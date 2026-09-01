import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";

import { Bookshelf } from "@/components/Bookshelf";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Garage61 } from "@/components/Garage61";
import {
	RecentConcertArtists,
	type RecentConcertArtistTile,
} from "@/components/RecentConcertArtists";
import {
	RecentListeningAlbums,
	type RecentListeningAlbumTile,
} from "@/components/RecentListeningAlbums";
import {
	HomepageSectionHeading,
	type SectionTitle,
} from "@/components/SectionHeading";
import { Text } from "@/components/Text";
import { HomepageWritingList } from "@/components/WritingList";
import { deezer } from "@/lib/deezer";
import { garage61 } from "@/lib/garage61";
import { goodreads } from "@/lib/goodreads";
import { lastfm } from "@/lib/lastfm";
import { buildHead } from "@/lib/meta";
import { posts } from "@/lib/posts/posts";
import { setlistfm } from "@/lib/setlistfm";
import { selectRecentConcertArtists } from "@/lib/setlistfm/recent-artists";
import { spotify } from "@/lib/spotify";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const [listeningRes, booksRes, racingRes, concertsRes, writingRes] =
		await Promise.all([
			lastfm.recentActivity(),
			goodreads.shelf(),
			garage61.summary(),
			setlistfm.attendedConcerts(),
			posts.all(),
		]);

	const listening = listeningRes.unwrapOr(null);
	const writing = writingRes.unwrapOr([]);
	const books = booksRes.unwrapOr({ reading: [], finished: [], next: [] });
	const racing = racingRes.unwrapOr(null);
	const concerts = concertsRes.unwrapOr(null);
	const recentConcerts = concerts ? selectRecentConcertArtists(concerts) : [];
	const homepageAlbums = listening?.albums.slice(0, 10) ?? [];
	const [spotifyArtistImagesRes, deezerArtistImagesRes, albumPlayCountsRes] =
		await Promise.all([
			spotify.artistImages(
				recentConcerts.map((artist) => ({
					name: artist.name,
					mbid: artist.mbid,
				})),
			),
			deezer.artistImages(recentConcerts.map((artist) => artist.name)),
			lastfm.albumPlayCounts(homepageAlbums),
		]);
	const imageByArtist = new Map(
		[
			...deezerArtistImagesRes.unwrapOr([]),
			...spotifyArtistImagesRes.unwrapOr([]),
		].map((image) => [image.name.toLocaleLowerCase(), image]),
	);
	const recentConcertArtists: Array<RecentConcertArtistTile> =
		recentConcerts.flatMap((artist) => {
			const image = imageByArtist.get(artist.name.toLocaleLowerCase());
			return image
				? [
						{
							name: artist.name,
							showCount: artist.showCount,
							imageUrl: image.imageUrl,
							artistPageUrl: image.pageUrl,
						},
					]
				: [];
		});
	const albumPlayCountByKey = new Map(
		albumPlayCountsRes
			.unwrapOr([])
			.map((album) => [
				`${album.name.toLocaleLowerCase()}::${album.artist.toLocaleLowerCase()}`,
				album.plays,
			]),
	);
	const recentListeningAlbums: Array<RecentListeningAlbumTile> =
		homepageAlbums.map((album) => ({
			albumPageUrl: album.url,
			artist: album.artist,
			imageUrl: album.image,
			name: album.name,
			playCount:
				albumPlayCountByKey.get(
					`${album.name.toLocaleLowerCase()}::${album.artist.toLocaleLowerCase()}`,
				) ?? null,
		}));

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
	if (Result.isError(spotifyArtistImagesRes)) {
		console.error("Spotify artistImages failed:", spotifyArtistImagesRes.error);
	}
	if (Result.isError(deezerArtistImagesRes)) {
		console.error("Deezer artistImages failed:", deezerArtistImagesRes.error);
	}
	if (Result.isError(albumPlayCountsRes)) {
		console.error("Last.fm albumPlayCounts failed:", albumPlayCountsRes.error);
	}
	if (Result.isError(writingRes)) {
		console.error("Published posts failed:", writingRes.error);
	}

	return {
		writing,
		books,
		racing,
		concerts,
		recentConcertArtists,
		recentListeningAlbums,
	};
});

const HomeRoute = () => {
	const {
		writing,
		books,
		racing,
		concerts,
		recentConcertArtists,
		recentListeningAlbums,
	} = Route.useLoaderData();
	const hasListeningContent = recentListeningAlbums.length > 0;
	const hasBooks = books.reading.length > 0 || books.finished.length > 0;
	const hasRacingOverview = Boolean(
		racing?.derived.overview.recentTracks.length ||
			racing?.derived.overview.recentCars.length ||
			racing?.derived.overview.totalTimeOnTrackSeconds,
	);
	const hasConcerts = Boolean(concerts && concerts.totalShows > 0);
	const homepageBooks = Array.from(
		new Map(
			[...books.reading, ...books.finished].map((book) => [book.slug, book]),
		).values(),
	);

	return (
		<>
			<div className="section-container">
				<HomepageSectionHeading href="/posts" title="Writing" />
				<HomepageWritingList writing={writing} />
			</div>
			{racing && hasRacingOverview ? (
				<div className="section-container section-container-flush-right">
					<Garage61 overview={racing.derived.overview} titleHref="/racing" />
				</div>
			) : (
				<HomepageSectionFallback
					href="/racing"
					title="Racing"
					message="No racing data available right now."
				/>
			)}
			{hasListeningContent ? (
				<div className="section-container section-container-flush-right">
					<RecentListeningAlbums
						albums={recentListeningAlbums}
						titleHref="/listening"
					/>
				</div>
			) : (
				<HomepageSectionFallback
					href="/listening"
					title="Listening"
					message="No listening data available right now."
				/>
			)}
			{hasConcerts && recentConcertArtists.length > 0 ? (
				<div className="section-container section-container-flush-right">
					<RecentConcertArtists
						artists={recentConcertArtists}
						titleHref="/concerts"
					/>
				</div>
			) : (
				<HomepageSectionFallback
					href="/concerts"
					title="Concerts"
					message="No concert data available right now."
				/>
			)}
			{hasBooks ? (
				<div className="section-container">
					<HomepageSectionHeading href="/reading" title="Reading" />
					<Bookshelf books={homepageBooks} variant="masonry" />
				</div>
			) : (
				<HomepageSectionFallback
					href="/reading"
					title="Reading"
					message="No reading data available right now."
				/>
			)}
		</>
	);
};

export const Route = createFileRoute("/")({
	component: HomeRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => buildHead({ title: "KPM" }),
});

type HomepageSectionFallbackProps = {
	href: string;
	message: string;
	title: SectionTitle;
};

const HomepageSectionFallback = ({
	href,
	message,
	title,
}: HomepageSectionFallbackProps) => {
	return (
		<div className="section-container">
			<HomepageSectionHeading href={href} title={title} />
			<Text as="p" size="1" color="2">
				{message}
			</Text>
		</div>
	);
};
