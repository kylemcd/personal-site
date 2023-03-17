const GITHUB_USERNAME = 'kylemcd';
const FIRST_OF_YEAR = `${new Date().getFullYear()}-01-01T12:00:00Z`;

const fetchGitHubData = async () => {
    const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
        body: JSON.stringify({
            query: `query {
                    user(login: "${GITHUB_USERNAME}") {
                      name
                      contributionsCollection(from: "${FIRST_OF_YEAR}") {
                        contributionCalendar {
                          colors
                          totalContributions
                          weeks {
                            contributionDays {
                              color
                              contributionCount
                              date
                              weekday
                            }
                            firstDay
                          }
                        }
                      }
                    }
                  }`,
        }),
        next: { revalidate: 3600 /* 1 hour */ },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch github data');
    }

    return res.json();
};

export default fetchGitHubData;
