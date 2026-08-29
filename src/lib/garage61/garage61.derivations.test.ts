import { describe, expect, it } from "vitest";

import { computeSharePercentage } from "./shared";

describe("garage61 derivations", () => {
	it("computes share percentages and handles zero totals", () => {
		expect(computeSharePercentage(30, 120)).toBe(25);
		expect(computeSharePercentage(0, 120)).toBe(0);
		expect(computeSharePercentage(30, 0)).toBeNull();
		expect(computeSharePercentage(-10, 100)).toBe(0);
	});
});
