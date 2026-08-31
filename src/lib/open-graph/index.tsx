import {
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

import { isPublicPost, sortPostsNewestFirst } from "@/lib/posts/publication";
import { publishedDocumentCollectionSchema } from "@/lib/posts/published-content-contract";

const PUBLISHED_CONTENT_URL =
	"https://publish.kpm.house/v1/published/posts/content";
const OUTPUT_DIRECTORY = "public/open-graph";
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const wordmark = `data:image/svg+xml;base64,${Buffer.from(
	readFileSync("./public/images/kpm-wordmark-badge.svg", "utf8"),
).toString("base64")}`;

type OpenGraphImageProps = {
	footerText?: string | undefined;
	label: string;
	title: string;
};

const staticPageImages: ReadonlyArray<OpenGraphImageProps & { path: string }> =
	[
		{
			footerText: "",
			label: "Personal site",
			path: "home",
			title: "Kyle McDonald",
		},
		{
			label: "Writing",
			path: "posts",
			title: "Notes on software, tools, and the things I build",
		},
		{
			label: "Listening",
			path: "listening",
			title: "What I’ve been listening to",
		},
		{
			label: "Concerts",
			path: "concerts",
			title: "The artists I’ve seen live",
		},
		{
			label: "Racing",
			path: "racing",
			title: "Recent cars, tracks, and time behind the wheel",
		},
		{
			label: "Reading",
			path: "reading",
			title: "What I’ve been reading",
		},
		{
			label: "Uses",
			path: "uses",
			title: "The software, hardware, and gear I use",
		},
	];

const titleSize = (title: string): number => {
	if (title.length > 74) return 54;
	if (title.length > 52) return 62;
	return 72;
};

const OpenGraphImage = ({
	footerText = "Kyle McDonald",
	label,
	title,
}: OpenGraphImageProps) => (
	<div
		style={{
			background: "#ffffff",
			color: "#000000",
			display: "flex",
			flexDirection: "column",
			height: "100%",
			justifyContent: "space-between",
			padding: "40px 48px 34px",
			width: "100%",
		}}
	>
		<div
			style={{
				alignItems: "flex-start",
				display: "flex",
				justifyContent: "space-between",
				width: "100%",
			}}
		>
			<img
				alt="KPM"
				height={119}
				src={wordmark}
				style={{ height: "119px", width: "302px" }}
				width={302}
			/>
			<span
				style={{
					fontFamily: "Inter",
					fontSize: "20px",
					letterSpacing: "-0.02em",
					paddingTop: "8px",
				}}
			>
				{label}
			</span>
		</div>

		<div
			style={{
				display: "flex",
				fontFamily: "Inter",
				fontSize: `${titleSize(title)}px`,
				fontWeight: 500,
				letterSpacing: "-0.045em",
				lineHeight: 1.04,
				maxWidth: "1040px",
			}}
		>
			{title}
		</div>

		<div
			style={{
				alignItems: "flex-end",
				display: "flex",
				fontFamily: "Inter",
				fontSize: "17px",
				justifyContent: "space-between",
				letterSpacing: "-0.025em",
				width: "100%",
			}}
		>
			<span>{footerText}</span>
			<span>kpm.sh</span>
		</div>
	</div>
);

const constructImage = async ({
	footerText,
	label,
	path,
	title,
}: OpenGraphImageProps & {
	path: string;
}): Promise<{ path: string; pngData: Uint8Array }> => {
	const svg = await satori(
		<OpenGraphImage footerText={footerText} label={label} title={title} />,
		{
			fonts: [
				{
					data: readFileSync("./public/fonts/opengraph-inter-medium.woff"),
					name: "Inter",
					style: "normal",
					weight: 500,
				},
			],
			height: OG_HEIGHT,
			width: OG_WIDTH,
		},
	);

	return {
		path,
		pngData: new Resvg(svg, {
			fitTo: { mode: "width", value: OG_WIDTH },
		})
			.render()
			.asPng(),
	};
};

const loadPublishedPosts = async () => {
	const response = await fetch(PUBLISHED_CONTENT_URL, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`Publish API returned ${response.status}`);
	}

	const body = await response.json();
	const envelope = publishedDocumentCollectionSchema.safeParse(
		typeof body === "object" && body !== null && "data" in body
			? body.data
			: undefined,
	);
	if (!envelope.success) {
		throw new Error("Publish API returned an invalid document collection", {
			cause: envelope.error,
		});
	}

	return sortPostsNewestFirst(
		envelope.data.documents.filter((post) => isPublicPost(post)),
	);
};

const generateImages = async (): Promise<void> => {
	const posts = await loadPublishedPosts();
	const images = [
		...posts.map((post) => ({
			label: "Writing",
			path: post.slug,
			title: post.title,
		})),
		...staticPageImages,
	];

	const generatedImages: Array<{ path: string; pngData: Uint8Array }> = [];
	for (const image of images) {
		generatedImages.push(await constructImage(image));
	}

	mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
	for (const filename of readdirSync(OUTPUT_DIRECTORY)) {
		if (filename.endsWith(".png")) {
			unlinkSync(`${OUTPUT_DIRECTORY}/${filename}`);
		}
	}
	for (const { path, pngData } of generatedImages) {
		writeFileSync(`${OUTPUT_DIRECTORY}/${path}.png`, pngData);
	}
};

const runImageGeneration = async (): Promise<void> => {
	try {
		await generateImages();
	} catch (error: unknown) {
		console.error("Unable to generate Open Graph images", error);
		process.exitCode = 1;
	}
};

await runImageGeneration();
