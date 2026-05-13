import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

import { Text } from "@/components/Text";
import type { ConcertsData } from "@/lib/setlistfm";

import "./ConcertsSection.styles.css";

type ConcertsSectionProps = {
	concerts: ConcertsData;
	titleHref?: string;
};

const formatShowDate = (dateIso: string): string => {
	const date = new Date(dateIso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
};

const MONTH_NAMES = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatShowsCount = (count: number): string =>
	`${count} ${count === 1 ? "show" : "shows"}`;

const formatBiggestMonthSubline = (
	value: { year: number; month: number } | null,
): string =>
	value ? `${MONTH_NAMES[value.month - 1]} ${value.year}` : "";

const formatBiggestWeekSubline = (
	value: { weekStartIso: string } | null,
): string => {
	if (!value) return "";
	const start = new Date(value.weekStartIso);
	if (Number.isNaN(start.getTime())) return "";
	const end = new Date(start);
	end.setUTCDate(end.getUTCDate() + 6);
	const sameMonth = start.getUTCMonth() === end.getUTCMonth();
	const startLabel = start.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
	const endLabel = end.toLocaleDateString("en-US", {
		month: sameMonth ? undefined : "short",
		day: "numeric",
		timeZone: "UTC",
	});
	const year = end.getUTCFullYear();
	return `${startLabel}–${endLabel}, ${year}`;
};

const formatGapDays = (days: number | null): string =>
	days === null ? "—" : `${days} ${days === 1 ? "day" : "days"}`;

const formatAvgLength = (avg: number): string =>
	avg > 0 ? `${avg.toFixed(1)} songs` : "—";

type YearlyTooltipDatum = {
	year: number;
	firstTime: number;
	returning: number;
	showCount: number;
};

const renderYearlyTooltip = ({
	active,
	payload,
}: {
	active?: boolean;
	payload?: ReadonlyArray<{ payload?: YearlyTooltipDatum }>;
}) => {
	if (!active || !payload?.length) return null;
	const data = payload[0]?.payload;
	if (!data) return null;
	return (
		<div className="concerts-yearly-tooltip">
			<div className="concerts-yearly-tooltip-year">{data.year}</div>
			<div className="concerts-yearly-tooltip-rows">
				<div className="concerts-yearly-tooltip-row">
					<span className="concerts-yearly-tooltip-swatch concerts-yearly-tooltip-swatch-line" />
					<span className="concerts-yearly-tooltip-label">Shows</span>
					<span className="concerts-yearly-tooltip-value">{data.showCount}</span>
				</div>
				<div className="concerts-yearly-tooltip-row">
					<span
						className="concerts-yearly-tooltip-swatch"
						style={{
							background:
								"color-mix(in srgb, var(--color-concert-orange) 30%, transparent)",
							border: "1px solid var(--color-concert-orange)",
						}}
					/>
					<span className="concerts-yearly-tooltip-label">Repeat artists</span>
					<span className="concerts-yearly-tooltip-value">{data.returning}</span>
				</div>
				<div className="concerts-yearly-tooltip-row">
					<span
						className="concerts-yearly-tooltip-swatch"
						style={{ background: "var(--color-concert-orange)" }}
					/>
					<span className="concerts-yearly-tooltip-label">New artists</span>
					<span className="concerts-yearly-tooltip-value">{data.firstTime}</span>
				</div>
			</div>
		</div>
	);
};

const CURRENT_YEAR = new Date().getUTCFullYear();

/**
 * SVG diagonal-stripe patterns embedded once per chart via <defs>. We use them
 * on the current year's bars to signal that the data is in-progress / partial.
 * Pattern IDs are namespaced per chart because recharts mounts each SVG
 * separately and ids need to be unique within a document.
 */
const incompletePatternDefs = (idPrefix: string) => (
	<defs>
		<pattern
			id={`${idPrefix}-incomplete-overlay`}
			patternUnits="userSpaceOnUse"
			width="6"
			height="6"
			patternTransform="rotate(45)"
		>
			<line
				x1="0"
				y1="0"
				x2="0"
				y2="6"
				stroke="#000"
				strokeOpacity="0.4"
				strokeWidth="1.5"
			/>
		</pattern>
	</defs>
);

type BarShapeProps = {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	payload?: { year?: number };
};

const renderFirstTimeBarShape = (props: BarShapeProps) => {
	const { x = 0, y = 0, width = 0, height = 0, payload } = props;
	const w = Math.max(0, width);
	const h = Math.max(0, height);
	const isCurrent = payload?.year === CURRENT_YEAR;
	return (
		<g>
			<rect
				x={x}
				y={y}
				width={w}
				height={h}
				fill="var(--color-concert-orange)"
			/>
			{isCurrent ? (
				<rect
					x={x}
					y={y}
					width={w}
					height={h}
					fill="url(#yearly-composed-incomplete-overlay)"
				/>
			) : null}
		</g>
	);
};

const renderReturningBarShape = (props: BarShapeProps) => {
	const { x = 0, y = 0, width = 0, height = 0, payload } = props;
	const isCurrent = payload?.year === CURRENT_YEAR;
	const insetWidth = Math.max(0, width - 1);
	const insetHeight = Math.max(0, height - 1);
	return (
		<g>
			<rect
				x={x + 0.5}
				y={y + 0.5}
				width={insetWidth}
				height={insetHeight}
				fill="var(--color-concert-orange)"
				fillOpacity={0.3}
				stroke="var(--color-concert-orange)"
				strokeWidth={1}
			/>
			{isCurrent ? (
				<rect
					x={x + 0.5}
					y={y + 0.5}
					width={insetWidth}
					height={insetHeight}
					fill="url(#yearly-composed-incomplete-overlay)"
				/>
			) : null}
		</g>
	);
};

type RadarTickProps = {
	x?: number | string;
	y?: number | string;
	textAnchor?: string;
	payload?: { value?: string };
};

const splitGenreLabel = (value: string): [string, string?] => {
	const label = value.trim();
	const maxSingleLine = 12;
	if (label.length <= maxSingleLine) return [label];
	const words = label.split(/\s+/).filter(Boolean);
	if (words.length <= 1) {
		const midpoint = Math.ceil(label.length / 2);
		return [label.slice(0, midpoint), label.slice(midpoint)];
	}
	let bestIndex = 1;
	let bestDelta = Number.POSITIVE_INFINITY;
	for (let index = 1; index < words.length; index += 1) {
		const left = words.slice(0, index).join(" ");
		const right = words.slice(index).join(" ");
		const delta = Math.abs(left.length - right.length);
		if (delta < bestDelta) {
			bestDelta = delta;
			bestIndex = index;
		}
	}
	return [
		words.slice(0, bestIndex).join(" "),
		words.slice(bestIndex).join(" "),
	];
};

const renderGenreAxisTick = ({
	x,
	y,
	textAnchor,
	payload,
}: RadarTickProps) => {
	const rawValue = payload?.value ?? "";
	const fullLabel = String(rawValue);
	const [lineOne, lineTwo] = splitGenreLabel(fullLabel);
	const tickX =
		typeof x === "number"
			? x
			: typeof x === "string"
				? Number.parseFloat(x)
				: Number.NaN;
	const tickY =
		typeof y === "number"
			? y
			: typeof y === "string"
				? Number.parseFloat(y)
				: Number.NaN;
	if (!Number.isFinite(tickX) || !Number.isFinite(tickY)) return null;
	const safeTextAnchor: "start" | "middle" | "end" | "inherit" =
		textAnchor === "start" ||
		textAnchor === "middle" ||
		textAnchor === "end" ||
		textAnchor === "inherit"
			? textAnchor
			: "middle";
	return (
		<text
			x={tickX}
			y={tickY}
			textAnchor={safeTextAnchor}
			fill="var(--color-text-2)"
			fontSize={11}
			fontFamily="var(--font-family-mono)"
			dominantBaseline="middle"
		>
			<tspan x={tickX} dy={lineTwo ? "-0.35em" : "0"}>
				{lineOne}
			</tspan>
			{lineTwo ? (
				<tspan x={tickX} dy="1.15em">
					{lineTwo}
				</tspan>
			) : null}
		</text>
	);
};

function ConcertsSection({ concerts, titleHref }: ConcertsSectionProps) {
	const hasShows = concerts.totalShows > 0;
	const topGenres = concerts.topGenres ?? [];
	const hasGenres = topGenres.length > 2;

	const showsByYearMap = new Map(
		concerts.showsByYear.map((entry) => [entry.year, entry.showCount]),
	);
	const yearlyArtists = concerts.firstTimeByYear.map((entry) => ({
		year: entry.year,
		firstTime: entry.firstTime,
		returning: entry.returning,
		showCount: showsByYearMap.get(entry.year) ?? 0,
	}));

	const artistRows = concerts.topArtists.map((artist) => ({
		key: `${artist.mbid ?? artist.name}-${artist.count}`,
		title: artist.name,
		count: `${artist.count} ${artist.count === 1 ? "show" : "shows"}`,
	}));

	const songRows = concerts.topSongs.map((song, index) => ({
		key: `${song.artist}-${song.name}-${index}`,
		title: song.name,
		count: `${song.artist} · ${song.count} ${song.count === 1 ? "play" : "plays"}`,
	}));

	return (
		<div className="concerts-section">
			<div className="concerts-section-top">
				<Text as="h2" size="2" className="concerts-section-title">
					{titleHref ? (
						<a className="section-heading-link" href={titleHref}>
							<span className="section-heading-label">Concerts</span>
							<i
								className="hn hn-angle-right section-heading-icon"
								aria-hidden="true"
							/>
						</a>
					) : (
						"Concerts"
					)}
				</Text>
				<Text
					as="p"
					size="0"
					color="2"
					family="mono"
					className="concerts-section-window"
				>
					{concerts.firstShowYear
						? `since ${concerts.firstShowYear}`
						: "attended"}
				</Text>
			</div>

			{!hasShows ? (
				<Text as="p" size="1" color="2">
					No attended shows yet.
				</Text>
			) : (
				<>
					<div className="concerts-kpi-grid">
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Total shows
							</Text>
							<Text as="p" size="3" family="mono" className="concerts-kpi-value">
								{concerts.totalShows}
							</Text>
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Unique artists
							</Text>
							<Text as="p" size="3" family="mono" className="concerts-kpi-value">
								{concerts.uniqueArtists}
							</Text>
						</div>
						{concerts.setlistStats.averageLength > 0 ? (
							<div className="section-stat-item">
								<Text as="p" size="0" color="2" className="concerts-kpi-label">
									Avg setlist
								</Text>
								<Text as="p" size="3" family="mono" className="concerts-kpi-value">
									{formatAvgLength(concerts.setlistStats.averageLength)}
								</Text>
							</div>
						) : null}
						{concerts.setlistStats.longestSetlist ? (
							<div className="section-stat-item">
								<Text as="p" size="0" color="2" className="concerts-kpi-label">
									Longest setlist
								</Text>
								<Text as="p" size="3" family="mono" className="concerts-kpi-value">
									{`${concerts.setlistStats.longestSetlist.songCount} songs`}
								</Text>
								<Text as="p" size="0" color="2" className="concerts-kpi-subline">
									{concerts.setlistStats.longestSetlist.artist}
								</Text>
							</div>
						) : null}
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Songs heard
							</Text>
							<Text as="p" size="3" family="mono" className="concerts-kpi-value">
								{concerts.showsByYear
									.reduce((sum, y) => sum + y.totalSongs, 0)
									.toLocaleString("en-US")}
							</Text>
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Avg between
							</Text>
							<Text as="p" size="3" family="mono" className="concerts-kpi-value">
								{formatGapDays(concerts.records.avgDaysBetweenShows)}
							</Text>
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Busiest month
							</Text>
							<Text as="p" size="3" family="mono" className="concerts-kpi-value">
								{concerts.records.biggestMonth
									? formatShowsCount(concerts.records.biggestMonth.count)
									: "—"}
							</Text>
							{concerts.records.biggestMonth ? (
								<Text as="p" size="0" color="2" className="concerts-kpi-subline">
									{formatBiggestMonthSubline(concerts.records.biggestMonth)}
								</Text>
							) : null}
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Busiest week
							</Text>
							<Text as="p" size="3" family="mono" className="concerts-kpi-value">
								{concerts.records.biggestWeek
									? formatShowsCount(concerts.records.biggestWeek.count)
									: "—"}
							</Text>
							{concerts.records.biggestWeek ? (
								<Text as="p" size="0" color="2" className="concerts-kpi-subline">
									{formatBiggestWeekSubline(concerts.records.biggestWeek)}
								</Text>
							) : null}
						</div>
					</div>

					<div className="concerts-charts-grid">
						{yearlyArtists.length > 0 ? (
							<div className="concerts-list-panel">
								<div className="concerts-list-head">
									<Text as="p" size="0" color="2">
										Shows per year
									</Text>
								</div>
								<div className="concerts-bar-chart">
									<ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={1}>
										<ComposedChart
											data={yearlyArtists}
											margin={{ top: 12, right: 4, bottom: 0, left: 0 }}
										>
											{incompletePatternDefs("yearly-composed")}
											<CartesianGrid
												stroke="var(--color-ui-2)"
												strokeOpacity={0.4}
												vertical={false}
											/>
											<XAxis
												dataKey="year"
												stroke="var(--color-text-2)"
												tickLine={false}
												axisLine={false}
												tick={{ fontSize: 11, fontFamily: "var(--font-family-mono)" }}
											/>
											<YAxis
												yAxisId="artists"
												width={28}
												stroke="var(--color-text-2)"
												tickLine={false}
												axisLine={false}
												allowDecimals={false}
												tickMargin={2}
												tick={{ fontSize: 11, fontFamily: "var(--font-family-mono)" }}
											/>
											<YAxis
												yAxisId="shows"
												orientation="right"
												width={24}
												stroke="var(--color-text-2)"
												tickLine={false}
												axisLine={false}
												allowDecimals={false}
												tickMargin={2}
												tick={{ fontSize: 11, fontFamily: "var(--font-family-mono)" }}
											/>
											<Tooltip
												cursor={{ fill: "var(--color-ui-1)", opacity: 0.4 }}
												content={renderYearlyTooltip}
											/>
											<Bar
												yAxisId="artists"
												dataKey="firstTime"
												stackId="artists"
												shape={renderFirstTimeBarShape}
												isAnimationActive={false}
											/>
											<Bar
												yAxisId="artists"
												dataKey="returning"
												stackId="artists"
												shape={renderReturningBarShape}
												isAnimationActive={false}
											/>
											<Line
												yAxisId="shows"
												type="monotone"
												dataKey="showCount"
												stroke="var(--color-text-1)"
												strokeWidth={2}
												dot={{
													fill: "var(--color-bg-1)",
													stroke: "var(--color-text-1)",
													strokeWidth: 2,
													r: 3,
												}}
												activeDot={{ r: 5 }}
												isAnimationActive={false}
											/>
										</ComposedChart>
									</ResponsiveContainer>
								</div>
							</div>
						) : null}

						{hasGenres ? (
							<div className="concerts-genre-block">
								<div className="concerts-list-head">
									<Text as="p" size="0" color="2">
										Genre breakdown
									</Text>
								</div>
								<div className="concerts-genre-radar">
									<ResponsiveContainer
										width="100%"
										height={240}
										minWidth={0}
										minHeight={1}
									>
										<RadarChart
											data={[...topGenres]}
											margin={{ top: 24, right: 36, bottom: 24, left: 36 }}
											outerRadius="68%"
										>
											<PolarGrid stroke="var(--color-ui-2)" strokeOpacity={0.6} />
											<PolarAngleAxis dataKey="name" tick={renderGenreAxisTick} />
											<PolarRadiusAxis
												axisLine={false}
												tick={false}
												tickCount={4}
												domain={[0, "dataMax"]}
											/>
											<Radar
												dataKey="share"
												stroke="var(--color-concert-orange)"
												fill="var(--color-concert-orange)"
												fillOpacity={0.24}
												strokeWidth={1.5}
												dot={false}
												activeDot={false}
											/>
										</RadarChart>
									</ResponsiveContainer>
								</div>
							</div>
						) : null}
					</div>

					<div className="concerts-lists-grid">
						{artistRows.length > 0 ? (
							<div className="concerts-list-panel">
								<div className="concerts-list-head">
									<Text as="p" size="0" color="2">
										Top artists
									</Text>
								</div>
								<ol className="concerts-ranked-list">
									{artistRows.map((row) => (
										<li key={row.key} className="concerts-ranked-row">
											<Text
												as="span"
												size="0"
												weight="500"
												className="concerts-ranked-name"
											>
												{row.title}
											</Text>
											<Text
												as="span"
												size="0"
												color="2"
												className="concerts-ranked-count"
											>
												{row.count}
											</Text>
										</li>
									))}
								</ol>
							</div>
						) : null}

						{songRows.length > 0 ? (
							<div className="concerts-list-panel">
								<div className="concerts-list-head">
									<Text as="p" size="0" color="2">
										Top songs
									</Text>
								</div>
								<ol className="concerts-ranked-list">
									{songRows.map((row) => (
										<li key={row.key} className="concerts-ranked-row">
											<Text
												as="span"
												size="0"
												weight="500"
												className="concerts-ranked-name"
											>
												{row.title}
											</Text>
											<Text
												as="span"
												size="0"
												color="2"
												className="concerts-ranked-count"
											>
												{row.count}
											</Text>
										</li>
									))}
								</ol>
							</div>
						) : null}
					</div>

					{concerts.recentShows.length > 0 ? (
						<div className="concerts-list-panel concerts-recent-panel">
							<div className="concerts-list-head">
								<Text as="p" size="0" color="2">
									Recent shows
								</Text>
							</div>
							<ul className="concerts-recent-list">
								{concerts.recentShows.map((show) => {
									const dateLabel = formatShowDate(show.dateIso);
									const venueLine = show.city
										? `${show.venue} · ${show.city}`
										: show.venue;
									return (
										<li
											key={`${show.dateIso}-${show.venue}-${show.artists[0]?.name ?? ""}`}
										>
											<div className="concerts-recent-row">
												<Text
													as="p"
													size="0"
													color="2"
													family="mono"
													className="concerts-recent-date"
												>
													{dateLabel}
												</Text>
												<div className="concerts-recent-copy">
													<Text
														as="p"
														size="1"
														weight="500"
														className="concerts-recent-artist"
													>
														{show.artists.map((artist, index) => (
															<span key={`${artist.name}-${index}`}>
																{index > 0 ? (
																	<span className="concerts-recent-separator">
																		,{" "}
																	</span>
																) : null}
																{artist.setlistUrl ? (
																	<a
																		href={artist.setlistUrl}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="concerts-recent-artist-link"
																	>
																		{artist.name}
																	</a>
																) : (
																	artist.name
																)}
															</span>
														))}
													</Text>
													<Text
														as="p"
														size="0"
														color="2"
														className="concerts-recent-venue"
													>
														{venueLine}
													</Text>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					) : null}
				</>
			)}
		</div>
	);
}

export { ConcertsSection };
