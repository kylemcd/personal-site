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
		meta: [{ title: "Uses - Kyle McDonald" }],
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
