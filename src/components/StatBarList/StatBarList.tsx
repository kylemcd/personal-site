import { MetricBar } from "@/components/MetricBar";
import { Text } from "@/components/Text";

import "./StatBarList.styles.css";

type TextSize = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type StatBarListRow = {
	key: string;
	title: React.ReactNode;
	subtitleLeft?: React.ReactNode;
	subtitleRight?: React.ReactNode;
	percent: number;
	percentLabel: string;
};

type StatBarListProps = {
	rows: Array<StatBarListRow>;
	barColor?: string;
	percentColor?: string;
	titleSize?: TextSize;
	variant?: "default" | "listening" | "racing";
} & React.HTMLAttributes<HTMLDivElement>;

function StatBarList({
	rows,
	barColor,
	percentColor,
	titleSize = "0",
	variant = "default",
	className,
	...rest
}: StatBarListProps) {
	const listClasses = [
		"share-list",
		variant === "default" ? null : `share-list-${variant}`,
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={listClasses} {...rest}>
			{rows.map((row) => (
				<div className="share-list-row" key={row.key}>
					<div className="share-list-head">
						<Text as="p" size={titleSize} weight="500">
							{row.title}
						</Text>
						{row.subtitleRight ? (
							<Text as="p" size="0" color="2" className="share-list-subtitle">
								{row.subtitleRight}
							</Text>
						) : null}
					</div>
					{row.subtitleLeft ? (
						<Text as="p" size="0" color="2" className="share-list-subtitle">
							{row.subtitleLeft}
						</Text>
					) : null}
					<div className="share-list-progress">
						<MetricBar value={row.percent} {...(barColor !== undefined ? { fillColor: barColor } : {})} />
						<Text
							as="p"
							size="0"
							family="mono"
							className="share-list-percent"
							style={
								percentColor
									? ({ color: percentColor } as React.CSSProperties)
									: undefined
							}
						>
							{row.percentLabel}
						</Text>
					</div>
				</div>
			))}
		</div>
	);
}

export type { StatBarListProps, StatBarListRow };
export { StatBarList };
