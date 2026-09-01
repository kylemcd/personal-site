import {
	HomepageSectionHeading,
	type SectionTitle,
} from "@/components/SectionHeading";
import { Text } from "@/components/Text";

import "./FeaturedMediaMosaic.styles.css";

export type FeaturedMediaMosaicItem = {
	accessibleLabel?: string;
	href: string;
	imageUrl: string;
	label: string;
	secondaryLabel?: string;
};

type FeaturedMediaMosaicProps = {
	items: ReadonlyArray<FeaturedMediaMosaicItem>;
	layout?: "featured" | "uniform";
	title: SectionTitle;
	titleHref?: string | undefined;
};

const FeaturedMediaMosaic = ({
	items,
	layout = "featured",
	title,
	titleHref,
}: FeaturedMediaMosaicProps) => {
	if (items.length === 0) return null;

	return (
		<section className="featured-media-mosaic">
			{titleHref ? (
				<HomepageSectionHeading href={titleHref} title={title} />
			) : (
				<Text as="h2" size="2">
					{title}
				</Text>
			)}
			<div className="featured-media-mosaic-grid" data-layout={layout}>
				{items.map((item, index) => {
					const isFeatured = layout === "featured" && index === 0;
					return (
						<a
							className="featured-media-mosaic-item"
							data-featured={isFeatured ? "true" : undefined}
							href={item.href}
							key={item.href}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={
								item.accessibleLabel ??
								(item.secondaryLabel
									? `${item.label} by ${item.secondaryLabel}`
									: item.label)
							}
						>
							<img
								className="featured-media-mosaic-image"
								src={item.imageUrl}
								alt=""
								loading={index === 0 ? "eager" : "lazy"}
								decoding="async"
							/>
							<span
								className="featured-media-mosaic-shade"
								aria-hidden="true"
							/>
							<span className="featured-media-mosaic-copy">
								<Text
									as="span"
									size={isFeatured ? "2" : "1"}
									weight="500"
									className="featured-media-mosaic-label"
								>
									{item.label}
								</Text>
								{item.secondaryLabel ? (
									<Text
										as="span"
										size="0"
										className="featured-media-mosaic-secondary-label"
									>
										{item.secondaryLabel}
									</Text>
								) : null}
							</span>
						</a>
					);
				})}
			</div>
		</section>
	);
};

export { FeaturedMediaMosaic };
