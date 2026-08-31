import {
	areaY,
	type ChartSvgRenderer,
	defineChart,
	dot,
	lineY,
	renderChartSvg,
} from "@tanstack/charts";
import { d3Curve } from "@tanstack/charts/d3/shape";
import { treemap } from "@tanstack/charts/hierarchy/treemap";
import { decorative } from "@tanstack/charts/mark/decorative";
import {
	angleGrid,
	focusGroupAngle,
	polar,
	radialArea,
	radialDot,
	radialGrid,
	radialLine,
} from "@tanstack/charts/polar";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { tooltip } from "@tanstack/charts/tooltip";
import { curveLinearClosed, curveMonotoneX } from "d3-shape";
import { useMemo } from "react";

import { formatPercentLabel } from "@/lib/format";

import "./DitherCharts.styles.css";

type ConcertHistoryDatum = {
	year: number;
	firstTime: number;
	returning: number;
	showCount: number;
};

type DitherRadarDatum = {
	name: string;
	share: number;
};

export type DitherTreemapDatum = {
	name: string;
	plays: number;
	share: number;
};

const createGradientRenderer =
	(definitions: string): ChartSvgRenderer =>
	(scene, options) =>
		renderChartSvg(scene, options).replace(
			/(<svg\b[^>]*>)/,
			`$1<defs aria-hidden="true">${definitions}</defs>`,
		);

const toSvgIdSegment = (value: string): string =>
	value
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, "-")
		.replaceAll(/(^-|-$)/g, "");

const CONCERT_NEW_GRADIENT_ID = "kpm-concert-new-gradient";
const CONCERT_RETURNING_GRADIENT_ID = "kpm-concert-returning-gradient";
const CONCERT_CURVE = d3Curve(curveMonotoneX);
const renderConcertChartSvg = createGradientRenderer(`
	<linearGradient id="${CONCERT_NEW_GRADIENT_ID}" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0%" stop-color="var(--color-ui-3)" stop-opacity="0.88"/>
		<stop offset="62%" stop-color="var(--color-ui-3)" stop-opacity="0.72"/>
		<stop offset="100%" stop-color="var(--color-ui-2)" stop-opacity="0.48"/>
	</linearGradient>
	<linearGradient id="${CONCERT_RETURNING_GRADIENT_ID}" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0%" stop-color="var(--color-ui-1)" stop-opacity="0.78"/>
		<stop offset="64%" stop-color="var(--color-ui-1)" stop-opacity="0.58"/>
		<stop offset="100%" stop-color="var(--color-bg-1)" stop-opacity="0.08"/>
	</linearGradient>`);

const TREEMAP_GRADIENTS = {
	primary: "kpm-treemap-gradient-primary",
	secondary: "kpm-treemap-gradient-secondary",
	tertiary: "kpm-treemap-gradient-tertiary",
} as const;
const renderTreemapChartSvg = createGradientRenderer(`
	<linearGradient id="${TREEMAP_GRADIENTS.primary}" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0%" stop-color="var(--color-ui-3)"/>
		<stop offset="100%" stop-color="color-mix(in srgb, var(--color-ui-3) 72%, var(--color-bg-1))"/>
	</linearGradient>
	<linearGradient id="${TREEMAP_GRADIENTS.secondary}" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0%" stop-color="var(--color-ui-2)"/>
		<stop offset="100%" stop-color="color-mix(in srgb, var(--color-ui-2) 72%, var(--color-bg-1))"/>
	</linearGradient>
	<linearGradient id="${TREEMAP_GRADIENTS.tertiary}" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0%" stop-color="var(--color-ui-1)"/>
		<stop offset="100%" stop-color="color-mix(in srgb, var(--color-ui-1) 72%, var(--color-bg-1))"/>
	</linearGradient>`);

const CHART_THEME = {
	background: "transparent",
	foreground: "var(--color-text-1)",
	grid: "color-mix(in srgb, var(--color-text-1) 11%, transparent)",
	muted: "var(--color-text-3)",
} as const;

const compactGenreLabel = (value: string): string => {
	const label = value.trim();
	return label.length > 15 ? `${label.slice(0, 14)}…` : label;
};

const isConcertHistoryDatum = (value: unknown): value is ConcertHistoryDatum =>
	typeof value === "object" &&
	value !== null &&
	"showCount" in value &&
	"year" in value;

export const DitherConcertHistoryChart = ({
	data,
	height = 300,
}: {
	data: ReadonlyArray<ConcertHistoryDatum>;
	height?: number;
}) => {
	const definition = useMemo(() => {
		const years = data.map((entry) => entry.year);
		const plottedData = data.map((entry) => ({
			...entry,
			artistTotal: entry.firstTime + entry.returning,
		}));
		const maxValue = Math.max(
			1,
			...plottedData.map((entry) =>
				Math.max(entry.showCount, entry.artistTotal),
			),
		);
		const yMax = Math.max(2, Math.ceil(maxValue * 1.2));
		const latestDatum = plottedData.at(-1);

		return defineChart({
			marks: [
				decorative(
					areaY(plottedData, {
						x: "year",
						y1: 0,
						y2: "firstTime",
						fill: `url(#${CONCERT_NEW_GRADIENT_ID})`,
						fillOpacity: 1,
						curve: CONCERT_CURVE,
						motion: false,
					}),
				),
				decorative(
					areaY(plottedData, {
						x: "year",
						y1: "firstTime",
						y2: "artistTotal",
						fill: `url(#${CONCERT_RETURNING_GRADIENT_ID})`,
						fillOpacity: 1,
						curve: CONCERT_CURVE,
						motion: false,
					}),
				),
				decorative(
					lineY(plottedData, {
						x: "year",
						y: "firstTime",
						stroke: "var(--color-text-2)",
						strokeDasharray: "4 4",
						strokeOpacity: 0.9,
						strokeWidth: 1,
						points: false,
						curve: CONCERT_CURVE,
						motion: false,
					}),
				),
				lineY(plottedData, {
					x: "year",
					y: "showCount",
					z: () => "Shows",
					stroke: "var(--color-text-1)",
					strokeWidth: 2,
					points: false,
					curve: CONCERT_CURVE,
					motion: false,
				}),
				...(latestDatum
					? [
							decorative(
								dot([latestDatum], {
									x: "year",
									y: "showCount",
									r: 4,
									fill: "var(--color-bg-1)",
									stroke: "var(--color-text-1)",
									strokeWidth: 2,
									motion: false,
								}),
							),
						]
					: []),
			],
			scales: {
				x: {
					scale: scalePoint<number>().domain(years).padding(0.03),
					axis: {
						line: false,
						ticks: { size: 0, padding: 10 },
						tickLabels: {
							fontSize: 12,
							opacity: 0.92,
							thin: { priority: "ends" },
						},
					},
				},
				y: {
					scale: scaleLinear().domain([0, yMax]).nice(),
					grid: true,
					axis: {
						line: false,
						ticks: { count: 4, size: 0, padding: 9 },
						tickLabels: { fontSize: 12, opacity: 0.88 },
					},
				},
			},
			clip: true,
			margin: { top: 38, right: 10, bottom: 38, left: 38 },
			focus: "group-x",
			maxFocusDistance: Number.POSITIVE_INFINITY,
			theme: CHART_THEME,
			tooltip: {
				use: tooltip,
				className: "dither-chart-tooltip",
				content: (points) => {
					const datum = points.find((point) =>
						isConcertHistoryDatum(point.datum),
					)?.datum;
					return {
						title: String(datum?.year ?? points[0]?.xValue ?? ""),
						rows: [
							{
								label: "Shows",
								value: String(datum?.showCount ?? 0),
							},
							{
								label: "New artists",
								value: String(datum?.firstTime ?? 0),
							},
							{
								label: "Returning artists",
								value: String(datum?.returning ?? 0),
							},
						],
					};
				},
			},
		});
	}, [data]);

	return (
		<div className="dither-chart-concerts-wrap">
			<ul className="dither-chart-legend" aria-label="Concert chart legend">
				<li>
					<span
						className="dither-chart-legend-swatch dither-chart-legend-swatch-new"
						aria-hidden="true"
					/>
					New artists
				</li>
				<li>
					<span
						className="dither-chart-legend-swatch dither-chart-legend-swatch-returning"
						aria-hidden="true"
					/>
					Returning
				</li>
				<li>
					<span
						className="dither-chart-legend-swatch dither-chart-legend-swatch-shows"
						aria-hidden="true"
					/>
					Shows
				</li>
			</ul>
			<Chart
				definition={definition}
				height={height}
				initialWidth={720}
				ariaLabel="Shows per year"
				ariaDescription="Layered gradient areas show artists first seen that year and artists seen in a prior year. A line shows the number of concerts. Focus a year for its show, new artist, and returning artist counts."
				className="dither-chart dither-chart-concerts"
				idPrefix="concert-history"
				renderSvg={renderConcertChartSvg}
			/>
		</div>
	);
};

export const DitherRadarChart = ({
	data,
	height = 240,
	ariaLabel,
}: {
	data: ReadonlyArray<DitherRadarDatum>;
	height?: number;
	ariaLabel: string;
}) => {
	const gradientId = `kpm-radar-gradient-${toSvgIdSegment(ariaLabel)}`;
	const renderSvg = useMemo(
		() =>
			createGradientRenderer(`
				<radialGradient id="${gradientId}" cx="50%" cy="42%" r="68%">
					<stop offset="0%" stop-color="var(--color-ui-3)" stop-opacity="0.58"/>
					<stop offset="62%" stop-color="var(--color-ui-2)" stop-opacity="0.36"/>
					<stop offset="100%" stop-color="var(--color-ui-1)" stop-opacity="0.1"/>
				</radialGradient>`),
		[gradientId],
	);
	const definition = useMemo(() => {
		const maxShare = Math.max(1, ...data.map((entry) => entry.share));
		const names = data.map((entry) => entry.name);
		const gridValues = [0.25, 0.5, 0.75, 1].map((ratio) => maxShare * ratio);

		return defineChart({
			marks: [
				polar({
					radiusRatio: 0.62,
					scales: {
						angle: {
							scale: scalePoint<string>().domain(names),
							wrap: true,
						},
						radius: {
							scale: scaleLinear().domain([0, maxShare]),
						},
					},
					guides: [
						radialGrid({
							values: gridValues,
							shape: "polygon",
							stroke: "var(--color-text-2)",
							strokeOpacity: 0.7,
							strokeWidth: 1,
							strokeDasharray: "2 3",
						}),
						angleGrid({
							labels: true,
							format: (value) => compactGenreLabel(String(value)),
							labelFill: "var(--color-text-1)",
							labelFontSize: 12,
							labelOffset: 13,
							stroke: "var(--color-text-2)",
							strokeOpacity: 0.52,
							strokeWidth: 1,
							strokeDasharray: "2 4",
						}),
					],
					marks: [
						radialArea(data, {
							angle: "name",
							radius: "share",
							curve: curveLinearClosed,
							fill: `url(#${gradientId})`,
							stroke: "var(--color-text-1)",
							strokeOpacity: 0.78,
							strokeWidth: 1,
							motion: false,
						}),
						radialLine(data, {
							angle: "name",
							radius: "share",
							curve: curveLinearClosed,
							stroke: "var(--color-text-1)",
							strokeWidth: 1.5,
							motion: false,
						}),
						radialDot(data, {
							angle: "name",
							radius: "share",
							r: 2.25,
							fill: "var(--color-bg-1)",
							stroke: "var(--color-text-1)",
							strokeWidth: 1,
							motion: false,
						}),
					],
				}),
			],
			scales: { x: null, y: null },
			guides: false,
			margin: 2,
			theme: CHART_THEME,
			focus: focusGroupAngle,
			tooltip: {
				use: tooltip,
				className: "dither-chart-tooltip",
				format: (point) =>
					`${point.datum.name}\n${formatPercentLabel(point.datum.share)}`,
			},
		});
	}, [data, gradientId]);

	return (
		<Chart
			definition={definition}
			height={height}
			initialWidth={420}
			ariaLabel={ariaLabel}
			ariaDescription="A monochrome gradient radar chart showing the relative share of each genre."
			className="dither-chart"
			idPrefix="genre-radar"
			renderSvg={renderSvg}
		/>
	);
};

export const DitherTreemapChart = ({
	data,
	height = 220,
}: {
	data: ReadonlyArray<DitherTreemapDatum>;
	height?: number;
}) => {
	const definition = useMemo(
		() =>
			defineChart({
				marks: [
					treemap(data, {
						path: "name",
						value: "plays",
						ratio: 4 / 3,
						round: true,
						paddingInner: 2,
						fill: (node) => {
							const rank = node.sourceIndexes[0] ?? 0;
							const gradient =
								rank === 0
									? TREEMAP_GRADIENTS.primary
									: rank < 2
										? TREEMAP_GRADIENTS.secondary
										: TREEMAP_GRADIENTS.tertiary;
							return `url(#${gradient})`;
						},
						stroke: "var(--color-bg-1)",
						strokeOpacity: 0.9,
						strokeWidth: 1,
						radius: 0,
						label: (node) => (node.external ? node.name : null),
						labelFill: "var(--color-text-1)",
						labelFontSize: 10,
						labelFontWeight: 650,
						labelPadding: 4,
						motion: false,
					}),
				],
				scales: { x: null, y: null },
				guides: false,
				margin: 0,
				theme: CHART_THEME,
				tooltip: {
					use: tooltip,
					className: "dither-chart-tooltip",
					format: (point) => {
						const item = point.datum.data;
						if (!item) return point.datum.name;
						return `${item.name}\n${item.plays.toLocaleString("en-US")} plays · ${formatPercentLabel(item.share, { invalidLabel: "<1%" })}`;
					},
				},
			}),
		[data],
	);

	return (
		<Chart
			definition={definition}
			height={height}
			initialWidth={720}
			ariaLabel="Top artists by plays"
			ariaDescription="A monochrome gradient treemap where larger cells represent more artist plays."
			className="dither-chart"
			idPrefix="listening-artist-treemap"
			renderSvg={renderTreemapChartSvg}
		/>
	);
};
