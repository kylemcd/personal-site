import { Schema } from "effect";

export const GoodreadsItemSchema = Schema.Struct({
	title: Schema.String,
	link: Schema.String,
	book_id: Schema.String,
	book_image_url: Schema.optional(Schema.String),
	book_small_image_url: Schema.optional(Schema.String),
	book_medium_image_url: Schema.optional(Schema.String),
	book_large_image_url: Schema.optional(Schema.String),
	book_description: Schema.optional(Schema.String),
	author_name: Schema.String,
	isbn: Schema.optional(Schema.String),
	user_name: Schema.optional(Schema.String),
	user_rating: Schema.optional(Schema.String),
	user_read_at: Schema.optional(Schema.String),
	user_date_added: Schema.optional(Schema.String),
	user_date_created: Schema.optional(Schema.String),
	user_shelves: Schema.optional(Schema.String),
	user_review: Schema.optional(Schema.String),
	average_rating: Schema.optional(Schema.String),
	book_published: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	guid: Schema.optional(Schema.String),
	pubDate: Schema.optional(Schema.String),
}).annotations({ exact: false });

export type GoodreadsItem = typeof GoodreadsItemSchema.Type;
