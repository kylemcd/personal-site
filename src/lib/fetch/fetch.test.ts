import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { FetchResponseError, fetchJson, SchemaParseError } from "./fetch";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("fetchJson", () => {
	it("decodes valid JSON with schema", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ value: 42 }), {
						status: 200,
						headers: { "content-type": "application/json" },
					}),
			),
		);

		const result = await fetchJson("https://example.com", {
			schema: z.object({ value: z.number() }),
		});

		expect(Result.isOk(result)).toBe(true);
		if (Result.isOk(result)) {
			expect(result.value.data.value).toBe(42);
		}
	});

	it("maps non-2xx responses to FetchResponseError", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () => new Response("nope", { status: 503, statusText: "Down" }),
			),
		);

		const result = await fetchJson("https://example.com");
		expect(Result.isError(result)).toBe(true);
		if (Result.isError(result)) {
			expect(result.error).toBeInstanceOf(FetchResponseError);
		}
	});

	it("maps schema parse failures to SchemaParseError", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ value: "not-a-number" }), {
						status: 200,
						headers: { "content-type": "application/json" },
					}),
			),
		);

		const result = await fetchJson("https://example.com", {
			schema: z.object({ value: z.number() }),
		});
		expect(Result.isError(result)).toBe(true);
		if (Result.isError(result)) {
			expect(result.error).toBeInstanceOf(SchemaParseError);
		}
	});
});
