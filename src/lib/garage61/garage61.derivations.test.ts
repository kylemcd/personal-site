import { describe, expect, it } from "vitest";

import {
	buildBestSessionChart,
	buildFallbackTrendFromStatistics,
	computeSharePercentage,
} from "./derivations";

describe("garage61 derivations", () => {
	it("builds best-session chart from lap rows and sorts laps by lap number", () => {
		const chart = buildBestSessionChart({
			track: "Long Beach Street Circuit",
			car: "Porsche 911 Cup",
			data: {
				items: [
					{ subsession_id: 101, lapNumber: 2, lapTime: 75.2, clean: true },
					{ subsession_id: 101, lapNumber: 1, lapTime: 74.9, clean: true },
					{ subsession_id: 101, lapNumber: 3, lapTime: 75.5, clean: true },
					{ subsession_id: 202, lapNumber: 1, lapTime: 76.3, clean: true },
					{ subsession_id: 202, lapNumber: 2, lapTime: 76.1, clean: true },
					{ subsession_id: 202, lapNumber: 3, lapTime: 76.7, clean: true },
				],
			},
		});

		expect(chart).not.toBeNull();
		expect(chart?.track).toBe("Long Beach Street Circuit");
		expect(chart?.car).toBe("Porsche 911 Cup");
		expect(chart?.lapCount).toBe(3);
		expect(chart?.bestLapSeconds).toBe(74.9);
		expect(chart?.rangeSeconds).toBe(0.6);
		expect(chart?.laps.map((lap) => lap.lapNumber)).toEqual([1, 2, 3]);
	});

	it("builds fallback trend and computes best/range from statistics", () => {
		const trend = buildFallbackTrendFromStatistics([
			{
				day: "2026-04-01",
				trackId: 1,
				carId: 2,
				track: "Track A",
				car: "Car A",
				sessionType: "Race",
				events: 1,
				lapsDriven: 10,
				cleanLapsDriven: 8,
				timeOnTrack: 760,
			},
			{
				day: "2026-04-02",
				trackId: 1,
				carId: 2,
				track: "Track A",
				car: "Car A",
				sessionType: "Race",
				events: 1,
				lapsDriven: 10,
				cleanLapsDriven: 9,
				timeOnTrack: 745,
			},
			{
				day: "2026-04-03",
				trackId: 3,
				carId: 4,
				track: "Track B",
				car: "Car B",
				sessionType: "Qualifying",
				events: 1,
				lapsDriven: 10,
				cleanLapsDriven: 9,
				timeOnTrack: 780,
			},
		]);

		expect(trend).not.toBeNull();
		expect(trend?.bestLapSeconds).toBe(74.5);
		expect(trend?.rangeSeconds).toBe(3.5);
		expect(trend?.lapCount).toBe(3);
		expect(trend?.source).toBe("trend_fallback");
	});

	it("computes share percentages and handles zero totals", () => {
		expect(computeSharePercentage(30, 120)).toBe(25);
		expect(computeSharePercentage(0, 120)).toBe(0);
		expect(computeSharePercentage(30, 0)).toBeNull();
		expect(computeSharePercentage(-10, 100)).toBe(0);
	});
});
