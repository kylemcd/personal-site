import { pickFontColorBasedonBackgroundColor } from '@/helpers/colorHelper';
import { FormattedGitHubData } from '@/types/github';
import { StatsContainer } from '../StatsContainer';
import { Button } from '@/components/global/Button';
import { Paragraph } from '@/components/global/Typography';

import styles from './GitHub.module.css';

const GitHub = ({ data }: { data: FormattedGitHubData | null }) => {
    const dayOfWeekAsString = (dayIndex: number) => {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex] || '';
    };

    return (
        <StatsContainer>
            <div className={styles.container}>
                <div className={styles.topContainer}>
                    <div className={styles.contributionContainer}>
                        {data?.mostRecentWeek?.map((day, index) => (
                            <div key={index}>
                                <Paragraph color={'--secondary-font-color'}>
                                    {dayOfWeekAsString(new Date(day.date).getDay())}
                                </Paragraph>
                                <div
                                    className={styles.contribution}
                                    style={{
                                        backgroundColor: day.color,
                                        color: pickFontColorBasedonBackgroundColor(day.color, '#fff', '#000'),
                                    }}
                                    key={day.weekday}
                                >
                                    {day.contributionCount}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={styles.statsContainer}>
                    <div className={styles.statContainer}>
                        <Paragraph color={'--primary-font-color'}>This Year</Paragraph>
                        <Paragraph color={'--primary-font-color'}>{data?.yearlyContributions}</Paragraph>
                    </div>
                    <div className={styles.statContainer}>
                        <Paragraph color={'--primary-font-color'}>This Week</Paragraph>
                        <Paragraph color={'--primary-font-color'}>{data?.weeklyContributions}</Paragraph>
                    </div>
                    <div className={styles.statContainer}>
                        <Paragraph color={'--primary-font-color'}>Current Streak</Paragraph>
                        <Paragraph color={'--primary-font-color'}>{data?.streak}</Paragraph>
                    </div>
                </div>
                <div className={styles.bottomContainer}>
                    <Paragraph color={'--primary-font-color'}>GitHub Contributions</Paragraph>
                    <Button
                        type="a"
                        href={'https://github.com/kylemcd'}
                        target="_blank"
                        color={'--primary-color'}
                        size={'sm'}
                    >
                        Open on GitHub
                    </Button>
                </div>
            </div>
        </StatsContainer>
    );
};

export default GitHub;
