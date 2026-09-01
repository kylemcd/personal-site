import { Result } from "better-result";

const getConcurrency = (itemCount: number, requested = itemCount) =>
	Math.min(
		itemCount,
		Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : itemCount),
	);

export const combineResults = <A, E>(
	results: ReadonlyArray<Result<A, E>>,
): Result<ReadonlyArray<A>, E> => {
	const values: A[] = [];
	for (const result of results) {
		if (Result.isError(result)) return Result.err(result.error);
		values.push(result.value);
	}
	return Result.ok(values);
};

export const forEachAsyncResult = async <A, B, E>(
	items: ReadonlyArray<A>,
	fn: (item: A) => Promise<Result<B, E>>,
	options?: { concurrency?: number },
): Promise<Result<ReadonlyArray<B>, E>> => {
	const concurrency = getConcurrency(items.length, options?.concurrency);
	const output: B[] = new Array(items.length);
	const entries = items.entries();
	let failure: { error: E } | undefined;

	const workers = Array.from({ length: concurrency }, async () => {
		while (true) {
			if (failure) return;
			const next = entries.next();
			if (next.done) return;
			const [current, item] = next.value;

			const result = await fn(item);
			if (Result.isError(result)) {
				failure ??= { error: result.error };
				return;
			}
			output[current] = result.value;
		}
	});

	await Promise.all(workers);

	if (failure) return Result.err(failure.error);
	return Result.ok(output);
};

export const mapAsyncConcurrent = async <A, B>(
	items: ReadonlyArray<A>,
	mapper: (item: A) => Promise<B>,
	options?: { concurrency?: number },
): Promise<Array<B>> => {
	const concurrency = getConcurrency(items.length, options?.concurrency);
	const output: B[] = new Array(items.length);
	const entries = items.entries();

	const workers = Array.from({ length: concurrency }, async () => {
		for (const [index, item] of entries) {
			output[index] = await mapper(item);
		}
	});

	await Promise.all(workers);
	return output;
};
