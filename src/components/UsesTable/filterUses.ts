import { matchSorter } from "match-sorter";

import type { UseItem } from "@/lib/uses";

type FilterUsesItemsArgs = {
	items: ReadonlyArray<UseItem>;
	searchQuery: string;
	selectedTagKeys: ReadonlyArray<string>;
};

export const filterUsesItems = ({
	items,
	searchQuery,
	selectedTagKeys,
}: FilterUsesItemsArgs): UseItem[] => {
	const normalizedTagKeys = selectedTagKeys
		.map((tagKey) => tagKey.trim().toLowerCase())
		.filter(Boolean);
	const tagKeySet = new Set(normalizedTagKeys);

	const tagFilteredItems =
		tagKeySet.size > 0
			? items.filter((item) =>
					item.tags.some((tag) => tagKeySet.has(tag.toLowerCase())),
				)
			: [...items];

	const normalizedQuery = searchQuery.trim();
	if (!normalizedQuery) {
		return tagFilteredItems;
	}

	return matchSorter(tagFilteredItems, normalizedQuery, {
		keys: ["name", "description"],
	});
};
