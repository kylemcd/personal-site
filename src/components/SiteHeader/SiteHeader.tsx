import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { Experience } from "@/components/Experience";
import { SiteIntro } from "@/components/SiteIntro";
import { SiteNavigation } from "@/components/SiteNavigation";
import { Wordmark } from "@/components/Wordmark";

import "./SiteHeader.styles.css";

function SiteHeader() {
	const { pathname } = useLocation();
	const compact = pathname !== "/";
	const headerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const header = headerRef.current;
		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		const supportsScrollTimeline = CSS.supports("animation-timeline: scroll()");

		if (
			compact ||
			!header ||
			prefersReducedMotion.matches ||
			supportsScrollTimeline
		) {
			return;
		}

		header.dataset.scrollAnimation = "fallback";

		let animationFrame = 0;

		const updateWordmark = () => {
			animationFrame = 0;

			const rootFontSize =
				Number.parseFloat(
					window.getComputedStyle(document.documentElement).fontSize,
				) || 16;
			const headerStyles = window.getComputedStyle(header);
			const gutter = Number.parseFloat(headerStyles.paddingLeft) || 0;
			const expandedPadding =
				Number.parseFloat(headerStyles.paddingTop) || gutter;
			const fullWidth = Math.max(window.innerWidth - gutter * 2, 0);
			const compactWidth = Math.min(
				Math.max(window.innerWidth * 0.18, rootFontSize * 7),
				rootFontSize * 13,
			);
			const compactTop = Math.min(
				Math.max(window.innerWidth * 0.015, rootFontSize),
				rootFontSize * 1.25,
			);
			const collapseDistance = Math.min(
				Math.max(window.innerHeight * 0.42, rootFontSize * 14),
				rootFontSize * 30,
			);
			const progress = Math.min(
				Math.max(window.scrollY / collapseDistance, 0),
				1,
			);
			const width = fullWidth - (fullWidth - compactWidth) * progress;
			const wordmarkPadding =
				expandedPadding + (compactTop - expandedPadding) * progress;

			header.style.setProperty("--site-wordmark-fallback-width", `${width}px`);
			header.style.setProperty(
				"--site-wordmark-fallback-padding",
				`${wordmarkPadding}px`,
			);
		};

		const requestUpdate = () => {
			if (animationFrame === 0) {
				animationFrame = window.requestAnimationFrame(updateWordmark);
			}
		};

		requestUpdate();
		window.addEventListener("scroll", requestUpdate, { passive: true });
		window.addEventListener("resize", requestUpdate);

		return () => {
			window.removeEventListener("scroll", requestUpdate);
			window.removeEventListener("resize", requestUpdate);
			window.cancelAnimationFrame(animationFrame);
			header.removeAttribute("data-scroll-animation");
			header.style.removeProperty("--site-wordmark-fallback-width");
			header.style.removeProperty("--site-wordmark-fallback-padding");
		};
	}, [compact]);

	if (compact) {
		return (
			<header ref={headerRef} className="site-header" data-variant="compact">
				<Wordmark variant="compact" />
				<SiteNavigation />
			</header>
		);
	}

	return (
		<header ref={headerRef} className="site-header" data-variant="standard">
			<div className="site-header-wordmark">
				<Wordmark />
			</div>
			<SiteNavigation />
			<div className="site-header-details">
				<SiteIntro />
				<aside className="site-header-experience" aria-label="Experience">
					<Experience />
				</aside>
			</div>
		</header>
	);
}

export { SiteHeader };
