const booksByReadingStateAndProfileQuery = `
        query booksByReadingStateAndProfile(
        $limit: Int!
        $offset: Int!
        $readingStatus: ReadingStatus!
        $profileId: String!
    ) {
        booksByReadingStateAndProfile(
        limit: $limit
        offset: $offset
        readingStatus: $readingStatus
        profileId: $profileId
    ) {
        title
        subtitle
        description
        slug
        cover
        authors {
            name
        }
    }
}
`;

export type Book = {
    title: string;
    subtitle: string;
    description: string;
    slug: string;
    cover: string;
    authors: Array<{
        name: string;
    }>;
};

const currentlyReadingArgs = {
    limit: 3,
    offset: 0,
    readingStatus: 'IS_READING',
    profileId: 'clqazgb086327830htsy14mo9ld',
};

const finishedArgs = {
    limit: 8,
    offset: 0,
    readingStatus: 'FINISHED',
    profileId: 'clqazgb086327830htsy14mo9ld',
};

export const fetchLiteralBooks = async (): Promise<{ currentlyReading: Book | null; finished: Array<Book> | null }> => {
    try {
        const currentlyReadingResponse = await fetch('https://literal.club/graphql/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: booksByReadingStateAndProfileQuery,
                variables: currentlyReadingArgs,
            }),
        });
        const currentlyReadingJson = await currentlyReadingResponse.json();

        const finishedResponse = await fetch('https://literal.club/graphql/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: booksByReadingStateAndProfileQuery,
                variables: finishedArgs,
            }),
        });
        const finishedJson = await finishedResponse.json();

        const currentlyReading = currentlyReadingJson?.data?.booksByReadingStateAndProfile?.[0];
        const finished = finishedJson?.data?.booksByReadingStateAndProfile;

        return {
            currentlyReading,
            finished,
        };
    } catch (error) {
        return {
            currentlyReading: null,
            finished: null,
        };
    }
};
