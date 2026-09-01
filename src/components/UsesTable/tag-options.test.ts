import { describe, expect, it } from "vitest";

import {
	buildTagOptions,
	buildTagPillStyles,
	selectedTagSummary,
} from "./tag-options";

describe("Uses tag options", () => {
	it("normalizes, deduplicates, and sorts tags without changing their display labels", () => {
		expect(
			buildTagOptions([
				{
					name: "Laptop",
					description: "",
					order: 0,
					tags: [" Hardware ", "Apple", "", "apple"],
				},
				{
					name: "Display",
					description: "",
					order: 1,
					tags: ["hardware", "Desk"],
				},
			]),
		).toEqual([
			{ key: "apple", label: "Apple" },
			{ key: "desk", label: "Desk" },
			{ key: "hardware", label: "Hardware" },
		]);
	});

	it("keeps the existing deterministic tag colors", () => {
		const options = [
			{ key: "apple", label: "Apple" },
			{ key: "hardware", label: "Hardware" },
		];
		const styles = buildTagPillStyles(options);
		expect(styles.get("apple")).toEqual({
			"--tag-hue": "287.00deg",
			"--tag-sat": "50%",
			"--tag-light": "32%",
			"--tag-border-sat": "64%",
			"--tag-border-light": "52%",
			"--tag-light-sat": "56%",
			"--tag-light-bg": "77%",
			"--tag-light-border-sat": "66%",
			"--tag-light-border": "56%",
		});
		expect(styles.get("hardware")).not.toEqual(styles.get("apple"));
		expect(buildTagPillStyles(options)).toEqual(styles);
	});

	it("summarizes selected tags", () => {
		const options = [{ key: "apple", label: "Apple" }];
		expect(selectedTagSummary([], options)).toBe("All tags");
		expect(selectedTagSummary(["apple"], options)).toBe("Apple");
		expect(selectedTagSummary(["unknown"], options)).toBe("1 selected");
		expect(selectedTagSummary(["apple", "hardware"], options)).toBe(
			"2 selected",
		);
	});
});
