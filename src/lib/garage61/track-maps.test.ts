import { describe, expect, it } from "vitest";

import { getTrackMapAssets } from "./track-maps";

describe("getTrackMapAssets", () => {
	it("returns every R2-backed layer for the active track layout", () => {
		expect(
			getTrackMapAssets({ platformId: 192, garage61TrackId: 105 }),
		).toEqual({
			active: "/media/racing/tracks/192/active.svg?source=r2-svg-v1",
			inactive: "/media/racing/tracks/192/inactive.svg?source=r2-svg-v1",
			turns: "/media/racing/tracks/192/turns.svg?source=r2-svg-v1",
			startFinish: "/media/racing/tracks/192/start-finish.svg?source=r2-svg-v1",
			pitroad: "/media/racing/tracks/192/pitroad.svg?source=r2-svg-v1",
		});
	});

	it("supports summaries cached before platform IDs were added", () => {
		expect(
			getTrackMapAssets({ platformId: null, garage61TrackId: 104 }),
		).toEqual({
			active: "/media/racing/tracks/179/active.svg?source=r2-svg-v1",
			inactive: "/media/racing/tracks/179/inactive.svg?source=r2-svg-v1",
			turns: "/media/racing/tracks/179/turns.svg?source=r2-svg-v1",
			startFinish: "/media/racing/tracks/179/start-finish.svg?source=r2-svg-v1",
			pitroad: "/media/racing/tracks/179/pitroad.svg?source=r2-svg-v1",
		});
	});

	it("returns null when neither ID can resolve a local configuration", () => {
		expect(
			getTrackMapAssets({ platformId: null, garage61TrackId: 9999 }),
		).toBeNull();
	});

	it("does not construct a broken URL for an unpublished configuration", () => {
		expect(
			getTrackMapAssets({ platformId: 586, garage61TrackId: 504 }),
		).toBeNull();
	});
});
