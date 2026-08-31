const FONT_STYLE_MARKER = 'data-kpm-track-map-font="inter"';
const SVG_START_PATTERN = /<svg\b[^>]*>/i;
const TEXT_ELEMENT_PATTERN = /<text\b/i;

const embedTrackMapFont = (svg, fontData) => {
	if (!TEXT_ELEMENT_PATTERN.test(svg) || svg.includes(FONT_STYLE_MARKER)) {
		return svg;
	}

	const svgStart = SVG_START_PATTERN.exec(svg);
	if (!svgStart) {
		throw new Error(
			"Track-map turn layer does not contain an SVG root element.",
		);
	}

	const fontBase64 = Buffer.from(fontData).toString("base64");
	const style = `
  <style ${FONT_STYLE_MARKER}>
    @font-face {
      font-family: "KPM Track Map Inter";
      src: url("data:font/woff;base64,${fontBase64}") format("woff");
      font-style: normal;
      font-weight: 500;
    }
    text, tspan {
      font-family: "KPM Track Map Inter", sans-serif !important;
      font-style: normal !important;
      font-variant-numeric: tabular-nums;
      font-weight: 500 !important;
    }
  </style>`;
	const insertionIndex = svgStart.index + svgStart[0].length;

	return `${svg.slice(0, insertionIndex)}${style}${svg.slice(insertionIndex)}`;
};

export { embedTrackMapFont };
