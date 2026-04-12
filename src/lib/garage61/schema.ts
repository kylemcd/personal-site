import { Schema } from "effect";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

export const Garage61MeSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	image: Schema.optional(Schema.String),
}).annotations({ exact: false });

export type Garage61Summary = {
	profile: {
		id: number;
		name: string;
		image?: string;
	};
	statistics: JsonValue;
	sessions: JsonValue;
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
				timeOnTrackSeconds: number;
				timeSharePercentage: number | null;
			}>;
			recentCars: Array<{
				id: number;
				name: string;
				timeOnTrackSeconds: number;
				timeSharePercentage: number | null;
			}>;
			insights: {
				secondsOffRecord: {
					track: string;
					car: string;
					bestLapSeconds: number;
					recordLapSeconds: number;
					secondsOffRecord: number;
					isFastestInTeam: boolean;
					onlyMyLaps: boolean;
				} | null;
				cleanestCombo: {
					track: string;
					car: string;
					cleanPercentage: number;
					cleanLaps: number;
					totalLaps: number;
				} | null;
				paceLadder: Array<{
					track: string;
					car: string;
					avgLapSeconds: number;
					laps: number;
				}>;
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

export type Garage61FastLap = Garage61Summary["derived"]["fastestLaps"][number];
export type Garage61RecentStatistic =
	Garage61Summary["derived"]["recentStatistics"][number];
