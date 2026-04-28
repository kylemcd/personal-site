import { Result, TaggedError } from "better-result";

import { fetchFresh } from "@/lib/fetch";

import { booksQuery } from "./gql";
import { type Book, BooksResponseSchema } from "./schema";

const LITERAL_PROFILE_ID = "clqazgb086327830htsy14mo9ld";

class FetchBooksError extends TaggedError("FetchBooksError")<{
	readonly error: unknown;
}>() {
	message = "Failed to fetch books";
}

type FetchBooksArgs = {
	readingStatus: "IS_READING" | "FINISHED" | "WANTS_TO_READ";
	limit: number;
};

const getBooks = async ({
	readingStatus,
	limit,
}: FetchBooksArgs): Promise<Result<ReadonlyArray<Book>, FetchBooksError>> => {
	const response = await fetchFresh({
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
	});

	if (Result.isError(response)) {
		return Result.err(new FetchBooksError({ error: response.error }));
	}

	return Result.ok(response.value.data.data.booksByReadingStateAndProfile);
};

const shelf = async (): Promise<
	Result<
		{
			reading: ReadonlyArray<Book>;
			finished: ReadonlyArray<Book>;
			next: ReadonlyArray<Book>;
		},
		FetchBooksError
	>
> =>
	Result.gen(async function* () {
		const reading = yield* Result.await(
			getBooks({ readingStatus: "IS_READING", limit: 10 }),
		);
		const finished = yield* Result.await(
			getBooks({ readingStatus: "FINISHED", limit: 20 }),
		);
		const next = yield* Result.await(
			getBooks({ readingStatus: "WANTS_TO_READ", limit: 10 }),
		);

		return Result.ok({ reading, finished, next });
	});

const books = {
	shelf,
};

export { books };
