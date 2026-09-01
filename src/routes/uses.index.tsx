import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";

import { ErrorComponent } from "@/components/ErrorComponent";
import { UsesTable } from "@/components/UsesTable";
import { buildHead } from "@/lib/meta";
import { uses } from "@/lib/uses";
import "@/styles/routes/uses.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const result = uses.list();
	if (Result.isError(result)) throw result.error;
	return { items: result.value };
});

const UsesRoute = () => {
	const { items } = Route.useLoaderData();

	return (
		<div className="section-container uses-page-section">
			<UsesTable items={items} />
		</div>
	);
};

export const Route = createFileRoute("/uses/")({
	component: UsesRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () =>
		buildHead({
			title: "Uses - KPM",
			description: "All of the hardware, software, etc that I use.",
			url: "https://kpm.sh/uses",
			image: "https://kpm.sh/open-graph/uses.png",
		}),
});
