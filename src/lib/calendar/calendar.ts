import { Result, TaggedError } from "better-result";

import { garage61 } from "@/lib/garage61";
import { goodreads } from "@/lib/goodreads";
import { lastfm } from "@/lib/lastfm";
import { markdown } from "@/lib/markdown";
import { setlistfm } from "@/lib/setlistfm";
import { getOrComputeJson } from "@/lib/store";

import {
	normalizeConcertEvents,
	normalizeCurrentlyReadingEvents,
	normalizeListeningEvents,
	normalizePostEvents,
	normalizeRacingEvents,
	normalizeReadingMilestoneEvents,
	type Window,
} from "./normalize";
import type { CalendarData } from "./types";

class CalendarError extends TaggedError("CalendarError")<{
	readonly error: unknown;
}>() {
	override message = "Failed to assemble calendar data";
}

const WINDOW_DAYS = 7;
export const CALENDAR_CACHE_KEY = "calendar:last-7-days:v15";
const CALENDAR_CACHE_TTL_SECONDS = 15 * 60;

const computeCalendarData = async (): Promise<
	Result<CalendarData, CalendarError>
> => {
	const nowMs = Date.now();
	const startMs = nowMs - WINDOW_DAYS * 24 * 60 * 60 * 1000;
	const window: Window = {
		startMs,
		endMs: nowMs,
		startIso: new Date(startMs).toISOString(),
		endIso: new Date(nowMs).toISOString(),
	};

	const [
		listeningSessionsResult,
		concertsResult,
		racingResult,
		readingEventsResult,
		shelfResult,
	] = await Promise.all([
		lastfm.recentSessions({ withinDays: WINDOW_DAYS }),
		setlistfm.attendedConcerts(),
		garage61.summary(),
		goodreads.recentReadingEvents({ withinDays: WINDOW_DAYS }),
		goodreads.shelf(),
	]);

	const events = [
		...(Result.isOk(listeningSessionsResult)
			? normalizeListeningEvents(listeningSessionsResult.value, window)
			: []),
		...(Result.isOk(concertsResult)
			? normalizeConcertEvents(concertsResult.value, window)
			: []),
		...(Result.isOk(racingResult)
			? normalizeRacingEvents(racingResult.value, window)
			: []),
		...(() => {
			const postsResult = markdown.all();
			return Result.isOk(postsResult)
				? normalizePostEvents(postsResult.value, window)
				: [];
		})(),
		...(Result.isOk(readingEventsResult)
			? normalizeReadingMilestoneEvents(readingEventsResult.value, window)
			: []),
		...(Result.isOk(shelfResult)
			? normalizeCurrentlyReadingEvents(shelfResult.value.reading, window)
			: []),
	];

	events.sort((a, b) => a.startIso.localeCompare(b.startIso));

	return Result.ok({
		windowStartIso: window.startIso,
		windowEndIso: window.endIso,
		events,
	});
};

const lastSevenDays = (): Promise<Result<CalendarData, CalendarError>> => {
	return getOrComputeJson<CalendarData, CalendarError>({
		key: CALENDAR_CACHE_KEY,
		ttlSeconds: CALENDAR_CACHE_TTL_SECONDS,
		compute: computeCalendarData,
	});
};

const calendar = {
	lastSevenDays,
};

export { calendar, CalendarError };
