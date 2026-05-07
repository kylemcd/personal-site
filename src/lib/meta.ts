const SITE_NAME = "Kyle McDonald";
const SITE_URL = "https://kylemcd.com";
const DEFAULT_DESCRIPTION =
	"Kyle McDonald's personal site where you can find his writings, projects, and other fun stuff.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/open-graph/home.png`;

type MetaConfig = {
	title: string;
	description?: string;
	url?: string;
	image?: string;
	imageAlt?: string;
	ogType?: "website" | "article";
	siteName?: string;
};

export const buildMeta = ({
	title,
	description = DEFAULT_DESCRIPTION,
	url = SITE_URL,
	image = DEFAULT_OG_IMAGE,
	imageAlt,
	ogType = "website",
	siteName = SITE_NAME,
}: MetaConfig) => [
	{ title },
	{ property: "og:title", content: title },
	{ property: "og:description", content: description },
	{ property: "og:url", content: url },
	{ property: "og:image", content: image },
	{ property: "og:image:type", content: "image/png" },
	{ property: "og:image:width", content: "1200" },
	{ property: "og:image:height", content: "630" },
	{ property: "og:site_name", content: siteName },
	{ property: "og:locale", content: "en-US" },
	{ property: "og:type", content: ogType },
	{ name: "twitter:card", content: "summary_large_image" },
	{ name: "twitter:title", content: title },
	{ name: "twitter:description", content: description },
	{ name: "twitter:image", content: image },
	...(imageAlt ? [{ name: "twitter:image:alt", content: imageAlt }] : []),
];
