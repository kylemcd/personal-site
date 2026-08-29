import { z } from "zod";

const publishedSummarySchema = z.object({
	id: z.uuid(),
	sourcePath: z.string(),
	slug: z.string(),
	title: z.string(),
	date: z.string(),
	draft: z.boolean(),
	substackLink: z.url().nullable(),
	sourceHash: z.string(),
	contentHash: z.string(),
	revision: z.string(),
	storageVersion: z.number().int().positive(),
	publishedAt: z.string(),
	updatedAt: z.string(),
});

const publishedManifestSchema = z.object({
	documents: z.array(publishedSummarySchema),
});

const publishedDocumentSchema = publishedSummarySchema.extend({
	markdown: z.string().min(1),
});

const publishedDocumentCollectionSchema = z.object({
	documents: z.array(publishedDocumentSchema),
});

type PublishedSummary = z.infer<typeof publishedSummarySchema>;
type PublishedDocument = z.infer<typeof publishedDocumentSchema>;

export type { PublishedDocument, PublishedSummary };
export {
	publishedDocumentCollectionSchema,
	publishedDocumentSchema,
	publishedManifestSchema,
};
