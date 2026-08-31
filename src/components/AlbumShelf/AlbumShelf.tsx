import { useState } from "react";

import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { Text } from "@/components/Text";
import type { Album } from "@/lib/lastfm/schema";

import "./Album.styles.css";

type CoverArtProps = {
	src: string;
	alt: string;
	className: string;
};

const CoverArt = ({ src, alt, className }: CoverArtProps) => {
	const [failed, setFailed] = useState(false);

	if (failed || !src.trim()) {
		return (
			<div
				className={className}
				data-cover-unavailable="true"
				role="img"
				aria-label={`${alt} cover unavailable`}
			>
				<Text as="span" size="0" color="2">
					No Cover
				</Text>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt={alt}
			className={className}
			onError={() => setFailed(true)}
		/>
	);
};

type AlbumShelfProps = {
	albums: ReadonlyArray<Album>;
	variant?: "scroll" | "grid";
};

type AlbumCardProps = {
	album: Album;
};

const AlbumCard = ({ album }: AlbumCardProps) => {
	return (
		<a
			className="album"
			href={album.url}
			target="_blank"
			rel="noopener noreferrer"
		>
			<CoverArt
				key={album.image}
				src={album.image}
				alt={album.name}
				className="album-image"
			/>
			<div className="album-info">
				<Text as="p" size="0" weight="500">
					{album.name}
				</Text>
				<Text as="p" size="0" color="2">
					{album.artist}
				</Text>
			</div>
		</a>
	);
};

const AlbumCards = ({ albums }: { albums: ReadonlyArray<Album> }) => {
	return albums.map((album) => <AlbumCard album={album} key={album.url} />);
};

const AlbumShelf = ({ albums, variant = "scroll" }: AlbumShelfProps) => {
	if (variant === "grid") {
		return (
			<div className="album-grid">
				<AlbumCards albums={albums} />
			</div>
		);
	}

	return (
		<HorizontalScrollContainer className="album-shelf">
			<AlbumCards albums={albums} />
		</HorizontalScrollContainer>
	);
};

export { AlbumShelf };
