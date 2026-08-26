import { SectionStatRow } from "@/components/SectionStatRow";
import { StatBarList, type StatBarListRow } from "@/components/StatBarList";
import { Text } from "@/components/Text";
import { clampPercent, formatDuration, formatPercentLabel } from "@/lib/format";
import type { Garage61Summary } from "@/lib/garage61/schema";

import "./Garage61.styles.css";

type Garage61Props = {
	overview: Garage61Summary["derived"]["overview"];
	titleHref?: string;
	recentLayout?: "scroll" | "stack";
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

function Garage61({ overview, titleHref }: Garage61Props) {
	const sessionTimeBreakdown = overview.insights.sessionTimeBreakdown;
	const hasRecent =
		overview.recentTracks.length > 0 || overview.recentCars.length > 0;
	const shouldRender = hasRecent || overview.totalTimeOnTrackSeconds > 0;

	const cleanestTracks = [...overview.insights.trackConfidence]
		.sort((a, b) => (b.cleanPercentage ?? -1) - (a.cleanPercentage ?? -1))
		.slice(0, 5);
	const recentTracks = overview.recentTracks.slice(0, 5);
	const recentCars = overview.recentCars.slice(0, 5);

	if (!shouldRender) return null;

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
		percent: clampPercent(track.timeSharePercentage ?? 0),
		percentLabel: formatPercentLabel(track.timeSharePercentage),
	}));
	const recentCarRows: Array<StatBarListRow> = recentCars.map((car) => ({
		key: `car-${car.id}-${car.name}`,
		title: car.name,
		subtitleRight: formatDuration(car.timeOnTrackSeconds),
		percent: clampPercent(car.timeSharePercentage ?? 0),
		percentLabel: formatPercentLabel(car.timeSharePercentage),
	}));

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

				<div className="g61-racing-recent-card">
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
					/>
				</div>
			</div>
		</div>
	);
}

export { Garage61 };
