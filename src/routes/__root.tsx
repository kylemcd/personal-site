import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta } from "@/lib/meta";
import "@/styles/global.css";

const initializeTheme = () => {
	const themeCookie = document.cookie
		.split("; ")
		.find((row) => row.startsWith("theme="))
		?.split("=")[1];
	if (themeCookie) {
		document.documentElement.setAttribute("data-appearance", themeCookie);
	} else {
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		document.documentElement.setAttribute(
			"data-appearance",
			prefersDark ? "dark" : "light",
		);
	}
};

const themeScript = `(${initializeTheme.toString()})();`;

const RootDocument = ({ children }: { children: ReactNode }) => {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme must be set before styles paint */}
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				<HeadContent />
				<link
					rel="alternate"
					type="application/rss+xml"
					title="Kyle McDonald's RSS Feed"
					href="https://kpm.sh/rss.xml"
				/>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
				<link
					rel="icon"
					href="/favicon-32.png"
					type="image/png"
					sizes="32x32"
				/>
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				<link rel="manifest" href="/manifest.json" />
			</head>
			<body>
				<div className="site-shell">
					<SiteHeader />
					<main className="site-content">{children}</main>
					<Footer />
				</div>
				<Scripts />
				{process.env.NODE_ENV === "production" && (
					<script
						async
						src="https://scripts.simpleanalyticscdn.com/latest.js"
					></script>
				)}
			</body>
		</html>
	);
};

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			...buildMeta({ title: "KPM" }),
		],
	}),

	shellComponent: RootDocument,
});
