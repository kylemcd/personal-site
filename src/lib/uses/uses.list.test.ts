import { Result } from "better-result";
import { describe, expect, it } from "vitest";

import { uses } from "./uses";

describe("uses.list", () => {
	it("returns rows from content/uses.md", () => {
		const result = uses.list();

		expect(Result.isOk(result)).toBe(true);
		if (Result.isError(result)) return;
		expect(result.value.length).toBeGreaterThan(0);
		expect(result.value[0]).toMatchObject({
			name: expect.any(String),
			description: expect.any(String),
			tags: expect.any(Array),
			order: expect.any(Number),
		});
	});
});
