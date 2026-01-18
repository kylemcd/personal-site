import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { Text } from "@/components/Text";
import type { Album } from "@/lib/lastfm/schema";

import "./Album.styles.css";

function Equalizer() {
	return (
		<span className="equalizer">
			<span className="equalizer-bar" />
			<span className="equalizer-bar" />
			<span className="equalizer-bar" />
		</span>
	);
}

type NowPlayingProps = {
	album: Album;
};

function NowPlaying({ album }: NowPlayingProps) {
	return (
		<a
			className="now-playing"
			href={album.url}
			target="_blank"
			rel="noopener noreferrer"
		>
			<img src={album.image} alt={album.name} className="now-playing-image" />
			<div className="now-playing-info">
				<Text as="p" size="1">
					{album.name}
				</Text>
				<Text as="p" size="0" color="2">
					{album.artist}
				</Text>
			</div>
		</a>
	);
}

type AlbumShelfProps = {
	albums: ReadonlyArray<Album>;
};

function AlbumShelf({ albums }: AlbumShelfProps) {
	return (
		<HorizontalScrollContainer className="album-shelf">
			{albums.map((album) => (
				<a
					className="album"
					key={album.mbid}
					href={album.url}
					target="_blank"
					rel="noopener noreferrer"
				>
					<img src={album.image} alt={album.name} className="album-image" />
					<div className="album-info">
						<Text as="p" size="1">
							{album.name}
						</Text>
						<Text as="p" size="0" color="2">
							{album.artist}
						</Text>
					</div>
				</a>
			))}
		</HorizontalScrollContainer>
	);
}

export { AlbumShelf, Equalizer, NowPlaying };
