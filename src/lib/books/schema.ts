import { Schema } from 'effect';

export const BookSchema = Schema.Struct({
    title: Schema.String,
    subtitle: Schema.Union(Schema.String, Schema.Null),
    description: Schema.Union(Schema.String, Schema.Null),
    slug: Schema.Union(Schema.String, Schema.Null),
    cover: Schema.Union(Schema.String, Schema.Null),
    authors: Schema.Array(
        Schema.Struct({
            name: Schema.String,
        })
    ),
}).annotations({ exact: false });

export const BooksResponseSchema = Schema.Struct({
    data: Schema.Struct({
        booksByReadingStateAndProfile: Schema.Array(BookSchema),
    }),
});
