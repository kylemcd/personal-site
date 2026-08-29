import { Dialog } from "@base-ui/react/dialog";
import { type CSSProperties, useRef, useState } from "react";

import { Text } from "@/components/Text";
import { formatDuration } from "@/lib/format";
import type { Garage61Summary } from "@/lib/garage61/schema";
import { getTrackMapAssets } from "@/lib/garage61/track-maps";

type RecentTrack =
	Garage61Summary["derived"]["overview"]["recentTracks"][number];

type RecentTrackMapsProps = { tracks: Array<RecentTrack> };

type TrackMapAssets = NonNullable<ReturnType<typeof getTrackMapAssets>>;

type TrackDialogStyle = CSSProperties & {
	"--track-dialog-origin-x": string;
	"--track-dialog-origin-y": string;
	"--track-dialog-origin-scale": number;
};

const defaultDialogStyle: TrackDialogStyle = {
	"--track-dialog-origin-x": "0px",
	"--track-dialog-origin-y": "0px",
	"--track-dialog-origin-scale": 0.2,
};

function TrackMapLayers({
	assets,
	detail = false,
	label,
}: {
	assets: TrackMapAssets;
	detail?: boolean;
	label: string;
}) {
	return (
		<div
			className="g61-racing-track-map-layers"
			role="img"
			aria-label={
				detail
					? `${label} track map with turn labels, pit road, and start and finish`
					: `${label} track map`
			}
		>
			<img
				className="g61-racing-track-map-image g61-racing-track-map-image-inactive"
				src={assets.inactive}
				alt=""
				loading={detail ? "eager" : "lazy"}
				decoding="async"
			/>
			<img
				className="g61-racing-track-map-image g61-racing-track-map-image-active"
				src={assets.active}
				alt=""
				loading={detail ? "eager" : "lazy"}
				decoding="async"
			/>
			{detail ? (
				<>
					<img
						className="g61-racing-track-detail-image g61-racing-track-detail-pitroad"
						src={assets.pitroad}
						alt=""
						decoding="async"
					/>
					<img
						className="g61-racing-track-detail-image g61-racing-track-detail-start-finish"
						src={assets.startFinish}
						alt=""
						decoding="async"
					/>
					<img
						className="g61-racing-track-detail-image g61-racing-track-detail-turns"
						src={assets.turns}
						alt=""
						decoding="async"
					/>
				</>
			) : null}
		</div>
	);
}

function RecentTrackMapItem({ track }: { track: RecentTrack }) {
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [dialogStyle, setDialogStyle] =
		useState<TrackDialogStyle>(defaultDialogStyle);
	const mapAssets = getTrackMapAssets({
		platformId: track.platformId ?? null,
		garage61TrackId: track.id,
	});
	const trackLabel = track.variant
		? `${track.name}, ${track.variant}`
		: track.name;

	const rememberDialogOrigin = () => {
		const bounds = triggerRef.current?.getBoundingClientRect();
		if (!bounds) return;

		const dialogWidth = window.innerWidth;
		setDialogStyle({
			"--track-dialog-origin-x": `${bounds.left + bounds.width / 2 - window.innerWidth / 2}px`,
			"--track-dialog-origin-y": `${bounds.top + bounds.height / 2 - window.innerHeight / 2}px`,
			"--track-dialog-origin-scale": Math.max(
				0.12,
				Math.min(0.55, bounds.width / dialogWidth),
			),
		});
	};

	return (
		<article className="g61-racing-track-map-item">
			<Dialog.Root>
				<Dialog.Trigger
					className="g61-racing-track-map-trigger"
					ref={triggerRef}
					onClick={rememberDialogOrigin}
					aria-label={`Open track map for ${trackLabel}`}
				>
					<div className="g61-racing-track-map-visual">
						{mapAssets ? (
							<TrackMapLayers assets={mapAssets} label={trackLabel} />
						) : (
							<Text as="span" size="0" color="3" family="mono">
								Map unavailable
							</Text>
						)}
					</div>
				</Dialog.Trigger>

				<div className="g61-racing-track-map-copy">
					<Text as="p" size="1" weight="500">
						{track.name}
					</Text>
					{track.variant ? (
						<Text
							as="p"
							size="0"
							color="2"
							className="g61-racing-track-map-layout"
						>
							{track.variant}
						</Text>
					) : null}
					<Text as="p" size="0" color="2" family="mono">
						{formatDuration(track.timeOnTrackSeconds)}
					</Text>
				</div>

				{mapAssets ? (
					<Dialog.Portal>
						<Dialog.Backdrop className="g61-racing-track-dialog-backdrop" />
						<Dialog.Popup
							className="g61-racing-track-dialog-popup"
							style={dialogStyle}
						>
							<div className="g61-racing-track-dialog-header">
								<div>
									<Dialog.Title className="g61-racing-track-dialog-title">
										{track.name}
									</Dialog.Title>
									<Dialog.Description className="g61-racing-track-dialog-description">
										{track.variant}
									</Dialog.Description>
								</div>
								<Dialog.Close
									className="g61-racing-track-dialog-close"
									aria-label={`Close ${track.name} track map`}
								>
									<svg
										viewBox="0 0 16 16"
										width="18"
										height="18"
										aria-hidden="true"
									>
										<path d="M2 2l12 12M14 2L2 14" />
									</svg>
								</Dialog.Close>
							</div>

							<div className="g61-racing-track-dialog-visual">
								<TrackMapLayers assets={mapAssets} detail label={trackLabel} />
							</div>

							<div className="g61-racing-track-map-legend">
								<ul>
									<li>
										<span className="g61-racing-track-map-key g61-racing-track-map-key-inactive" />
										Other layouts
									</li>
									<li>
										<span className="g61-racing-track-map-key g61-racing-track-map-key-turns" />
										Turn numbers and names
									</li>
									<li>
										<span className="g61-racing-track-map-key g61-racing-track-map-key-pitroad" />
										Pit road
									</li>
									<li>
										<span className="g61-racing-track-map-key g61-racing-track-map-key-start" />
										Start / finish
									</li>
								</ul>
							</div>
						</Dialog.Popup>
					</Dialog.Portal>
				) : null}
			</Dialog.Root>
		</article>
	);
}

function RecentTrackMaps({ tracks }: RecentTrackMapsProps) {
	return (
		<div className="g61-racing-track-map-grid">
			{tracks.map((track) => (
				<RecentTrackMapItem
					key={`track-map-${track.id}-${track.name}`}
					track={track}
				/>
			))}
		</div>
	);
}

export { RecentTrackMaps };
