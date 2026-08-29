const RACING_MEDIA_CACHE_CONTROL = "public, max-age=0, must-revalidate";

const respondWithRacingMediaObject = async ({
	request,
	bucket,
	objectKey,
	missingMessage,
}: {
	request: Request;
	bucket: R2Bucket | undefined;
	objectKey: string;
	missingMessage: string;
}): Promise<Response> => {
	if (!bucket) {
		return new Response(missingMessage, {
			status: 404,
			headers: { "cache-control": RACING_MEDIA_CACHE_CONTROL },
		});
	}

	const object = await bucket.get(objectKey, { onlyIf: request.headers });
	if (!object) {
		return new Response(missingMessage, {
			status: 404,
			headers: { "cache-control": RACING_MEDIA_CACHE_CONTROL },
		});
	}

	if (!("body" in object)) {
		return new Response(null, {
			status: 304,
			headers: {
				etag: object.httpEtag,
				"cache-control": RACING_MEDIA_CACHE_CONTROL,
			},
		});
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("cache-control", RACING_MEDIA_CACHE_CONTROL);
	return new Response(request.method === "HEAD" ? null : object.body, {
		headers,
	});
};

export { respondWithRacingMediaObject };
