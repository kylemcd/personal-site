export type CalendarSource =
	| "listening"
	| "concert"
	| "racing"
	| "post"
	| "reading";

export type CalendarEvent = {
	id: string;
	source: CalendarSource;
	title: string;
	subtitle?: string;
	startIso: string;
	endIso?: string;
	allDay: boolean;
	url?: string;
	/** Optional lines shown in the event's hover tooltip. */
	details?: string[];
	/** Marks an all-day event that spans the entire visible window (e.g. a book
	 *  the user is currently reading). The agenda treats these specially so the
	 *  same event isn't repeated under every day. */
	ongoing?: boolean;
};

export type CalendarData = {
	windowStartIso: string;
	windowEndIso: string;
	events: CalendarEvent[];
};
