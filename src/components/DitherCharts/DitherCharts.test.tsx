import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
	DitherConcertHistoryChart,
	DitherRadarChart,
	DitherTreemapChart,
} from "./DitherCharts";

describe("DitherCharts", () => {
	it("renders the concert timeline with layered monochrome gradients", () => {
		const markup = renderToStaticMarkup(
			<DitherConcertHistoryChart
				data={[
					{ year: 2025, firstTime: 12, returning: 5, showCount: 9 },
					{ year: 2026, firstTime: 8, returning: 4, showCount: 6 },
				]}
			/>,
		);

		expect(markup).toContain("Shows per year");
		expect(markup).toContain('id="kpm-concert-new-gradient"');
		expect(markup).toContain('id="kpm-concert-returning-gradient"');
		expect(markup).toContain("url(#kpm-concert-new-gradient)");
		expect(markup).toContain("Layered gradient areas");
		expect(markup).toContain("Concert chart legend");
		expect(markup).toContain("Returning");
		expect(markup).toContain("new artist");
		expect(markup).toContain("linearGradient");
		expect(markup).not.toContain("<pattern");
		expect(markup).not.toContain("dither layers");
		expect(markup).not.toContain("--color-concert-orange");
	});

	it("renders the radar chart with a monochrome radial gradient", () => {
		const markup = renderToStaticMarkup(
			<DitherRadarChart
				data={[
					{ name: "Pop Punk", share: 48 },
					{ name: "Emo", share: 31 },
					{ name: "Rock", share: 21 },
				]}
				ariaLabel="Listening genre breakdown"
			/>,
		);

		expect(markup).toContain("Listening genre breakdown");
		expect(markup).toContain(
			'id="kpm-radar-gradient-listening-genre-breakdown"',
		);
		expect(markup).toContain(
			"url(#kpm-radar-gradient-listening-genre-breakdown)",
		);
		expect(markup).not.toContain("<pattern");
		expect(markup).not.toContain("--color-listening-blue");
	});

	it("renders treemap cells with multiple subtle gradient strengths", () => {
		const markup = renderToStaticMarkup(
			<DitherTreemapChart
				data={[
					{ name: "The Story So Far", plays: 65, share: 24 },
					{ name: "No Pressure", plays: 60, share: 22 },
					{ name: "Driveways", plays: 35, share: 13 },
				]}
			/>,
		);

		expect(markup).toContain("Top artists by plays");
		expect(markup).toContain("url(#kpm-treemap-gradient-primary)");
		expect(markup).toContain("url(#kpm-treemap-gradient-secondary)");
		expect(markup).toContain("url(#kpm-treemap-gradient-tertiary)");
		expect(markup).not.toContain("<pattern");
		expect(markup).not.toContain("--color-listening-blue");
	});
});
