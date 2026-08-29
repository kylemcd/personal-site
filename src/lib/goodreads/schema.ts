export type Book = {
	title: string;
	subtitle: string | null;
	description: string | null;
	slug: string | null;
	cover: string | null;
	authors: Array<{ name: string }>;
};
