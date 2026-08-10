import { describe, expect, test } from "vitest";

import {
	publishedDocumentCollectionSchema,
	publishedDocumentSchema,
	publishedManifestSchema,
} from "./published-content-contract";

const publishedSummary = {
	id: "ff305576-29ba-4db7-a3b2-d17860916a3b",
	sourcePath: "An article.md",
	slug: "an-article",
	title: "An article",
	date: "2026-08-10T12:00:00.000Z",
	draft: false,
	substackLink: null,
	sourceHash: "source-hash",
	contentHash: "content-hash",
	revision: "revision",
	storageVersion: 2,
	publishedAt: "2026-08-10T12:00:00.000Z",
	updatedAt: "2026-08-10T12:00:00.000Z",
};

describe("published content contract", () => {
	test("accepts the live manifest and document shape", () => {
		expect(
			publishedManifestSchema.safeParse({ documents: [publishedSummary] })
				.success,
		).toBe(true);
		expect(
			publishedDocumentSchema.safeParse({
				...publishedSummary,
				markdown: "---\ntitle: An article\n---\n\nBody",
			}).success,
		).toBe(true);
		expect(
			publishedDocumentCollectionSchema.safeParse({
				documents: [
					{
						...publishedSummary,
						markdown: "---\ntitle: An article\n---\n\nBody",
					},
				],
			}).success,
		).toBe(true);
	});

	test("rejects manifests that omit the storage contract version", () => {
		const { storageVersion: _storageVersion, ...withoutStorageVersion } =
			publishedSummary;

		expect(
			publishedManifestSchema.safeParse({ documents: [withoutStorageVersion] })
				.success,
		).toBe(false);
	});
});
