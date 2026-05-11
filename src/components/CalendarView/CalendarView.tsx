import { Tooltip } from "@base-ui/react/tooltip";

import { Text } from "@/components/Text";
import type { CalendarData } from "@/lib/calendar";

import { CalendarWeekGrid } from "./CalendarWeekGrid";
import "./CalendarView.styles.css";

type CalendarViewProps = {
	data: CalendarData;
};

function CalendarView({ data }: CalendarViewProps) {
	if (data.events.length === 0) {
		return (
			<div className="calendar-view calendar-view-empty">
				<Text as="p" size="1" color="2">
					Nothing happened in the last 7 days.
				</Text>
			</div>
		);
	}

	return (
		<Tooltip.Provider delay={120} closeDelay={80}>
			<div className="calendar-view">
				<div className="calendar-view-scroll">
					<CalendarWeekGrid data={data} />
				</div>
			</div>
		</Tooltip.Provider>
	);
}

export { CalendarView };
