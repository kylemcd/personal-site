// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UseItem } from "@/lib/uses";

import { UsesTable } from "./UsesTable";

const ITEMS: UseItem[] = [
	{
		name: "MacBook Pro",
		description: "Main laptop for development",
		tags: ["Hardware", "Apple"],
		link: "https://www.apple.com/macbook-pro/",
		order: 0,
	},
];

afterEach(() => {
	vi.restoreAllMocks();
});

describe("UsesTable", () => {
	it("renders rows and shows empty state when search has no matches", () => {
		render(<UsesTable items={ITEMS} />);

		expect(screen.getByText("MacBook Pro")).not.toBeNull();

		const input = screen.getByPlaceholderText("Search name or description");
		fireEvent.change(input, { target: { value: "no-match-term" } });

		expect(
			screen.getByText("No matches for your current filters."),
		).not.toBeNull();
	});

	it("renders a link for linked rows with correct href and target", () => {
		render(<UsesTable items={ITEMS} />);

		const link = screen.getByRole("link", { name: "Open MacBook Pro" });

		expect(link).not.toBeNull();
		expect(link.getAttribute("href")).toBe("https://www.apple.com/macbook-pro/");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});
});
