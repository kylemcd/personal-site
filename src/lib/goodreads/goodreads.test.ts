import { Result } from "better-result";
import { describe, expect, test } from "vitest";

import { parseRssToBooks } from "./rss";

describe("Goodreads RSS parsing", () => {
	test("rejects a successful HTML challenge instead of caching an empty shelf", () => {
		const result = parseRssToBooks("<html><body>Challenge</body></html>");

		expect(Result.isError(result)).toBe(true);
	});

	test("accepts a valid RSS channel with no items", () => {
		const result = parseRssToBooks(
			'<?xml version="1.0"?><rss><channel><title>Empty</title></channel></rss>',
		);

		expect(Result.isOk(result) && result.value).toEqual([]);
	});
});
