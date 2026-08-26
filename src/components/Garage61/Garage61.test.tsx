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
		{
			// Ovals are excluded from lap counting, so this track has real time on
			// track but no countable laps. The bar must follow the duration label.
			id: 3,
			name: "Daytona International Speedway",
			variant: null,
			timeOnTrackSeconds: 17760,
			timeSharePercentage: 13,
			lapsDriven: 0,
			lapSharePercentage: 0,
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
		sessionTimeBreakdown: {
			practiceTimeOnTrackSeconds: 14000,
			racingTimeOnTrackSeconds: 22000,
			practicePercentage: 39,
			racingPercentage: 61,
		},
		cleanestCombo: {
			track: "Long Beach Street Circuit",
			car: "Porsche 911 Cup",
			cleanPercentage: 97,
			cleanLaps: 24,
			totalLaps: 25,
		},
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
	it("renders the statistics-derived KPIs and lists", () => {
		render(<Garage61 overview={buildOverview()} />);

		expect(screen.getByText("Racing")).not.toBeNull();
		expect(screen.getByText("Time on track")).not.toBeNull();
		expect(screen.getByText("Clean laps")).not.toBeNull();
		expect(screen.getByText("Cleanest combo")).not.toBeNull();
		expect(screen.getByText("Seat balance")).not.toBeNull();
		expect(screen.getByText("Recent tracks")).not.toBeNull();
		expect(screen.getByText("Recent cars")).not.toBeNull();
		expect(screen.getByText("Cleanest tracks")).not.toBeNull();
		expect(
			screen.getAllByText("Long Beach Street Circuit").length,
		).toBeGreaterThan(0);
	});

	it("does not render lap-derived sections that were dropped to cut API usage", () => {
		render(<Garage61 overview={buildOverview()} />);

		expect(screen.queryByText("Fastest laps")).toBeNull();
		expect(screen.queryByLabelText("Racing lap time trend chart")).toBeNull();
		expect(
			screen.queryByText("Not enough lap data for chart rendering yet."),
		).toBeNull();
	});

	it("shares time rather than laps, so oval time is not reported as <1%", () => {
		render(<Garage61 overview={buildOverview()} />);

		expect(
			screen.getAllByText("Daytona International Speedway").length,
		).toBeGreaterThan(0);
		expect(screen.getAllByText("4h 56m").length).toBeGreaterThan(0);
		expect(screen.getAllByText("13%").length).toBeGreaterThan(0);
		expect(screen.queryByText("<1%")).toBeNull();
	});

	it("renders the cleanest combo tile from the statistics rollup", () => {
		const overview = buildOverview();
		render(<Garage61 overview={overview} />);

		expect(screen.getAllByText("Porsche 911 Cup").length).toBeGreaterThan(0);
	});

	it("renders nothing when there is no recent activity", () => {
		const overview = buildOverview();
		overview.recentTracks = [];
		overview.recentCars = [];
		overview.totalTimeOnTrackSeconds = 0;

		const { container } = render(<Garage61 overview={overview} />);

		expect(container.firstChild).toBeNull();
	});
});
