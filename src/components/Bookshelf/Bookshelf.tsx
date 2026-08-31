import { type Ref, useEffect, useRef } from "react";

import { Text } from "@/components/Text/Text";
import type { Book } from "@/lib/goodreads";

import "./Bookshelf.styles.css";

type BookshelfProps = {
	books: ReadonlyArray<Book>;
	variant?: "row" | "grid" | "masonry";
};

type BookCardProps = {
	book: Book;
	bookRef?: Ref<HTMLDivElement>;
};

const BookCard = ({ book, bookRef }: BookCardProps) => {
	return (
		<div className="book" ref={bookRef}>
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
};

const MasonryBookCard = ({ book }: { book: Book }) => {
	const bookRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const bookElement = bookRef.current;
		const bookshelfElement = bookElement?.parentElement;
		if (!bookElement || !bookshelfElement) return;
		if (globalThis.CSS?.supports("display", "grid-lanes")) {
			bookElement.dataset.masonryReady = "true";
			return;
		}

		let animationFrame = 0;
		const measure = () => {
			const bookshelfStyles = getComputedStyle(bookshelfElement);
			const rowHeight = Number.parseFloat(bookshelfStyles.gridAutoRows);
			const masonryGap = Number.parseFloat(bookshelfStyles.columnGap);
			const bookHeight = bookElement.getBoundingClientRect().height;

			if (
				!Number.isFinite(rowHeight) ||
				!Number.isFinite(masonryGap) ||
				rowHeight <= 0 ||
				bookHeight <= 0
			) {
				return;
			}

			const rowSpan = Math.ceil((bookHeight + masonryGap) / rowHeight);
			bookElement.style.setProperty("--book-row-span", String(rowSpan));
			bookElement.dataset.masonryReady = "true";
		};
		const scheduleMeasure = () => {
			cancelAnimationFrame(animationFrame);
			animationFrame = requestAnimationFrame(measure);
		};

		const resizeObserver = new ResizeObserver(scheduleMeasure);
		resizeObserver.observe(bookElement);
		scheduleMeasure();

		return () => {
			cancelAnimationFrame(animationFrame);
			resizeObserver.disconnect();
		};
	}, []);

	return <BookCard book={book} bookRef={bookRef} />;
};

const Bookshelf = ({ books, variant = "row" }: BookshelfProps) => {
	if (books.length === 0) return null;

	return (
		<div className="bookshelf" data-variant={variant}>
			{books.map((book) =>
				variant === "masonry" ? (
					<MasonryBookCard book={book} key={book.slug} />
				) : (
					<BookCard book={book} key={book.slug} />
				),
			)}
		</div>
	);
};

export { Bookshelf };
