// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TableOfContents } from "./TableOfContents";

const frames = new Map<number, FrameRequestCallback>();
const disconnect = vi.fn();
let nextFrame = 0;

beforeEach(() => {
	frames.clear();
	nextFrame = 0;
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
		frames.set(++nextFrame, callback);
		return nextFrame;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe = vi.fn();
			disconnect = disconnect;
		},
	);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	disconnect.mockClear();
});

const renderContents = () =>
	render(
		<div className="page-container">
			<div className="post-container">
				<h2 id="intro">Introduction</h2>
				<TableOfContents
					items={[{ id: "intro", text: "Intro", level: 2, children: [] }]}
				/>
			</div>
		</div>,
	);

describe("TableOfContents", () => {
	it("cancels pending hover measurements when unmounted", () => {
		const { container, unmount } = renderContents();
		const contents = container.querySelector(".table-of-contents-container");
		if (!contents) throw new Error("Missing contents menu");
		fireEvent.mouseEnter(contents);
		expect(frames.size).toBeGreaterThan(0);
		unmount();
		expect(frames.size).toBe(0);
		expect(disconnect).toHaveBeenCalledOnce();
	});

	it.each([true, false])(
		"respects reduced motion (%s) when navigating",
		(reducedMotion) => {
			vi.stubGlobal("matchMedia", () => ({ matches: reducedMotion }));
			renderContents();
			const heading = screen.getByRole("heading", { name: "Introduction" });
			const scrollIntoView = vi.fn();
			heading.scrollIntoView = scrollIntoView;
			fireEvent.click(screen.getByRole("link", { name: "Intro" }));
			expect(scrollIntoView).toHaveBeenCalledWith({
				behavior: reducedMotion ? "instant" : "smooth",
			});
		},
	);
});
