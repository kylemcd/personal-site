import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";
import { useEffect } from "react";

import { ErrorComponent } from "@/components/ErrorComponent";
import { TableOfContents } from "@/components/TableOfContents";
import { Text } from "@/components/Text";
import { formatDateInCentral } from "@/lib/dates";
import { markdown } from "@/lib/markdown";
import { buildMeta } from "@/lib/meta";
import "@/styles/prism.css";
import "@/styles/routes/posts.css";

const getPost = createServerFn({ method: "GET" })
	.validator((data: { slug: string }) => data)
	.handler(async ({ data: { slug } }) => {
		const result = markdown.fromPath<{
			title: string;
			date: string;
			"substack-link"?: string;
		}>({ path: `./posts/${slug}.md` });

		if (Result.isError(result)) {
			throw new Error("This post does not exist.", {
				cause: result.error,
			});
		}

		return result.value;
	});

export const Route = createFileRoute("/posts/$slug")({
	component: PostRoute,
	loader: ({ params }) => getPost({ data: { slug: params.slug } }),
	errorComponent: ErrorComponent,
	head: ({ loaderData, params }) => {
		const postTitle = loaderData?.frontmatter?.title;
		const fullTitle = postTitle
			? `${postTitle} - Kyle McDonald`
			: "Kyle McDonald";
		const imageUrl = `https://kylemcd.com/open-graph/${params.slug}.png`;

		return {
			meta: buildMeta({
				title: fullTitle,
				url: `https://kylemcd.com/posts/${params.slug}`,
				image: imageUrl,
				imageAlt: postTitle ?? "Open graph image",
				ogType: "article",
			}),
		};
	},
});

function PostRoute() {
	const { frontmatter, content, tableOfContents, readingTime, hasMermaid } =
		Route.useLoaderData();

	useEffect(() => {
		if (hasMermaid) {
			(async () => {
				const { default: mermaid } = await import("mermaid");
				mermaid.initialize({ startOnLoad: true });
				mermaid.run();
			})();
		}
	}, [hasMermaid]);

	return (
		<div className="post-layout">
			<div className="post-container">
				<div className="post-header">
					<Text as="h1" size="6" weight="500" className="post-title">
						{frontmatter.title}
					</Text>
					<div className="post-author">
						<img
							src="/images/avatar.png"
							alt="Kyle McDonald"
							className="post-author-avatar"
						/>
						<Text as="span" size="1" color="2">
							Kyle McDonald
						</Text>
					</div>
					{frontmatter?.["substack-link"] && (
						<div className="post-substack">
							<Text
								as="a"
								size="0"
								href={frontmatter["substack-link"]}
								target="_blank"
							>
								Read on Substack
							</Text>
							<i className="hn hn-external-link" data-text-size="0" />
						</div>
					)}
				</div>
				<div className="post-details">
					<Text as="span" size="1" color="2">
						{formatDateInCentral(frontmatter.date)}
					</Text>
					<div className="post-details-right">
						<Text as="span" size="1" color="2">
							{readingTime} min read
						</Text>
						<a
							href="/rss.xml"
							className="post-rss-link"
							aria-label="Subscribe to the RSS feed"
							type="application/rss+xml"
						>
							<i className="hn hn-rss" aria-hidden="true" />
							<span className="sr-only">Subscribe to the RSS feed</span>
						</a>
					</div>
				</div>
				<TableOfContents items={tableOfContents} />
				<div
					className="post-content"
					data-post
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Sort of necessary for markdoc
					dangerouslySetInnerHTML={{ __html: content }}
				/>
			</div>
		</div>
	);
}
