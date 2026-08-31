import {
	FeaturedMediaMosaic,
	type FeaturedMediaMosaicItem,
} from "@/components/FeaturedMediaMosaic";

const HOMEPAGE_ALBUM_LIMIT = 10;

export type RecentListeningAlbumTile = {
	albumPageUrl: string;
	artist: string;
	imageUrl: string;
	name: string;
	playCount: number | null;
};

type RecentListeningAlbumsProps = {
	albums: ReadonlyArray<RecentListeningAlbumTile>;
	titleHref?: string;
};

const RecentListeningAlbums = ({
	albums,
	titleHref,
}: RecentListeningAlbumsProps) => {
	const items: Array<FeaturedMediaMosaicItem> = albums
		.slice(0, HOMEPAGE_ALBUM_LIMIT)
		.map((album) => ({
			accessibleLabel: `${album.name} by ${album.artist}${album.playCount === null ? "" : `, ${album.playCount} ${album.playCount === 1 ? "album play" : "album plays"}`}`,
			href: album.albumPageUrl,
			imageUrl: album.imageUrl,
			label: album.name,
			secondaryLabel:
				album.playCount === null
					? album.artist
					: `${album.artist} · ${album.playCount.toLocaleString()} ${album.playCount === 1 ? "album play" : "album plays"}`,
		}));

	return (
		<FeaturedMediaMosaic
			items={items}
			layout="uniform"
			title="Listening"
			titleHref={titleHref}
		/>
	);
};

export { RecentListeningAlbums };
