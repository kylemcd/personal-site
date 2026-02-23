import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { Text } from "@/components/Text";
import type { Garage61Summary } from "@/lib/garage61/schema";

import "./Garage61.styles.css";

type Garage61Props = {
	overview: Garage61Summary["derived"]["overview"];
};

const formatDuration = (seconds: number) => {
	if (seconds <= 0) return "0m";
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.round((seconds % 3600) / 60);
	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

const formatLapTime = (seconds: number) => {
	const minutes = Math.floor(seconds / 60);
	const remainder = seconds - minutes * 60;
	return `${minutes}:${remainder.toFixed(3).padStart(6, "0")}`;
};

const clampPercent = (value: number | null) => {
	if (value === null) return 0;
	return Math.max(0, Math.min(100, value));
};

function Garage61({ overview }: Garage61Props) {
	const hasRecent =
		overview.recentTracks.length > 0 || overview.recentCars.length > 0;
	if (!hasRecent && overview.totalTimeOnTrackSeconds <= 0) return null;

	return (
		<div className="g61-racing">
			<div className="g61-racing-list-block">
				<Text as="h2" size="2" className="g61-racing-header">
					Racing
				</Text>
				<div className="g61-racing-list g61-racing-insights">
					<div className="g61-racing-row">
						<div className="g61-racing-row-content">
							<div className="g61-racing-meta">
								<Text
									as="p"
									size="1"
									className="g61-racing-track g61-racing-kpi-label"
								>
									Time on track
								</Text>
								<Text as="p" size="3" className="g61-racing-kpi-value">
									{formatDuration(overview.totalTimeOnTrackSeconds)}
								</Text>
								<Text
									as="p"
									size="0"
									color="2"
									className="g61-racing-description"
								>
									Total driving time in {overview.windowLabel.toLowerCase()}
								</Text>
							</div>
						</div>
					</div>

					<div className="g61-racing-row">
						<div className="g61-racing-row-content">
							<div className="g61-racing-meta">
								<Text
									as="p"
									size="1"
									className="g61-racing-track g61-racing-kpi-label"
								>
									Clean lap percentage
								</Text>
								<Text as="p" size="3" className="g61-racing-kpi-value">
									{overview.cleanLapPercentage !== null
										? `${overview.cleanLapPercentage}%`
										: "n/a"}
								</Text>
								<div className="g61-racing-meter">
									<div
										className="g61-racing-meter-fill"
										style={{
											width: `${clampPercent(overview.cleanLapPercentage)}%`,
										}}
									/>
								</div>
								<Text
									as="p"
									size="0"
									color="2"
									className="g61-racing-description"
								>
									Percentage of laps without an incident
								</Text>
							</div>
						</div>
					</div>

					{overview.insights.cleanestCombo && (
						<div className="g61-racing-row">
							<div className="g61-racing-row-content">
								<div className="g61-racing-meta">
									<Text
										as="p"
										size="1"
										className="g61-racing-track g61-racing-kpi-label"
									>
										Cleanest combo
									</Text>
									<Text as="p" size="3" className="g61-racing-kpi-value">
										{overview.insights.cleanestCombo.cleanPercentage}%
									</Text>
									<div className="g61-racing-meter">
										<div
											className="g61-racing-meter-fill"
											style={{
												width: `${clampPercent(overview.insights.cleanestCombo.cleanPercentage)}%`,
											}}
										/>
									</div>
									<div className="g61-racing-combo-container">
										<Text
											as="p"
											size="0"
											color="2"
											className="g61-racing-description g61-racing-combo"
										>
											{overview.insights.cleanestCombo.track}
										</Text>
										<Text
											as="p"
											size="0"
											color="2"
											className="g61-racing-description g61-racing-combo"
										>
											{overview.insights.cleanestCombo.car}
										</Text>
									</div>
								</div>
							</div>
						</div>
					)}

					{overview.insights.secondsOffRecord && (
						<div className="g61-racing-row">
							<div className="g61-racing-row-content">
								<div className="g61-racing-meta">
									<Text
										as="p"
										size="1"
										className="g61-racing-track g61-racing-kpi-label"
									>
										Me vs Friends
									</Text>
									<Text as="p" size="3" className="g61-racing-kpi-value">
										{overview.insights.secondsOffRecord.onlyMyLaps
											? "Fastest so far"
											: overview.insights.secondsOffRecord.isFastestInTeam
												? "P1 in team"
												: `+${overview.insights.secondsOffRecord.secondsOffRecord.toFixed(3)}s`}
									</Text>
									<div>
										<Text
											as="p"
											size="0"
											color="2"
											className="g61-racing-description g61-racing-combo"
										>
											{overview.insights.secondsOffRecord.track}
										</Text>
										<Text
											as="p"
											size="0"
											color="2"
											className="g61-racing-description g61-racing-combo"
										>
											{overview.insights.secondsOffRecord.car}
										</Text>
									</div>
								</div>
							</div>
						</div>
					)}

					{overview.insights.paceLadder.length > 0 && (
						<div className="g61-racing-row">
							<div className="g61-racing-row-content">
								<div className="g61-racing-meta">
									<Text
										as="p"
										size="1"
										className="g61-racing-track g61-racing-kpi-label"
									>
										Pace ladder
									</Text>
									<div className="g61-racing-ladder">
										{overview.insights.paceLadder.map((item, index) => (
											<div
												className="g61-racing-ladder-row"
												key={`pace-${item.track}-${index}`}
											>
												<Text
													as="p"
													size="0"
													color="2"
													className="g61-racing-ladder-track"
												>
													{item.track}
												</Text>
												<Text
													as="p"
													size="0"
													className="g61-racing-ladder-time"
												>
													{formatLapTime(item.avgLapSeconds)}
												</Text>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					)}

					{overview.insights.trackConfidence.length > 0 && (
						<div className="g61-racing-row">
							<div className="g61-racing-row-content">
								<div className="g61-racing-meta">
									<Text
										as="p"
										size="1"
										className="g61-racing-track g61-racing-kpi-label"
									>
										Cleanest tracks
									</Text>
									<div className="g61-racing-ladder">
										{overview.insights.trackConfidence.map((track, index) => (
											<div
												className="g61-racing-ladder-row"
												key={`track-confidence-${track.track}-${index}`}
											>
												<Text
													as="p"
													size="0"
													color="2"
													className="g61-racing-ladder-track"
												>
													{track.track}
												</Text>
												<Text
													as="p"
													size="0"
													color="1"
													className="g61-racing-ladder-time"
												>
													{track.cleanPercentage === null
														? "n/a"
														: `${Math.round(track.cleanPercentage)}%`}
												</Text>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="g61-racing-recent-lists">
				<div className="g61-racing-list-block">
					<Text as="h3" size="1">
						Recent Tracks
					</Text>
					<HorizontalScrollContainer className="g61-racing-scroller">
						{overview.recentTracks.map((track) => (
							<div
								className="g61-racing-row g61-racing-square-card"
								key={`track-${track.id}`}
							>
								<div className="g61-racing-row-content">
									<div className="g61-racing-meta">
										<Text as="p" size="1" className="g61-racing-track">
											{track.name}
										</Text>
										{track.variant && (
											<Text
												as="p"
												size="0"
												color="2"
												className="g61-racing-variant"
											>
												{track.variant}
											</Text>
										)}
										<Text as="p" size="0" color="2" className="g61-racing-car">
											{formatDuration(track.timeOnTrackSeconds)}
											{track.timeSharePercentage !== null
												? ` (${track.timeSharePercentage}% of time)`
												: ""}
										</Text>
									</div>
								</div>
							</div>
						))}
					</HorizontalScrollContainer>
				</div>

				<div className="g61-racing-list-block">
					<Text as="h3" size="1">
						Recent Cars
					</Text>
					<HorizontalScrollContainer className="g61-racing-scroller">
						{overview.recentCars.map((car) => (
							<div
								className="g61-racing-row g61-racing-square-card"
								key={`car-${car.id}`}
							>
								<div className="g61-racing-row-content">
									<div className="g61-racing-meta">
										<Text as="p" size="1" className="g61-racing-track">
											{car.name}
										</Text>
										<Text as="p" size="0" color="2" className="g61-racing-car">
											{formatDuration(car.timeOnTrackSeconds)}
											{car.timeSharePercentage !== null
												? ` (${car.timeSharePercentage}% of time)`
												: ""}
										</Text>
									</div>
								</div>
							</div>
						))}
					</HorizontalScrollContainer>
				</div>
			</div>
		</div>
	);
}

export { Garage61 };
