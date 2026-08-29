import {
	DitherConcertHistoryChart,
	DitherRadarChart,
} from "@/components/DitherCharts";
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
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

const formatShowsCount = (count: number): string =>
	`${count} ${count === 1 ? "show" : "shows"}`;

const formatBiggestMonthSubline = (
	value: { year: number; month: number } | null,
): string => (value ? `${MONTH_NAMES[value.month - 1]} ${value.year}` : "");

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
							<Text
								as="p"
								size="3"
								family="mono"
								className="concerts-kpi-value"
							>
								{concerts.totalShows}
							</Text>
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Unique artists
							</Text>
							<Text
								as="p"
								size="3"
								family="mono"
								className="concerts-kpi-value"
							>
								{concerts.uniqueArtists}
							</Text>
						</div>
						{concerts.setlistStats.averageLength > 0 ? (
							<div className="section-stat-item">
								<Text as="p" size="0" color="2" className="concerts-kpi-label">
									Avg setlist
								</Text>
								<Text
									as="p"
									size="3"
									family="mono"
									className="concerts-kpi-value"
								>
									{formatAvgLength(concerts.setlistStats.averageLength)}
								</Text>
							</div>
						) : null}
						{concerts.setlistStats.longestSetlist ? (
							<div className="section-stat-item">
								<Text as="p" size="0" color="2" className="concerts-kpi-label">
									Longest setlist
								</Text>
								<Text
									as="p"
									size="3"
									family="mono"
									className="concerts-kpi-value"
								>
									{`${concerts.setlistStats.longestSetlist.songCount} songs`}
								</Text>
								<Text
									as="p"
									size="0"
									color="2"
									className="concerts-kpi-subline"
								>
									{concerts.setlistStats.longestSetlist.artist}
								</Text>
							</div>
						) : null}
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Songs heard
							</Text>
							<Text
								as="p"
								size="3"
								family="mono"
								className="concerts-kpi-value"
							>
								{concerts.showsByYear
									.reduce((sum, y) => sum + y.totalSongs, 0)
									.toLocaleString("en-US")}
							</Text>
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Avg between
							</Text>
							<Text
								as="p"
								size="3"
								family="mono"
								className="concerts-kpi-value"
							>
								{formatGapDays(concerts.records.avgDaysBetweenShows)}
							</Text>
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Busiest month
							</Text>
							<Text
								as="p"
								size="3"
								family="mono"
								className="concerts-kpi-value"
							>
								{concerts.records.biggestMonth
									? formatShowsCount(concerts.records.biggestMonth.count)
									: "—"}
							</Text>
							{concerts.records.biggestMonth ? (
								<Text
									as="p"
									size="0"
									color="2"
									className="concerts-kpi-subline"
								>
									{formatBiggestMonthSubline(concerts.records.biggestMonth)}
								</Text>
							) : null}
						</div>
						<div className="section-stat-item">
							<Text as="p" size="0" color="2" className="concerts-kpi-label">
								Busiest week
							</Text>
							<Text
								as="p"
								size="3"
								family="mono"
								className="concerts-kpi-value"
							>
								{concerts.records.biggestWeek
									? formatShowsCount(concerts.records.biggestWeek.count)
									: "—"}
							</Text>
							{concerts.records.biggestWeek ? (
								<Text
									as="p"
									size="0"
									color="2"
									className="concerts-kpi-subline"
								>
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
									<DitherConcertHistoryChart data={yearlyArtists} />
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
									<DitherRadarChart
										data={topGenres}
										ariaLabel="Concert genre breakdown"
									/>
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
															<span key={`${artist.name}-${artist.setlistUrl}`}>
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
