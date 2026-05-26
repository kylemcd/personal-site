import server from "@tanstack/react-start/server-entry";
import { createBlogRssFeed, RSS_PATH } from "./src/lib/rss";
import type {
	RefreshWorkflowParams as Garage61RefreshParams,
	RefreshGarage61WorkflowEnv,
} from "./workflows/refresh-garage61";
import { RefreshGarage61Workflow } from "./workflows/refresh-garage61";
import type {
	RefreshWorkflowParams as GoodreadsRefreshParams,
	RefreshGoodreadsWorkflowEnv,
} from "./workflows/refresh-goodreads";
import { RefreshGoodreadsWorkflow } from "./workflows/refresh-goodreads";
import type {
	RefreshWorkflowParams as LastFmRefreshParams,
	RefreshLastFmWorkflowEnv,
} from "./workflows/refresh-lastfm";
import { RefreshLastFmWorkflow } from "./workflows/refresh-lastfm";
import type {
	SetlistRefreshWorkflowParams as SetlistFmRefreshParams,
	RefreshSetlistFmWorkflowEnv,
} from "./workflows/refresh-setlistfm";
import { RefreshSetlistFmWorkflow } from "./workflows/refresh-setlistfm";
import type {
	StaleMonitorParams,
	StaleMonitorWorkflowEnv,
} from "./workflows/stale-data-monitor";
import { StaleDataMonitorWorkflow } from "./workflows/stale-data-monitor";
import type {
	GenreReviewDigestParams,
	GenreReviewDigestWorkflowEnv,
} from "./workflows/genre-review-digest";
import { GenreReviewDigestWorkflow } from "./workflows/genre-review-digest";
import { applyBaseRuntimeEnv } from "./workflows/shared";

type WorkerEnv = StaleMonitorWorkflowEnv &
	RefreshGarage61WorkflowEnv &
	RefreshGoodreadsWorkflowEnv &
	RefreshLastFmWorkflowEnv &
	RefreshSetlistFmWorkflowEnv &
	GenreReviewDigestWorkflowEnv & {
		GARAGE61_REFRESH_WORKFLOW?: {
			create: (options?: {
				id?: string;
				params?: Garage61RefreshParams;
			}) => Promise<unknown>;
		};
		GOODREADS_REFRESH_WORKFLOW?: {
			create: (options?: {
				id?: string;
				params?: GoodreadsRefreshParams;
			}) => Promise<unknown>;
		};
		LASTFM_REFRESH_WORKFLOW?: {
			create: (options?: {
				id?: string;
				params?: LastFmRefreshParams;
			}) => Promise<unknown>;
		};
		SETLISTFM_REFRESH_WORKFLOW?: {
			create: (options?: {
				id?: string;
				params?: SetlistFmRefreshParams;
			}) => Promise<unknown>;
		};
		STALE_MONITOR_WORKFLOW?: {
			create: (options?: {
				id?: string;
				params?: StaleMonitorParams;
			}) => Promise<unknown>;
		};
		GENRE_REVIEW_DIGEST_WORKFLOW?: {
			create: (options?: {
				id?: string;
				params?: GenreReviewDigestParams;
			}) => Promise<unknown>;
		};
	};

export {
	RefreshGarage61Workflow,
	RefreshGoodreadsWorkflow,
	RefreshLastFmWorkflow,
	RefreshSetlistFmWorkflow,
	StaleDataMonitorWorkflow,
	GenreReviewDigestWorkflow,
};

const applyRuntimeEnv = (env: WorkerEnv) => {
	applyBaseRuntimeEnv(env);
	process.env.GARAGE61_API_KEY =
		env.GARAGE61_API_KEY ?? process.env.GARAGE61_API_KEY;
	process.env.LASTFM_API_KEY = env.LASTFM_API_KEY ?? process.env.LASTFM_API_KEY;
};

const respondWithRssFeed = async (): Promise<Response> => {
	try {
		const feed = await createBlogRssFeed();
		return new Response(feed, {
			headers: {
				"content-type": "application/rss+xml; charset=utf-8",
				"cache-control":
					"public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
				"x-robots-tag": "index, follow",
			},
		});
	} catch (error) {
		console.error("[rss] Failed to generate feed", error);
		return new Response("Unable to generate RSS feed.", {
			status: 500,
			headers: {
				"content-type": "text/plain; charset=utf-8",
			},
		});
	}
};

type RefreshWorkflowBinding = {
	create: (options?: {
		id?: string;
		params?: { triggeredAt: string };
	}) => Promise<unknown>;
};

const triggerRefreshWorkflow = (
	ctx: ExecutionContext,
	binding: RefreshWorkflowBinding | undefined,
	name: string,
	id: string,
	triggeredAt: string,
) => {
	if (!binding) {
		console.error(`[refresh] ${name} binding missing`);
		return;
	}
	ctx.waitUntil(binding.create({ id: `${id}-${Date.now()}`, params: { triggeredAt } }));
};

export default {
	fetch: async (request: Request, env: WorkerEnv) => {
		applyRuntimeEnv(env);

		const { pathname } = new URL(request.url);
		if (request.method === "GET" && pathname === RSS_PATH) {
			return respondWithRssFeed();
		}

		return server.fetch(request);
	},
	scheduled: (
		controller: ScheduledController,
		env: WorkerEnv,
		ctx: ExecutionContext,
	) => {
		applyRuntimeEnv(env);
		const scheduledAt = new Date(controller.scheduledTime);
		const minute = scheduledAt.getUTCMinutes();
		const triggeredAt = new Date().toISOString();

		triggerRefreshWorkflow(ctx, env.GARAGE61_REFRESH_WORKFLOW, "GARAGE61_REFRESH_WORKFLOW", "refresh-garage61", triggeredAt);
		triggerRefreshWorkflow(ctx, env.GOODREADS_REFRESH_WORKFLOW, "GOODREADS_REFRESH_WORKFLOW", "refresh-goodreads", triggeredAt);
		triggerRefreshWorkflow(ctx, env.LASTFM_REFRESH_WORKFLOW, "LASTFM_REFRESH_WORKFLOW", "refresh-lastfm", triggeredAt);
		if (scheduledAt.getUTCHours() === 0 && minute === 0) {
			triggerRefreshWorkflow(
				ctx,
				env.SETLISTFM_REFRESH_WORKFLOW,
				"SETLISTFM_REFRESH_WORKFLOW",
				"refresh-setlistfm",
				triggeredAt,
			);
		}

		if (minute !== 0) return;
		if (!env.STALE_MONITOR_WORKFLOW) {
			console.error("[monitor] STALE_MONITOR_WORKFLOW binding missing");
			return;
		}

		ctx.waitUntil(
			env.STALE_MONITOR_WORKFLOW.create({
				id: `stale-monitor-${Date.now()}`,
				params: { triggeredAt: new Date().toISOString() },
			}),
		);
		if (
			scheduledAt.getUTCDay() === 1 &&
			scheduledAt.getUTCHours() === 14 &&
			env.GENRE_REVIEW_DIGEST_WORKFLOW
		) {
			ctx.waitUntil(
				env.GENRE_REVIEW_DIGEST_WORKFLOW.create({
					id: `genre-review-digest-${Date.now()}`,
					params: { triggeredAt: new Date().toISOString() },
				}),
			);
		}
	},
};
