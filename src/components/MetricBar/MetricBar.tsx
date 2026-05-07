import "./MetricBar.styles.css";

type MetricBarProps = React.HTMLAttributes<HTMLDivElement> & {
	value: number;
	height?: number;
	fillColorVar?: string;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

function MetricBar({
	value,
	height,
	fillColorVar,
	className,
	style,
	...rest
}: MetricBarProps) {
	const safeValue = Number.isFinite(value) ? clampPercent(value) : 0;
	const widthPercent = safeValue > 0 ? Math.max(2, safeValue) : 0;
	const mergedStyle: React.CSSProperties = {
		...(style ?? {}),
		...(typeof height === "number" ? { height: `${height}px` } : {}),
		...(fillColorVar
			? ({ "--metric-bar-fill-color": `var(${fillColorVar})` } as React.CSSProperties)
			: {}),
	};

	const trackClasses = ["metric-bar-track", className].filter(Boolean).join(" ");

	return (
		<div className={trackClasses} style={mergedStyle} aria-hidden="true" {...rest}>
			<div className="metric-bar-fill" style={{ width: `${widthPercent}%` }} />
		</div>
	);
}

export { MetricBar };
export type { MetricBarProps };
