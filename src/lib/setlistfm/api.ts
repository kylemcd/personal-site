import { Result, TaggedError } from "better-result";
import { z } from "zod";

import type { ConcertEntry } from "./concerts-data";

const SETLIST_FM_API_BASE_URL = "https://api.setlist.fm/rest/1.0";
const SETLIST_FM_USER_DEFAULT = "kpmdev";
// Setlist.fm allows 2 requests/second. Leave 100 ms of headroom between pages.
const DEFAULT_REQUEST_DELAY_MS = 600;
const MAX_API_PAGES = 50;

const ApiSongSchema = z.object({
	name: z.string(),
	cover: z.object({ name: z.string().optional() }).optional(),
});

const ApiSetlistSchema = z.object({
	id: z.string(),
	versionId: z.string().optional(),
	eventDate: z.string(),
	lastUpdated: z.string().optional(),
	artist: z.object({
		name: z.string(),
		mbid: z.string().optional().default(""),
	}),
	venue: z.object({
		name: z.string(),
		city: z
			.object({
				name: z.string().optional(),
				stateCode: z.string().optional(),
				country: z.object({ name: z.string().optional() }).optional(),
			})
			.optional(),
	}),
	tour: z.object({ name: z.string().optional() }).optional(),
	sets: z
		.object({
			set: z
				.array(
					z.object({
						song: z.array(ApiSongSchema).optional().default([]),
					}),
				)
				.optional()
				.default([]),
		})
		.optional()
		.default({ set: [] }),
	url: z.string().optional().default(""),
});

const ApiSetlistsPageSchema = z.object({
	setlist: z.array(ApiSetlistSchema).optional().default([]),
	total: z.number().int().nonnegative(),
	page: z.number().int().positive(),
	itemsPerPage: z.number().int().positive(),
});

type ApiSetlist = z.infer<typeof ApiSetlistSchema>;

class SetlistFmApiError extends TaggedError("SetlistFmApiError")<{
	readonly error: unknown;
	readonly status?: number;
	readonly url?: string;
}> {
	override message =
		"Failed to fetch attended concerts from the Setlist.fm API";
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

const eventDateToIso = (eventDate: string): string | null => {
	const match = eventDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
	if (!match?.[1] || !match[2] || !match[3]) return null;

	const day = Number.parseInt(match[1], 10);
	const month = Number.parseInt(match[2], 10);
	const year = Number.parseInt(match[3], 10);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		Number.isNaN(date.getTime()) ||
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return `${match[3]}-${match[2]}-${match[1]}`;
};

const formatCity = (setlist: ApiSetlist): string => {
	const city = setlist.venue.city;
	if (!city) return "";

	const name = city.name?.trim() ?? "";
	const region = city.stateCode?.trim() ?? "";
	const country = city.country?.name?.trim() ?? "";
	const suffix =
		region || (country && country !== "United States" ? country : "");
	return [name, suffix].filter(Boolean).join(", ");
};

const apiSetlistToConcertEntry = (setlist: ApiSetlist): ConcertEntry | null => {
	const date = eventDateToIso(setlist.eventDate);
	if (!date || date > new Date().toISOString().slice(0, 10)) return null;

	const songs: ConcertEntry["songs"] = [];
	for (const set of setlist.sets.set) {
		for (const song of set.song) {
			const name = song.name.trim();
			if (!name) continue;
			const cover = song.cover?.name?.trim();
			songs.push(cover ? { name, cover } : name);
		}
	}

	const artistMbid = setlist.artist.mbid.trim();
	const tour = setlist.tour?.name?.trim();
	return {
		id: setlist.id,
		date,
		artist: setlist.artist.name.trim(),
		...(artistMbid ? { artistMbid } : {}),
		venue: setlist.venue.name.trim(),
		city: formatCity(setlist),
		...(tour ? { tour } : {}),
		url: setlist.url,
		songs,
		...(setlist.versionId ? { versionId: setlist.versionId } : {}),
		...(setlist.lastUpdated ? { lastUpdated: setlist.lastUpdated } : {}),
	};
};

const fetchApiPage = async (params: {
	apiKey: string;
	user: string;
	page: number;
	fetcher: typeof fetch;
}): Promise<
	Result<z.infer<typeof ApiSetlistsPageSchema>, SetlistFmApiError>
> => {
	const url = `${SETLIST_FM_API_BASE_URL}/user/${encodeURIComponent(params.user)}/attended?p=${params.page}`;

	const responseResult = await Result.tryPromise<Response, SetlistFmApiError>({
		try: () =>
			params.fetcher(url, {
				headers: {
					Accept: "application/json",
					"x-api-key": params.apiKey,
				},
			}),
		catch: (error) => new SetlistFmApiError({ url, error }),
	});
	if (Result.isError(responseResult)) return responseResult;

	const response = responseResult.value;
	if (!response.ok) {
		return Result.err(
			new SetlistFmApiError({
				url,
				status: response.status,
				error: new Error(`HTTP ${response.status}: ${response.statusText}`),
			}),
		);
	}

	const payloadResult = await Result.tryPromise<unknown, SetlistFmApiError>({
		try: () => response.json() as Promise<unknown>,
		catch: (error) => new SetlistFmApiError({ url, error }),
	});

	return payloadResult.andThen((payload) => {
		const parsed = ApiSetlistsPageSchema.safeParse(payload);
		if (!parsed.success) {
			return Result.err(new SetlistFmApiError({ url, error: parsed.error }));
		}
		return Result.ok(parsed.data);
	});
};

const fetchAttendedConcertEntries = async (params: {
	apiKey: string;
	user?: string;
	requestDelayMs?: number;
	fetcher?: typeof fetch;
}): Promise<
	Result<
		{ concerts: ConcertEntry[]; total: number; pages: number },
		SetlistFmApiError
	>
> => {
	const apiKey = params.apiKey.trim();
	if (!apiKey) {
		return Result.err(
			new SetlistFmApiError({
				error: new Error("SETLIST_FM_API_KEY is missing"),
			}),
		);
	}

	const user = params.user?.trim() || SETLIST_FM_USER_DEFAULT;
	const fetcher = params.fetcher ?? fetch;
	const requestDelayMs = Math.max(
		0,
		params.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS,
	);
	const byId = new Map<string, ConcertEntry>();
	let page = 1;
	let pageCount = 1;
	let total = 0;

	while (page <= pageCount) {
		const pageResult = await fetchApiPage({ apiKey, user, page, fetcher });
		if (Result.isError(pageResult)) return pageResult;

		const payload = pageResult.value;
		total = Math.max(total, payload.total);
		pageCount = Math.max(1, Math.ceil(total / payload.itemsPerPage));
		if (pageCount > MAX_API_PAGES) {
			return Result.err(
				new SetlistFmApiError({
					error: new Error(
						`Setlist.fm API response requires ${pageCount} pages; maximum is ${MAX_API_PAGES}`,
					),
				}),
			);
		}

		for (const setlist of payload.setlist) {
			const concert = apiSetlistToConcertEntry(setlist);
			if (concert) byId.set(concert.id, concert);
		}

		page += 1;
		if (page <= pageCount && requestDelayMs > 0) {
			await sleep(requestDelayMs);
		}
	}

	return Result.ok({
		concerts: [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)),
		total,
		pages: pageCount,
	});
};

export { fetchAttendedConcertEntries };
