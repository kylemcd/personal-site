import { describe, expect, it } from "vitest";

import { toErrorDetails } from "./error-details";

describe("toErrorDetails", () => {
	it("returns an Error message by default", () => {
		expect(toErrorDetails(new Error("Request failed"))).toBe("Request failed");
	});

	it("collects and deduplicates nested error context", () => {
		const error = new Error("Request failed", {
			cause: {
				_tag: "ProviderError",
				message: "Rate limited",
				response: {
					status: 429,
					statusText: "Too Many Requests",
					url: "https://example.com/data",
				},
			},
		});

		const details = toErrorDetails(error, { collectFragments: true });

		expect(details).toContain("Error: Request failed");
		expect(details).toContain("ProviderError");
		expect(details).toContain("Rate limited");
		expect(details).toContain(
			"HTTP 429 Too Many Requests (https://example.com/data)",
		);
	});

	it("handles circular fallback values and enforces the maximum length", () => {
		const circular: Record<string, unknown> = { message: "A long failure" };
		circular.self = circular;

		expect(toErrorDetails(circular, { maxLength: 6 })).toBe("[objec...");
	});
});
