import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";

import { Bookshelf } from "@/components/Bookshelf";
import { ErrorComponent } from "@/components/ErrorComponent";
import { Text } from "@/components/Text";
import { goodreads } from "@/lib/goodreads";
import { buildMeta } from "@/lib/meta";

const getData = createServerFn({ method: "GET" }).handler(async () => {
	const booksResult = await goodreads.shelf();
	if (Result.isError(booksResult)) {
		console.error("Goodreads shelf failed:", booksResult.error);
	}
	const books = Result.isOk(booksResult)
		? booksResult.value
		: { reading: [], finished: [], next: [] };

	return { books };
});

export const Route = createFileRoute("/reading/")({
	component: ReadingRoute,
	loader: () => getData(),
	errorComponent: ErrorComponent,
	head: () => ({
		meta: buildMeta({
			title: "Reading - Kyle McDonald",
			url: "https://kylemcd.com/reading",
			image: "https://kylemcd.com/open-graph/reading.png",
		}),
	}),
});

function ReadingRoute() {
	const { books } = Route.useLoaderData();
	const hasReading = (books?.reading?.length ?? 0) > 0;
	const hasFinished = (books?.finished?.length ?? 0) > 0;

	if (!hasReading && !hasFinished) {
		return (
			<div className="section-container">
				<Text as="p" size="1" color="2">
					No reading data available right now.
				</Text>
			</div>
		);
	}

	return (
		<div className="section-stack">
			{hasReading && (
				<div className="section-container">
					<Text as="h2" size="2">
						Reading
					</Text>
					<Bookshelf books={books.reading} variant="grid" />
				</div>
			)}
			{hasFinished && (
				<div className="section-container">
					<Text as="h2" size="2">
						Finished
					</Text>
					<Bookshelf books={books.finished} variant="grid" />
				</div>
			)}
		</div>
	);
}
