import { describe, expect, it } from "vitest";

import {
	getRacingCarImageObjectKey,
	getRacingCarImagePath,
	getRacingCarImagePlatformId,
	respondWithRacingCarImage,
} from "./car-images";

describe("racing car images", () => {
	it("builds stable object and route paths", () => {
		expect(getRacingCarImageObjectKey(208)).toBe("cars/208.png");
		expect(getRacingCarImagePath(208)).toBe(
			"/media/racing/cars/208?source=r2-png-v1",
		);
		expect(getRacingCarImagePath(null)).toBeNull();
	});

	it("parses only valid car image route ids", () => {
		expect(getRacingCarImagePlatformId("/media/racing/cars/208")).toBe(208);
		expect(
			getRacingCarImagePlatformId("/media/racing/cars/208/extra"),
		).toBeNull();
		expect(getRacingCarImagePlatformId("/media/racing/cars/nope")).toBeNull();
	});

	it("returns a revalidating miss when R2 is unavailable", async () => {
		const response = await respondWithRacingCarImage({
			request: new Request("https://kylemcd.com/media/racing/cars/208"),
			bucket: undefined,
			platformId: 208,
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
		const response = await respondWithRacingCarImage({
			request: new Request("https://kylemcd.com/media/racing/cars/208", {
				headers: { "if-none-match": '"current-etag"' },
			}),
			bucket,
			platformId: 208,
		});

		expect(response.status).toBe(304);
		expect(response.headers.get("etag")).toBe('"current-etag"');
		expect(response.headers.get("cache-control")).toBe(
			"public, max-age=0, must-revalidate",
		);
	});
});
