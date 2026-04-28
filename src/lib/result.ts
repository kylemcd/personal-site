import { Result } from "better-result";

export type ResultValue<A, E> = Result<A, E>;
export type AsyncResult<A, E> = Promise<Result<A, E>>;

const errorMessage = (error: unknown): string => {
	if (error instanceof Error && error.message.trim())
		return error.message.trim();
	if (typeof error === "string" && error.trim()) return error.trim();
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

export const toError = (error: unknown): Error =>
	error instanceof Error ? error : new Error(errorMessage(error));

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

export const combineResultMap = <T extends Record<string, unknown>, E>(
	map: { [K in keyof T]: Result<T[K], E> },
): Result<T, E> => {
	const entries: Array<[string, unknown]> = [];
	for (const [key, result] of Object.entries(map) as Array<
		[keyof T & string, Result<T[keyof T], E>]
	>) {
		if (Result.isError(result)) return Result.err(result.error);
		entries.push([key, result.value]);
	}
	return Result.ok(Object.fromEntries(entries) as T);
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

			const result = await fn(items[current]);
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

export const tapAsyncError = async <A, E>(
	result: Promise<Result<A, E>>,
	onError: (error: E) => Promise<void> | void,
): Promise<Result<A, E>> => {
	const resolved = await result;
	if (Result.isError(resolved)) {
		await onError(resolved.error);
	}
	return resolved;
};

export const logIfError = <A, E>(
	result: Result<A, E>,
	context: string,
): Result<A, E> => {
	if (Result.isError(result)) {
		console.error(context, result.error);
	}
	return result;
};
