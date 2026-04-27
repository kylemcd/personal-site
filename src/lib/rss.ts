import { Effect } from "effect";
import { XMLBuilder } from "fast-xml-parser";

import { toComparableTimestampInCentral } from "@/lib/dates";
import { markdown } from "@/lib/markdown";

const SITE_URL = "https://kylemcd.com";
const RSS_PATH = "/rss.xml";
const FEED_URL = `${SITE_URL}${RSS_PATH}`;
const rssXmlBuilder = new XMLBuilder({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	textNodeName: "#text",
	cdataPropName: "__cdata",
	suppressBooleanAttributes: false,
	format: true,
	indentBy: "\t",
});

const toPlainText = (value: string): string =>
	value
		.replaceAll(/<[^>]*>/g, " ")
		.replaceAll(/&nbsp;/g, " ")
		.replaceAll(/\s+/g, " ")
		.trim();

const toSummary = (value: string, maxLength = 220): string => {
	if (value.length <= maxLength) return value;
	const shortened = value.slice(0, maxLength).trim();
	const lastSpace = shortened.lastIndexOf(" ");
	if (lastSpace < maxLength * 0.6) return `${shortened}...`;
	return `${shortened.slice(0, lastSpace).trim()}...`;
};

const toSafeCdata = (value: string): string =>
	value.replaceAll("]]>", "]]]]><![CDATA[>");

const toUtcDateString = (date: string): string => {
	const centralTimestamp = toComparableTimestampInCentral(date);
	if (!Number.isNaN(centralTimestamp)) {
		return new Date(centralTimestamp).toUTCString();
	}

	const parsedTimestamp = Date.parse(date);
	if (!Number.isNaN(parsedTimestamp)) {
		return new Date(parsedTimestamp).toUTCString();
	}

	return new Date().toUTCString();
};

type FeedPost = {
	title: string;
	slug: string;
	date: string;
	content: string;
};

const createBlogRssFeed = async (): Promise<string> => {
	const posts = await Effect.runPromise(markdown.all());
	const feedPosts = await Effect.runPromise(
		Effect.all(
			posts.map((post) =>
				markdown
					.fromPath<{ title: string; date: string }>({
						path: `./posts/${post.slug}.md`,
					})
					.pipe(
						Effect.map(({ frontmatter, content }): FeedPost => ({
							title: frontmatter.title,
							slug: post.slug,
							date: frontmatter.date,
							content,
						})),
					),
			),
		),
	);

	const lastBuildDate = feedPosts[0]
		? toUtcDateString(feedPosts[0].date)
		: new Date().toUTCString();

	const xmlBody = rssXmlBuilder.build({
		rss: {
			"@_version": "2.0",
			"@_xmlns:atom": "http://www.w3.org/2005/Atom",
			"@_xmlns:content": "http://purl.org/rss/1.0/modules/content/",
			channel: {
				title: "Kyle McDonald",
				link: SITE_URL,
				description: "Kyle McDonald's writings, projects, and posts.",
				language: "en-us",
				lastBuildDate,
				"atom:link": {
					"@_href": FEED_URL,
					"@_rel": "self",
					"@_type": "application/rss+xml",
				},
				item: feedPosts.map((post) => {
					const link = `${SITE_URL}/posts/${post.slug}`;
					const summary = toSummary(toPlainText(post.content));
					const pubDate = toUtcDateString(post.date);

					return {
						title: post.title,
						link,
						guid: {
							"@_isPermaLink": "true",
							"#text": link,
						},
						pubDate,
						description: summary,
						"content:encoded": { __cdata: toSafeCdata(post.content) },
					};
				}),
			},
		},
	});

	return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
};

export { RSS_PATH, createBlogRssFeed };
