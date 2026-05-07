import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
import { buildMeta } from "@/lib/meta";
import "@/styles/global.css";

function initializeTheme() {
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
}

const themeScript = `(${initializeTheme.toString()})();`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			...buildMeta({ title: "Kyle McDonald" }),
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<link
					rel="alternate"
					type="application/rss+xml"
					title="Kyle McDonald's RSS Feed"
					href="https://kylemcd.com/rss.xml"
				/>
				<link rel="icon" href="/images/avatar.png" type="image/png" />
			</head>
			<body>
				<div className="page-container">
					<Navigation />
					{children}
				</div>
				<Footer />
				<Scripts />
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme script must run before first paint to avoid flash */}
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				{process.env.NODE_ENV === "production" && (
					<script
						async
						src="https://scripts.simpleanalyticscdn.com/latest.js"
					></script>
				)}
			</body>
		</html>
	);
}
