type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

export type Garage61Summary = {
	profile: {
		id: number;
		name: string;
		image?: string;
	};
	statistics: JsonValue;
	sessions: JsonValue;
	// Fingerprint of the statistics rows this summary was built from. The whole
	// summary is derived from those rows, so an unchanged fingerprint means a
	// rebuild would produce identical output and can be skipped.
	statisticsFingerprint?: string;
	derived: {
		sessionCount: number | null;
		trackCount: number | null;
		fastestLaps: Array<{
			track: string;
			car: string;
			lapTimeMs: number;
			lapTime: string;
			sessionDate: string | null;
			sessionUrl: string | null;
		}>;
		recentStatistics: Array<{
			day: string | null;
			trackId: number | null;
			carId: number | null;
			track: string;
			car: string;
			sessionType: string | null;
			events: number | null;
			lapsDriven: number | null;
			cleanLapsDriven: number | null;
			timeOnTrack: number | null;
		}>;
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
				trackConfidence: Array<{
					track: string;
					laps: number;
					cleanLaps: number;
					cleanPercentage: number | null;
					avgLapSeconds: number | null;
				}>;
			};
		};
	};
};
