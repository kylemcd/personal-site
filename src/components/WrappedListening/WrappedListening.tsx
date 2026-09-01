import {
	DitherRadarChart,
	DitherTreemapChart,
	type DitherTreemapDatum,
} from "@/components/DitherCharts";
import { PageSectionHeading } from "@/components/SectionHeading";
import { SectionStatRow } from "@/components/SectionStatRow";
import { StatBarList, type StatBarListRow } from "@/components/StatBarList";
import { Text } from "@/components/Text";
import { formatDuration, formatPercentLabel } from "@/lib/format";
import type { NowPlayingAlbum, WrappedData } from "@/lib/lastfm/schema";

import "./WrappedListening.styles.css";

type WrappedListeningProps = {
	wrapped: WrappedData;
	nowPlaying?: NowPlayingAlbum | null;
};

type WaveformBar = {
	id: string;
	order: number;
	height: number;
	warm: boolean;
};

const createWaveformBars = (
	seed: string,
	count: number,
): Array<WaveformBar> => {
	if (count <= 0) return [];

	let state = Array.from(seed).reduce(
		(current, character) => (current * 31 + character.charCodeAt(0)) >>> 0,
		0,
	);
	if (state === 0) state = 0x6d2b79f5;

	return Array.from({ length: count }, (_, index): WaveformBar => {
		state = (state * 1664525 + 1013904223) >>> 0;
		const noise = state / 4294967295;
		// Blend periodic waves + deterministic noise to create clustered peaks
		// similar to an audio waveform strip.
		const phaseA = Math.abs(Math.sin((index / count) * Math.PI * 10));
		const phaseB = Math.abs(Math.sin((index / count) * Math.PI * 22 + 0.7));
		const pulse = 0.58 * phaseA + 0.3 * phaseB + 0.12 * noise;
		const height = Math.round(7 + pulse * 58);
		const warmCutoff = Math.floor(count * 0.42);
		return {
			id: `${state}-${index}`,
			order: index,
			height,
			warm: index <= warmCutoff,
		};
	});
};

const WrappedListening = ({ wrapped, nowPlaying }: WrappedListeningProps) => {
	const topTracks = wrapped.topTracks.slice(0, 10);
	const topArtists = wrapped.topArtists.slice(0, 10);
	const topAlbums = wrapped.topAlbums.slice(0, 8);
	const topGenres = (wrapped.topGenres ?? []).slice(0, 6);
	const topArtistsTreemapBase = wrapped.topArtists
		.filter((artist) => artist.plays > 0)
		.slice(0, 20);
	const topArtistsTreemapHead = topArtistsTreemapBase.slice(0, 16);
	const topArtistsTreemapTail = topArtistsTreemapBase.slice(16);
	const topArtistsTreemapData: Array<DitherTreemapDatum> =
		topArtistsTreemapHead.map((artist) => ({
			name: artist.name,
			plays: artist.plays,
			share: artist.share,
		}));
	if (topArtistsTreemapTail.length > 0) {
		topArtistsTreemapData.push({
			name: "Other",
			plays: topArtistsTreemapTail.reduce(
				(total, artist) => total + artist.plays,
				0,
			),
			share: topArtistsTreemapTail.reduce(
				(total, artist) => total + artist.share,
				0,
			),
		});
	}

	const hasLiveNowPlaying = Boolean(nowPlaying);
	const liveTrackName = nowPlaying?.trackName ?? "";
	const liveArtist = nowPlaying?.artist ?? "";
	const liveArtistUrl = nowPlaying?.artistUrl ?? "";
	const liveAlbum = nowPlaying?.name ?? "";
	const liveAlbumUrl = nowPlaying?.url ?? "";
	const liveArtwork = nowPlaying?.image ?? null;
	const liveUrl = nowPlaying?.trackUrl ?? "";

	const waveformBars = hasLiveNowPlaying
		? createWaveformBars(
				`${liveTrackName}|${liveArtist}|${wrapped.totalScrobbles}`,
				48,
			)
		: [];

	const trackShareRows: Array<StatBarListRow> = topTracks.map((track) => ({
		key: `${track.name}-${track.artist}-${track.plays}`,
		title: (
			<a
				href={track.url}
				target="_blank"
				rel="noopener noreferrer"
				className="wrapped-inline-link"
			>
				{track.name}
			</a>
		),
		subtitleRight: (
			<>
				<a
					href={track.artistUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="wrapped-inline-link"
				>
					{track.artist}
				</a>{" "}
				· {track.plays} plays
			</>
		),
		percent: track.share,
		percentLabel: formatPercentLabel(track.share, { invalidLabel: "<1%" }),
	}));
	const artistShareRows: Array<StatBarListRow> = topArtists.map((artist) => ({
		key: `${artist.name}-${artist.plays}`,
		title: (
			<a
				href={artist.url}
				target="_blank"
				rel="noopener noreferrer"
				className="wrapped-inline-link"
			>
				{artist.name}
			</a>
		),
		subtitleRight: `${artist.plays} plays`,
		percent: artist.share,
		percentLabel: formatPercentLabel(artist.share, { invalidLabel: "<1%" }),
	}));
	const albumShareRows: Array<StatBarListRow> = topAlbums.map((album) => ({
		key: `${album.name}-${album.artist}-${album.plays}`,
		title: (
			<a
				href={album.url}
				target="_blank"
				rel="noopener noreferrer"
				className="wrapped-inline-link"
			>
				{album.name}
			</a>
		),
		subtitleLeft: (
			<>
				<a
					href={album.artistUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="wrapped-inline-link"
				>
					{album.artist}
				</a>{" "}
				· {album.plays} plays
			</>
		),
		percent: album.share,
		percentLabel: formatPercentLabel(album.share, { invalidLabel: "<1%" }),
	}));

	return (
		<div className="wrapped-listening-redesign">
			<div className="wrapped-listening-top">
				<PageSectionHeading title="Listening" />
				<Text
					as="p"
					size="0"
					color="2"
					family="tabular"
					className="wrapped-listening-window"
				>
					last 30 days
				</Text>
			</div>

			{hasLiveNowPlaying ? (
				<div className="wrapped-live">
					<a
						href={liveUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="wrapped-live-cover-link"
					>
						{liveArtwork ? (
							<img
								src={liveArtwork}
								alt={liveAlbum}
								className="wrapped-live-cover"
							/>
						) : (
							<div className="wrapped-live-cover-fallback" aria-hidden="true">
								<Text as="span" size="4" family="tabular" color="2">
									{liveTrackName.charAt(0).toUpperCase()}
								</Text>
							</div>
						)}
					</a>
					<div className="wrapped-live-copy">
						<Text
							as="p"
							size="0"
							color="2"
							family="tabular"
							className="wrapped-live-label"
						>
							<span className="wrapped-live-dot" aria-hidden="true" />
							Live
						</Text>
						<Text as="p" size="7" weight="500" className="wrapped-live-track">
							<a
								href={liveUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="wrapped-inline-link wrapped-live-track-link"
							>
								{liveTrackName}
							</a>
						</Text>
						<Text as="p" size="1" color="2" className="wrapped-live-meta">
							{liveArtistUrl ? (
								<a
									href={liveArtistUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="wrapped-inline-link"
								>
									{liveArtist}
								</a>
							) : (
								liveArtist
							)}{" "}
							·{" "}
							{liveAlbumUrl ? (
								<a
									href={liveAlbumUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="wrapped-inline-link"
								>
									{liveAlbum}
								</a>
							) : (
								liveAlbum
							)}
						</Text>
					</div>
					<div
						className="wrapped-waveform wrapped-live-waveform"
						aria-hidden="true"
					>
						{waveformBars.map((bar) => (
							<span
								key={bar.id}
								className="wrapped-waveform-bar"
								data-warm={bar.warm ? "true" : "false"}
								style={{
									height: `${bar.height}px`,
									animationDelay: `${(bar.order % 9) * 90}ms`,
									animationDuration: `${1050 + (bar.order % 7) * 85}ms`,
								}}
							/>
						))}
					</div>
				</div>
			) : null}

			<SectionStatRow
				className="wrapped-listening-kpis"
				items={[
					{
						key: "plays",
						label: (
							<Text
								as="p"
								size="0"
								color="2"
								className="wrapped-listening-kpi-label"
							>
								Plays
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="tabular"
								className="wrapped-kpi-value"
							>
								{wrapped.totalScrobbles}
							</Text>
						),
					},
					{
						key: "listening-time",
						label: (
							<Text
								as="p"
								size="0"
								color="2"
								className="wrapped-listening-kpi-label"
							>
								Listening time
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="tabular"
								className="wrapped-kpi-value"
							>
								{formatDuration(wrapped.totalListeningSeconds)}
							</Text>
						),
					},
					{
						key: "avg-session",
						label: (
							<Text
								as="p"
								size="0"
								color="2"
								className="wrapped-listening-kpi-label"
							>
								Avg session
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="tabular"
								className="wrapped-kpi-value"
							>
								{formatDuration(wrapped.averageSessionSeconds)}
							</Text>
						),
					},
					{
						key: "artists",
						label: (
							<Text
								as="p"
								size="0"
								color="2"
								className="wrapped-listening-kpi-label"
							>
								Artists
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="tabular"
								className="wrapped-kpi-value"
							>
								{wrapped.uniqueArtists}
							</Text>
						),
					},
				]}
			/>

			<div className="wrapped-repeat">
				<div className="wrapped-repeat-copy wrapped-artist-treemap-block">
					<div className="wrapped-artist-treemap">
						<DitherTreemapChart data={topArtistsTreemapData} />
					</div>
				</div>
				{topGenres.length > 2 ? (
					<div className="wrapped-genre-radar">
						<DitherRadarChart
							data={topGenres}
							height={220}
							ariaLabel="Listening genre breakdown"
						/>
					</div>
				) : null}
			</div>

			<div className="wrapped-lists-grid">
				<div className="wrapped-list-panel">
					<div className="wrapped-list-head">
						<Text as="p" size="0" color="2">
							Top tracks
						</Text>
					</div>
					<StatBarList
						rows={trackShareRows}
						barColor="var(--color-text-1)"
						percentColor="var(--color-text-2)"
						variant="listening"
						className="wrapped-list-rows"
					/>
				</div>

				<div className="wrapped-list-panel">
					<div className="wrapped-list-head">
						<Text as="p" size="0" color="2">
							Top artists
						</Text>
					</div>
					<StatBarList
						rows={artistShareRows}
						barColor="var(--color-text-1)"
						percentColor="var(--color-text-2)"
						variant="listening"
						className="wrapped-list-rows"
					/>
				</div>
			</div>

			{topAlbums.length > 0 ? (
				<div className="wrapped-list-panel wrapped-albums-panel">
					<div className="wrapped-list-head">
						<Text as="p" size="0" color="2">
							Top albums
						</Text>
					</div>
					<StatBarList
						rows={albumShareRows}
						barColor="var(--color-text-1)"
						percentColor="var(--color-text-2)"
						variant="listening"
						className="wrapped-list-rows"
					/>
				</div>
			) : null}
		</div>
	);
};

export { WrappedListening };
