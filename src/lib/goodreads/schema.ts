import { z } from "zod";

export const GoodreadsItemSchema = z.object({
	title: z.string(),
	link: z.string(),
	book_id: z.string(),
	book_image_url: z.string().optional(),
	book_small_image_url: z.string().optional(),
	book_medium_image_url: z.string().optional(),
	book_large_image_url: z.string().optional(),
	book_description: z.string().optional(),
	author_name: z.string(),
	isbn: z.string().optional(),
	user_name: z.string().optional(),
	user_rating: z.string().optional(),
	user_read_at: z.string().optional(),
	user_date_added: z.string().optional(),
	user_date_created: z.string().optional(),
	user_shelves: z.string().optional(),
	user_review: z.string().optional(),
	average_rating: z.string().optional(),
	book_published: z.string().optional(),
	description: z.string().optional(),
	guid: z.string().optional(),
	pubDate: z.string().optional(),
});

export type GoodreadsItem = z.infer<typeof GoodreadsItemSchema>;
