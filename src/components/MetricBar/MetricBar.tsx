import type { CSSProperties, HTMLAttributes } from "react";

import "./MetricBar.styles.css";
import { clampPercent } from "@/lib/format";

type MetricBarProps = HTMLAttributes<HTMLDivElement> & {
	value: number;
	height?: number;
	fillColor?: string;
};

const MetricBar = ({
	value,
	height,
	fillColor,
	className,
	style,
	...rest
}: MetricBarProps) => {
	const safeValue = Number.isFinite(value) ? clampPercent(value) : 0;
	const widthPercent = safeValue > 0 ? Math.max(2, safeValue) : 0;
	const mergedStyle: CSSProperties = {
		...(style ?? {}),
		...(typeof height === "number" ? { height: `${height}px` } : {}),
		...(fillColor
			? ({
					"--metric-bar-fill-color": fillColor,
				} as CSSProperties)
			: {}),
	};

	const trackClasses = ["metric-bar-track", className]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			className={trackClasses}
			style={mergedStyle}
			aria-hidden="true"
			{...rest}
		>
			<div className="metric-bar-fill" style={{ width: `${widthPercent}%` }} />
		</div>
	);
};

export { MetricBar };
