import { respondWithRacingMediaObject } from "./r2-response";

const RACING_TRACK_MAP_ROUTE_PREFIX = "/media/racing/tracks/";
const RACING_TRACK_MAP_OBJECT_PREFIX = "tracks/iracing/";
const RACING_TRACK_MAP_CACHE_NAMESPACE = "r2-svg-v2";

const trackMapLayers = [
	"active",
	"background",
	"inactive",
	"pitroad",
	"start-finish",
	"turns",
] as const;

type RacingTrackMapLayer = (typeof trackMapLayers)[number];

type RacingTrackMapRequest = {
	platformId: number;
	layer: RacingTrackMapLayer;
};

const trackMapLayerPattern = new RegExp(
	`^${RACING_TRACK_MAP_ROUTE_PREFIX}(\\d+)/(${trackMapLayers.join("|")})\\.svg$`,
);

export const getRacingTrackMapObjectKey = ({
	platformId,
	layer,
}: RacingTrackMapRequest): string =>
	`${RACING_TRACK_MAP_OBJECT_PREFIX}${platformId}/${layer}.svg`;

export const getRacingTrackMapPath = ({
	platformId,
	layer,
}: RacingTrackMapRequest): string =>
	`${RACING_TRACK_MAP_ROUTE_PREFIX}${platformId}/${layer}.svg?source=${RACING_TRACK_MAP_CACHE_NAMESPACE}`;

export const getRacingTrackMapRequest = (
	pathname: string,
): RacingTrackMapRequest | null => {
	const match = trackMapLayerPattern.exec(pathname);
	if (!match) return null;

	const platformId = Number(match[1]);
	const layer = match[2] as RacingTrackMapLayer;
	return Number.isSafeInteger(platformId) && platformId > 0
		? { platformId, layer }
		: null;
};

export const respondWithRacingTrackMap = async ({
	request,
	bucket,
	trackMap,
}: {
	request: Request;
	bucket: R2Bucket | undefined;
	trackMap: RacingTrackMapRequest;
}): Promise<Response> => {
	return respondWithRacingMediaObject({
		request,
		bucket,
		objectKey: getRacingTrackMapObjectKey(trackMap),
		missingMessage: "Track map not found",
	});
};
