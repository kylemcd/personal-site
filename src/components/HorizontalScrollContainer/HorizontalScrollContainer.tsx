import { useEffect, useRef, useState } from "react";

import "./HorizontalScrollContainer.styles.css";

type HorizontalScrollContainerProps = {
	children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

function HorizontalScrollContainer({
	children,
	...props
}: HorizontalScrollContainerProps) {
	const itemsRef = useRef<HTMLDivElement>(null);
	const [showLeftGradient, setShowLeftGradient] = useState(false);

	useEffect(() => {
		const element = itemsRef.current;
		if (!element) return;

		const updateGradients = () => {
			setShowLeftGradient(element.scrollLeft > 0.5);
		};

		updateGradients();
		element.addEventListener("scroll", updateGradients, { passive: true });

		let resizeObserver: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(updateGradients);
			resizeObserver.observe(element);
		}

		return () => {
			element.removeEventListener("scroll", updateGradients);
			resizeObserver?.disconnect();
		};
	}, []);

	return (
		<div
			className={`horizontal-scroll-container${showLeftGradient ? " is-scrolled-right" : ""}`}
		>
			<div
				{...props}
				ref={itemsRef}
				className={`horizontal-scroll-container-items ${props.className ?? ""}`}
			>
				{children}
			</div>
		</div>
	);
}

export { HorizontalScrollContainer };
