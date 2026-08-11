import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ErrorComponent } from "@/components/ErrorComponent";
import { UsesTable } from "@/components/UsesTable";
import { buildHead } from "@/lib/meta";
import { uses } from "@/lib/uses";
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
	head: () =>
		buildHead({
			title: "Uses - Kyle McDonald",
			description: "All of the hardware, software, etc that I use.",
			url: "https://kpm.sh/uses",
			image: "https://kpm.sh/open-graph/uses.png",
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
