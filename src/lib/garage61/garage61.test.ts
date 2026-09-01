import { Result } from "better-result";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	fetchFresh: vi.fn(),
	getJson: vi.fn(),
	getOrComputeJson: vi.fn(),
	refreshJson: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: { GARAGE61_API_KEY: "test-key" } }));
vi.mock("@/lib/fetch", () => ({ fetchFresh: mocks.fetchFresh }));
vi.mock("@/lib/store", () => ({
	getJson: mocks.getJson,
	getOrComputeJson: mocks.getOrComputeJson,
	refreshJson: mocks.refreshJson,
}));

beforeEach(() => {
	vi.resetModules();
	vi.resetAllMocks();
	vi.useFakeTimers();
	const compute = ({ compute }: { compute: () => Promise<unknown> }) =>
		compute();
	mocks.refreshJson.mockImplementation(compute);
	mocks.getOrComputeJson.mockImplementation(compute);
	mocks.getJson.mockResolvedValue(Result.ok(null));
	mocks.fetchFresh.mockImplementation(async ({ url }: { url: string }) => {
		let data: unknown;
		if (url.includes("/me/statistics?")) {
			data = [
				{
					day: "2026-08-31",
					track: 46,
					car: 168,
					sessionType: "race",
					lapsDriven: 20,
					cleanLapsDriven: 18,
					timeOnTrack: 1400,
				},
			];
		} else if (url.includes("/tracks?")) {
			data = [
				{
					id: 46,
					name: "Road Atlanta",
					variant: "Full Course",
					platform_id: 586,
				},
			];
		} else if (url.includes("/cars?")) {
			data = [{ id: 168, name: "Corvette GT3", platform_id: 173 }];
		} else {
			data = { id: 1, name: "Kyle" };
		}
		return Result.ok({ data, headers: new Headers() });
	});
});

afterEach(() => {
	vi.useRealTimers();
});

describe("Garage61 refresh", () => {
	it("preserves the current racing data and releases its timeout after success", async () => {
		const { garage61 } = await import("./garage61");
		const result = await garage61.refreshSummary();
		if (Result.isError(result)) throw result.error;
		expect(result.value.derived.overview).toMatchObject({
			windowLabel: "Last 30 Days",
			totalTimeOnTrackSeconds: 1400,
			totalLapsDriven: 20,
			cleanLapPercentage: 90,
			recentTracks: [
				{
					name: "Road Atlanta",
					variant: "Full Course",
					platformId: 586,
					timeOnTrackSeconds: 1400,
				},
			],
			recentCars: [
				{ name: "Corvette GT3", platformId: 173, timeOnTrackSeconds: 1400 },
			],
			insights: { cleanestCombo: { cleanPercentage: 90 } },
		});
		expect(mocks.fetchFresh).toHaveBeenCalledTimes(4);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("returns a typed error when a lookup unexpectedly rejects", async () => {
		const error = new Error("Lookup failed unexpectedly");
		mocks.getOrComputeJson.mockRejectedValueOnce(error);
		const { garage61 } = await import("./garage61");
		const result = await garage61.refreshSummary();
		expect(Result.isError(result)).toBe(true);
		if (Result.isError(result)) {
			expect(result.error._tag).toBe("Garage61Error");
			expect(result.error.error).toBe(error);
		}
		expect(vi.getTimerCount()).toBe(0);
	});
});
