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
		DurableObject: class {},
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

describe("StaleDataMonitorWorkflow", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("reserves each alert before a failed email attempt", async () => {
		const calls: string[] = [];
		const { StaleDataMonitorWorkflow } = await import("./stale-data-monitor");
		const workflow = new StaleDataMonitorWorkflow(
			{} as never,
			{
				APP_STORE: {
					get: async (key: string) => {
						if (key.includes("monitor:")) return null;
						return JSON.stringify({
							__cacheEnvelope: 1,
							value: {},
							refreshAfter: Date.now() - 3 * 60 * 60 * 1000,
						});
					},
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

		expect(calls).toEqual([
			"reserve",
			"send",
			"reserve",
			"reserve",
			"send",
			"reserve",
			"reserve",
			"send",
			"reserve",
		]);
	});
});
