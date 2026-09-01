import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { Text } from "@/components/Text";
import type { TableOfContentsItem } from "@/lib/markdown";

import "./TableOfContents.styles.css";

const TableOfContentsContext = createContext<{
	activeId: string | null;
}>({ activeId: null });

type TableOfContentsItemProps = {
	item: TableOfContentsItem;
	itemIndex?: number;
};

const TableOfContentsListItem = ({
	item,
	itemIndex,
}: TableOfContentsItemProps) => {
	const { activeId } = useContext(TableOfContentsContext);
	const isActive = activeId === item.id || (!activeId && itemIndex === 0);

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
					const reducedMotion = window.matchMedia(
						"(prefers-reduced-motion: reduce)",
					).matches;
					target.scrollIntoView({
						behavior: reducedMotion ? "instant" : "smooth",
					});
				}}
				color={isActive ? "1" : "2"}
			>
				<span>{item.text}</span>
			</Text>
			{item.children.length > 0 && (
				<ul>
					{item.children.map((child) => (
						<TableOfContentsListItem key={child.id} item={child} />
					))}
				</ul>
			)}
		</li>
	);
};

type TableOfContentsProps = {
	items: Array<TableOfContentsItem>;
};

const flattenItems = (
	items: ReadonlyArray<TableOfContentsItem>,
): Array<TableOfContentsItem> =>
	items.flatMap((item) => [item, ...flattenItems(item.children)]);

const TableOfContents = ({ items }: TableOfContentsProps) => {
	const [activeId, setActiveId] = useState<string | null>(null);
	const flatItems = useMemo(() => flattenItems(items), [items]);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const headings = flatItems
			.map(({ id }) => document.getElementById(id))
			.filter((heading): heading is HTMLElement => heading !== null);
		if (headings.length === 0) return;

		const threshold = 22;
		let animationFrame = 0;
		const updateActiveHeading = () => {
			animationFrame = 0;
			let activeHeading = headings[0];
			for (const heading of headings) {
				if (heading.getBoundingClientRect().top > threshold) break;
				activeHeading = heading;
			}
			setActiveId((current) =>
				current === activeHeading?.id ? current : (activeHeading?.id ?? null),
			);
		};
		const scheduleUpdate = () => {
			if (animationFrame === 0) {
				animationFrame = window.requestAnimationFrame(updateActiveHeading);
			}
		};

		scheduleUpdate();
		document.addEventListener("scroll", scheduleUpdate, { passive: true });
		window.addEventListener("resize", scheduleUpdate);
		return () => {
			document.removeEventListener("scroll", scheduleUpdate);
			window.removeEventListener("resize", scheduleUpdate);
			window.cancelAnimationFrame(animationFrame);
		};
	}, [flatItems]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const clampContainer =
			container.closest(".page-container") ?? container.closest(".post-layout");
		const postContainer = container.closest(".post-container");
		if (!(clampContainer instanceof HTMLElement)) return;
		if (!(postContainer instanceof HTMLElement)) return;

		const TOP_ALIGNMENT_OFFSET = -1;
		const fixedTop =
			container.getBoundingClientRect().top + TOP_ALIGNMENT_OFFSET;
		let animationFrame = 0;

		const updatePosition = () => {
			animationFrame = 0;
			const tocHeight = container.getBoundingClientRect().height;
			const layoutRect = clampContainer.getBoundingClientRect();
			const containerRect = postContainer.getBoundingClientRect();
			const maxBottom = layoutRect.bottom;
			const wouldOverflowBottom = fixedTop + tocHeight > maxBottom;

			if (!wouldOverflowBottom) {
				container.style.position = "fixed";
				container.style.top = `${fixedTop}px`;
				return;
			}

			const layoutBottomDoc = window.scrollY + layoutRect.bottom;
			const containerTopDoc = window.scrollY + containerRect.top;
			const absoluteTop = Math.max(
				0,
				layoutBottomDoc - tocHeight - containerTopDoc,
			);

			container.style.position = "absolute";
			container.style.top = `${absoluteTop}px`;
		};

		const scheduleUpdate = () => {
			if (animationFrame === 0) {
				animationFrame = window.requestAnimationFrame(updatePosition);
			}
		};
		updatePosition();
		window.addEventListener("scroll", scheduleUpdate, { passive: true });
		window.addEventListener("resize", scheduleUpdate);
		container.addEventListener("mouseenter", scheduleUpdate);
		container.addEventListener("mouseleave", scheduleUpdate);
		const resizeObserver = new ResizeObserver(scheduleUpdate);
		resizeObserver.observe(container);

		return () => {
			window.removeEventListener("scroll", scheduleUpdate);
			window.removeEventListener("resize", scheduleUpdate);
			container.removeEventListener("mouseenter", scheduleUpdate);
			container.removeEventListener("mouseleave", scheduleUpdate);
			resizeObserver.disconnect();
			window.cancelAnimationFrame(animationFrame);
		};
	}, []);

	return (
		<div ref={containerRef} className="table-of-contents-container">
			<TableOfContentsContext.Provider value={{ activeId }}>
				<div className="table-of-contents">
					<ul>
						{items.map((item, index) => (
							<TableOfContentsListItem
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
};

export { TableOfContents };
