import { Text } from "@/components/Text";
import { SectionStatRow } from "@/components/SectionStatRow";
import { StatBarList, type StatBarListRow } from "@/components/StatBarList";
import type { NowPlayingAlbum, WrappedData } from "@/lib/lastfm/schema";
import {
	PolarAngleAxis,
	PolarGrid,
	PolarRadiusAxis,
	Radar,
	RadarChart,
	ResponsiveContainer,
	Treemap,
	Tooltip,
} from "recharts";

import "./WrappedListening.styles.css";

type WrappedListeningProps = {
	wrapped: WrappedData;
	nowPlaying?: NowPlayingAlbum | null;
	variant?: "compact" | "rich";
	titleHref?: string;
};

type WaveformBar = {
	height: number;
	warm: boolean;
};

type RadarAngleTickProps = {
	x?: number | string;
	y?: number | string;
	textAnchor?: string;
	payload?: { value?: string };
};

type TreemapArtistNode = {
	name: string;
	plays: number;
	share: number;
};

type TreemapNodeProps = {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	name?: string;
	depth?: number;
	index?: number;
};

type TreemapTooltipPayload = {
	payload?: TreemapArtistNode;
};

type TreemapTooltipProps = {
	active?: boolean;
	payload?: ReadonlyArray<TreemapTooltipPayload>;
};

const formatDurationCompact = (seconds: number) => {
	if (seconds <= 0) return "0m";
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.round((seconds % 3600) / 60);
	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
};

const formatSharePercent = (value: number) => {
	if (!Number.isFinite(value) || value <= 0) return "<1%";
	if (value < 1) return "<1%";
	return `${Math.round(value)}%`;
};

const splitGenreAxisLabel = (value: string): [string, string?] => {
	const label = value.trim();
	const maxSingleLine = 12;
	if (label.length <= maxSingleLine) return [label];

	const words = label.split(/\s+/).filter(Boolean);
	if (words.length <= 1) {
		const midpoint = Math.ceil(label.length / 2);
		return [label.slice(0, midpoint), label.slice(midpoint)];
	}

	let bestIndex = 1;
	let bestDelta = Number.POSITIVE_INFINITY;
	for (let index = 1; index < words.length; index += 1) {
		const left = words.slice(0, index).join(" ");
		const right = words.slice(index).join(" ");
		const delta = Math.abs(left.length - right.length);
		if (delta < bestDelta) {
			bestDelta = delta;
			bestIndex = index;
		}
	}

	return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")];
};

const truncateTreemapLabel = (label: string, tileWidth: number) => {
	const innerWidth = Math.max(0, tileWidth - 14);
	const estimatedCharWidth = 7.2;
	const maxChars = Math.max(3, Math.floor(innerWidth / estimatedCharWidth));
	if (label.length <= maxChars) return label;
	if (maxChars <= 3) return "…";
	return `${label.slice(0, maxChars - 1)}…`;
};

const renderTreemapTile = ({
	x,
	y,
	width,
	height,
	name,
	depth,
	index,
}: TreemapNodeProps) => {
	if (
		typeof x !== "number" ||
		typeof y !== "number" ||
		typeof width !== "number" ||
		typeof height !== "number" ||
		!name
	) {
		return <g />;
	}
	if (depth !== 1) return <g />;

	const showLabel = width >= 54 && height >= 26;
	const label = truncateTreemapLabel(String(name), width);
	const tint = 0.84 - ((index ?? 0) % 5) * 0.07;
	const fill = `color-mix(in srgb, var(--color-listening-blue) ${Math.round(
		tint * 100,
	)}%, black)`;

	return (
		<g>
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				fill={fill}
				stroke="var(--color-bg-1)"
				strokeWidth={1}
			/>
			{showLabel ? (
				<text
					x={x + 8}
					y={y + 18}
					fill="var(--color-static-white)"
					fontSize={11}
					fontWeight={500}
					fontFamily="var(--font-family-body)"
				>
					{label}
					{label !== name ? <title>{String(name)}</title> : null}
				</text>
			) : null}
		</g>
	);
};

const renderTreemapTooltip = ({ active, payload }: TreemapTooltipProps) => {
	if (!active || !payload || payload.length === 0) return null;
	const item = payload[0]?.payload;
	if (!item) return null;
	return (
		<div className="wrapped-treemap-tooltip">
			<p className="wrapped-treemap-tooltip-name">{item.name}</p>
			<p className="wrapped-treemap-tooltip-meta">
				{item.plays} plays · {formatSharePercent(item.share)}
			</p>
		</div>
	);
};

const renderGenreAxisTick = ({
	x,
	y,
	textAnchor,
	payload,
}: RadarAngleTickProps) => {
	const rawValue = payload?.value ?? "";
	const fullLabel = String(rawValue);
	const [lineOne, lineTwo] = splitGenreAxisLabel(fullLabel);
	const tickX =
		typeof x === "number" ? x : typeof x === "string" ? Number.parseFloat(x) : Number.NaN;
	const tickY =
		typeof y === "number" ? y : typeof y === "string" ? Number.parseFloat(y) : Number.NaN;
	if (!Number.isFinite(tickX) || !Number.isFinite(tickY)) return null;
	const safeTextAnchor: "start" | "middle" | "end" | "inherit" =
		textAnchor === "start" ||
		textAnchor === "middle" ||
		textAnchor === "end" ||
		textAnchor === "inherit"
			? textAnchor
			: "middle";
	return (
		<text
			x={tickX}
			y={tickY}
			textAnchor={safeTextAnchor}
			fill="var(--color-text-2)"
			fontSize={11}
			fontFamily="var(--font-family-mono)"
			dominantBaseline="middle"
		>
			<tspan x={tickX} dy={lineTwo ? "-0.35em" : "0"}>
				{lineOne}
			</tspan>
			{lineTwo ? (
				<tspan x={tickX} dy="1.15em">
					{lineTwo}
				</tspan>
			) : null}
		</text>
	);
};

const createWaveformBars = (seed: string, count: number): Array<WaveformBar> => {
	let state = 0;
	for (const character of seed) {
		state = (state * 31 + character.charCodeAt(0)) >>> 0;
	}
	if (state === 0) state = 0x6d2b79f5;

	const bars: Array<WaveformBar> = [];
	for (let index = 0; index < count; index += 1) {
		state = (state * 1664525 + 1013904223) >>> 0;
		const noise = state / 4294967295;
		// Blend periodic waves + deterministic noise to create clustered peaks
		// similar to an audio waveform strip.
		const phaseA = Math.abs(Math.sin((index / count) * Math.PI * 10));
		const phaseB = Math.abs(Math.sin((index / count) * Math.PI * 22 + 0.7));
		const pulse = 0.58 * phaseA + 0.3 * phaseB + 0.12 * noise;
		const height = Math.round(7 + pulse * 58);
		const warmCutoff = Math.floor(count * 0.42);
		bars.push({
			height,
			warm: index <= warmCutoff,
		});
	}

	return bars;
};

function WrappedListening({
	wrapped,
	nowPlaying,
	variant = "compact",
	titleHref,
}: WrappedListeningProps) {
	const isRich = variant === "rich";
	const trackLimit = isRich ? 10 : 5;
	const artistLimit = isRich ? 10 : 5;
	const albumLimit = isRich ? 8 : 0;

	const topTracks = wrapped.topTracks.slice(0, trackLimit);
	const topArtists = wrapped.topArtists.slice(0, artistLimit);
	const topAlbums = wrapped.topAlbums.slice(0, albumLimit);
	const topGenres = (wrapped.topGenres ?? []).slice(0, 6);
	const topArtistsTreemapBase = wrapped.topArtists
		.filter((artist) => artist.plays > 0)
		.slice(0, 20);
	const topArtistsTreemapHead = topArtistsTreemapBase.slice(0, 16);
	const topArtistsTreemapTail = topArtistsTreemapBase.slice(16);
	const topArtistsTreemapData: Array<TreemapArtistNode> = topArtistsTreemapHead.map(
		(artist) => ({
			name: artist.name,
			plays: artist.plays,
			share: artist.share,
		}),
	);
	if (topArtistsTreemapTail.length > 0) {
		topArtistsTreemapData.push({
			name: "Other",
			plays: topArtistsTreemapTail.reduce((total, artist) => total + artist.plays, 0),
			share: topArtistsTreemapTail.reduce((total, artist) => total + artist.share, 0),
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
				isRich ? 48 : 40,
			)
		: [];

	const sectionTitle = titleHref ? (
		<a className="section-heading-link" href={titleHref}>
			<span className="section-heading-label">Listening</span>
			<i className="hn hn-angle-right section-heading-icon" aria-hidden="true" />
		</a>
	) : (
		"Listening"
	);

	const trackShareRows: Array<StatBarListRow> = topTracks.map((track) => ({
		key: `${track.name}-${track.artist}-${track.plays}`,
		title: (
			<a href={track.url} target="_blank" rel="noopener noreferrer" className="wrapped-inline-link">
				{track.name}
			</a>
		),
		subtitleRight: (
			<>
				<a href={track.artistUrl} target="_blank" rel="noopener noreferrer" className="wrapped-inline-link">
					{track.artist}
				</a>{" "}
				· {track.plays} plays
			</>
		),
		percent: track.share,
		percentLabel: formatSharePercent(track.share),
	}));
	const artistShareRows: Array<StatBarListRow> = topArtists.map((artist) => ({
		key: `${artist.name}-${artist.plays}`,
		title: (
			<a href={artist.url} target="_blank" rel="noopener noreferrer" className="wrapped-inline-link">
				{artist.name}
			</a>
		),
		subtitleRight: `${artist.plays} plays`,
		percent: artist.share,
		percentLabel: formatSharePercent(artist.share),
	}));
	const albumShareRows: Array<StatBarListRow> = topAlbums.map((album) => ({
		key: `${album.name}-${album.artist}-${album.plays}`,
		title: (
			<a href={album.url} target="_blank" rel="noopener noreferrer" className="wrapped-inline-link">
				{album.name}
			</a>
		),
		subtitleLeft: (
			<>
				<a href={album.artistUrl} target="_blank" rel="noopener noreferrer" className="wrapped-inline-link">
					{album.artist}
				</a>{" "}
				· {album.plays} plays
			</>
		),
		percent: album.share,
		percentLabel: formatSharePercent(album.share),
	}));

	return (
		<div
			className={`wrapped-listening-redesign${isRich ? " wrapped-listening-redesign-rich" : ""}`}
		>
			<div className="wrapped-listening-top">
				<Text as="h2" size="2" className="wrapped-listening-title">
					{sectionTitle}
				</Text>
				<Text
					as="p"
					size="0"
					color="2"
					family="mono"
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
							<img src={liveArtwork} alt={liveAlbum} className="wrapped-live-cover" />
						) : (
							<div className="wrapped-live-cover-fallback" aria-hidden="true">
								<Text as="span" size="4" family="mono" color="2">
									{liveTrackName.charAt(0).toUpperCase()}
								</Text>
							</div>
						)}
					</a>
					<div className="wrapped-live-copy">
						<Text as="p" size="0" color="2" family="mono" className="wrapped-live-label">
							<span className="wrapped-live-dot" aria-hidden="true" />
							Live
						</Text>
						<Text as="p" size={isRich ? "7" : "6"} weight="500" className="wrapped-live-track">
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
					<div className="wrapped-waveform wrapped-live-waveform" aria-hidden="true">
						{waveformBars.map((bar, index) => (
							<span
								key={`wave-${index}`}
								className={`wrapped-waveform-bar${bar.warm ? " is-warm" : ""}`}
								style={{
									height: `${bar.height}px`,
									animationDelay: `${(index % 9) * 90}ms`,
									animationDuration: `${1050 + (index % 7) * 85}ms`,
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
							<Text as="p" size="0" color="2" className="wrapped-listening-kpi-label">
								Plays
							</Text>
						),
						value: (
							<Text as="p" size="6" family="mono" className="wrapped-kpi-value">
								{wrapped.totalScrobbles}
							</Text>
						),
					},
					{
						key: "listening-time",
						label: (
							<Text as="p" size="0" color="2" className="wrapped-listening-kpi-label">
								Listening time
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="mono"
								className="wrapped-kpi-value wrapped-kpi-duration-value"
							>
								{formatDurationCompact(wrapped.totalListeningSeconds)}
							</Text>
						),
					},
					{
						key: "avg-session",
						label: (
							<Text as="p" size="0" color="2" className="wrapped-listening-kpi-label">
								Avg session
							</Text>
						),
						value: (
							<Text
								as="p"
								size="6"
								family="mono"
								className="wrapped-kpi-value wrapped-kpi-duration-value"
							>
								{formatDurationCompact(wrapped.averageSessionSeconds)}
							</Text>
						),
					},
					{
						key: "artists",
						label: (
							<Text as="p" size="0" color="2" className="wrapped-listening-kpi-label">
								Artists
							</Text>
						),
						value: (
							<Text as="p" size="6" family="mono" className="wrapped-kpi-value">
								{wrapped.uniqueArtists}
							</Text>
						),
					},
				]}
			/>

			<div className="wrapped-repeat">
				<div className="wrapped-repeat-copy wrapped-artist-treemap-block">
					<div className="wrapped-artist-treemap">
						<ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={1}>
							<Treemap
								data={topArtistsTreemapData}
								dataKey="plays"
								nameKey="name"
								aspectRatio={4 / 3}
								isAnimationActive={false}
								content={renderTreemapTile}
							>
								<Tooltip
									content={renderTreemapTooltip}
									cursor={{ stroke: "var(--color-static-white)", strokeOpacity: 0.35, strokeWidth: 1 }}
								/>
							</Treemap>
						</ResponsiveContainer>
					</div>
				</div>
				{topGenres.length > 2 ? (
					<div className="wrapped-genre-radar">
						<ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={1}>
							<RadarChart
								data={topGenres}
								margin={{ top: 24, right: 36, bottom: 24, left: 36 }}
								outerRadius="68%"
							>
								<PolarGrid stroke="var(--color-ui-2)" strokeOpacity={0.6} />
								<PolarAngleAxis
									dataKey="name"
									tick={renderGenreAxisTick}
								/>
								<PolarRadiusAxis
									axisLine={false}
									tick={false}
									tickCount={4}
									domain={[0, "dataMax"]}
								/>
								<Radar
									dataKey="share"
									stroke="var(--color-listening-blue)"
									fill="var(--color-listening-blue)"
									fillOpacity={0.24}
									strokeWidth={1.5}
									dot={false}
									activeDot={false}
								/>
							</RadarChart>
						</ResponsiveContainer>
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
						barColorVar="--color-listening-blue"
						percentColorVar="--color-listening-blue"
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
						barColorVar="--color-listening-blue"
						percentColorVar="--color-listening-blue"
						className="wrapped-list-rows"
					/>
				</div>
			</div>

			{isRich && topAlbums.length > 0 ? (
				<div className="wrapped-list-panel wrapped-albums-panel">
					<div className="wrapped-list-head">
						<Text as="p" size="0" color="2">
							Top albums
						</Text>
					</div>
					<StatBarList
						rows={albumShareRows}
						barColorVar="--color-listening-blue"
						percentColorVar="--color-listening-blue"
						className="wrapped-list-rows"
					/>
				</div>
			) : null}
		</div>
	);
}

export { WrappedListening };
