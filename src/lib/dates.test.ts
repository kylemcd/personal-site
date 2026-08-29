import { describe, expect, test } from "vitest";

import { toComparableTimestampInCentral } from "./dates";

describe("toComparableTimestampInCentral", () => {
	test("preserves explicit UTC and numeric offsets", () => {
		expect(toComparableTimestampInCentral("2026-01-01T00:00:00Z")).toBe(
			Date.parse("2026-01-01T00:00:00Z"),
		);
		expect(toComparableTimestampInCentral("2026-01-01T00:00:00+02:00")).toBe(
			Date.parse("2026-01-01T00:00:00+02:00"),
		);
	});

	test("interprets offset-free timestamps as Central time", () => {
		expect(toComparableTimestampInCentral("2026-01-01T00:00:00")).toBe(
			Date.parse("2026-01-01T00:00:00-06:00"),
		);
	});
});
