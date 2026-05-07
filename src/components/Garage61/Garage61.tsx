import { useEffect, useMemo, useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { SectionStatRow } from "@/components/SectionStatRow";
import { StatBarList, type StatBarListRow } from "@/components/StatBarList";
import { Text } from "@/components/Text";
import {
	clampPercent,
	formatDuration,
	formatLapTime,
	formatPercentLabel,
} from "@/lib/format";
import type { Garage61Summary } from "@/lib/garage61/schema";

import "./Garage61.styles.css";

type Garage61Props = {
	overview: Garage61Summary["derived"]["overview"];
	titleHref?: string;
	recentLayout?: "scroll" | "stack";
};

type ChartRow = {
	index: number;
	lapNumber: number;
	lapSeconds: number;
	isBest: boolean;
};
type ChartSession =
	Garage61Summary["derived"]["overview"]["insights"]["chart"]["sessions"][number];

type ChartDotProps = {
	cx?: number;
	cy?: number;
	payload?: ChartRow;
};

type ChartAxisTickProps = {
	y?: number | string;
	payload?: { value?: unknown };
};

type HoveredChartPoint = {
	lapLabel: string;
	lapSeconds: number;
	x: number;
	y: number;
};

const formatLapTimeTenthScale = (seconds: number) => {
	const roundedMilliseconds = Math.round(seconds * 10) * 100;
	const minutes = Math.floor(roundedMilliseconds / 60000);
	const remainderMs = roundedMilliseconds - minutes * 60000;
	const wholeSeconds = Math.floor(remainderMs / 1000);
	const milliseconds = remainderMs - wholeSeconds * 1000;
	return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}:${milliseconds.toString().padStart(3, "0")}`;
};

const getCleanLapRatio = (track: {
	cleanLaps?: number | null;
	laps: number;
	cleanPercentage: number | null;
}) => {
	const laps = Math.max(0, track.laps ?? 0);
	const cleanFromField =
		typeof track.cleanLaps === "number" && Number.isFinite(track.cleanLaps)
			? track.cleanLaps
			: null;
	const cleanFromPercentage =
		track.cleanPercentage !== null
			? Math.round((track.cleanPercentage / 100) * laps)
			: 0;
	const clean = Math.max(
		0,
		Math.min(laps, cleanFromField ?? cleanFromPercentage),
	);
	return `${clean}/${laps}`;
};

const buildChartRows = (
	lapSeries: ReadonlyArray<{ lapNumber: number; lapSeconds: number }>,
	bestLapSeconds: number,
): Array<ChartRow> =>
	lapSeries.map((lap, index) => ({
		index,
		// Normalize to an ordinal lap index so repeated/missing lap numbers
		// from upstream data do not collapse x-axis points.
		lapNumber: index + 1,
		lapSeconds: lap.lapSeconds,
		isBest: Math.abs(lap.lapSeconds - bestLapSeconds) < 0.0005,
	}));

const buildChartLapTicks = (rows: ReadonlyArray<ChartRow>) => {
	if (rows.length === 0) return [];
	const firstLap = rows[0]?.lapNumber ?? 1;
	const lastLap = rows.at(-1)?.lapNumber ?? firstLap;
	const ticks = [firstLap];
	for (let lap = 5; lap < lastLap; lap += 5) {
		if (lap > firstLap) ticks.push(lap);
	}
	if (lastLap !== firstLap && !ticks.includes(lastLap)) ticks.push(lastLap);
	return ticks;
};

const buildChartYTicks = (min: number, max: number, count = 5) => {
	const safeMin = Math.min(min, max);
	const safeMax = Math.max(min, max);
	const span = Math.max(0.001, safeMax - safeMin);
	const step = span / Math.max(1, count - 1);
	const roundedTicks = Array.from({ length: count }, (_, index) => {
		const rawTick = safeMin + step * index;
		return Math.round(rawTick * 10) / 10;
	});
	return [...new Set(roundedTicks)];
};

const quantile = (values: ReadonlyArray<number>, q: number): number => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const position = (sorted.length - 1) * q;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	if (lower === upper) return sorted[lower] ?? 0;
	const lowerValue = sorted[lower] ?? 0;
	const upperValue = sorted[upper] ?? lowerValue;
	return lowerValue + (upperValue - lowerValue) * (position - lower);
};

const removeChartOutliers = (
	rows: ReadonlyArray<ChartRow>,
): ReadonlyArray<ChartRow> => {
	if (rows.length < 8) return rows;
	const lapTimes = rows.map((row) => row.lapSeconds);
	const q1 = quantile(lapTimes, 0.25);
	const q3 = quantile(lapTimes, 0.75);
	const iqr = Math.max(0.001, q3 - q1);
	const lowerFence = q1 - iqr * 1.5;
	const upperFence = q3 + iqr * 1.5;
	const filtered = rows.filter(
		(row) => row.lapSeconds >= lowerFence && row.lapSeconds <= upperFence,
	);
	if (filtered.length < Math.max(6, Math.round(rows.length * 0.7))) return rows;
	return filtered.map((row, index) => ({
		...row,
		index,
		lapNumber: index + 1,
	}));
};

function Garage61({ overview, titleHref }: Garage61Props) {
	const sessionTimeBreakdown = overview.insights.sessionTimeBreakdown;
	const hasRecent =
		overview.recentTracks.length > 0 || overview.recentCars.length > 0;
	const shouldRender = hasRecent || overview.totalTimeOnTrackSeconds > 0;

	const fastestLaps = [...overview.insights.paceLadder]
		.sort((a, b) => a.avgLapSeconds - b.avgLapSeconds)
		.slice(0, 5);
	const cleanestTracks = [...overview.insights.trackConfidence]
		.sort((a, b) => (b.cleanPercentage ?? -1) - (a.cleanPercentage ?? -1))
		.slice(0, 5);
	const recentTracks = overview.recentTracks.slice(0, 5);
	const recentCars = overview.recentCars.slice(0, 5);
	const chartSessions = useMemo<Array<ChartSession>>(() => {
		if (overview.insights.chart.sessions.length > 0) {
			return overview.insights.chart.sessions;
		}
		const single =
			overview.insights.chart.bestSession ??
			overview.insights.chart.fallbackTrend;
		if (!single) return [];
		return [
			{
				id: single.source === "trend_fallback" ? "trend-fallback" : "session-1",
				title: `${single.track} · ${single.car}`,
				track: single.track,
				car: single.car,
				source: single.source,
				bestLapSeconds: single.bestLapSeconds,
				rangeSeconds: single.rangeSeconds,
				lapCount: single.lapCount,
				laps: single.laps,
			},
		];
	}, [overview.insights.chart]);
	const [activeChartId, setActiveChartId] = useState<string>(
		chartSessions[0]?.id ?? "",
	);
	const [hoveredPoint, setHoveredPoint] = useState<HoveredChartPoint | null>(
		null,
	);
	useEffect(() => {
		if (chartSessions.length === 0) {
			setHoveredPoint(null);
			setActiveChartId("");
			return;
		}
		const stillExists = chartSessions.some(
			(session) => session.id === activeChartId,
		);
		if (!stillExists) {
			setHoveredPoint(null);
			setActiveChartId(chartSessions[0]?.id ?? "");
		}
	}, [chartSessions, activeChartId]);

	if (!shouldRender) return null;

	const chart =
		chartSessions.find((session) => session.id === activeChartId) ??
		chartSessions[0] ??
		null;
	const chartSeries = chart?.laps ?? [];
	const chartRowsRaw = chart
		? buildChartRows(chartSeries, chart.bestLapSeconds)
		: [];
	const chartRows = removeChartOutliers(chartRowsRaw);
	const chartMin =
		chartRows.length > 0
			? Math.min(...chartRows.map((row) => row.lapSeconds))
			: null;
	const chartMax =
		chartRows.length > 0
			? Math.max(...chartRows.map((row) => row.lapSeconds))
			: null;
	const chartDomainPadding =
		chartMin !== null && chartMax !== null
			? Math.max(0.12, (chartMax - chartMin) * 0.2)
			: 0;
	const chartDomainMin =
		chartMin !== null ? chartMin - chartDomainPadding : null;
	const chartDomainMax =
		chartMax !== null ? chartMax + chartDomainPadding : null;
	const chartLapTicks = buildChartLapTicks(chartRows);
	const chartYTicks =
		chartDomainMin !== null && chartDomainMax !== null
			? buildChartYTicks(chartDomainMin, chartDomainMax)
			: [];
	const chartDisplayedSpreadSeconds =
		chartRows.length > 1
			? Math.max(...chartRows.map((row) => row.lapSeconds)) -
				Math.min(...chartRows.map((row) => row.lapSeconds))
			: (chart?.rangeSeconds ?? 0);
	const chartDisplayedLapCount =
		chartRows.length > 0 ? chartRows.length : (chart?.lapCount ?? 0);
	const chartYAxisMin =
		chartYTicks.length > 0 ? (chartYTicks[0] ?? null) : null;
	const chartYAxisMax =
		chartYTicks.length > 0 ? (chartYTicks.at(-1) ?? null) : null;
	const fastestLapLabel = chart
		? `fastest ${formatLapTime(chart.bestLapSeconds)}`
		: "";
	const cleanestTrackRows: Array<StatBarListRow> = cleanestTracks.map(
		(track) => ({
			key: `clean-${track.track}`,
			title: track.track,
			subtitleRight: `${getCleanLapRatio(track)} laps`,
			percent: clampPercent(track.cleanPercentage),
			percentLabel: formatPercentLabel(track.cleanPercentage),
		}),
	);
	const recentTrackRows: Array<StatBarListRow> = recentTracks.map((track) => ({
		key: `track-${track.id}-${track.name}`,
		title: track.name,
		subtitleRight: formatDuration(track.timeOnTrackSeconds),
		percent: clampPercent(track.lapSharePercentage ?? 0),
		percentLabel: formatPercentLabel(track.lapSharePercentage),
	}));
	const recentCarRows: Array<StatBarListRow> = recentCars.map((car) => ({
		key: `car-${car.id}-${car.name}`,
		title: car.name,
		subtitleRight: formatDuration(car.timeOnTrackSeconds),
		percent: clampPercent(car.lapSharePercentage ?? 0),
		percentLabel: formatPercentLabel(car.lapSharePercentage),
	}));
	const renderChartYAxisTick = ({ y, payload }: ChartAxisTickProps) => {
		const value = payload?.value;
		const numericValue =
			typeof value === "number"
				? value
				: typeof value === "string"
					? Number.parseFloat(value)
					: Number.NaN;
		const parsedY =
			typeof y === "number"
				? y
				: typeof y === "string"
					? Number.parseFloat(y)
					: Number.NaN;
		if (!Number.isFinite(numericValue) || !Number.isFinite(parsedY))
			return null;
		return (
			<text
				x={0}
				y={parsedY}
				fill="var(--color-text-2)"
				fontSize={11}
				fontFamily="var(--font-family-mono)"
				textAnchor="start"
				dominantBaseline="middle"
			>
				{formatLapTimeTenthScale(numericValue)}
			</text>
		);
	};
	const renderChartDot = ({ cx, cy, payload }: ChartDotProps) => {
		if (typeof cx !== "number" || typeof cy !== "number" || !payload) {
			return null;
		}
		const lapLabel = `L${payload.lapNumber}`;
		const isHovered = hoveredPoint?.lapLabel === lapLabel;
		const onEnter = () =>
			setHoveredPoint({
				lapLabel,
				lapSeconds: payload.lapSeconds,
				x: cx,
				y: cy,
			});
		const onLeave = () => setHoveredPoint(null);
		if (payload.isBest) {
			const labelPadX = 6;
			const labelHeight = 16;
			const approxCharWidth = 6.4;
			const labelWidth =
				Math.ceil(fastestLapLabel.length * approxCharWidth) + labelPadX * 2;
			const placeLabelLeft =
				payload.lapNumber / Math.max(1, chartRows.length) > 0.72;
			const labelY = Math.max(12, cy - 10);
			const labelX = placeLabelLeft ? cx - (labelWidth + 14) : cx + 14;
			const labelTextX = placeLabelLeft
				? labelX + labelWidth - labelPadX
				: labelX + labelPadX;
			const labelTextAnchor = placeLabelLeft ? "end" : "start";
			return (
				/* biome-ignore lint/a11y/noStaticElementInteractions: Recharts custom SVG dots use group hover handlers for chart tooltip behavior. */
				<g onMouseEnter={onEnter} onMouseLeave={onLeave}>
					<circle cx={cx} cy={cy} r={11} fill="transparent" stroke="none" />
					<circle
						cx={cx}
						cy={cy}
						r={isHovered ? 8 : 7}
						fill="var(--color-racing-red)"
						stroke="var(--color-racing-red)"
						className="g61-racing-chart-dot-active"
					/>
					<rect
						x={labelX}
						y={labelY - labelHeight / 2}
						width={labelWidth}
						height={labelHeight}
						fill="var(--color-racing-red)"
					/>
					<text
						x={labelTextX}
						y={labelY}
						fill="#ffffff"
						fontFamily="var(--font-family-mono)"
						fontSize={11}
						textAnchor={labelTextAnchor}
						dominantBaseline="middle"
					>
						{fastestLapLabel}
					</text>
					<text
						x={cx}
						y={cy - 12}
						fill="var(--color-racing-red)"
						fontFamily="var(--font-family-mono)"
						fontSize={10}
						textAnchor="middle"
					>
						{lapLabel}
					</text>
				</g>
			);
		}
		return (
			/* biome-ignore lint/a11y/noStaticElementInteractions: Recharts custom SVG dots use group hover handlers for chart tooltip behavior. */
			<g onMouseEnter={onEnter} onMouseLeave={onLeave}>
				<circle cx={cx} cy={cy} r={9} fill="transparent" stroke="none" />
				<circle
					cx={cx}
					cy={cy}
					r={isHovered ? 4.6 : 3.5}
					className="g61-racing-chart-dot"
				/>
			</g>
		);
	};
	return (
		<div className="g61-racing">
			<div className="g61-racing-top">
				<Text as="h2" size="2" className="g61-racing-title">
					{titleHref ? (
						<a className="section-heading-link" href={titleHref}>
							<span className="section-heading-label">Racing</span>
							<i
								className="hn hn-angle-right section-heading-icon"
								aria-hidden="true"
							/>
						</a>
					) : (
						"Racing"
					)}
				</Text>
				<Text
					as="p"
					size="0"
					color="2"
					family="mono"
					className="g61-racing-window"
				>
					{overview.windowLabel.toLowerCase()}
				</Text>
			</div>

			<SectionStatRow
				className="g61-racing-kpis"
				items={[
					{
						key: "time-on-track",
						label: (
							<Text as="p" size="0" color="2" className="g61-racing-kpi-label">
								Time on track
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="mono"
								className="g61-racing-kpi-value g61-racing-kpi-time-value"
							>
								{formatDuration(overview.totalTimeOnTrackSeconds)}
							</Text>
						),
					},
					{
						key: "clean-laps",
						label: (
							<Text as="p" size="0" color="2" className="g61-racing-kpi-label">
								Clean laps
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="mono"
								className="g61-racing-kpi-value"
							>
								{formatPercentLabel(overview.cleanLapPercentage)}
							</Text>
						),
						subline: (
							<Text
								as="p"
								size="0"
								color="2"
								className="g61-racing-kpi-subline"
							>
								Incident-free
							</Text>
						),
					},
					{
						key: "cleanest-combo",
						label: (
							<Text as="p" size="0" color="2" className="g61-racing-kpi-label">
								Cleanest combo
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="mono"
								className="g61-racing-kpi-value"
							>
								{overview.insights.cleanestCombo
									? formatPercentLabel(
											overview.insights.cleanestCombo.cleanPercentage,
										)
									: "n/a"}
							</Text>
						),
						subline: overview.insights.cleanestCombo ? (
							<div className="g61-racing-kpi-stack">
								<Text as="p" size="0" color="2">
									{overview.insights.cleanestCombo.track}
								</Text>
								<Text as="p" size="0" color="2">
									{overview.insights.cleanestCombo.car}
								</Text>
							</div>
						) : undefined,
					},
					{
						key: "seat-balance",
						label: (
							<Text as="p" size="0" color="2" className="g61-racing-kpi-label">
								Seat balance
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="mono"
								className="g61-racing-kpi-value"
							>
								{sessionTimeBreakdown
									? formatPercentLabel(sessionTimeBreakdown.practicePercentage)
									: "n/a"}
							</Text>
						),
						subline: (
							<>
								<div className="g61-racing-balance-bar" aria-hidden="true">
									<div
										className="g61-racing-balance-practice"
										style={{
											width: `${clampPercent(sessionTimeBreakdown?.practicePercentage ?? 0)}%`,
										}}
									/>
									<div
										className="g61-racing-balance-racing"
										style={{
											width: `${clampPercent(sessionTimeBreakdown?.racingPercentage ?? 0)}%`,
										}}
									/>
								</div>
								<div className="g61-racing-balance-labels">
									<Text as="p" size="0" color="2" family="mono">
										{sessionTimeBreakdown
											? `Practice ${formatDuration(sessionTimeBreakdown.practiceTimeOnTrackSeconds)}`
											: "Practice n/a"}
									</Text>
									<Text
										as="p"
										size="0"
										family="mono"
										className="g61-racing-red"
									>
										{sessionTimeBreakdown
											? `Racing ${formatDuration(sessionTimeBreakdown.racingTimeOnTrackSeconds)}`
											: "Racing n/a"}
									</Text>
								</div>
							</>
						),
					},
				]}
			/>

			<div className="g61-racing-chart-card">
				<div className="g61-racing-chart-head">
					<div>
						<Text
							as="p"
							size="1"
							weight="500"
							className="g61-racing-chart-combo"
						>
							{chart ? chart.track : "No recent lap series"}
						</Text>
						{chart && (
							<Text
								as="p"
								size="0"
								color="2"
								className="g61-racing-chart-subline"
							>
								{chart.car}
							</Text>
						)}
					</div>
					{chart && (
						<div className="g61-racing-chart-side">
							{chartSessions.length > 1 && (
								<div className="g61-racing-chart-tabs" role="tablist">
									{chartSessions.map((session, index) => (
										<button
											key={session.id}
											type="button"
											role="tab"
											aria-selected={session.id === activeChartId}
											className={`g61-racing-chart-tab${session.id === activeChartId ? " is-active" : ""}`}
											onClick={() => {
												setHoveredPoint(null);
												setActiveChartId(session.id);
											}}
										>
											{`S${index + 1}`}
										</button>
									))}
								</div>
							)}
							<Text
								as="p"
								size="0"
								color="2"
								family="mono"
								className="g61-racing-chart-meta"
							>
								Best{" "}
								<span className="g61-racing-red">
									{formatLapTime(chart.bestLapSeconds)}
								</span>{" "}
								· Spread {chartDisplayedSpreadSeconds.toFixed(2)}s ·{" "}
								{chartDisplayedLapCount} laps
							</Text>
						</div>
					)}
				</div>
				{chart &&
				chartRows.length > 1 &&
				chartMin !== null &&
				chartMax !== null ? (
					<div
						className="g61-racing-chart"
						role="img"
						aria-label="Racing lap time trend chart"
					>
						{hoveredPoint && (
							<div
								className="g61-racing-chart-tooltip g61-racing-chart-point-tooltip"
								style={{
									left: `${hoveredPoint.x + 8}px`,
									top: `${hoveredPoint.y - 22}px`,
								}}
							>
								<span className="g61-racing-chart-tooltip-lap">
									{hoveredPoint.lapLabel}
								</span>
								<span className="g61-racing-chart-tooltip-time">
									{formatLapTime(hoveredPoint.lapSeconds)}
								</span>
							</div>
						)}
						<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
							<LineChart
								data={chartRows}
								margin={{ top: 18, right: 16, left: 0, bottom: 34 }}
							>
								<CartesianGrid
									strokeDasharray="2 6"
									stroke="var(--color-text-2)"
									strokeOpacity={0.26}
									strokeWidth={1}
									className="g61-racing-recharts-grid"
									vertical={false}
								/>
								<XAxis
									dataKey="lapNumber"
									ticks={chartLapTicks}
									interval={0}
									tickFormatter={(value) => `L${value}`}
									tick={{
										fill: "var(--color-text-2)",
										fontSize: 11,
										fontFamily: "var(--font-family-mono)",
									}}
									axisLine={false}
									tickLine={false}
									tickMargin={16}
									padding={{ left: 2, right: 2 }}
								/>
								<YAxis
									type="number"
									domain={[chartYAxisMin ?? 0, chartYAxisMax ?? 0]}
									ticks={chartYTicks}
									tick={renderChartYAxisTick}
									reversed
									axisLine={false}
									tickLine={false}
									width={62}
									tickMargin={6}
								/>
								<ReferenceLine
									y={chart.bestLapSeconds}
									className="g61-racing-recharts-ref"
								/>
								<Line
									type="linear"
									dataKey="lapSeconds"
									stroke="var(--color-text-3)"
									strokeWidth={1.5}
									dot={renderChartDot}
									activeDot={false}
									isAnimationActive={false}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				) : (
					<Text
						as="p"
						size="0"
						color="2"
						family="mono"
						className="g61-racing-empty"
					>
						Not enough lap data for chart rendering yet.
					</Text>
				)}
			</div>

			<div className="g61-racing-tables">
				<div className="g61-racing-table-card">
					<div className="g61-racing-table-header">
						<Text as="p" size="0" color="2">
							Fastest laps
						</Text>
						<Text as="p" size="0" color="2" family="mono">
							Time
						</Text>
					</div>
					<div className="g61-racing-table-rows">
						{fastestLaps.map((item) => {
							return (
								<div
									className="g61-racing-table-row"
									key={`fast-${item.track}-${item.car}`}
								>
									<div className="g61-racing-table-left g61-racing-table-left-no-rank">
										<div>
											<Text as="p" size="0" weight="500">
												{item.track}
											</Text>
											<Text as="p" size="0" color="2" family="mono">
												{item.car}
											</Text>
										</div>
									</div>
									<div className="g61-racing-table-right">
										<Text
											as="p"
											size="0"
											family="mono"
											className="g61-racing-metric-primary"
										>
											{formatLapTime(item.avgLapSeconds)}
										</Text>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="g61-racing-table-card">
					<div className="g61-racing-table-header">
						<Text as="p" size="0" color="2">
							Cleanest tracks
						</Text>
					</div>
					<StatBarList
						rows={cleanestTrackRows}
						barColor="var(--color-racing-red)"
						percentColor="var(--color-racing-red)"
						variant="racing"
						className="g61-racing-table-rows"
					/>
				</div>
			</div>

			<div className="g61-racing-recent-lists">
				<div className="g61-racing-recent-card">
					<div className="g61-racing-table-header">
						<Text as="p" size="0" color="2">
							Recent tracks
						</Text>
					</div>
					<StatBarList
						rows={recentTrackRows}
						barColor="var(--color-racing-red)"
						percentColor="var(--color-racing-red)"
						variant="racing"
					/>
				</div>

				<div className="g61-racing-recent-card">
					<div className="g61-racing-table-header">
						<Text as="p" size="0" color="2">
							Recent cars
						</Text>
					</div>
					<StatBarList
						rows={recentCarRows}
						barColor="var(--color-racing-red)"
						percentColor="var(--color-racing-red)"
						variant="racing"
					/>
				</div>
			</div>
		</div>
	);
}

export { Garage61 };
