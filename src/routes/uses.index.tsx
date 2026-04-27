import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ErrorComponent } from "@/components/ErrorComponent";
import { UsesTable } from "@/components/UsesTable";
import { uses } from "@/lib/uses";
import "@/styles/routes/home.css";
import "@/styles/routes/uses.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	return {
		items: uses.list(),
	};
});

export const Route = createFileRoute("/uses/")({
	component: UsesRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: [
			{ title: "Uses - Kyle McDonald" },
			{ property: "og:title", content: "Uses - Kyle McDonald" },
			{
				property: "og:description",
				content: "All of the hardware, software, etc that I use.",
			},
			{ property: "og:url", content: "https://kylemcd.com" },
			{
				property: "og:image",
				content: "https://kylemcd.com/open-graph/uses.png",
			},
			{ property: "og:image:type", content: "image/png" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:site_name", content: "Uses -Kyle McDonald" },
			{ property: "og:locale", content: "en-US" },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Uses -Kyle McDonald" },
			{
				name: "twitter:description",
				content: "All of the hardware, software, etc that I use.",
			},
			{
				name: "twitter:image",
				content: "https://kylemcd.com/open-graph/uses.png",
			},
		],
	}),
});

function UsesRoute() {
	const { items } = Route.useLoaderData();

	return (
		<div className="section-container uses-page-section">
			<UsesTable items={items} />
		</div>
	);
}
