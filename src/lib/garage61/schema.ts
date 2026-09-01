export type Garage61Summary = {
	profile: {
		id: number;
		name: string;
		image?: string;
	};
	// Fingerprint of the statistics rows this summary was built from. The whole
	// summary is derived from those rows, so an unchanged fingerprint means a
	// rebuild would produce identical output and can be skipped.
	statisticsFingerprint?: string;
	derived: {
		sessionCount: number | null;
		trackCount: number | null;
		overview: {
			windowLabel: string;
			totalTimeOnTrackSeconds: number;
			totalLapsDriven: number;
			totalCleanLapsDriven: number;
			cleanLapPercentage: number | null;
			recentTracks: Array<{
				id: number;
				name: string;
				variant?: string | null;
				platformId?: number | null;
				timeOnTrackSeconds: number;
				timeSharePercentage: number | null;
				lapsDriven: number;
				lapSharePercentage: number | null;
			}>;
			recentCars: Array<{
				id: number;
				name: string;
				platformId?: number | null;
				timeOnTrackSeconds: number;
				timeSharePercentage: number | null;
				lapsDriven: number;
				lapSharePercentage: number | null;
			}>;
			insights: {
				sessionTimeBreakdown: {
					practiceTimeOnTrackSeconds: number;
					racingTimeOnTrackSeconds: number;
					practicePercentage: number;
					racingPercentage: number;
				} | null;
				cleanestCombo: {
					track: string;
					car: string;
					cleanPercentage: number;
					cleanLaps: number;
					totalLaps: number;
				} | null;
			};
		};
	};
};
