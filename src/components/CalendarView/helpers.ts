import type { CalendarEvent, CalendarSource } from "@/lib/calendar";

const CENTRAL_TZ = "America/Chicago";

/**
 * Returns the wall-clock time in Central time, expressed as a "naive" Date
 * whose UTC fields equal the local Central calendar fields. Useful for doing
 * arithmetic on Central-local hours/minutes without writing a full TZ engine.
 */
const toCentralWall = (iso: string): Date | null => {
	const ms = Date.parse(iso);
	if (!Number.isFinite(ms)) return null;
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: CENTRAL_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(new Date(ms));
	const get = (name: string) =>
		Number.parseInt(parts.find((p) => p.type === name)?.value ?? "0", 10);
	let hour = get("hour");
	if (hour === 24) hour = 0; // some Intl impls return "24" for midnight
	return new Date(
		Date.UTC(
			get("year"),
			get("month") - 1,
			get("day"),
			hour,
			get("minute"),
			get("second"),
		),
	);
};

const centralDayKey = (iso: string): string => {
	const wall = toCentralWall(iso);
	if (!wall) return "";
	return wall.toISOString().slice(0, 10);
};

// Listening + Racing tokens are mis-named in tokens.css (the "blue" var holds
// the listening red and the "red" var holds the racing blue) but reusing them
// keeps the calendar consistent with the homepage palette.
export const SOURCE_ACCENT_VAR: Record<CalendarSource, string> = {
	listening: "var(--color-listening-blue)", // rgb(175, 48, 41) — red
	racing: "var(--color-racing-red)", // rgb(32, 94, 166) — blue
	reading: "rgb(135, 154, 57)", // green
	concert: "var(--color-concert, #c084fc)",
	post: "var(--color-posts, #38bdf8)",
};

export const SOURCE_LABEL: Record<CalendarSource, string> = {
	listening: "Listening",
	concert: "Concert",
	racing: "Racing",
	post: "Post",
	reading: "Reading",
};

export const SOURCE_ICON: Record<CalendarSource, string> = {
	listening: "hn hn-music-note",
	concert: "hn hn-microphone",
	racing: "hn hn-flag",
	post: "hn hn-document-text",
	reading: "hn hn-book-open",
};

/**
 * Build a list of {dayKey, label} for the 7-day window ending today, oldest
 * first. Day boundaries are in Central time so a 1am Central scrobble lands on
 * the right calendar day.
 */
export const buildWeekDays = (params: {
	windowStartIso: string;
	windowEndIso: string;
}): Array<{
	dayKey: string;
	weekday: string;
	dayNumber: string;
	monthShort: string;
}> => {
	const endWall = toCentralWall(params.windowEndIso);
	if (!endWall) return [];

	const days: ReturnType<typeof buildWeekDays> = [];
	for (let i = 6; i >= 0; i -= 1) {
		const dayMs = endWall.getTime() - i * 24 * 60 * 60 * 1000;
		const date = new Date(dayMs);
		days.push({
			dayKey: date.toISOString().slice(0, 10),
			weekday: date.toLocaleDateString("en-US", {
				weekday: "short",
				timeZone: "UTC",
			}),
			dayNumber: String(date.getUTCDate()),
			monthShort: date.toLocaleDateString("en-US", {
				month: "short",
				timeZone: "UTC",
			}),
		});
	}
	return days;
};

export const eventDayKey = (iso: string): string => centralDayKey(iso);

/**
 * Returns minutes-from-day-start in Central time for grid placement.
 */
export const eventMinutesFromMidnight = (iso: string): number => {
	const wall = toCentralWall(iso);
	if (!wall) return 0;
	return wall.getUTCHours() * 60 + wall.getUTCMinutes();
};

export const eventDurationMinutes = (event: CalendarEvent): number => {
	if (!event.endIso) return 30;
	const startMs = Date.parse(event.startIso);
	const endMs = Date.parse(event.endIso);
	if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 30;
	return Math.max(15, Math.round((endMs - startMs) / 60_000));
};

export const formatHourLabel = (hour: number): string => {
	const display = hour % 12 === 0 ? 12 : hour % 12;
	const suffix = hour < 12 || hour === 24 ? "am" : "pm";
	return `${display}${suffix}`;
};

export const formatTimeLabel = (iso: string): string => {
	const ms = Date.parse(iso);
	if (!Number.isFinite(ms)) return "";
	return new Date(ms).toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		timeZone: CENTRAL_TZ,
	});
};

/**
 * Group events by their day key. Days with no events are present as empty arrays.
 */
export const groupEventsByDay = (params: {
	days: ReturnType<typeof buildWeekDays>;
	events: ReadonlyArray<CalendarEvent>;
}): Map<string, CalendarEvent[]> => {
	const map = new Map<string, CalendarEvent[]>();
	for (const day of params.days) map.set(day.dayKey, []);
	for (const event of params.events) {
		const key = eventDayKey(event.startIso);
		const list = map.get(key);
		if (list) list.push(event);
	}
	return map;
};

/**
 * Compute the visible hour range for the desktop grid based on the timed events
 * present. Pads ±1h, clamps to a sensible 6–24 window minimum.
 */
export const computeHourRange = (
	events: ReadonlyArray<CalendarEvent>,
): { startHour: number; endHour: number } => {
	const timedHours = events
		.filter((event) => !event.allDay)
		.flatMap((event) => {
			const startMin = eventMinutesFromMidnight(event.startIso);
			const endMin = startMin + eventDurationMinutes(event);
			return [startMin / 60, endMin / 60];
		});
	if (timedHours.length === 0) {
		return { startHour: 9, endHour: 22 };
	}
	const minHour = Math.max(0, Math.floor(Math.min(...timedHours)) - 1);
	const maxHour = Math.min(24, Math.ceil(Math.max(...timedHours)) + 1);
	const startHour = Math.min(minHour, 9);
	const endHour = Math.max(maxHour, 18);
	return { startHour, endHour };
};
