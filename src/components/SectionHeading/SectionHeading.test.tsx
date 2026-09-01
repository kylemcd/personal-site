// @vitest-environment jsdom

import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomepageSectionHeading, PageSectionHeading } from "./SectionHeading";

afterEach(cleanup);

describe("HomepageSectionHeading", () => {
	it.each([
		["Writing", "/posts"],
		["Racing", "/racing"],
		["Listening", "/listening"],
		["Concerts", "/concerts"],
		["Reading", "/reading"],
	] as const)("gives %s an accessible heading and link", (title, href) => {
		const { getByRole } = render(
			<HomepageSectionHeading title={title} href={href} />,
		);
		const heading = getByRole("heading", { level: 2, name: title });
		const link = within(heading).getByRole("link", { name: title });

		expect(link.getAttribute("href")).toBe(href);
		expect(link.querySelector(".section-wordmark-label")?.textContent).toBe(
			title,
		);
		expect(
			link.querySelector(".section-wordmark")?.getAttribute("aria-hidden"),
		).toBe("true");
		expect(
			link.querySelector(".section-heading-icon")?.getAttribute("aria-hidden"),
		).toBe("true");
		link.focus();
		expect(document.activeElement).toBe(link);
	});
});

describe("PageSectionHeading", () => {
	it.each([
		["Writing", "writing.svg"],
		["Racing", "racing.svg"],
		["Listening", "listening.svg"],
		["Concerts", "concerts.svg"],
		["Reading", "reading.svg"],
	] as const)(
		"renders %s as a named page heading with its wordmark",
		(title, asset) => {
			const { getByRole } = render(<PageSectionHeading title={title} />);
			const heading = getByRole("heading", { level: 1, name: title });
			const wordmark = heading.querySelector(".section-wordmark");

			expect(wordmark?.getAttribute("aria-hidden")).toBe("true");
			expect(wordmark?.getAttribute("style")).toContain(
				`/images/section-wordmarks/${asset}`,
			);
			expect(
				heading.querySelector(".section-wordmark-label")?.textContent,
			).toBe(title);
			expect(within(heading).queryByRole("link")).toBeNull();
			expect(heading.querySelector(".section-heading-icon")).toBeNull();
		},
	);
});
