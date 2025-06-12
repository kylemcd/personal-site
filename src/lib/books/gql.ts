export const booksQuery = `
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
