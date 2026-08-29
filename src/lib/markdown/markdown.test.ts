import { Result } from "better-result";
import { describe, expect, test } from "vitest";
import { z } from "zod";

import { markdown } from "./markdown";

const schema = z.object({ title: z.string(), date: z.string() });

describe("markdown frontmatter", () => {
	test("validates frontmatter against the caller schema", () => {
		const result = markdown.fromRaw({
			rawMarkdown: "---\ntitle: Valid\ndate: 2026-01-01\n---\n\nBody",
			frontmatterSchema: schema,
		});

		expect(Result.isOk(result) && result.value.frontmatter).toEqual({
			title: "Valid",
			date: "2026-01-01",
		});
	});

	test("rejects malformed typed frontmatter", () => {
		const result = markdown.fromRaw({
			rawMarkdown:
				"---\ntitle:\n  nested: value\ndate: 2026-01-01\n---\n\nBody",
			frontmatterSchema: schema,
		});

		expect(Result.isError(result)).toBe(true);
	});
});
