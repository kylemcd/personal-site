import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";

import { AlbumShelf } from "@/components/AlbumShelf";
import { Bookshelf } from "@/components/Bookshelf";
import { ConcertsSection } from "@/components/ConcertsSection";
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
import { buildMeta } from "@/lib/meta";
import { setlistfm } from "@/lib/setlistfm";
import "@/styles/routes/home.css";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const [listeningRes, booksRes, racingRes, concertsRes] = await Promise.all([
		lastfm.recentActivity(),
		goodreads.shelf(),
		garage61.summary(),
		setlistfm.attendedConcerts(),
	]);
	const writingRes = markdown.all();

	const listening = Result.isOk(listeningRes) ? listeningRes.value : null;
	const writing = Result.isOk(writingRes) ? writingRes.value : [];
	const books = Result.isOk(booksRes)
		? booksRes.value
		: { reading: [], finished: [], next: [] };
	const racing = Result.isOk(racingRes) ? racingRes.value : null;
	const concerts = Result.isOk(concertsRes) ? concertsRes.value : null;

	if (Result.isError(listeningRes)) {
		console.error("Last.fm recentActivity failed:", listeningRes.error);
	}
	if (Result.isError(booksRes)) {
		console.error("Goodreads shelf failed:", booksRes.error);
	}
	if (Result.isError(racingRes)) {
		console.error("Garage61 summary failed:", racingRes.error);
	}
	if (Result.isError(concertsRes)) {
		console.error("Setlist.fm attendedConcerts failed:", concertsRes.error);
	}

	return {
		listening,
		writing,
		books,
		racing,
		concerts,
	};
});

export const Route = createFileRoute("/")({
	component: HomeRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: buildMeta({ title: "Kyle McDonald" }),
	}),
});

function HomeRoute() {
	const { listening, writing, books, racing, concerts } = Route.useLoaderData();
	const hasListeningContent = Boolean(
		listening &&
			(listening.nowPlaying ||
				listening.wrapped ||
				listening.albums.length > 0),
	);
	const hasBooks = Boolean(
		(books?.reading?.length ?? 0) > 0 || (books?.finished?.length ?? 0) > 0,
	);
	const hasRacingOverview = Boolean(
		racing?.derived.overview.recentTracks.length ||
			racing?.derived.overview.recentCars.length ||
			racing?.derived.overview.totalTimeOnTrackSeconds,
	);
	const hasConcerts = Boolean(concerts && concerts.totalShows > 0);

	return (
		<>
			<HomeHero />
			<div className="section-container">
				<Text as="h2" size="2">
					<a className="section-heading-link" href="/posts">
						<span className="section-heading-label">Writing</span>
						<i
							className="hn hn-angle-right section-heading-icon"
							aria-hidden="true"
						/>
					</a>
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
							<WrappedListening
								wrapped={listening.wrapped}
								nowPlaying={listening.nowPlaying}
								titleHref="/listening"
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
			)}
			{hasBooks && (
				<div className="section-container section-container-flush-right">
					<HorizontalScrollContainer className="bookshelf-container">
						<div className="bookshelf-section">
							<Text as="h2" size="2">
								<a className="section-heading-link" href="/reading">
									<span className="section-heading-label">Reading</span>
									<i
										className="hn hn-angle-right section-heading-icon"
										aria-hidden="true"
									/>
								</a>
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
					<Garage61 overview={racing.derived.overview} titleHref="/racing" />
				</div>
			)}
			{hasConcerts && concerts && (
				<div className="section-container section-container-flush-right">
					<ConcertsSection concerts={concerts} titleHref="/concerts" />
				</div>
			)}
		</>
	);
}
