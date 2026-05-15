import { Result, TaggedError } from "better-result";

import type { ConcertEntry } from "./concerts-data";

const SETLIST_FM_BASE_URL = "https://www.setlist.fm";
const SETLIST_FM_USER_DEFAULT = "kpmdev";
const REQUEST_DELAY_MS = 350;
const MAX_PAGES = 25;
const USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const MONTHS: Record<string, number> = {
	Jan: 1,
	Feb: 2,
	Mar: 3,
	Apr: 4,
	May: 5,
	Jun: 6,
	Jul: 7,
	Aug: 8,
	Sep: 9,
	Oct: 10,
	Nov: 11,
	Dec: 12,
};

class SetlistScrapeError extends TaggedError("SetlistScrapeError")<{
	readonly url?: string;
	readonly error: unknown;
}>() {}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

const getTodayIsoDate = (): string => new Date().toISOString().slice(0, 10);

const isFutureConcertDate = (date: string): boolean => date > getTodayIsoDate();

const decodeHtml = (value: string): string =>
	value
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&nbsp;/g, " ");

const slugFromUrl = (url: string): string => {
	const match = url.match(/\/setlist\/[^/]+\/\d+\/([^"/]+)\.html/);
	if (match?.[1]) return match[1];
	return url.split("/").pop()?.replace(/\.html$/, "") ?? url;
};

const extractSetlistLinks = (html: string): string[] => {
	const links = new Set<string>();
	const r1 = /href="\.\.\/setlist\/([^"]+\.html)"/g;
	const r2 = /href="setlist\/([^"]+\.html)"/g;
	let match: RegExpExecArray | null = null;
	while ((match = r1.exec(html)) !== null) {
		if (match[1]) links.add(`${SETLIST_FM_BASE_URL}/setlist/${match[1]}`);
	}
	while ((match = r2.exec(html)) !== null) {
		if (match[1]) links.add(`${SETLIST_FM_BASE_URL}/setlist/${match[1]}`);
	}
	return [...links];
};

const extractPageNavLinks = (html: string): string[] => {
	const regex =
		/href="(?:\.\.\/)?\?(wicket:interface=:[^"]+:navigation:\d+:pageLink::ILinkListener::)"/g;
	const links = new Set<string>();
	let match: RegExpExecArray | null = null;
	while ((match = regex.exec(html)) !== null) {
		if (match[1]) links.add(match[1].replace(/&amp;/g, "&"));
	}
	return [...links];
};

const extractNextLink = (html: string): string | null => {
	const match = html.match(
		/href="(?:\.\.\/)?\?(wicket:interface=:[^"]+:next::ILinkListener::)"/,
	);
	return match?.[1] ? match[1].replace(/&amp;/g, "&") : null;
};

const parseSetlistPage = (html: string, url: string): ConcertEntry | null => {
	const monthMatch = html.match(/<span class="month">([^<]+)<\/span>/);
	const dayMatch = html.match(/<span class="day">([^<]+)<\/span>/);
	const yearMatch = html.match(/<span class="year">([^<]+)<\/span>/);
	if (!monthMatch?.[1] || !dayMatch?.[1] || !yearMatch?.[1]) return null;

	const month = MONTHS[monthMatch[1].trim()];
	const day = Number.parseInt(dayMatch[1].trim(), 10);
	const year = Number.parseInt(yearMatch[1].trim(), 10);
	if (!month || !Number.isFinite(day) || !Number.isFinite(year)) return null;

	const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	const ogTitleMatch = html.match(
		/<meta property="og:title" content="([^"]+) Setlist at [^"]+"/,
	);
	const artist = ogTitleMatch?.[1] ? decodeHtml(ogTitleMatch[1]).trim() : "";
	if (!artist) return null;

	let venue = "";
	let cityRaw = "";
	const venueHeaderMatch = html.match(
		/<div class="venueHeader">[\s\S]*?<h2>([^<]+)<\/h2>[\s\S]*?<span><span>([^<]+)<\/span>/,
	);
	if (venueHeaderMatch?.[1] && venueHeaderMatch[2]) {
		venue = decodeHtml(venueHeaderMatch[1]).trim();
		cityRaw = decodeHtml(venueHeaderMatch[2]).trim();
	} else {
		const inlineVenueMatch = html.match(
			/<div class="setlistHeadline">[\s\S]*?<span>at <a[^>]*title="More setlists from ([^"]+)"/,
		);
		if (inlineVenueMatch?.[1]) {
			const full = decodeHtml(inlineVenueMatch[1]).trim();
			const parts = full.split(",").map((part) => part.trim());
			venue = parts[0] ?? "";
			cityRaw = parts.slice(1).join(", ");
		}
	}

	const cityParts = cityRaw
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const city = cityParts.slice(0, Math.min(2, cityParts.length)).join(", ");

	const tourMatch = html.match(
		/<span>Tour:<\/span>\s*<span><a[^>]*><span>([^<]+)<\/span>/,
	);
	const tour = tourMatch?.[1] ? decodeHtml(tourMatch[1]).trim() : null;

	const songs: Array<string | { name: string; cover: string }> = [];
	const songRegex =
		/<li class="setlistParts song">([\s\S]*?)(?=<li class="setlistParts|<\/ol>)/g;
	let songMatch: RegExpExecArray | null = null;
	while ((songMatch = songRegex.exec(html)) !== null) {
		const songBlock = songMatch[1] ?? "";
		const labelMatch = songBlock.match(
			/<a class="songLabel"[^>]*title="Statistics for ([^"]+) performed by [^"]+"/,
		);
		const fallbackLabel = songBlock.match(/<a class="songLabel"[^>]*>([^<]+)</);
		const songName = labelMatch?.[1]
			? decodeHtml(labelMatch[1]).trim()
			: fallbackLabel?.[1]
				? decodeHtml(fallbackLabel[1]).trim()
				: "";
		if (!songName) continue;
		const coverMatch = songBlock.match(
			/<a[^>]+title="More songs[^"]*by ([^"]+)"[^>]*>[^<]+<\/a>\s*cover/i,
		);
		const cover = coverMatch?.[1] ? decodeHtml(coverMatch[1]).trim() : null;
		songs.push(cover ? { name: songName, cover } : songName);
	}

	const entry: ConcertEntry = {
		id: slugFromUrl(url),
		date,
		artist,
		venue,
		city,
		url,
		songs,
	};
	if (tour) entry.tour = tour;
	return entry;
};

const fetchHtmlWithSession = async (params: {
	url: string;
	cookieJar: string;
	referer?: string;
}): Promise<Result<{ html: string; cookieJar: string }, SetlistScrapeError>> => {
	try {
		const response = await fetch(params.url, {
			headers: {
				"User-Agent": USER_AGENT,
				...(params.cookieJar ? { Cookie: params.cookieJar } : {}),
				...(params.referer ? { Referer: params.referer } : {}),
			},
			redirect: "follow",
		});
		if (!response.ok) {
			return Result.err(
				new SetlistScrapeError({
					url: params.url,
					error: new Error(`HTTP ${response.status}`),
				}),
			);
		}
		const setCookie = response.headers.get("set-cookie");
		const sessionMatch = setCookie?.match(/JSESSIONID=[^;]+/);
		return Result.ok({
			html: await response.text(),
			cookieJar: sessionMatch?.[0] ?? params.cookieJar,
		});
	} catch (error) {
		return Result.err(new SetlistScrapeError({ url: params.url, error }));
	}
};

const collectAllSetlistLinks = async (
	user: string,
): Promise<Result<string[], SetlistScrapeError>> => {
	const indexUrl = `${SETLIST_FM_BASE_URL}/attended/${user}`;
	const first = await fetchHtmlWithSession({ url: indexUrl, cookieJar: "" });
	if (Result.isError(first)) return first;

	const all = new Set(extractSetlistLinks(first.value.html));
	const visitedQueries = new Set<string>();
	const queue = [...new Set(extractPageNavLinks(first.value.html))];
	const nextFromFirst = extractNextLink(first.value.html);
	if (nextFromFirst) queue.push(nextFromFirst);

	let cookieJar = first.value.cookieJar;
	let pageIndex = 1;

	while (queue.length > 0 && pageIndex < MAX_PAGES) {
		const query = queue.shift();
		if (!query || visitedQueries.has(query)) continue;
		visitedQueries.add(query);
		pageIndex += 1;

		const url = `${SETLIST_FM_BASE_URL}/?${query}`;
		const page = await fetchHtmlWithSession({
			url,
			referer: indexUrl,
			cookieJar,
		});
		if (Result.isError(page)) {
			console.error("[setlistfm] failed to load pagination page", {
				url,
				error: page.error,
			});
			await sleep(REQUEST_DELAY_MS);
			continue;
		}

		cookieJar = page.value.cookieJar;
		for (const link of extractSetlistLinks(page.value.html)) all.add(link);
		for (const newQuery of extractPageNavLinks(page.value.html)) {
			if (!visitedQueries.has(newQuery) && !queue.includes(newQuery)) {
				queue.push(newQuery);
			}
		}
		const nextQuery = extractNextLink(page.value.html);
		if (
			nextQuery &&
			!visitedQueries.has(nextQuery) &&
			!queue.includes(nextQuery)
		) {
			queue.push(nextQuery);
		}
		await sleep(REQUEST_DELAY_MS);
	}

	return Result.ok([...all]);
};

const fetchSetlistEntry = async (
	url: string,
): Promise<Result<ConcertEntry | null, SetlistScrapeError>> => {
	const page = await fetchHtmlWithSession({ url, cookieJar: "" });
	if (Result.isError(page)) return page;
	return Result.ok(parseSetlistPage(page.value.html, url));
};

const mergeConcertEntries = (
	existing: ReadonlyArray<ConcertEntry>,
	incoming: ReadonlyArray<ConcertEntry>,
): ConcertEntry[] => {
	const byId = new Map<string, ConcertEntry>();
	for (const entry of existing) {
		if (!isFutureConcertDate(entry.date)) byId.set(entry.id, entry);
	}
	for (const entry of incoming) {
		if (!isFutureConcertDate(entry.date)) byId.set(entry.id, entry);
	}
	return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
};

const scrapeConcertEntriesDiff = async (params?: {
	user?: string;
	existing?: ReadonlyArray<ConcertEntry>;
}): Promise<
	Result<
		{
			concerts: ConcertEntry[];
			added: number;
			discoveredLinks: number;
		},
		SetlistScrapeError
	>
> => {
	const user = params?.user?.trim() || SETLIST_FM_USER_DEFAULT;
	const existing = params?.existing ?? [];
	const existingIds = new Set(existing.map((entry) => entry.id));

	const linksResult = await collectAllSetlistLinks(user);
	if (Result.isError(linksResult)) return linksResult;
	const links = linksResult.value;
	const newLinks = links.filter((url) => !existingIds.has(slugFromUrl(url)));
	if (newLinks.length === 0) {
		return Result.ok({
			concerts: [...existing].sort((a, b) => b.date.localeCompare(a.date)),
			added: 0,
			discoveredLinks: links.length,
		});
	}

	const incoming: ConcertEntry[] = [];
	for (const url of newLinks) {
		const entry = await fetchSetlistEntry(url);
		if (Result.isError(entry)) {
			console.error("[setlistfm] failed to fetch setlist", { url, error: entry.error });
			await sleep(REQUEST_DELAY_MS);
			continue;
		}
		if (entry.value && !isFutureConcertDate(entry.value.date)) {
			incoming.push(entry.value);
		}
		await sleep(REQUEST_DELAY_MS);
	}

	return Result.ok({
		concerts: mergeConcertEntries(existing, incoming),
		added: incoming.length,
		discoveredLinks: links.length,
	});
};

export { scrapeConcertEntriesDiff };
export type { SetlistScrapeError };
