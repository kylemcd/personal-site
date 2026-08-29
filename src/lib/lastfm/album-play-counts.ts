export const toFullAlbumPlayCount = (
	trackPlayCount: number,
	trackCount: number,
): number | null => {
	if (
		!Number.isFinite(trackPlayCount) ||
		trackPlayCount < 0 ||
		!Number.isInteger(trackCount) ||
		trackCount <= 0
	) {
		return null;
	}

	return Math.floor(trackPlayCount / trackCount);
};
