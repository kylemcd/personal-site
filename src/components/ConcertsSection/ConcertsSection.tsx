import {
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
} from "recharts";

import { SectionStatRow } from "@/components/SectionStatRow";
import { StatBarList, type StatBarListRow } from "@/components/StatBarList";
import { Text } from "@/components/Text";
import type { ConcertsData } from "@/lib/setlistfm";

import "./ConcertsSection.styles.css";

type ConcertsSectionProps = {
	concerts: ConcertsData;
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

function ConcertsSection({ concerts }: ConcertsSectionProps) {
	const hasShows = concerts.totalShows > 0;
	const topArtistMaxCount = concerts.topArtists[0]?.count ?? 1;
	const topSongMaxCount = concerts.topSongs[0]?.count ?? 1;
	const topGenres = concerts.topGenres ?? [];
	const hasGenres = topGenres.length > 2;

	const artistRows: Array<StatBarListRow> = concerts.topArtists.map(
		(artist) => ({
			key: `${artist.mbid ?? artist.name}-${artist.count}`,
			title: artist.name,
			subtitleRight: `${artist.count} ${artist.count === 1 ? "show" : "shows"}`,
			percent: (artist.count / topArtistMaxCount) * 100,
			percentLabel: String(artist.count),
		}),
	);

	const songRows: Array<StatBarListRow> = concerts.topSongs.map(
		(song, index) => ({
			key: `${song.artist}-${song.name}-${index}`,
			title: song.name,
			subtitleRight: song.artist,
			percent: (song.count / topSongMaxCount) * 100,
			percentLabel: `${song.count} ${song.count === 1 ? "play" : "plays"}`,
		}),
	);

	return (
		<div className="concerts-section">
			<div className="concerts-section-top">
				<Text as="h2" size="2" className="concerts-section-title">
					Concerts
				</Text>
				<Text
					as="p"
					size="0"
					color="2"
					family="mono"
					className="concerts-section-window"
				>
					attended
				</Text>
			</div>

			{!hasShows ? (
				<Text as="p" size="1" color="2">
					No attended shows yet.
				</Text>
			) : (
				<>
					<SectionStatRow
						className="concerts-section-kpis"
						items={[
							{
								key: "shows",
								label: (
									<Text
										as="p"
										size="0"
										color="2"
										className="concerts-kpi-label"
									>
										Total shows
									</Text>
								),
								value: (
									<Text
										as="p"
										size="6"
										family="mono"
										className="concerts-kpi-value"
									>
										{concerts.totalShows}
									</Text>
								),
							},
							{
								key: "artists",
								label: (
									<Text
										as="p"
										size="0"
										color="2"
										className="concerts-kpi-label"
									>
										Unique artists
									</Text>
								),
								value: (
									<Text
										as="p"
										size="6"
										family="mono"
										className="concerts-kpi-value"
									>
										{concerts.uniqueArtists}
									</Text>
								),
							},
						]}
					/>

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
											stroke="var(--color-listening-blue)"
											fill="var(--color-listening-blue)"
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

					{concerts.recentShows.length > 0 ? (
						<div className="concerts-list-panel">
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

					<div className="concerts-lists-grid">
						{artistRows.length > 0 ? (
							<div className="concerts-list-panel">
								<div className="concerts-list-head">
									<Text as="p" size="0" color="2">
										Most seen artists
									</Text>
								</div>
								<StatBarList
									rows={artistRows}
									barColor="var(--color-listening-blue)"
									percentColor="var(--color-listening-blue)"
									variant="listening"
									className="concerts-list-rows"
								/>
							</div>
						) : null}

						{songRows.length > 0 ? (
							<div className="concerts-list-panel">
								<div className="concerts-list-head">
									<Text as="p" size="0" color="2">
										Most heard songs
									</Text>
								</div>
								<StatBarList
									rows={songRows}
									barColor="var(--color-listening-blue)"
									percentColor="var(--color-listening-blue)"
									variant="listening"
									className="concerts-list-rows"
								/>
							</div>
						) : null}
					</div>
				</>
			)}
		</div>
	);
}

export { ConcertsSection };
