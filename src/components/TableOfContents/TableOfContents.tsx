import React from "react";

import { Text } from "@/components/Text";
import type { TableOfContentsItem } from "@/lib/markdown";

import "./TableOfContents.styles.css";

// Create a context to share active item ID
const TableOfContentsContext = React.createContext<{
	activeId: string | null;
	setActiveId: (id: string | null) => void;
}>({ activeId: null, setActiveId: () => {} });

type TableOfContentsItemProps = {
	item: TableOfContentsItem;
	itemIndex?: number;
};

const TableOfContentsItem = ({ item, itemIndex }: TableOfContentsItemProps) => {
	const { activeId, setActiveId } = React.useContext(TableOfContentsContext);
	const isActive = activeId === item.id || (!activeId && itemIndex === 0);

	const checkIfActive = React.useCallback(() => {
		const target = document.getElementById(item.id);
		if (!target) return;

		const rect = target.getBoundingClientRect();
		const THRESHOLD = 22;

		// Check if this item should be active
		const isClosestToThreshold =
			rect.top <= THRESHOLD && rect.top > -target.offsetHeight;

		// If we're the active item and we've scrolled past the threshold, find previous item
		if (activeId === item.id && rect.top > THRESHOLD) {
			// Get all headings
			const allHeadings = Array.from(
				document.querySelectorAll(
					"h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
				),
			);
			const currentIndex = allHeadings.findIndex((el) => el.id === item.id);

			// If we have a previous heading, check if it should be active
			if (currentIndex > 0) {
				const prevHeading = allHeadings[currentIndex - 1];
				const prevRect = prevHeading.getBoundingClientRect();
				if (prevRect.top <= THRESHOLD) {
					setActiveId(prevHeading.id);
				}
			}
		}

		// Make this item active if it's closest to threshold
		if (isClosestToThreshold) {
			setActiveId(item.id);
		}
	}, [item.id, setActiveId, activeId]);

	React.useEffect(() => {
		// Initial check
		checkIfActive();

		// Add scroll listener
		document.addEventListener("scroll", checkIfActive);
		return () => {
			document.removeEventListener("scroll", checkIfActive);
		};
	}, [checkIfActive]);

	return (
		<li>
			<Text
				as="a"
				size="0"
				href={`#${item.id}`}
				onClick={(event) => {
					event.preventDefault();
					const target = document.getElementById(item.id);
					if (!target) return;
					target.scrollIntoView({ behavior: "smooth" });
				}}
				color={isActive ? "1" : "2"}
			>
				<span>{item.text}</span>
			</Text>
			{item.children.length > 0 && (
				<ul>
					{item.children.map((child) => (
						<TableOfContentsItem key={child.id} item={child} />
					))}
				</ul>
			)}
		</li>
	);
};

type TableOfContentsProps = {
	items: Array<TableOfContentsItem>;
};

function TableOfContents({ items }: TableOfContentsProps) {
	const [activeId, setActiveId] = React.useState<string | null>(null);
	const [containerStyle, setContainerStyle] =
		React.useState<React.CSSProperties>();
	const containerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const clampContainer =
			container.closest(".page-container") ?? container.closest(".post-layout");
		const postContainer = container.closest(".post-container");
		if (!(clampContainer instanceof HTMLElement)) return;
		if (!(postContainer instanceof HTMLElement)) return;

		const BORDER_OFFSET = 0;
		const TOP_ALIGNMENT_OFFSET = -1;
		const BOTTOM_ALIGNMENT_OFFSET = 0;
		const fixedTop =
			container.getBoundingClientRect().top + TOP_ALIGNMENT_OFFSET;

		const updatePosition = () => {
			const tocHeight = container.getBoundingClientRect().height;
			const layoutRect = clampContainer.getBoundingClientRect();
			const containerRect = postContainer.getBoundingClientRect();
			const maxBottom = layoutRect.bottom - BORDER_OFFSET;
			const wouldOverflowBottom = fixedTop + tocHeight > maxBottom;

			if (!wouldOverflowBottom) {
				setContainerStyle({ position: "fixed", top: `${fixedTop}px` });
				return;
			}

			const layoutBottomDoc = window.scrollY + layoutRect.bottom;
			const containerTopDoc = window.scrollY + containerRect.top;
			const absoluteTop = Math.max(
				0,
				layoutBottomDoc -
					tocHeight -
					BORDER_OFFSET -
					containerTopDoc +
					BOTTOM_ALIGNMENT_OFFSET,
			);

			setContainerStyle({ position: "absolute", top: `${absoluteTop}px` });
		};

		updatePosition();
		window.addEventListener("scroll", updatePosition, { passive: true });
		window.addEventListener("resize", updatePosition);
		const handleHoverChange = () => {
			window.requestAnimationFrame(updatePosition);
		};
		container.addEventListener("mouseenter", handleHoverChange);
		container.addEventListener("mouseleave", handleHoverChange);
		const resizeObserver = new ResizeObserver(updatePosition);
		resizeObserver.observe(container);

		return () => {
			window.removeEventListener("scroll", updatePosition);
			window.removeEventListener("resize", updatePosition);
			container.removeEventListener("mouseenter", handleHoverChange);
			container.removeEventListener("mouseleave", handleHoverChange);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="table-of-contents-container"
			style={containerStyle}
		>
			<TableOfContentsContext.Provider value={{ activeId, setActiveId }}>
				<div className="table-of-contents">
					<ul>
						{items.map((item, index) => (
							<TableOfContentsItem
								key={item.id}
								item={item}
								itemIndex={index}
							/>
						))}
					</ul>
				</div>
			</TableOfContentsContext.Provider>
		</div>
	);
}

export { TableOfContents };
