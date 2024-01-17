export type Book = {
    title: string;
    subtitle: string;
    slug: string;
    cover: string;
    authors: Array<{ name: string}>;
};

export type FormattedBooks = {
    currentlyReading: Book;
    finished: Array<Book>;
};
