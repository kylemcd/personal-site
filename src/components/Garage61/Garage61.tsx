import {
	HomepageSectionHeading,
	PageSectionHeading,
} from "@/components/SectionHeading";
import { SectionStatRow } from "@/components/SectionStatRow";
import { Text } from "@/components/Text";
import { clampPercent, formatDuration, formatPercentLabel } from "@/lib/format";
import type { Garage61Summary } from "@/lib/garage61/schema";

import { RecentCarImages } from "./RecentCarImages";
import { RecentTrackMaps } from "./RecentTrackMaps";
import "./Garage61.styles.css";

type Garage61Props = {
	overview: Garage61Summary["derived"]["overview"];
	titleHref?: string;
};

const Garage61 = ({ overview, titleHref }: Garage61Props) => {
	const sessionTimeBreakdown = overview.insights.sessionTimeBreakdown;
	const hasRecent =
		overview.recentTracks.length > 0 || overview.recentCars.length > 0;
	const shouldRender = hasRecent || overview.totalTimeOnTrackSeconds > 0;

	const recentTracks = overview.recentTracks.slice(0, 5);
	const recentCars = overview.recentCars.slice(0, 5);
	const windowLabel = overview.windowLabel.toLowerCase();

	if (!shouldRender) return null;

	return (
		<div className="g61-racing">
			{titleHref ? (
				<HomepageSectionHeading href={titleHref} title="Racing" />
			) : (
				<PageSectionHeading title="Racing" />
			)}

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
								family="tabular"
								className="g61-racing-kpi-value"
							>
								{formatDuration(overview.totalTimeOnTrackSeconds)}
							</Text>
						),
						subline: (
							<Text
								as="p"
								size="0"
								color="2"
								family="tabular"
								className="g61-racing-window"
							>
								{windowLabel.charAt(0).toUpperCase()}
								{windowLabel.slice(1)}
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
								family="tabular"
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
								family="tabular"
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
								family="tabular"
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
									<Text as="p" size="0" color="2" family="tabular">
										{sessionTimeBreakdown
											? `Practice ${formatDuration(sessionTimeBreakdown.practiceTimeOnTrackSeconds)}`
											: "Practice n/a"}
									</Text>
									<Text as="p" size="0" color="2" family="tabular">
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
				<div className="g61-racing-recent-card g61-racing-recent-tracks">
					<div className="g61-racing-table-header">
						<Text as="p" size="0" color="2">
							Recent tracks
						</Text>
					</div>
					<RecentTrackMaps tracks={recentTracks} />
				</div>

				<div className="g61-racing-recent-card g61-racing-recent-cars">
					<div className="g61-racing-table-header">
						<Text as="p" size="0" color="2">
							Recent cars
						</Text>
					</div>
					<RecentCarImages cars={recentCars} />
				</div>
			</div>
		</div>
	);
};

export { Garage61 };
