import { Text } from "@/components/Text/Text";
import type { BookSchema } from "@/lib/books/schema";

import "./Bookshelf.styles.css";

type BookshelfProps = {
	books: ReadonlyArray<typeof BookSchema.Type>;
	variant?: "row" | "grid";
};

type BookCardProps = {
	book: typeof BookSchema.Type;
};

function BookCard({ book }: BookCardProps) {
	return (
		<div className="book">
			{book.cover ? (
				<div className="cover">
					<img src={book.cover} alt={book.title} />
				</div>
			) : (
				<div className="text-cover">
					<Text as="p" size="1" align="center" weight="500">
						{book.title}
					</Text>
					<Text as="p" size="0" align="center">
						{book.authors.map((author) => author.name).join(", ")}
					</Text>
				</div>
			)}
			<a
				className="link"
				href={`https://www.goodreads.com/book/show/${book.slug}`}
				target="_blank"
				rel="noopener noreferrer"
			>
				<span className="sr-only">View {book.title} on Goodreads</span>
			</a>
		</div>
	);
}

function Bookshelf({ books, variant = "row" }: BookshelfProps) {
	if (!books) return null;

	return (
		<div className="bookshelf" data-variant={variant}>
			{books.map((book) => (
				<BookCard book={book} key={book.slug} />
			))}
		</div>
	);
}

export { BookCard, Bookshelf };
