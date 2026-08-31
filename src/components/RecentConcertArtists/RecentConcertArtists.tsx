import {
	FeaturedMediaMosaic,
	type FeaturedMediaMosaicItem,
} from "@/components/FeaturedMediaMosaic";

export type RecentConcertArtistTile = {
	name: string;
	showCount: number;
	imageUrl: string;
	artistPageUrl: string;
};

type RecentConcertArtistsProps = {
	artists: ReadonlyArray<RecentConcertArtistTile>;
	titleHref?: string;
};

const RecentConcertArtists = ({
	artists,
	titleHref,
}: RecentConcertArtistsProps) => {
	const items: Array<FeaturedMediaMosaicItem> = artists.map((artist) => ({
		accessibleLabel: `${artist.name}, seen at ${artist.showCount} ${artist.showCount === 1 ? "show" : "shows"}`,
		href: artist.artistPageUrl,
		imageUrl: artist.imageUrl,
		label: artist.name,
		secondaryLabel: `${artist.showCount.toLocaleString()} ${artist.showCount === 1 ? "show" : "shows"}`,
	}));

	return (
		<FeaturedMediaMosaic items={items} title="Concerts" titleHref={titleHref} />
	);
};

export { RecentConcertArtists };
