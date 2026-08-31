import { describe, expect, it } from "vitest";

import {
	getRacingTrackMapObjectKey,
	getRacingTrackMapPath,
	getRacingTrackMapRequest,
	respondWithRacingTrackMap,
} from "./track-maps";

describe("R2 racing track maps", () => {
	it("builds stable object and route paths", () => {
		expect(
			getRacingTrackMapObjectKey({ platformId: 192, layer: "active" }),
		).toBe("tracks/iracing/192/active.svg");
		expect(
			getRacingTrackMapPath({ platformId: 192, layer: "start-finish" }),
		).toBe("/media/racing/tracks/192/start-finish.svg?source=r2-svg-v2");
	});

	it("parses only valid track-map routes", () => {
		expect(
			getRacingTrackMapRequest("/media/racing/tracks/192/turns.svg"),
		).toEqual({ platformId: 192, layer: "turns" });
		expect(
			getRacingTrackMapRequest("/media/racing/tracks/192/unknown.svg"),
		).toBeNull();
		expect(
			getRacingTrackMapRequest("/media/racing/tracks/192/turns.svg/extra"),
		).toBeNull();
	});

	it("returns a revalidating miss when R2 is unavailable", async () => {
		const response = await respondWithRacingTrackMap({
			request: new Request(
				"https://kylemcd.com/media/racing/tracks/192/active.svg",
			),
			bucket: undefined,
			trackMap: { platformId: 192, layer: "active" },
		});

		expect(response.status).toBe(404);
		expect(response.headers.get("cache-control")).toBe(
			"public, max-age=0, must-revalidate",
		);
	});

	it("keeps the R2 cache policy on conditional responses", async () => {
		const bucket = {
			get: async () => ({ httpEtag: '"current-etag"' }),
		} as unknown as R2Bucket;
		const response = await respondWithRacingTrackMap({
			request: new Request(
				"https://kylemcd.com/media/racing/tracks/192/active.svg",
				{ headers: { "if-none-match": '"current-etag"' } },
			),
			bucket,
			trackMap: { platformId: 192, layer: "active" },
		});

		expect(response.status).toBe(304);
		expect(response.headers.get("etag")).toBe('"current-etag"');
	});
});
