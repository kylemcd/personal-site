import type { CSSProperties } from "react";

import { Text } from "@/components/Text";

import "./SectionHeading.styles.css";

type SectionTitle = "Writing" | "Racing" | "Listening" | "Concerts" | "Reading";

type PageSectionHeadingProps = {
	title: SectionTitle;
};

type HomepageSectionHeadingProps = PageSectionHeadingProps & {
	href: string;
};

type WordmarkAsset = {
	aspectRatio: string;
	path: string;
};

const WORDMARKS: Record<SectionTitle, WordmarkAsset> = {
	Writing: {
		aspectRatio: "1675 / 389",
		path: "/images/section-wordmarks/writing.svg",
	},
	Racing: {
		aspectRatio: "1000 / 201",
		path: "/images/section-wordmarks/racing.svg",
	},
	Listening: {
		aspectRatio: "1000 / 138",
		path: "/images/section-wordmarks/listening.svg",
	},
	Concerts: {
		aspectRatio: "1000 / 288",
		path: "/images/section-wordmarks/concerts.svg",
	},
	Reading: {
		aspectRatio: "1000 / 201",
		path: "/images/section-wordmarks/reading.svg",
	},
};

const SectionWordmark = ({ title }: PageSectionHeadingProps) => {
	const wordmark = WORDMARKS[title];
	const wordmarkStyle = {
		"--section-wordmark-aspect-ratio": wordmark.aspectRatio,
		"--section-wordmark-image": `url("${wordmark.path}")`,
	} as CSSProperties;

	return (
		<>
			<span className="section-wordmark-label sr-only">{title}</span>
			<span
				className="section-wordmark"
				style={wordmarkStyle}
				aria-hidden="true"
			/>
		</>
	);
};

const PageSectionHeading = ({ title }: PageSectionHeadingProps) => (
	<Text
		as="h1"
		size="2"
		className="section-wordmark-heading page-section-heading"
		data-section={title.toLowerCase()}
	>
		<SectionWordmark title={title} />
	</Text>
);

const HomepageSectionHeading = ({
	href,
	title,
}: HomepageSectionHeadingProps) => {
	return (
		<Text
			as="h2"
			size="2"
			className="section-wordmark-heading homepage-section-heading"
			data-section={title.toLowerCase()}
		>
			<a className="section-heading-link" href={href}>
				<SectionWordmark title={title} />
				<i
					className="hn hn-angle-right section-heading-icon"
					aria-hidden="true"
				/>
			</a>
		</Text>
	);
};

export type { SectionTitle };
export { HomepageSectionHeading, PageSectionHeading };
