import { Tooltip } from "@base-ui/react/tooltip";

import { Text } from "@/components/Text";
import type { CalendarEvent } from "@/lib/calendar";

import { SOURCE_ACCENT_VAR, SOURCE_LABEL } from "./helpers";

type CalendarEventCardProps = {
	event: CalendarEvent;
	variant: "grid" | "agenda" | "all-day";
};

function CalendarEventCard({ event, variant }: CalendarEventCardProps) {
	const accent = SOURCE_ACCENT_VAR[event.source];
	const sourceLabel = SOURCE_LABEL[event.source];
	const detailLines = (event.details ?? []).filter(
		(line) => line !== undefined,
	);
	const hasTooltip = detailLines.length > 0;

	const cardChildren = (
		<>
			<span className="calendar-event-bar" aria-hidden="true" />
			<span className="calendar-event-body">
				<Text
					as="span"
					size="0"
					weight="500"
					className="calendar-event-title"
				>
					{event.title}
				</Text>
				{event.subtitle ? (
					<Text
						as="span"
						size="0"
						color="2"
						className="calendar-event-subtitle"
					>
						{event.subtitle}
					</Text>
				) : null}
			</span>
			<span className="sr-only"> ({sourceLabel})</span>
		</>
	);

	const baseClass = `calendar-event calendar-event-${variant}`;
	const eventStyle = { "--event-accent": accent } as React.CSSProperties;

	if (!hasTooltip) {
		return event.url ? (
			<a
				className={baseClass}
				data-source={event.source}
				style={eventStyle}
				href={event.url}
				target={event.url.startsWith("http") ? "_blank" : undefined}
				rel={
					event.url.startsWith("http") ? "noopener noreferrer" : undefined
				}
			>
				{cardChildren}
			</a>
		) : (
			<div
				className={baseClass}
				data-source={event.source}
				style={eventStyle}
			>
				{cardChildren}
			</div>
		);
	}

	return (
		<Tooltip.Root>
			<Tooltip.Trigger
				delay={120}
				closeDelay={80}
				render={(triggerProps) =>
					event.url ? (
						<a
							{...triggerProps}
							className={baseClass}
							data-source={event.source}
							style={eventStyle}
							href={event.url}
							target={event.url.startsWith("http") ? "_blank" : undefined}
							rel={
								event.url.startsWith("http")
									? "noopener noreferrer"
									: undefined
							}
						>
							{cardChildren}
						</a>
					) : (
						<div
							{...triggerProps}
							className={baseClass}
							data-source={event.source}
							style={eventStyle}
						>
							{cardChildren}
						</div>
					)
				}
			/>
			<Tooltip.Portal>
				<Tooltip.Positioner side="top" align="start" sideOffset={6}>
					<Tooltip.Popup
						className="calendar-event-tooltip"
						style={{ "--event-accent": accent } as React.CSSProperties}
					>
						<div className="calendar-event-tooltip-header">
							<span className="calendar-event-tooltip-title">
								{event.title}
							</span>
							{event.subtitle ? (
								<span className="calendar-event-tooltip-subtitle">
									{event.subtitle}
								</span>
							) : null}
						</div>
						<div className="calendar-event-tooltip-body">
							{detailLines.map((line, index) => (
								<span
									key={`${index}-${line}`}
									className={
										line === ""
											? "calendar-event-tooltip-spacer"
											: "calendar-event-tooltip-line"
									}
								>
									{line === "" ? " " : line}
								</span>
							))}
						</div>
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}

export { CalendarEventCard };
