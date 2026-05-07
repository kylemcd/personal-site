// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricBar } from "./MetricBar";

describe("MetricBar", () => {
	it("clamps values and applies min visible fill", () => {
		const { container, rerender } = render(<MetricBar value={-10} />);
		let fill = container.querySelector(".metric-bar-fill") as HTMLDivElement;
		expect(fill.style.width).toBe("0%");

		rerender(<MetricBar value={0.5} />);
		fill = container.querySelector(".metric-bar-fill") as HTMLDivElement;
		expect(fill.style.width).toBe("2%");

		rerender(<MetricBar value={120} />);
		fill = container.querySelector(".metric-bar-fill") as HTMLDivElement;
		expect(fill.style.width).toBe("100%");
	});
});
