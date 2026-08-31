import { describe, expect, it } from "vitest";

import { embedTrackMapFont } from "./embed-track-map-font.mjs";

const turnLayer = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
  <text style="font-family: ArialMT, Arial; font-size: 36px;"><tspan>1</tspan></text>
</svg>`;

describe("embedTrackMapFont", () => {
	it("embeds a self-contained Inter font override for turn labels", () => {
		const result = embedTrackMapFont(turnLayer, Buffer.from("font fixture"));

		expect(result).toContain('data-kpm-track-map-font="inter"');
		expect(result).toContain("data:font/woff;base64,Zm9udCBmaXh0dXJl");
		expect(result).toContain(
			'font-family: "KPM Track Map Inter", sans-serif !important;',
		);
		expect(result.indexOf("<style")).toBeLessThan(result.indexOf("<text"));
		expect(embedTrackMapFont(result, Buffer.from("font fixture"))).toBe(result);
	});

	it("leaves empty turn layers unchanged", () => {
		const emptyLayer = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

		expect(embedTrackMapFont(emptyLayer, Buffer.from("font fixture"))).toBe(
			emptyLayer,
		);
	});

	it("rejects malformed turn layers", () => {
		expect(() =>
			embedTrackMapFont("<text>1</text>", Buffer.from("font fixture")),
		).toThrow("does not contain an SVG root element");
	});
});
