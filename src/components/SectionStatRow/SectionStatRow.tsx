import type { HTMLAttributes, ReactNode } from "react";

import "./SectionStatRow.styles.css";

type SectionStatItem = {
	key: string;
	label: ReactNode;
	value: ReactNode;
	subline?: ReactNode;
};

type SectionStatRowProps = {
	items: Array<SectionStatItem>;
	align?: "start" | "center";
} & HTMLAttributes<HTMLDivElement>;

const SectionStatRow = ({
	items,
	align = "start",
	className,
	...rest
}: SectionStatRowProps) => {
	const rowClasses = ["section-stat-row", className].filter(Boolean).join(" ");

	return (
		<div className={rowClasses} data-align={align} {...rest}>
			{items.map((item) => (
				<div key={item.key} data-slot="item" className="section-stat-item">
					{item.label}
					{item.value}
					{item.subline ?? null}
				</div>
			))}
		</div>
	);
};

export { SectionStatRow };
