import { Text } from "@/components/Text";
import type { CalendarData, CalendarEvent } from "@/lib/calendar";

import { CalendarEventCard } from "./CalendarEventCard";
import {
	buildWeekDays,
	computeHourRange,
	eventDurationMinutes,
	eventMinutesFromMidnight,
	formatHourLabel,
	groupEventsByDay,
} from "./helpers";

const HOUR_HEIGHT_PX = 56;

type CalendarWeekGridProps = {
	data: CalendarData;
};

function CalendarWeekGrid({ data }: CalendarWeekGridProps) {
	const days = buildWeekDays({
		windowStartIso: data.windowStartIso,
		windowEndIso: data.windowEndIso,
	});
	const eventsByDay = groupEventsByDay({ days, events: data.events });
	const { startHour, endHour } = computeHourRange(data.events);
	const totalHours = endHour - startHour;
	const gridHeightPx = totalHours * HOUR_HEIGHT_PX;
	const hours = Array.from(
		{ length: totalHours },
		(_, index) => startHour + index,
	);

	const timedEventsByDay = new Map<string, CalendarEvent[]>(
		[...eventsByDay.entries()].map(([key, list]) => [
			key,
			list.filter((e) => !e.allDay),
		]),
	);

	// All-day events are placed at the top-level grid so they can span multiple
	// day columns (e.g. an "ongoing" currently-reading book spans the whole
	// week). Compute a column span per event and assign each to a non-overlapping
	// vertical lane.
	const dayKeyToCol = new Map(days.map((day, index) => [day.dayKey, index]));
	type AllDayPlacement = {
		event: CalendarEvent;
		startCol: number;
		endCol: number;
		lane: number;
	};
	const allDayEvents = data.events.filter((e) => e.allDay);
	const placements: AllDayPlacement[] = [];
	const sortedAllDay = [...allDayEvents].sort((a, b) => {
		// Ongoing/multi-day first (so they sit on lane 0), then by start.
		if (Boolean(b.ongoing) !== Boolean(a.ongoing)) {
			return a.ongoing ? -1 : 1;
		}
		return a.startIso.localeCompare(b.startIso);
	});
	for (const event of sortedAllDay) {
		const startKey = event.startIso.slice(0, 10);
		const endKey = (event.endIso ?? event.startIso).slice(0, 10);
		const startColRaw = dayKeyToCol.get(startKey);
		const endColRaw = dayKeyToCol.get(endKey);
		// Clamp to visible window (events outside skip; partial spans clip).
		const startCol = startColRaw ?? (event.ongoing ? 0 : -1);
		const endCol = endColRaw ?? (event.ongoing ? days.length - 1 : -1);
		if (startCol < 0 || endCol < 0 || endCol < startCol) continue;
		// Find first lane where this event doesn't overlap an already-placed event.
		let lane = 0;
		while (
			placements.some(
				(p) =>
					p.lane === lane && !(p.endCol < startCol || p.startCol > endCol),
			)
		) {
			lane += 1;
		}
		placements.push({ event, startCol, endCol, lane });
	}
	const allDayLaneCount = Math.max(
		1,
		...placements.map((p) => p.lane + 1),
	);
	const ALLDAY_ROW_HEIGHT_PX = 28;
	const allDayLaneHeight = allDayLaneCount * ALLDAY_ROW_HEIGHT_PX + 12;

	return (
		<div className="calendar-week-grid">
			<div className="calendar-week-headers">
				<div className="calendar-week-corner" aria-hidden="true" />
				{days.map((day) => (
					<div key={day.dayKey} className="calendar-week-day-header">
						<Text as="span" size="0" color="2" family="mono">
							{day.weekday}
						</Text>
						<Text as="span" size="2" weight="500">
							{day.dayNumber}
						</Text>
					</div>
				))}
			</div>

			<div
				className="calendar-week-allday"
				style={
					{
						minHeight: `${allDayLaneHeight}px`,
						"--allday-lane-count": String(allDayLaneCount),
						"--allday-row-height": `${ALLDAY_ROW_HEIGHT_PX}px`,
					} as React.CSSProperties
				}
			>
				<div className="calendar-week-allday-label" aria-hidden="true" />
				{placements.map(({ event, startCol, endCol, lane }) => (
					<div
						key={event.id}
						className="calendar-week-allday-event"
						style={{
							gridColumn: `${startCol + 2} / ${endCol + 3}`,
							gridRow: lane + 1,
						}}
					>
						<CalendarEventCard event={event} variant="all-day" />
					</div>
				))}
			</div>

			<div
				className="calendar-week-body"
				style={{ height: `${gridHeightPx}px` }}
			>
				<div className="calendar-week-hours">
					{hours.map((hour) => (
						<div
							key={hour}
							className="calendar-week-hour"
							style={{ height: `${HOUR_HEIGHT_PX}px` }}
						>
							<Text as="span" size="0" color="2" family="mono">
								{formatHourLabel(hour)}
							</Text>
						</div>
					))}
				</div>
				{days.map((day) => (
					<div
						key={day.dayKey}
						className="calendar-week-day-column"
						style={{ height: `${gridHeightPx}px` }}
					>
						{hours.map((hour) => (
							<div
								key={hour}
								className="calendar-week-hour-line"
								style={{ height: `${HOUR_HEIGHT_PX}px` }}
								aria-hidden="true"
							/>
						))}
						{(timedEventsByDay.get(day.dayKey) ?? []).map((event) => {
							const startMin = eventMinutesFromMidnight(event.startIso);
							const durationMin = eventDurationMinutes(event);
							const startOffsetMin = startMin - startHour * 60;
							const top = Math.max(
								0,
								(startOffsetMin / 60) * HOUR_HEIGHT_PX,
							);
							const height = Math.max(
								24,
								(durationMin / 60) * HOUR_HEIGHT_PX,
							);
							return (
								<div
									key={event.id}
									className="calendar-week-event-slot"
									style={{ top: `${top}px`, height: `${height}px` }}
								>
									<CalendarEventCard event={event} variant="grid" />
								</div>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}

export { CalendarWeekGrid };
