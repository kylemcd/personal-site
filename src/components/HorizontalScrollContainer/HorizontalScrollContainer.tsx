import {
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

import "./HorizontalScrollContainer.styles.css";

type HorizontalScrollContainerProps = {
	children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const HorizontalScrollContainer = ({
	children,
	className,
	...props
}: HorizontalScrollContainerProps) => {
	const itemsRef = useRef<HTMLDivElement>(null);
	const [hasScrolledRight, setHasScrolledRight] = useState(false);

	useEffect(() => {
		const element = itemsRef.current;
		if (!element) return;

		const updateGradients = () => {
			setHasScrolledRight(element.scrollLeft > 0.5);
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
			className="horizontal-scroll-container"
			data-scrolled-right={hasScrolledRight}
		>
			<div
				{...props}
				ref={itemsRef}
				className={`horizontal-scroll-container-items ${className ?? ""}`}
			>
				{children}
			</div>
		</div>
	);
};

export { HorizontalScrollContainer };
