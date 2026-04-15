import { describe, expect, it } from "vitest";

import { uses } from "./uses";

describe("uses.list", () => {
	it("returns rows from content/uses.md", () => {
		const result = uses.list();

		expect(result.length).toBeGreaterThan(0);
		expect(result[0]).toMatchObject({
			name: expect.any(String),
			description: expect.any(String),
			tags: expect.any(Array),
			order: expect.any(Number),
		});
	});
});
