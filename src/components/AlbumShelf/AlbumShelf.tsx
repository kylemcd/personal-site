import { useEffect, useRef, useState } from "react";

import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { Text } from "@/components/Text";
import type { Album } from "@/lib/lastfm/schema";

import "./Album.styles.css";

type CoverArtProps = {
	src: string;
	alt: string;
	className: string;
};

function CoverArt({ src, alt, className }: CoverArtProps) {
	const [failed, setFailed] = useState(false);
	const imageRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		setFailed(false);
		if (!src.trim()) return;

		const img = imageRef.current;
		if (!img) return;
		if (img.complete && img.naturalWidth === 0) {
			setFailed(true);
		}
	}, [src]);

	if (failed || !src.trim()) {
		return (
			<div
				className={`${className} cover-art-fallback`}
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
			ref={imageRef}
			src={src}
			alt={alt}
			className={className}
			onError={() => setFailed(true)}
		/>
	);
}

type AlbumShelfProps = {
	albums: ReadonlyArray<Album>;
	variant?: "scroll" | "grid";
};

type AlbumCardProps = {
	album: Album;
};

function AlbumCard({ album }: AlbumCardProps) {
	return (
		<a
			className="album"
			href={album.url}
			target="_blank"
			rel="noopener noreferrer"
		>
			<CoverArt src={album.image} alt={album.name} className="album-image" />
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
}

function AlbumShelf({ albums, variant = "scroll" }: AlbumShelfProps) {
	const content = albums.map((album) => (
		<AlbumCard album={album} key={album.mbid} />
	));

	if (variant === "grid") {
		return <div className="album-grid">{content}</div>;
	}

	return (
		<HorizontalScrollContainer className="album-shelf">
			{content}
		</HorizontalScrollContainer>
	);
}

export { AlbumShelf };
