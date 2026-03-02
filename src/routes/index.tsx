import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { AlbumShelf, Equalizer, NowPlaying } from "@/components/AlbumShelf";
import { Bookshelf } from "@/components/Bookshelf";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Experience } from "@/components/Experience";
import { Garage61 } from "@/components/Garage61";
import { HomeHero } from "@/components/HomeHero";
import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { Text } from "@/components/Text";
import { WrappedListening } from "@/components/WrappedListening";
import { WritingList } from "@/components/WritingList";
import { garage61 } from "@/lib/garage61";
import { goodreads } from "@/lib/goodreads";
import { lastfm } from "@/lib/lastfm";
import { markdown } from "@/lib/markdown";
import "@/styles/routes/home.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const result = await Effect.runPromise(
		Effect.all([
			lastfm
				.recentActivity()
				.pipe(
					Effect.catchAll(() => Effect.succeed(null)),
				),
			markdown.all().pipe(Effect.catchAll(() => Effect.succeed([]))),
			goodreads
				.shelf()
				.pipe(
					Effect.catchAll(() =>
						Effect.succeed({ reading: [], finished: [], next: [] }),
					),
				),
			garage61.summary().pipe(
				Effect.tapErrorCause((cause) =>
					Effect.sync(() => {
						console.error("Garage61 summary failed:", cause);
					}),
				),
				Effect.catchAllCause(() => Effect.succeed(null)),
			),
		]),
	);

	return {
		listening: result[0],
		writing: result[1],
		books: result[2],
		racing: result[3],
	};
});

export const Route = createFileRoute("/")({
	component: Home,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: [
			{ title: "Kyle McDonald" },
			{ property: "og:title", content: "Kyle McDonald" },
			{
				property: "og:description",
				content:
					"Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
			},
			{ property: "og:url", content: "https://kylemcd.com" },
			{
				property: "og:image",
				content: "https://kylemcd.com/open-graph/home.png",
			},
			{ property: "og:image:type", content: "image/png" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:site_name", content: "Kyle McDonald" },
			{ property: "og:locale", content: "en-US" },
			{ property: "og:type", content: "website" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Kyle McDonald" },
			{
				name: "twitter:description",
				content:
					"Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.",
			},
			{
				name: "twitter:image",
				content: "https://kylemcd.com/open-graph/home.png",
			},
		],
	}),
});

function Home() {
	const { listening, writing, books, racing } = Route.useLoaderData();
	const hasListeningContent = Boolean(
		listening &&
			(listening.nowPlaying || listening.wrapped || listening.albums.length > 0),
	);
	const hasBooks = Boolean(
		(books?.reading?.length ?? 0) > 0 || (books?.finished?.length ?? 0) > 0,
	);
	const hasRacingOverview = Boolean(
		racing?.derived.overview.recentTracks.length ||
			racing?.derived.overview.recentCars.length ||
			racing?.derived.overview.totalTimeOnTrackSeconds,
	);

	return (
		<>
			<HomeHero />
			<div className="section-container">
				<Text as="h2" size="2">
					Writing
				</Text>
				<WritingList writing={writing} />
			</div>
			<div className="section-container">
				<Text as="h2" size="2">
					Experience
				</Text>
				<Experience />
			</div>
			{hasListeningContent && listening && (
				<div className="section-container section-container-flush-right">
					<div className="listening-stack">
						{listening.wrapped && (
							<WrappedListening wrapped={listening.wrapped} />
						)}
						<HorizontalScrollContainer className="listening-container">
							{listening.nowPlaying && (
								<div className="listening-section">
									<div className="listening-section-header">
										<Text as="h3" size="1" weight="500">
											Now
										</Text>
										<Equalizer />
									</div>
									<NowPlaying album={listening.nowPlaying} />
								</div>
							)}
							<div className="listening-section">
								<Text as="h3" size="1" weight="500">
									Recently Played
								</Text>
								<AlbumShelf albums={listening.albums} />
							</div>
						</HorizontalScrollContainer>
					</div>
				</div>
			)}
			{hasBooks && (
				<div className="section-container section-container-flush-right">
					<HorizontalScrollContainer className="bookshelf-container">
						<div className="bookshelf-section">
							<Text as="h2" size="2">
								Reading
							</Text>
							<Bookshelf books={books.reading} />
						</div>
						<div className="bookshelf-section">
							<Text as="h2" size="2">
								Finished
							</Text>
							<Bookshelf books={books.finished} />
						</div>
					</HorizontalScrollContainer>
				</div>
			)}
			{racing && hasRacingOverview && (
				<div className="section-container section-container-flush-right">
					<Garage61 overview={racing.derived.overview} />
				</div>
			)}
		</>
	);
}
