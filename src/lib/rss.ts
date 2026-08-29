import { Result, TaggedError } from "better-result";
import { XMLBuilder } from "fast-xml-parser";

import { toComparableTimestampInCentral } from "@/lib/dates";
import {
	type InvalidFrontmatterError,
	type InvalidMarkdownError,
	markdown,
	type ParseMarkdownError,
} from "@/lib/markdown";
import { isPublicPost, sortPostsNewestFirst } from "@/lib/posts/publication";
import {
	type PublishedContentError,
	publishedContent,
} from "@/lib/posts/published-content";
import { combineResults } from "@/lib/result";
import { SITE_URL } from "@/lib/site";

const RSS_PATH = "/rss.xml";
const FEED_URL = `${SITE_URL}${RSS_PATH}`;
const RSS_CACHE_KEY = "rss:blog:v2";
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

type RssStore = {
	get: (key: string, type: "text") => Promise<string | null>;
	put: (key: string, value: string) => Promise<void>;
};

class RssCacheError extends TaggedError("RssCacheError")<{
	readonly message: string;
	readonly cause: unknown;
}>() {}

type RssFeedError =
	| PublishedContentError
	| InvalidMarkdownError
	| ParseMarkdownError
	| InvalidFrontmatterError;

const createBlogRssFeed = async (): Promise<Result<string, RssFeedError>> => {
	const documentsResult = await publishedContent.all();
	if (Result.isError(documentsResult)) {
		return Result.err(documentsResult.error);
	}

	const publicDocuments = sortPostsNewestFirst(
		documentsResult.value.filter((document) => isPublicPost(document)),
	);
	const feedPostsResult = combineResults(
		publicDocuments.map((document) =>
			markdown.toHtml({ rawMarkdown: document.markdown }).map(
				(content) =>
					({
						title: document.title,
						slug: document.slug,
						date: document.date,
						content,
					}) satisfies FeedPost,
			),
		),
	);
	if (Result.isError(feedPostsResult)) {
		return Result.err(feedPostsResult.error);
	}
	const feedPosts = feedPostsResult.value;

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

	return Result.ok(`<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`);
};

const readCachedBlogRssFeed = ({ store }: { store: RssStore }) => {
	return Result.tryPromise<string | null, RssCacheError>({
		try: () => store.get(RSS_CACHE_KEY, "text"),
		catch: (cause) =>
			new RssCacheError({
				message: "Unable to read the cached RSS feed",
				cause,
			}),
	});
};

const refreshCachedBlogRssFeed = async ({ store }: { store: RssStore }) => {
	const feedResult = await createBlogRssFeed();
	if (Result.isError(feedResult)) return feedResult;

	const writeResult = await Result.tryPromise<void, RssCacheError>({
		try: () => store.put(RSS_CACHE_KEY, feedResult.value),
		catch: (cause) =>
			new RssCacheError({
				message: "Unable to cache the RSS feed",
				cause,
			}),
	});
	return writeResult.map(() => feedResult.value);
};

export {
	createBlogRssFeed,
	RSS_CACHE_KEY,
	RSS_PATH,
	readCachedBlogRssFeed,
	refreshCachedBlogRssFeed,
};
