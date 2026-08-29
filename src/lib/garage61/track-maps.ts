import { getRacingTrackMapPath } from "../racing-media/track-maps";
import { availableTrackMapIds } from "./track-map-ids.generated";

// Compatibility for summaries cached before Garage61 platform IDs were stored.
const legacyPlatformIdsByGarage61Id: Readonly<Record<number, number>> = {
	35: 95,
	49: 18,
	60: 353,
	67: 212,
	79: 219,
	90: 218,
	104: 179,
	105: 192,
	158: 128,
	253: 403,
	498: 580,
	502: 584,
};

type TrackMapAssets = {
	active: string;
	inactive: string;
	turns: string;
	startFinish: string;
	pitroad: string;
};

function getTrackMapAssets({
	platformId,
	garage61TrackId,
}: {
	platformId?: number | null;
	garage61TrackId: number;
}): TrackMapAssets | null {
	const resolvedPlatformId =
		platformId ?? legacyPlatformIdsByGarage61Id[garage61TrackId];
	if (!resolvedPlatformId || !availableTrackMapIds.has(resolvedPlatformId)) {
		return null;
	}
	return {
		active: getRacingTrackMapPath({
			platformId: resolvedPlatformId,
			layer: "active",
		}),
		inactive: getRacingTrackMapPath({
			platformId: resolvedPlatformId,
			layer: "inactive",
		}),
		turns: getRacingTrackMapPath({
			platformId: resolvedPlatformId,
			layer: "turns",
		}),
		startFinish: getRacingTrackMapPath({
			platformId: resolvedPlatformId,
			layer: "start-finish",
		}),
		pitroad: getRacingTrackMapPath({
			platformId: resolvedPlatformId,
			layer: "pitroad",
		}),
	};
}

export { getTrackMapAssets };
