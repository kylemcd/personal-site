import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { AlbumShelf } from "@/components/AlbumShelf";
import { ErrorComponent } from "@/components/ErrorComponent";
import { PageSectionHeading } from "@/components/SectionHeading";
import { Text } from "@/components/Text";
import { WrappedListening } from "@/components/WrappedListening";
import { lastfm } from "@/lib/lastfm";
import { buildHead } from "@/lib/meta";
import "@/styles/routes/listening.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const listeningResult = await lastfm.recentActivity();
	return {
		listening: listeningResult.unwrapOr(null),
	};
});

const ListeningRoute = () => {
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
				<PageSectionHeading title="Listening" />
				<Text as="p" size="1" color="2">
					No listening data available right now.
				</Text>
			</div>
		);
	}

	return (
		<div className="section-container section-container-flush-right listening-page-section">
			<div className="listening-stack">
				{listening.wrapped ? (
					<WrappedListening
						wrapped={listening.wrapped}
						nowPlaying={listening.nowPlaying}
					/>
				) : (
					<div className="section-title-padded">
						<PageSectionHeading title="Listening" />
					</div>
				)}
				{listening.albums.length > 0 ? (
					<div className="listening-section listening-recent-section">
						<Text as="h3" size="1" weight="500">
							Recently played
						</Text>
						<AlbumShelf albums={listening.albums} />
					</div>
				) : null}
			</div>
		</div>
	);
};

export const Route = createFileRoute("/listening/")({
	component: ListeningRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () =>
		buildHead({
			title: "Listening - KPM",
			url: "https://kpm.sh/listening",
			image: "https://kpm.sh/open-graph/listening.png",
		}),
});
