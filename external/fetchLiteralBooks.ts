const fetchLiteralBooks = async (): Promise<any> => {
    const query = `
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
      slug
      cover
      authors {
        name
      }
    }
}`;

    const currentlyReadingArgs = {
        limit: 3,
        offset: 0,
        readingStatus: 'IS_READING',
        profileId: 'clqazgb086327830htsy14mo9ld',
    };

    const finishedArgs = {
        limit: 4,
        offset: 0,
        readingStatus: 'FINISHED',
        profileId: 'clqazgb086327830htsy14mo9ld',
    };

    const currentlyReadingRes = await fetch('https://literal.club/graphql/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            variables: currentlyReadingArgs,
        }),
    });
    const currentlyReadingJson = await currentlyReadingRes.json();

    const finishedResponse = await fetch('https://literal.club/graphql/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: query,
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
};

export default fetchLiteralBooks;
