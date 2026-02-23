import { Text } from "@/components/Text";
import type { WrappedData } from "@/lib/lastfm/schema";

import "./WrappedListening.styles.css";

type WrappedListeningProps = {
	wrapped: WrappedData;
};

function WrappedListening({ wrapped }: WrappedListeningProps) {
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

	return (
		<div className="wrapped-listening">
			<div className="wrapped-repeat">
				<div className="wrapped-repeat-copy">
					<Text as="p" size="1">
						{openingSentence}
						{topArtistSentence} {funFactsParagraph}
					</Text>
				</div>
			</div>

			<div className="wrapped-lists">
				<div className="wrapped-list">
					<Text as="p" size="0" color="2">
						Top Tracks
					</Text>
					<div>
						{wrapped.topTracks.map((track, index) => (
							<div
								className="wrapped-row"
								key={`${track.name}-${track.artist}-${track.plays}`}
							>
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
								<Text as="p" size="0" color="2" className="wrapped-row-detail">
									{track.share}% of his monthly listening ({track.plays} plays)
								</Text>
							</div>
						))}
					</div>
				</div>

				<div className="wrapped-list">
					<Text as="p" size="0" color="2">
						Top Artists
					</Text>
					<div>
						{wrapped.topArtists.map((artist, index) => (
							<div
								className="wrapped-row"
								key={`${artist.name}-${artist.plays}`}
							>
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
								<Text as="p" size="0" color="2" className="wrapped-row-detail">
									{artist.share}% of his listening ({artist.plays} plays)
								</Text>
							</div>
						))}
					</div>
				</div>

				<div className="wrapped-list">
					<Text as="p" size="0" color="2">
						Top Albums
					</Text>
					<div>
						{wrapped.topAlbums.map((album, index) => (
							<div
								className="wrapped-row"
								key={`${album.name}-${album.artist}-${album.plays}`}
							>
								<Text as="p" size="0" className="wrapped-row-title">
									<span className="wrapped-row-rank">{index + 1}</span>
									<a
										href={album.url}
										target="_blank"
										rel="noopener noreferrer"
										className="wrapped-inline-link"
									>
										{album.name}
									</a>{" "}
									by{" "}
									<a
										href={album.artistUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="wrapped-inline-link"
									>
										{album.artist}
									</a>
								</Text>
								<Text as="p" size="0" color="2" className="wrapped-row-detail">
									{album.share}% of his monthly listening ({album.plays} plays)
								</Text>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export { WrappedListening };
