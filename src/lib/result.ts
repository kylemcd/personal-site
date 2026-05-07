import { Result } from "better-result";

import { toErrorDetails } from "@/lib/error-details";

export type ResultValue<A, E> = Result<A, E>;
export type AsyncResult<A, E> = Promise<Result<A, E>>;

export const toError = (error: unknown): Error =>
	error instanceof Error ? error : new Error(toErrorDetails(error));

export const trySync = <A, E>(
	thunk: () => A,
	mapError: (error: unknown) => E,
): Result<A, E> => {
	try {
		return Result.ok(thunk());
	} catch (error) {
		return Result.err(mapError(error));
	}
};

export const tryAsync = <A, E>(
	thunk: () => Promise<A>,
	mapError: (error: unknown) => E,
): Promise<Result<A, E>> =>
	(async () => {
		try {
			return Result.ok(await thunk());
		} catch (error) {
			return Result.err(mapError(error));
		}
	})();

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

export const combineAsyncResults = async <A, E>(
	results: ReadonlyArray<Promise<Result<A, E>>>,
): Promise<Result<ReadonlyArray<A>, E>> =>
	combineResults(await Promise.all(results));

export const forEachAsyncResult = async <A, B, E>(
	items: ReadonlyArray<A>,
	fn: (item: A) => Promise<Result<B, E>>,
	options?: { concurrency?: number },
): Promise<Result<ReadonlyArray<B>, E>> => {
	const concurrency = Math.max(1, (options?.concurrency ?? items.length) || 1);
	const output: B[] = new Array(items.length);
	let index = 0;
	let firstError: E | null = null;

	const workers = Array.from({ length: concurrency }, async () => {
		while (true) {
			if (firstError !== null) return;
			const current = index;
			index += 1;
			if (current >= items.length) return;

			const result = await fn(items[current]!);
			if (Result.isError(result)) {
				firstError = result.error;
				return;
			}
			output[current] = result.value;
		}
	});

	await Promise.all(workers);

	if (firstError !== null) return Result.err(firstError);
	return Result.ok(output);
};

export const mapAsyncConcurrent = async <A, B>(
	items: ReadonlyArray<A>,
	mapper: (item: A) => Promise<B>,
	options?: { concurrency?: number },
): Promise<Array<B>> => {
	const mapped = await forEachAsyncResult(
		items,
		async (item) => Result.ok(await mapper(item)),
		options,
	);
	return Result.isOk(mapped) ? [...mapped.value] : [];
};

