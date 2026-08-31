import { describe, expect, it } from "vitest";

import { formatDuration } from ".";

describe("formatDuration", () => {
	it("uses visible tabular spaces between duration units", () => {
		expect(formatDuration(13 * 3600 + 2 * 60)).toBe("13h\u20072m");
		expect(formatDuration(24 * 3600 + 2 * 3600 + 4 * 60)).toBe(
			"1d\u20072h\u20074m",
		);
	});

	it("carries rounded minutes into the next hour", () => {
		expect(formatDuration(3599)).toBe("1h\u20070m");
	});
});
