// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
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
			id: 104,
			name: "Long Beach Street Circuit",
			variant: "Grand Prix",
			platformId: 179,
			timeOnTrackSeconds: 7200,
			timeSharePercentage: 20,
			lapsDriven: 30,
			lapSharePercentage: 25,
		},
		{
			// Ovals are excluded from lap counting, so this track has real time on
			// track but no countable laps. The bar must follow the duration label.
			id: 105,
			name: "Daytona International Speedway",
			variant: "Road Course",
			platformId: 192,
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
			platformId: 208,
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
		expect(screen.queryByText("Cleanest tracks")).toBeNull();
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

	it("renders clean track-map SVGs in the homepage layout", () => {
		const { container } = render(<Garage61 overview={buildOverview()} />);
		const mapImages = container.querySelectorAll(".g61-racing-track-map-image");

		expect(mapImages).toHaveLength(4);
		expect(mapImages[0]?.getAttribute("src")).toContain(
			"/media/racing/tracks/179/inactive.svg",
		);
		expect(mapImages[1]?.getAttribute("src")).toContain(
			"/media/racing/tracks/179/active.svg",
		);
		expect(screen.getAllByText("Grand Prix").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Road Course").length).toBeGreaterThan(0);
	});

	it("opens an image-only track trigger into an active-layout modal", () => {
		const { container } = render(<Garage61 overview={buildOverview()} />);
		const rendered = within(container);
		const trigger = rendered.getByRole("button", {
			name: "Open track map for Long Beach Street Circuit, Grand Prix",
		});

		expect(trigger.textContent).toBe("");
		expect(rendered.queryByText("Layout details")).toBeNull();
		fireEvent.click(trigger);

		const dialog = screen.getByRole("dialog", {
			name: "Long Beach Street Circuit",
		});
		const modal = within(dialog);
		expect(modal.getByText("Grand Prix")).not.toBeNull();
		expect(modal.queryByText("Active layout")).toBeNull();
		expect(modal.queryByText(/2h/)).toBeNull();
		expect(modal.getByText("Other layouts")).not.toBeNull();
		expect(modal.getByText("Turn numbers and names")).not.toBeNull();
		expect(modal.getByText("Pit road")).not.toBeNull();
		expect(modal.getByText("Start / finish")).not.toBeNull();
		expect(
			modal.getByRole("button", {
				name: "Close Long Beach Street Circuit track map",
			}),
		).not.toBeNull();
		expect(
			dialog
				.querySelector(".g61-racing-track-detail-turns")
				?.getAttribute("src"),
		).toBe("/media/racing/tracks/179/turns.svg?source=r2-svg-v2");
	});

	it("renders R2 car images without requiring a checked-in source entry", () => {
		const overview = buildOverview();
		const firstCar = overview.recentCars[0];
		if (!firstCar) throw new Error("Expected a recent car fixture");
		const r2OnlyOverview = {
			...overview,
			recentCars: [
				{ ...firstCar, platformId: 999 },
				...overview.recentCars.slice(1),
			],
		};
		const { container } = render(<Garage61 overview={r2OnlyOverview} />);
		const carImage = container.querySelector(".g61-racing-car-image");

		expect(carImage?.getAttribute("src")).toBe(
			"/media/racing/cars/999?source=r2-png-v1",
		);
		expect(carImage?.getAttribute("alt")).toBe("Porsche 911 Cup racing livery");
		expect(screen.queryByText("EVA RT TEST TYPE-01")).toBeNull();
	});

	it("uses the visual track and car grids on the focused racing route", () => {
		const { container } = render(<Garage61 overview={buildOverview()} />);

		expect(
			container.querySelector(".g61-racing-track-map-grid"),
		).not.toBeNull();
		expect(
			container.querySelector(".g61-racing-car-image-grid"),
		).not.toBeNull();
		expect(
			screen.getAllByText("Long Beach Street Circuit").length,
		).toBeGreaterThan(0);
	});

	it("shows time without lap totals or time-share percentages", () => {
		render(<Garage61 overview={buildOverview()} />);

		expect(
			screen.getAllByText("Daytona International Speedway").length,
		).toBeGreaterThan(0);
		expect(screen.getAllByText(/4h 56m/).length).toBeGreaterThan(0);
		expect(screen.queryByText(/30 laps/)).toBeNull();
		expect(screen.queryByText(/36 laps/)).toBeNull();
		expect(screen.queryByText(/13%/)).toBeNull();
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
