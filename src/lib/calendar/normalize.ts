import { formatLapTime } from "@/lib/format";
import type { Garage61Summary } from "@/lib/garage61/schema";
import type { ReadingEvent } from "@/lib/goodreads";
import type { ListeningSession } from "@/lib/lastfm/lastfm";
import type { ConcertsData } from "@/lib/setlistfm";

import type { CalendarEvent } from "./types";

/**
 * Convert a YYYY-MM-DD or ISO-ish date string into a UTC midnight ISO timestamp.
 * Returns null if unparseable.
 */
export const toMidnightUtcIso = (value: string): string | null => {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const [y, m, d] = trimmed.split("-").map((p) => Number.parseInt(p, 10));
		const ms = Date.UTC(y!, m! - 1, d!);
		if (!Number.isFinite(ms)) return null;
		return new Date(ms).toISOString();
	}
	const ms = Date.parse(trimmed);
	if (!Number.isFinite(ms)) return null;
	const d = new Date(ms);
	d.setUTCHours(0, 0, 0, 0);
	return d.toISOString();
};

export type Window = {
	startMs: number;
	endMs: number;
	startIso: string;
	endIso: string;
};

const isWithinWindow = (iso: string, w: Window): boolean => {
	const ms = Date.parse(iso);
	return Number.isFinite(ms) && ms >= w.startMs && ms <= w.endMs;
};

// ---------------------------------------------------------------------------
// Listening
// ---------------------------------------------------------------------------

/**
 * Listening sessions where the user only played a single track aren't
 * meaningful in a "what was I doing this hour" view (probably a quick check or
 * a track started + paused), so the calendar drops them. Other consumers of
 * `lastfm.recentSessions` keep all sessions.
 */
const LISTENING_MIN_SCROBBLES = 2;

/**
 * Build a session title from its track list. If a single artist dominates
 * (≥60% of plays) we show just that artist; otherwise we list the top 2
 * artists by play count and append "+N" when there are more.
 */
const buildListeningTitle = (
	tracks: ListeningSession["tracks"],
	totalPlays: number,
): string => {
	if (tracks.length === 0) return "Listening";
	const artistCounts = new Map<string, number>();
	for (const track of tracks) {
		artistCounts.set(
			track.artist,
			(artistCounts.get(track.artist) ?? 0) + track.count,
		);
	}
	const ranked = [...artistCounts.entries()].sort((a, b) => b[1] - a[1]);
	const top = ranked[0];
	if (!top) return "Listening";
	const dominantShare = totalPlays > 0 ? top[1] / totalPlays : 0;
	if (ranked.length === 1 || dominantShare >= 0.6) return top[0];
	const head = ranked.slice(0, 2).map(([name]) => name);
	const remaining = ranked.length - head.length;
	const tail = remaining > 0 ? ` +${remaining}` : "";
	return `${head.join(", ")}${tail}`;
};

export const normalizeListeningEvents = (
	sessions: ReadonlyArray<ListeningSession>,
	w: Window,
): CalendarEvent[] => {
	const events: CalendarEvent[] = [];
	for (const [index, session] of sessions.entries()) {
		if (session.scrobbleCount < LISTENING_MIN_SCROBBLES) continue;
		if (!isWithinWindow(session.startIso, w)) continue;
		const details = session.tracks.slice(0, 12).map((track) => {
			const playLabel = track.count > 1 ? ` × ${track.count}` : "";
			return `${track.name} — ${track.artist}${playLabel}`;
		});
		events.push({
			id: `listening-${session.startIso}-${index}`,
			source: "listening",
			title: buildListeningTitle(session.tracks, session.scrobbleCount),
			subtitle: `${session.scrobbleCount} ${
				session.scrobbleCount === 1 ? "play" : "plays"
			}`,
			startIso: session.startIso,
			endIso: session.endIso,
			allDay: false,
			details,
		});
	}
	return events;
};

// ---------------------------------------------------------------------------
// Concerts
// ---------------------------------------------------------------------------

export const normalizeConcertEvents = (
	concerts: ConcertsData,
	w: Window,
): CalendarEvent[] => {
	const events: CalendarEvent[] = [];
	for (const show of concerts.recentShows) {
		if (!isWithinWindow(show.dateIso, w)) continue;
		const headliner = show.artists[0];
		const others = show.artists.slice(1);
		const title = headliner ? headliner.name : "Concert";
		const subtitle = [
			show.venue,
			others.length > 0 ? `+ ${others.map((a) => a.name).join(", ")}` : null,
		]
			.filter(Boolean)
			.join(" · ");
		events.push({
			id: `concert-${show.dateIso}-${show.venue}`,
			source: "concert",
			title,
			subtitle,
			startIso: show.dateIso,
			allDay: true,
			...(headliner?.setlistUrl ? { url: headliner.setlistUrl } : {}),
		});
	}
	return events;
};

// ---------------------------------------------------------------------------
// Racing
// ---------------------------------------------------------------------------

/**
 * Garage61 sometimes splits one continuous racing trip across multiple iRacing
 * event IDs (e.g. when a practice/quali/race series straddles event boundaries
 * or when the user does back-to-back drives). Merge adjacent sessions at the
 * same track + car when the gap between them is small.
 */
const RACING_MERGE_GAP_MS = 30 * 60 * 1000;

type RawRacingSession = Garage61Summary["derived"]["recentSessions"][number];

type MergedRacing = {
	track: string;
	car: string;
	startIso: string;
	endIso: string;
	lapCount: number;
	ids: string[];
	lapTimes: Array<{ lapNumber: number | null; lapSeconds: number }>;
	fastestLapSeconds: number;
};

const mergeRacingSessions = (
	sessions: ReadonlyArray<RawRacingSession>,
): MergedRacing[] => {
	const merged: MergedRacing[] = [];
	for (const session of sessions) {
		const last = merged[merged.length - 1];
		if (
			last &&
			last.track === session.track &&
			last.car === session.car &&
			Date.parse(session.startIso) - Date.parse(last.endIso) <=
				RACING_MERGE_GAP_MS
		) {
			last.endIso = session.endIso;
			last.lapCount += session.lapCount;
			last.ids.push(session.sessionKey);
			last.lapTimes.push(...(session.lapTimes ?? []));
			last.fastestLapSeconds = Math.min(
				last.fastestLapSeconds,
				session.fastestLapSeconds,
			);
		} else {
			merged.push({
				track: session.track,
				car: session.car,
				startIso: session.startIso,
				endIso: session.endIso,
				lapCount: session.lapCount,
				ids: [session.sessionKey],
				lapTimes: [...(session.lapTimes ?? [])],
				fastestLapSeconds: session.fastestLapSeconds,
			});
		}
	}
	return merged;
};

export const normalizeRacingEvents = (
	summary: Garage61Summary,
	w: Window,
): CalendarEvent[] => {
	const raw = (summary.derived.recentSessions ?? [])
		.filter((s) => isWithinWindow(s.startIso, w))
		.slice()
		.sort((a, b) => a.startIso.localeCompare(b.startIso));
	const merged = mergeRacingSessions(raw);
	return merged.map((session) => {
		const details: string[] = [];
		if (Number.isFinite(session.fastestLapSeconds)) {
			details.push(`Fastest lap: ${formatLapTime(session.fastestLapSeconds)}`);
		}
		if (session.lapTimes.length > 0) {
			const totalSeconds = session.lapTimes.reduce(
				(sum, lap) => sum + lap.lapSeconds,
				0,
			);
			const avgSeconds = totalSeconds / session.lapTimes.length;
			if (Number.isFinite(avgSeconds)) {
				details.push(`Average lap: ${formatLapTime(avgSeconds)}`);
			}
		}
		return {
			id: `racing-${session.ids.join("+")}`,
			source: "racing",
			title: session.track || "Racing",
			subtitle: [
				session.car,
				session.lapCount > 0
					? `${session.lapCount} ${session.lapCount === 1 ? "lap" : "laps"}`
					: null,
			]
				.filter(Boolean)
				.join(" · "),
			startIso: session.startIso,
			endIso: session.endIso,
			allDay: false,
			details,
		};
	});
};

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export const normalizePostEvents = (
	posts: ReadonlyArray<{ slug: string; title: string; date: string }>,
	w: Window,
): CalendarEvent[] => {
	const events: CalendarEvent[] = [];
	for (const post of posts) {
		const iso = toMidnightUtcIso(post.date);
		if (!iso || !isWithinWindow(iso, w)) continue;
		events.push({
			id: `post-${post.slug}`,
			source: "post",
			title: post.title,
			startIso: iso,
			allDay: true,
			url: `/posts/${post.slug}`,
		});
	}
	return events;
};

// ---------------------------------------------------------------------------
// Reading (started/finished events + currently-reading ongoing band)
// ---------------------------------------------------------------------------

export const normalizeReadingMilestoneEvents = (
	readingEvents: ReadonlyArray<ReadingEvent>,
	w: Window,
): CalendarEvent[] => {
	const events: CalendarEvent[] = [];
	for (const event of readingEvents) {
		if (!isWithinWindow(event.dateIso, w)) continue;
		const author = event.book.authors[0]?.name;
		events.push({
			id: `reading-${event.kind}-${event.book.slug ?? event.book.title}`,
			source: "reading",
			title:
				event.kind === "started"
					? `Started ${event.book.title}`
					: `Finished ${event.book.title}`,
			...(author ? { subtitle: author } : {}),
			startIso: event.dateIso,
			allDay: true,
		});
	}
	return events;
};

export const normalizeCurrentlyReadingEvents = (
	books: ReadonlyArray<{
		title: string;
		slug: string | null;
		description: string | null;
		authors: ReadonlyArray<{ name: string }>;
	}>,
	w: Window,
): CalendarEvent[] => {
	return books.map((book, index) => {
		const author = book.authors[0]?.name ?? "";
		const details: string[] = [];
		if (author) details.push(`by ${author}`);
		if (book.description) {
			const cleaned = book.description
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim();
			if (cleaned) {
				details.push("");
				details.push(
					cleaned.length > 480 ? `${cleaned.slice(0, 480)}…` : cleaned,
				);
			}
		}
		return {
			id: `reading-current-${book.slug ?? book.title}-${index}`,
			source: "reading",
			title: book.title,
			...(author ? { subtitle: author } : {}),
			startIso: w.startIso,
			endIso: w.endIso,
			allDay: true,
			ongoing: true,
			...(book.slug
				? { url: `https://www.goodreads.com/book/show/${book.slug}` }
				: {}),
			details,
		};
	});
};
