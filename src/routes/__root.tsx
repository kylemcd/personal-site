import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Footer } from "@/components/Footer";
import { Navigation } from "@/components/Navigation";
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
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Kyle McDonald",
			},
			{ property: "icon", content: "/images/avatar.png" },
			{ property: "og:title", content: "Kyle McDonald" },
			{
				property: "og:description",
				content:
					"Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
			},
			{ property: "og:url", content: "https://kylemcd.com" },
			{
				property: "og:image",
				content: "https://kylemcd.com/open-graph/home.png",
			},
			{ property: "og:image:type", content: "image/png" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:site_name", content: "Kyle McDonald" },
			{ property: "og:locale", content: "en-US" },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Kyle McDonald" },
			{
				name: "twitter:description",
				content:
					"Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
			},
			{
				name: "twitter:image",
				content: "https://kylemcd.com/open-graph/home.png",
			},
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<link rel="icon" href="/images/avatar.png" type="image/png" />
			</head>
			<body>
				<div className="page-container">
					<Navigation />
					{children}
				</div>
				<Footer />
				<Scripts />
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: I want to do this. */}
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
