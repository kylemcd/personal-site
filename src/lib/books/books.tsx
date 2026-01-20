import { Data, Effect, pipe } from "effect";

import { fetchFresh } from "@/lib/fetch";

import { booksQuery } from "./gql";
import { BooksResponseSchema } from "./schema";

const LITERAL_PROFILE_ID = "clqazgb086327830htsy14mo9ld";

class FetchBooksError extends Data.TaggedError("FetchBooksError")<Error> {
	message = "Failed to fetch books";
}

type FetchBooksArgs = {
	readingStatus: "IS_READING" | "FINISHED" | "WANTS_TO_READ";
	limit: number;
};

const getBooks = ({ readingStatus, limit }: FetchBooksArgs) => {
	return fetchFresh({
		url: "https://api.literal.club/graphql/",
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			query: booksQuery,
			variables: {
				limit,
				readingStatus,
				profileId: LITERAL_PROFILE_ID,
				offset: 0,
			},
		}),
		schema: BooksResponseSchema,
	}).pipe(
		Effect.mapError((e) => new FetchBooksError(e as Error)),
		Effect.flatMap(({ data }) =>
			Effect.succeed(data.data.booksByReadingStateAndProfile),
		),
	);
};

const shelf = () =>
	pipe(
		getBooks({ readingStatus: "IS_READING", limit: 10 }),
		Effect.flatMap((reading) =>
			getBooks({ readingStatus: "FINISHED", limit: 20 }).pipe(
				Effect.map((finished) => {
					return { reading, finished };
				}),
			),
		),
		Effect.flatMap((books) =>
			getBooks({ readingStatus: "WANTS_TO_READ", limit: 10 }).pipe(
				Effect.map((next) => {
					return { ...books, next };
				}),
			),
		),
	);

const books = {
	shelf,
};

export { books };
