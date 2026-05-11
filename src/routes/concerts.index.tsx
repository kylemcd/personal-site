import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";

import { ConcertsSection } from "@/components/ConcertsSection";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Text } from "@/components/Text";
import { buildMeta } from "@/lib/meta";
import { setlistfm } from "@/lib/setlistfm";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const concertsResult = await setlistfm.attendedConcerts();
	return {
		concerts: Result.isOk(concertsResult) ? concertsResult.value : null,
	};
});

export const Route = createFileRoute("/concerts/")({
	component: ConcertsRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: buildMeta({
			title: "Concerts - Kyle McDonald",
			url: "https://kylemcd.com/concerts",
		}),
	}),
});

function ConcertsRoute() {
	const { concerts } = Route.useLoaderData();
	const hasConcerts = Boolean(concerts && concerts.totalShows > 0);

	if (!hasConcerts || !concerts) {
		return (
			<div className="section-container">
				<Text as="p" size="1" color="2">
					No concert data available right now.
				</Text>
			</div>
		);
	}

	return (
		<div className="section-container section-container-flush-right">
			<ConcertsSection concerts={concerts} />
		</div>
	);
}
