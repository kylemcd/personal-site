import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";

import { ErrorComponent } from "@/components/ErrorComponent";
import { Garage61 } from "@/components/Garage61";
import { Text } from "@/components/Text";
import { garage61 } from "@/lib/garage61";
import { buildMeta } from "@/lib/meta";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const racingResult = await garage61.summary();
	if (Result.isError(racingResult)) {
		console.error("Garage61 summary failed:", racingResult.error);
		return { racing: null };
	}
	return { racing: racingResult.value };
});

export const Route = createFileRoute("/racing/")({
	component: RacingRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: buildMeta({
			title: "Racing - Kyle McDonald",
			url: "https://kylemcd.com/racing",
			image: "https://kylemcd.com/open-graph/racing.png",
		}),
	}),
});

function RacingRoute() {
	const { racing } = Route.useLoaderData();
	const hasRacingOverview = Boolean(
		racing?.derived.overview.recentTracks.length ||
			racing?.derived.overview.recentCars.length ||
			racing?.derived.overview.totalTimeOnTrackSeconds,
	);

	if (!racing || !hasRacingOverview) {
		return (
			<div className="section-container">
				<Text as="p" size="1" color="2">
					No racing data available right now.
				</Text>
			</div>
		);
	}

	return (
		<div className="section-container section-container-flush-right">
			<Garage61 overview={racing.derived.overview} recentLayout="stack" />
		</div>
	);
}
