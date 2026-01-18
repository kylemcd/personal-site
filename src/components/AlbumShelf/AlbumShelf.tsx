import { useEffect, useRef, useState } from "react";

import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { Text } from "@/components/Text";
import type { Album, NowPlayingAlbum } from "@/lib/lastfm/schema";

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

type MarqueeProps = {
	text: string;
	size?: "0" | "1";
	color?: "1" | "2";
};

function Marquee({ text, size = "1", color = "1" }: MarqueeProps) {
	const containerRef = useRef<HTMLSpanElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [shouldScroll, setShouldScroll] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		const textEl = textRef.current;

		if (container && textEl) {
			const isOverflowing = textEl.scrollWidth > container.clientWidth;
			setShouldScroll(isOverflowing);
		}
	}, []);

	return (
		<span
			className="marquee"
			data-size={size}
			data-color={color}
			data-scroll={shouldScroll}
			ref={containerRef}
		>
			<span className="marquee-content">
				<span ref={textRef}>{text}</span>
				{shouldScroll && <span aria-hidden="true">{text}</span>}
			</span>
		</span>
	);
}

type NowPlayingProps = {
	album: NowPlayingAlbum;
};

function NowPlaying({ album }: NowPlayingProps) {
	return (
		<a
			className="now-playing"
			href={album.trackUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			<img src={album.image} alt={album.name} className="now-playing-image" />
			<div className="now-playing-info">
				<Marquee text={album.trackName} size="1" color="1" />
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
