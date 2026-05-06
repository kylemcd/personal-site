// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Garage61Summary } from "@/lib/garage61/schema";

import { Garage61 } from "./Garage61";

const buildOverview = (): Garage61Summary["derived"]["overview"] => ({
	windowLabel: "Last 30 Days",
	totalTimeOnTrackSeconds: 36000,
	totalLapsDriven: 120,
	totalCleanLapsDriven: 102,
	cleanLapPercentage: 85,
	recentTracks: [
		{
			id: 1,
			name: "Long Beach Street Circuit",
			variant: null,
			timeOnTrackSeconds: 7200,
			timeSharePercentage: 20,
			lapsDriven: 30,
			lapSharePercentage: 25,
		},
	],
	recentCars: [
		{
			id: 2,
			name: "Porsche 911 Cup",
			timeOnTrackSeconds: 9000,
			timeSharePercentage: 25,
			lapsDriven: 36,
			lapSharePercentage: 30,
		},
	],
	insights: {
		chart: {
			sessions: [
				{
					id: "session-1",
					title: "Long Beach Street Circuit · Porsche 911 Cup",
					track: "Long Beach Street Circuit",
					car: "Porsche 911 Cup",
					source: "session_laps",
					bestLapSeconds: 73.89,
					rangeSeconds: 2.95,
					lapCount: 5,
					laps: [
						{ lapNumber: 1, lapSeconds: 74.2 },
						{ lapNumber: 2, lapSeconds: 73.89 },
						{ lapNumber: 3, lapSeconds: 74.6 },
						{ lapNumber: 4, lapSeconds: 74.4 },
						{ lapNumber: 5, lapSeconds: 74.9 },
					],
				},
			],
			bestSession: {
				track: "Long Beach Street Circuit",
				car: "Porsche 911 Cup",
				source: "session_laps",
				bestLapSeconds: 73.89,
				rangeSeconds: 2.95,
				lapCount: 5,
				laps: [
					{ lapNumber: 1, lapSeconds: 74.2 },
					{ lapNumber: 2, lapSeconds: 73.89 },
					{ lapNumber: 3, lapSeconds: 74.6 },
					{ lapNumber: 4, lapSeconds: 74.4 },
					{ lapNumber: 5, lapSeconds: 74.9 },
				],
			},
			fallbackTrend: null,
		},
		sessionTimeBreakdown: {
			practiceTimeOnTrackSeconds: 14000,
			racingTimeOnTrackSeconds: 22000,
			practicePercentage: 39,
			racingPercentage: 61,
		},
		secondsOffRecord: null,
		cleanestCombo: {
			track: "Long Beach Street Circuit",
			car: "Porsche 911 Cup",
			cleanPercentage: 97,
			cleanLaps: 24,
			totalLaps: 25,
		},
		paceLadder: [
			{
				track: "Long Beach Street Circuit",
				car: "Porsche 911 Cup",
				avgLapSeconds: 73.89,
				laps: 25,
			},
		],
		trackConfidence: [
			{
				track: "Long Beach Street Circuit",
				laps: 25,
				cleanLaps: 24,
				cleanPercentage: 96,
				avgLapSeconds: 74.2,
			},
		],
	},
});

describe("Garage61", () => {
	it("renders full dashboard sections with best-session chart data", () => {
		render(<Garage61 overview={buildOverview()} />);

		expect(screen.getByText("Racing")).not.toBeNull();
		expect(screen.queryByText("Session trends")).toBeNull();
		expect(screen.getByText("Fastest laps")).not.toBeNull();
		expect(screen.getByText("Cleanest tracks")).not.toBeNull();
		expect(screen.getByText("Recent tracks")).not.toBeNull();
		expect(screen.getByText("Recent cars")).not.toBeNull();
		expect(screen.getByLabelText("Racing lap time trend chart")).not.toBeNull();
	});

	it("renders fallback empty-state copy when chart has insufficient lap points", () => {
		const overview = buildOverview();
		overview.insights.chart.sessions = [
			{
				id: "trend-fallback",
				title: "Trend fallback",
				track: "Fallback Track",
				car: "Fallback Car",
				source: "trend_fallback",
				bestLapSeconds: 75,
				rangeSeconds: 0,
				lapCount: 1,
				laps: [{ lapNumber: 1, lapSeconds: 75 }],
			},
		];
		overview.insights.chart.bestSession = null;
		overview.insights.chart.fallbackTrend = {
			track: "Fallback Track",
			car: "Fallback Car",
			source: "trend_fallback",
			bestLapSeconds: 75,
			rangeSeconds: 0,
			lapCount: 1,
			laps: [{ lapNumber: 1, lapSeconds: 75 }],
		};

		render(<Garage61 overview={overview} />);

		expect(
			screen.getByText("Not enough lap data for chart rendering yet."),
		).not.toBeNull();
	});

	it("uses outlier-filtered laps for displayed spread and lap count", () => {
		const overview = buildOverview();
		overview.insights.chart.sessions = [
			{
				id: "session-outlier",
				title: "Outlier Session",
				track: "Autodromo Hermanos Rodriguez",
				car: "Porsche 911 Cup",
				source: "session_laps",
				bestLapSeconds: 79.9,
				rangeSeconds: 142.1,
				lapCount: 8,
				laps: [
					{ lapNumber: 1, lapSeconds: 80.0 },
					{ lapNumber: 2, lapSeconds: 80.2 },
					{ lapNumber: 3, lapSeconds: 80.1 },
					{ lapNumber: 4, lapSeconds: 79.9 },
					{ lapNumber: 5, lapSeconds: 80.3 },
					{ lapNumber: 6, lapSeconds: 80.0 },
					{ lapNumber: 7, lapSeconds: 80.15 },
					{ lapNumber: 8, lapSeconds: 222.0 },
				],
			},
		];

		render(<Garage61 overview={overview} />);

		expect(screen.getByText(/Spread 0\.40s · 7 laps/)).not.toBeNull();
	});
});
