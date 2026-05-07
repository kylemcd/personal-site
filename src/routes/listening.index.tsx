import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";

import { AlbumShelf } from "@/components/AlbumShelf";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Text } from "@/components/Text";
import { WrappedListening } from "@/components/WrappedListening";
import { lastfm } from "@/lib/lastfm";
import { buildMeta } from "@/lib/meta";
import "@/styles/routes/listening.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const listeningResult = await lastfm.recentActivity();
	return {
		listening: Result.isOk(listeningResult) ? listeningResult.value : null,
	};
});

export const Route = createFileRoute("/listening/")({
	component: ListeningRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: buildMeta({
			title: "Listening - Kyle McDonald",
			url: "https://kylemcd.com/listening",
			image: "https://kylemcd.com/open-graph/listening.png",
		}),
	}),
});

function ListeningRoute() {
	const { listening } = Route.useLoaderData();
	const hasListeningContent = Boolean(
		listening &&
			(listening.nowPlaying ||
				listening.wrapped ||
				listening.albums.length > 0),
	);

	if (!hasListeningContent || !listening) {
		return (
			<div className="section-container">
				<Text as="p" size="1" color="2">
					No listening data available right now.
				</Text>
			</div>
		);
	}

	return (
		<div className="section-container section-container-flush-right listening-page-section">
			<div className="listening-stack">
				{listening.wrapped && (
					<WrappedListening
						wrapped={listening.wrapped}
						nowPlaying={listening.nowPlaying}
						variant="rich"
					/>
				)}
				<div className="listening-section listening-recent-section">
					<Text as="h3" size="1" weight="500">
						Recently played
					</Text>
					<AlbumShelf albums={listening.albums} variant="scroll" />
				</div>
			</div>
		</div>
	);
}
