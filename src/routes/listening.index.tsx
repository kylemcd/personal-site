import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { AlbumShelf, Equalizer, NowPlaying } from "@/components/AlbumShelf";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Text } from "@/components/Text";
import { WrappedListening } from "@/components/WrappedListening";
import { lastfm } from "@/lib/lastfm";
import "@/styles/routes/home.css";
import "@/styles/routes/listening.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const listening = await Effect.runPromise(
		lastfm
			.recentActivity()
			.pipe(Effect.catchAll(() => Effect.succeed(null))),
	);

	return { listening };
});

export const Route = createFileRoute("/listening/")({
	component: ListeningRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: [{ title: "Listening - Kyle McDonald" }],
	}),
});

function ListeningRoute() {
	const { listening } = Route.useLoaderData();
	const hasListeningContent = Boolean(
		listening &&
			(listening.nowPlaying || listening.wrapped || listening.albums.length > 0),
	);

	if (!hasListeningContent || !listening) {
		return null;
	}

	return (
		<div className="section-container section-container-flush-right listening-page-section">
			<Text as="h2" size="2">
				Listening
			</Text>
			<div className="listening-stack">
				{listening.wrapped && (
					<WrappedListening
						wrapped={listening.wrapped}
						variant="rich"
						preListsContent={
							listening.nowPlaying ? (
								<div className="listening-section">
									<div className="listening-section-header">
										<Text as="h3" size="1" weight="500">
											Now
										</Text>
										<Equalizer />
									</div>
									<NowPlaying album={listening.nowPlaying} />
								</div>
							) : null
						}
					/>
				)}
				<div className="listening-section">
					<Text as="h3" size="1" weight="500">
						Recently Played
					</Text>
					<AlbumShelf albums={listening.albums} variant="grid" />
				</div>
			</div>
		</div>
	);
}
