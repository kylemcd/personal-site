import { Result } from "better-result";
import { describe, expect, it, vi } from "vitest";

import { fetchAttendedConcertEntries } from "./api";

const makeApiSetlist = (params: {
	id: string;
	eventDate: string;
	artist: string;
	versionId?: string;
	mbid?: string;
	cover?: string;
}) => ({
	id: params.id,
	versionId: params.versionId ?? `${params.id}-version`,
	eventDate: params.eventDate,
	lastUpdated: "2026-08-27T12:00:00.000+0000",
	artist: {
		name: params.artist,
		mbid: params.mbid ?? `${params.id}-mbid`,
	},
	venue: {
		name: "Metro",
		city: {
			name: "Chicago",
			stateCode: "IL",
			country: { name: "United States" },
		},
	},
	tour: { name: "Test Tour" },
	sets: {
		set: [
			{
				song: [
					{ name: "First Song" },
					{
						name: "Cover Song",
						...(params.cover ? { cover: { name: params.cover } } : {}),
					},
				],
			},
		],
	},
	url: `https://www.setlist.fm/setlist/test/${params.id}.html`,
});

describe("Setlist.fm API", () => {
	it("fetches every attended page with the API key and normalizes setlists", async () => {
		const fetcher = vi.fn(
			async (input: RequestInfo | URL, _init?: RequestInit) => {
				const url = new URL(String(input));
				const page = Number(url.searchParams.get("p"));
				return Response.json({
					setlist:
						page === 1
							? [
									makeApiSetlist({
										id: "newer",
										eventDate: "20-08-2026",
										artist: "The Story So Far",
										cover: "Blink-182",
									}),
									makeApiSetlist({
										id: "future",
										eventDate: "01-01-2099",
										artist: "Future Artist",
									}),
								]
							: [
									makeApiSetlist({
										id: "older",
										eventDate: "15-03-2025",
										artist: "Older Artist",
									}),
								],
					total: 21,
					page,
					itemsPerPage: 20,
				});
			},
		);

		const result = await fetchAttendedConcertEntries({
			apiKey: "test-api-key",
			user: "kpmdev",
			requestDelayMs: 0,
			fetcher,
		});

		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(fetcher.mock.calls.map((call) => String(call[0]))).toEqual([
			"https://api.setlist.fm/rest/1.0/user/kpmdev/attended?p=1",
			"https://api.setlist.fm/rest/1.0/user/kpmdev/attended?p=2",
		]);
		for (const call of fetcher.mock.calls) {
			const headers = new Headers(call[1]?.headers);
			expect(headers.get("accept")).toBe("application/json");
			expect(headers.get("x-api-key")).toBe("test-api-key");
		}
		expect(result.value).toMatchObject({ total: 21, pages: 2 });
		expect(result.value.concerts).toHaveLength(2);
		expect(result.value.concerts[0]).toMatchObject({
			id: "newer",
			date: "2026-08-20",
			artist: "The Story So Far",
			artistMbid: "newer-mbid",
			venue: "Metro",
			city: "Chicago, IL",
			tour: "Test Tour",
			versionId: "newer-version",
			songs: ["First Song", { name: "Cover Song", cover: "Blink-182" }],
		});
		expect(
			result.value.concerts.some((concert) => concert.id === "future"),
		).toBe(false);
	});

	it("does not make a request without an API key", async () => {
		const fetcher = vi.fn();
		const result = await fetchAttendedConcertEntries({
			apiKey: " ",
			requestDelayMs: 0,
			fetcher,
		});

		expect(Result.isError(result)).toBe(true);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("fails the complete refresh when any API page fails", async () => {
		const fetcher = vi.fn(
			async () =>
				new Response("rate limited", {
					status: 429,
					statusText: "Too Many Requests",
				}),
		);
		const result = await fetchAttendedConcertEntries({
			apiKey: "test-api-key",
			requestDelayMs: 0,
			fetcher,
		});

		expect(Result.isError(result)).toBe(true);
		if (Result.isOk(result)) return;
		expect(result.error.status).toBe(429);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("rejects malformed API payloads rather than returning partial data", async () => {
		const result = await fetchAttendedConcertEntries({
			apiKey: "test-api-key",
			requestDelayMs: 0,
			fetcher: vi.fn(async () => Response.json({ setlist: [] })),
		});

		expect(Result.isError(result)).toBe(true);
	});
});
