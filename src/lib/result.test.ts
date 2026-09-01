import { Result } from "better-result";
import { describe, expect, it, vi } from "vitest";

import { forEachAsyncResult, mapAsyncConcurrent } from "./result";

describe("async result helpers", () => {
	it.each([
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER,
		0,
		-2,
		0.5,
	])(
		"handles invalid concurrency %s without dropping work",
		async (concurrency) => {
			const items = [1, 2, 3];
			expect(
				await mapAsyncConcurrent(items, async (value) => value * 2, {
					concurrency,
				}),
			).toEqual([2, 4, 6]);
			const result = await forEachAsyncResult(
				items,
				async (value) => Result.ok(value * 2),
				{ concurrency },
			);
			expect(result.unwrapOr([])).toEqual([2, 4, 6]);
		},
	);

	it("does not start work for empty input", async () => {
		const mapper = vi.fn(async () => 1);
		expect(
			await mapAsyncConcurrent([], mapper, { concurrency: Infinity }),
		).toEqual([]);
		expect(mapper).not.toHaveBeenCalled();
	});

	it("preserves falsy error values", async () => {
		const result = await forEachAsyncResult([1], async () => Result.err(null));

		expect(Result.isError(result)).toBe(true);
		if (Result.isError(result)) expect(result.error).toBeNull();
	});

	it("keeps the first failure and does not start queued work afterward", async () => {
		const completions: Array<(result: Result<number, string>) => void> = [];
		const mapper = vi.fn(
			() =>
				new Promise<Result<number, string>>((resolve) => {
					completions.push(resolve);
				}),
		);
		const pending = forEachAsyncResult([1, 2, 3], mapper, { concurrency: 2 });
		completions[1]?.(Result.err("first failure"));
		await Promise.resolve();
		completions[0]?.(Result.err("later failure"));
		const result = await pending;
		if (Result.isOk(result)) throw new Error("Expected a failure");
		expect(result.error).toBe("first failure");
		expect(mapper).toHaveBeenCalledTimes(2);
	});

	it("maps concurrently without changing input order", async () => {
		const result = await mapAsyncConcurrent(
			[3, 1, 2],
			async (value) => {
				await Promise.resolve();
				return value * 2;
			},
			{ concurrency: 2 },
		);

		expect(result).toEqual([6, 2, 4]);
	});
});
