import { HorizontalScrollContainer } from "@/components/HorizontalScrollContainer";
import { Text } from "@/components/Text";
import type { WrappedData } from "@/lib/lastfm/schema";

import "./WrappedListening.styles.css";

type WrappedListeningProps = {
	wrapped: WrappedData;
	variant?: "compact" | "rich";
	preListsContent?: React.ReactNode;
};

function WrappedListening({
	wrapped,
	variant = "compact",
	preListsContent,
}: WrappedListeningProps) {
	const compactLimit = 5;
	const topTracks =
		variant === "compact"
			? wrapped.topTracks.slice(0, compactLimit)
			: wrapped.topTracks;
	const topArtists =
		variant === "compact"
			? wrapped.topArtists.slice(0, compactLimit)
			: wrapped.topArtists;
	const topAlbums =
		variant === "compact"
			? wrapped.topAlbums.slice(0, compactLimit)
			: wrapped.topAlbums;

	const funFactsParagraph = wrapped.funFacts.join(" ");
	const openingSentence =
		wrapped.topTrack.plays > 3 ? (
			<>
				This month, Kyle kept{" "}
				<a
					href={wrapped.topTrack.url}
					target="_blank"
					rel="noopener noreferrer"
					className="wrapped-inline-link"
				>
					{wrapped.topTrack.name}
				</a>{" "}
				by{" "}
				<a
					href={wrapped.topTrack.artistUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="wrapped-inline-link"
				>
					{wrapped.topTrack.artist}
				</a>{" "}
				on repeat for {wrapped.topTrack.plays} plays.
			</>
		) : (
			<>
				This month, Kyle's most-played track was{" "}
				<a
					href={wrapped.topTrack.url}
					target="_blank"
					rel="noopener noreferrer"
					className="wrapped-inline-link"
				>
					{wrapped.topTrack.name}
				</a>{" "}
				by{" "}
				<a
					href={wrapped.topTrack.artistUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="wrapped-inline-link"
				>
					{wrapped.topTrack.artist}
				</a>{" "}
				at {wrapped.topTrack.plays} plays.
			</>
		);
	const topArtistSentence =
		wrapped.topArtist.share >= 30 ? (
			<>
				{" "}
				<a
					href={wrapped.topArtists[0]?.url ?? wrapped.topTrack.artistUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="wrapped-inline-link"
				>
					{wrapped.topArtist.name}
				</a>{" "}
				accounted for {wrapped.topArtist.share}% of listening.
			</>
		) : null;

	const renderThumbnail = (params: {
		image: string | null;
		label: string;
		href: string;
	}) => {
		const fallback = params.label.charAt(0).toUpperCase();
		return (
			<a
				href={params.href}
				target="_blank"
				rel="noopener noreferrer"
				className="wrapped-thumb-link"
				aria-label={params.label}
			>
				<div className="wrapped-row-thumb" aria-hidden="true">
					{params.image ? (
						<img
							src={params.image}
							alt=""
							className="wrapped-row-thumb-image"
						/>
					) : (
						<span className="wrapped-row-thumb-fallback">{fallback}</span>
					)}
				</div>
				<span className="sr-only">{params.label}</span>
			</a>
		);
	};

	if (variant === "rich") {
		return (
			<div className="wrapped-listening wrapped-listening-rich">
				<div className="wrapped-repeat">
					<div className="wrapped-repeat-copy">
						<Text as="p" size="1" color="1">
							{openingSentence}
							{topArtistSentence} {funFactsParagraph}
						</Text>
					</div>
				</div>

				{preListsContent ? (
					<div className="wrapped-rich-prelists">{preListsContent}</div>
				) : null}

				<div className="wrapped-rich-lists">
					<div className="wrapped-list">
						<Text
							as="p"
							size="1"
							weight="500"
							className="wrapped-rich-list-title"
						>
							Top Tracks
						</Text>
						<HorizontalScrollContainer className="wrapped-rich-scroller">
							{topTracks.map((track, index) => (
								<div
									className="wrapped-rich-card"
									key={`${track.name}-${track.artist}-${track.plays}`}
								>
									{renderThumbnail({
										image: track.image,
										label: track.name,
										href: track.url,
									})}
									<div className="wrapped-rich-card-body">
										<Text
											as="p"
											size="0"
											color="2"
											className="wrapped-rich-rank"
										>
											{index + 1}
										</Text>
										<div className="wrapped-rich-track-copy">
											<Text as="p" size="0" className="wrapped-rich-card-title">
												<a
													href={track.url}
													target="_blank"
													rel="noopener noreferrer"
													className="wrapped-inline-link"
												>
													{track.name}
												</a>
											</Text>
											<Text
												as="p"
												size="0"
												color="2"
												className="wrapped-rich-card-subtitle"
											>
												<a
													href={track.artistUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="wrapped-inline-link"
												>
													{track.artist}
												</a>
											</Text>
											<Text
												as="p"
												size="0"
												color="2"
												className="wrapped-rich-card-detail"
											>
												{track.share}% of listening ({track.plays} plays)
											</Text>
										</div>
									</div>
								</div>
							))}
						</HorizontalScrollContainer>
					</div>

					<div className="wrapped-list">
						<Text
							as="p"
							size="1"
							weight="500"
							className="wrapped-rich-list-title"
						>
							Top Artists
						</Text>
						<HorizontalScrollContainer className="wrapped-rich-scroller">
							{topArtists.map((artist, index) => (
								<div
									className="wrapped-rich-card"
									key={`${artist.name}-${artist.plays}`}
								>
									{renderThumbnail({
										image: artist.image,
										label: artist.name,
										href: artist.url,
									})}
									<div className="wrapped-rich-card-body">
										<Text
											as="p"
											size="0"
											color="2"
											className="wrapped-rich-rank"
										>
											{index + 1}
										</Text>
										<Text as="p" size="0" className="wrapped-rich-card-title">
											<a
												href={artist.url}
												target="_blank"
												rel="noopener noreferrer"
												className="wrapped-inline-link"
											>
												{artist.name}
											</a>
										</Text>
										<Text
											as="p"
											size="0"
											color="2"
											className="wrapped-rich-card-detail"
										>
											{artist.share}% of listening ({artist.plays} plays)
										</Text>
									</div>
								</div>
							))}
						</HorizontalScrollContainer>
					</div>

					<div className="wrapped-list">
						<Text
							as="p"
							size="1"
							weight="500"
							className="wrapped-rich-list-title"
						>
							Top Albums
						</Text>
						<HorizontalScrollContainer className="wrapped-rich-scroller">
							{topAlbums.map((album, index) => (
								<div
									className="wrapped-rich-card"
									key={`${album.name}-${album.artist}-${album.plays}`}
								>
									{renderThumbnail({
										image: album.image,
										label: album.name,
										href: album.url,
									})}
									<div className="wrapped-rich-card-body">
										<Text
											as="p"
											size="0"
											color="2"
											className="wrapped-rich-rank"
										>
											{index + 1}
										</Text>
										<Text as="p" size="0" className="wrapped-rich-card-title">
											<a
												href={album.url}
												target="_blank"
												rel="noopener noreferrer"
												className="wrapped-inline-link"
											>
												{album.name}
											</a>
										</Text>
										<Text
											as="p"
											size="0"
											color="2"
											className="wrapped-rich-card-subtitle"
										>
											<a
												href={album.artistUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="wrapped-inline-link"
											>
												{album.artist}
											</a>
										</Text>
										<Text
											as="p"
											size="0"
											color="2"
											className="wrapped-rich-card-detail"
										>
											{album.share}% of listening ({album.plays} plays)
										</Text>
									</div>
								</div>
							))}
						</HorizontalScrollContainer>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="wrapped-listening">
			<div className="wrapped-repeat">
				<div className="wrapped-repeat-copy">
					<Text as="p" size="1" color="1">
						{openingSentence}
						{topArtistSentence} {funFactsParagraph}
					</Text>
				</div>
			</div>

			<div className="wrapped-lists">
				<div className="wrapped-list">
					<Text as="p" size="1" weight="500">
						Top Tracks
					</Text>
					<div className="wrapped-row-group">
						{topTracks.map((track, index) => (
							<div
								className="wrapped-row wrapped-row-ladder"
								key={`${track.name}-${track.artist}-${track.plays}`}
							>
								<div className="wrapped-row-meta">
									<Text as="p" size="0" className="wrapped-row-title">
										<span className="wrapped-row-rank">{index + 1}</span>
										<a
											href={track.url}
											target="_blank"
											rel="noopener noreferrer"
											className="wrapped-inline-link"
										>
											{track.name}
										</a>{" "}
										by{" "}
										<a
											href={track.artistUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="wrapped-inline-link"
										>
											{track.artist}
										</a>
									</Text>
									<Text
										as="p"
										size="0"
										color="2"
										className="wrapped-row-subline"
									>
										{track.share}% of listening ({track.plays} plays)
									</Text>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="wrapped-list">
					<Text as="p" size="1" weight="500">
						Top Artists
					</Text>
					<div className="wrapped-row-group">
						{topArtists.map((artist, index) => (
							<div
								className="wrapped-row wrapped-row-ladder"
								key={`${artist.name}-${artist.plays}`}
							>
								<div className="wrapped-row-meta">
									<Text as="p" size="0" className="wrapped-row-title">
										<span className="wrapped-row-rank">{index + 1}</span>
										<a
											href={artist.url}
											target="_blank"
											rel="noopener noreferrer"
											className="wrapped-inline-link"
										>
											{artist.name}
										</a>
									</Text>
									<Text
										as="p"
										size="0"
										color="2"
										className="wrapped-row-subline"
									>
										{artist.share}% of listening ({artist.plays} plays)
									</Text>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export { WrappedListening };
