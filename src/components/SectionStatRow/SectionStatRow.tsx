import "./SectionStatRow.styles.css";

type SectionStatItem = {
	key: string;
	label: React.ReactNode;
	value: React.ReactNode;
	subline?: React.ReactNode;
};

type SectionStatRowProps = {
	items: Array<SectionStatItem>;
	align?: "start" | "center";
} & React.HTMLAttributes<HTMLDivElement>;

function SectionStatRow({
	items,
	align = "start",
	className,
	...rest
}: SectionStatRowProps) {
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
}

export { SectionStatRow };
export type { SectionStatItem, SectionStatRowProps };
