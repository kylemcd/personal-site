import type { CSSProperties } from "react";

import { fnv1a32 } from "@/lib/hash";
import type { UseItem } from "@/lib/uses";

type TagOption = {
	key: string;
	label: string;
};

type TagPillStyle = CSSProperties &
	Record<
		| "--tag-hue"
		| "--tag-sat"
		| "--tag-light"
		| "--tag-border-sat"
		| "--tag-border-light"
		| "--tag-light-sat"
		| "--tag-light-bg"
		| "--tag-light-border-sat"
		| "--tag-light-border",
		string
	>;

export const buildTagOptions = (items: ReadonlyArray<UseItem>): TagOption[] => {
	const optionMap = new Map<string, string>();

	for (const item of items) {
		for (const tag of item.tags) {
			const label = tag.trim();
			if (!label) {
				continue;
			}

			const key = label.toLowerCase();
			if (!optionMap.has(key)) {
				optionMap.set(key, label);
			}
		}
	}

	return Array.from(optionMap.entries())
		.map(([key, label]) => ({ key, label }))
		.sort((a, b) => a.label.localeCompare(b.label));
};

export const buildTagPillStyles = (
	tagOptions: ReadonlyArray<TagOption>,
): ReadonlyMap<string, TagPillStyle> => {
	const circularHueDistance = (a: number, b: number): number => {
		const diff = Math.abs(a - b);
		return Math.min(diff, 360 - diff);
	};

	const usedHues: number[] = [];
	const styleMap = new Map<string, TagPillStyle>();

	tagOptions.forEach((tag) => {
		const hash = fnv1a32(tag.key);
		let hue = hash % 360;
		let attempts = 0;

		// Nudge hue by golden-angle increments until it is distinct enough
		// from hues already assigned in this markdown-derived tag list.
		while (
			usedHues.some((usedHue) => circularHueDistance(usedHue, hue) < 20) &&
			attempts < 24
		) {
			hue = (hue + 137.508) % 360;
			attempts += 1;
		}

		usedHues.push(hue);

		const satOffset = (hash >>> 4) % 3;
		const lightOffset = (hash >>> 7) % 2;

		styleMap.set(tag.key, {
			"--tag-hue": `${hue.toFixed(2)}deg`,
			"--tag-sat": `${38 + satOffset * 6}%`,
			"--tag-light": `${28 + lightOffset * 4}%`,
			"--tag-border-sat": `${54 + satOffset * 5}%`,
			"--tag-border-light": `${48 + lightOffset * 4}%`,
			"--tag-light-sat": `${48 + satOffset * 4}%`,
			"--tag-light-bg": `${74 + lightOffset * 3}%`,
			"--tag-light-border-sat": `${58 + satOffset * 4}%`,
			"--tag-light-border": `${52 + lightOffset * 4}%`,
		});
	});

	return styleMap;
};

export const selectedTagSummary = (
	selectedTagKeys: ReadonlyArray<string>,
	tagOptions: ReadonlyArray<TagOption>,
): string => {
	if (selectedTagKeys.length === 0) {
		return "All tags";
	}

	if (selectedTagKeys.length === 1) {
		const selected = tagOptions.find((tag) => tag.key === selectedTagKeys[0]);
		return selected?.label ?? "1 selected";
	}

	return `${selectedTagKeys.length} selected`;
};
