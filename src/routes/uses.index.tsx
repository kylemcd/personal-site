import { createFileRoute } from "@tanstack/react-router";

import { ErrorComponent } from "@/components/ErrorComponent";
import { Text } from "@/components/Text";
import { Uses } from "@/components/Uses";
import "@/styles/routes/uses.css";

export const Route = createFileRoute("/uses/")({
	component: UsesRoute,
	errorComponent: ErrorComponent,
	head: () => ({
		meta: [{ title: "Uses - Kyle McDonald" }],
	}),
});

function UsesRoute() {
	return (
		<div className="section-stack">
			<div className="section-container">
				<Text as="h1" size="3">
					Uses
				</Text>
				<Text as="p" size="3" color="2">
					Here's a list of hardware, software, and other things I use day to day.
				</Text>
			</div>
			<Uses />
		</div>
	);
}
