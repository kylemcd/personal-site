import { z } from "zod";

export const BookSchema = z.object({
	title: z.string(),
	subtitle: z.string().nullable(),
	description: z.string().nullable(),
	slug: z.string().nullable(),
	cover: z.string().nullable(),
	authors: z.array(
		z.object({
			name: z.string(),
		}),
	),
});

export type Book = z.infer<typeof BookSchema>;

export const BooksResponseSchema = z.object({
	data: z.object({
		booksByReadingStateAndProfile: z.array(BookSchema),
	}),
});

export type BooksResponse = z.infer<typeof BooksResponseSchema>;
