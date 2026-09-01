import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
	FetchResponseError,
	FetchTimeoutError,
	fetchJson,
	JsonParseError,
	SchemaParseError,
} from "./fetch";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("fetchJson", () => {
	it("cleans up timeout and external abort listeners after success", async () => {
		vi.useFakeTimers();
		const external = new AbortController();
		const removeListener = vi.spyOn(external.signal, "removeEventListener");
		let requestSignal: AbortSignal | null | undefined;
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
				requestSignal = init?.signal;
				return Response.json({ value: 42 });
			}),
		);
		const result = await fetchJson("https://example.com", {
			signal: external.signal,
			timeoutMs: 100,
		});
		expect(Result.isOk(result)).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
		expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
		external.abort();
		expect(requestSignal?.aborted).toBe(false);
	});

	it("keeps malformed JSON errors distinct from timeouts", async () => {
		vi.useFakeTimers();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("not json")),
		);
		const result = await fetchJson("https://example.com", { timeoutMs: 100 });
		if (Result.isOk(result)) throw new Error("Expected invalid JSON to fail");
		expect(result.error).toBeInstanceOf(JsonParseError);
		expect(vi.getTimerCount()).toBe(0);
	});

	it.each([200, 503])(
		"keeps timeout active while reading a %s body",
		async (status) => {
			vi.useFakeTimers();
			let bodyController:
				| ReadableStreamDefaultController<Uint8Array>
				| undefined;
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					bodyController = controller;
					controller.enqueue(new TextEncoder().encode('{"value":'));
				},
			});
			const response = new Response(body, { status });
			const abort = vi.fn(() => {
				bodyController?.error(new DOMException("Aborted", "AbortError"));
			});
			vi.stubGlobal(
				"fetch",
				vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
					init?.signal?.addEventListener("abort", abort);
					return response;
				}),
			);

			const pending = fetchJson("https://example.com", { timeoutMs: 10 });
			await vi.advanceTimersByTimeAsync(10);
			// Settle the stream even if the timeout is broken, so the test cannot hang.
			bodyController?.error(new DOMException("Stream closed", "AbortError"));
			const result = await pending;
			expect(abort).toHaveBeenCalledOnce();
			expect(Result.isError(result)).toBe(true);
			if (Result.isError(result)) {
				expect(result.error).toBeInstanceOf(FetchTimeoutError);
			}
			expect(vi.getTimerCount()).toBe(0);
		},
	);

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

	it("maps timeout to FetchTimeoutError", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				(_input: RequestInfo | URL, init?: RequestInit) =>
					new Promise<Response>((_resolve, reject) => {
						init?.signal?.addEventListener("abort", () => {
							reject(new DOMException("Aborted", "AbortError"));
						});
					}),
			),
		);

		const result = await fetchJson("https://example.com", {
			timeoutMs: 10,
		});

		expect(Result.isError(result)).toBe(true);
		if (Result.isError(result)) {
			expect(result.error).toBeInstanceOf(FetchTimeoutError);
		}
	});
});
