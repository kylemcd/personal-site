import { respondWithRacingMediaObject } from "./r2-response";

const RACING_CAR_IMAGE_ROUTE_PREFIX = "/media/racing/cars/";
const RACING_CAR_IMAGE_OBJECT_PREFIX = "cars/";
const RACING_CAR_IMAGE_CACHE_NAMESPACE = "r2-png-v1";

export const getRacingCarImageObjectKey = (platformId: number): string =>
	`${RACING_CAR_IMAGE_OBJECT_PREFIX}${platformId}.png`;

export const getRacingCarImagePath = (
	platformId: number | null | undefined,
): string | null =>
	typeof platformId === "number" && Number.isFinite(platformId)
		? `${RACING_CAR_IMAGE_ROUTE_PREFIX}${platformId}?source=${RACING_CAR_IMAGE_CACHE_NAMESPACE}`
		: null;

export const respondWithRacingCarImage = async ({
	request,
	bucket,
	platformId,
}: {
	request: Request;
	bucket: R2Bucket | undefined;
	platformId: number;
}): Promise<Response> => {
	return respondWithRacingMediaObject({
		request,
		bucket,
		objectKey: getRacingCarImageObjectKey(platformId),
		missingMessage: "Car image not found",
	});
};

export const getRacingCarImagePlatformId = (
	pathname: string,
): number | null => {
	if (!pathname.startsWith(RACING_CAR_IMAGE_ROUTE_PREFIX)) return null;
	const raw = pathname.slice(RACING_CAR_IMAGE_ROUTE_PREFIX.length);
	if (!/^\d+$/.test(raw)) return null;
	const platformId = Number(raw);
	return Number.isSafeInteger(platformId) && platformId > 0 ? platformId : null;
};
