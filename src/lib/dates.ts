const CENTRAL_TIME_ZONE = "America/Chicago";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;

type DateTimeParts = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

const asNumber = (value: string): number => Number.parseInt(value, 10);

const timeZoneFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: CENTRAL_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

const centralDateFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: CENTRAL_TIME_ZONE,
	year: "numeric",
	month: "long",
	day: "numeric",
});

const getTimeZoneOffsetMs = (timestamp: number): number => {
	const parts = timeZoneFormatter.formatToParts(new Date(timestamp));
	const values = parts.reduce(
		(acc, part) => {
			if (part.type === "year") acc.year = asNumber(part.value);
			if (part.type === "month") acc.month = asNumber(part.value);
			if (part.type === "day") acc.day = asNumber(part.value);
			if (part.type === "hour") acc.hour = asNumber(part.value);
			if (part.type === "minute") acc.minute = asNumber(part.value);
			if (part.type === "second") acc.second = asNumber(part.value);
			return acc;
		},
		{
			year: 0,
			month: 0,
			day: 0,
			hour: 0,
			minute: 0,
			second: 0,
		},
	);
	const asUtcTimestamp = Date.UTC(
		values.year,
		values.month - 1,
		values.day,
		values.hour,
		values.minute,
		values.second,
	);
	return asUtcTimestamp - timestamp;
};

const toCentralTimestamp = ({
	year,
	month,
	day,
	hour,
	minute,
	second,
}: DateTimeParts): number => {
	const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
	const firstOffset = getTimeZoneOffsetMs(utcGuess);
	const corrected = utcGuess - firstOffset;
	const secondOffset = getTimeZoneOffsetMs(corrected);
	return utcGuess - secondOffset;
};

const toComparableTimestampInCentral = (date: string): number => {
	const dateOnly = DATE_ONLY_PATTERN.exec(date);
	if (dateOnly) {
		const [, year, month, day] = dateOnly;
		return toCentralTimestamp({
			year: asNumber(year),
			month: asNumber(month),
			day: asNumber(day),
			hour: 0,
			minute: 0,
			second: 0,
		});
	}

	const dateTime = DATE_TIME_PATTERN.exec(date);
	if (dateTime) {
		const [, year, month, day, hour, minute, second = "0"] = dateTime;
		return toCentralTimestamp({
			year: asNumber(year),
			month: asNumber(month),
			day: asNumber(day),
			hour: asNumber(hour),
			minute: asNumber(minute),
			second: asNumber(second),
		});
	}

	return new Date(date).getTime();
};

const formatDateInCentral = (date: string): string => {
	const timestamp = toComparableTimestampInCentral(date);
	if (Number.isNaN(timestamp)) {
		return date;
	}

	return centralDateFormatter.format(new Date(timestamp));
};

export { formatDateInCentral, toComparableTimestampInCentral };
