import { describe, expect, it } from "vitest";

import type { UseItem } from "@/lib/uses";

import { filterUsesItems } from "./filterUses";

const ITEMS: UseItem[] = [
	{
		name: "MacBook Pro",
		description: "Main laptop for development",
		tags: ["Hardware", "Apple"],
		order: 0,
	},
	{
		name: "Visual Studio Code",
		description: "Editor used every day",
		tags: ["Software", "Development"],
		order: 1,
	},
	{
		name: "Raycast",
		description: "Launcher and command runner",
		tags: ["Software", "Productivity"],
		order: 2,
	},
];

describe("filterUsesItems", () => {
	it("applies match-any tag filtering", () => {
		const result = filterUsesItems({
			items: ITEMS,
			searchQuery: "",
			selectedTagKeys: ["apple", "productivity"],
		});

		expect(result.map((item) => item.name)).toEqual(["MacBook Pro", "Raycast"]);
	});

	it("applies fuzzy search across name and description", () => {
		const result = filterUsesItems({
			items: ITEMS,
			searchQuery: "launchr",
			selectedTagKeys: [],
		});

		expect(result.map((item) => item.name)).toEqual(["Raycast"]);
	});

	it("preserves markdown order when query is empty", () => {
		const result = filterUsesItems({
			items: ITEMS,
			searchQuery: "   ",
			selectedTagKeys: ["software"],
		});

		expect(result.map((item) => item.order)).toEqual([1, 2]);
	});
});
