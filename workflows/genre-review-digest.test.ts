import { beforeEach, describe, expect, it, vi } from "vitest";

(
	vi.mock as unknown as (
		path: string,
		factory: () => unknown,
		options: { virtual: boolean },
	) => void
)(
	"cloudflare:workers",
	() => ({
		env: {},
		WorkflowEntrypoint: class {
			env: unknown;

			constructor(_ctx: unknown, env: unknown) {
				this.env = env;
			}
		},
	}),
	{ virtual: true },
);

vi.mock("@/lib/lastfm/genre-taxonomy", () => ({
	GENRE_DIGEST_LAST_SENT_KV_KEY: "lastfm:genre:digest:last-sent:v1",
	taxonomyAdmin: {
		getObservationSnapshot: async () => ({
			observed: { powerpop: { rawTag: "PowerPop", count: 1 } },
			suggestions: {
				powerpop: {
					rawTag: "PowerPop",
					suggestedCanonical: "pop punk",
					confidence: "high",
					count: 1,
				},
			},
		}),
		listReviewState: async () => ({}),
	},
}));

describe("GenreReviewDigestWorkflow", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("reserves the weekly digest before a failed email attempt", async () => {
		const calls: string[] = [];
		const { GenreReviewDigestWorkflow } = await import("./genre-review-digest");
		const workflow = new GenreReviewDigestWorkflow(
			{} as never,
			{
				APP_STORE: {
					get: async () => null,
					put: async () => {
						calls.push("reserve");
					},
				},
				EMAIL: {
					send: async () => {
						calls.push("send");
						throw new Error("ambiguous delivery");
					},
				},
				STALE_ALERT_EMAIL_TO: "to@example.com",
				STALE_ALERT_EMAIL_FROM: "from@example.com",
			} as never,
		);

		await workflow.run(
			{ payload: { triggeredAt: "2026-01-01T00:00:00.000Z" } },
			{
				do: async <T>(_name: string, callback: () => Promise<T>) => callback(),
			},
		);

		expect(calls).toEqual(["reserve", "send", "reserve"]);
	});
});
