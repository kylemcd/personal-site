import { Result } from "better-result";
import { describe, expect, it } from "vitest";

import { forEachAsyncResult, mapAsyncConcurrent } from "./result";

describe("async result helpers", () => {
	it("preserves falsy error values", async () => {
		const result = await forEachAsyncResult([1], async () => Result.err(null));

		expect(Result.isError(result)).toBe(true);
		if (Result.isError(result)) expect(result.error).toBeNull();
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
