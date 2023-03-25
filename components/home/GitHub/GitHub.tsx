import { FormattedGitHubData } from '@/types/github';
import { StatsContainer } from '../StatsContainer';
import { Button } from '@/components/global/Button';
import { PrimaryHeading, SecondaryHeading, Paragraph } from '@/components/global/Typography';
import styles from './GitHub.module.css';
const GitHub = ({ data }: { data: FormattedGitHubData | null }) => {
    return (
        <StatsContainer>
            <div className={styles.container}>
                <div className={styles.headingContainer}>
                    <SecondaryHeading color={'--primary-font-color'}>GitHub Contributions</SecondaryHeading>
                    <Button
                        type="a"
                        href={'https://github.com/kylemcd'}
                        target="_blank"
                        color={'--primary-color'}
                        size={'sm'}
                    >
                        Go To GitHub
                    </Button>
                </div>
                <div className={styles.statsContainer}>
                    <div className={styles.statContainer}>
                        <Paragraph color={'--primary-font-color'}>Year</Paragraph>
                        <PrimaryHeading color={'--primary-font-color'}>{data?.yearlyContributions}</PrimaryHeading>
                    </div>
                    <div className={styles.statContainer}>
                        <Paragraph color={'--primary-font-color'}>Week</Paragraph>
                        <PrimaryHeading color={'--primary-font-color'}>{data?.weeklyContributions}</PrimaryHeading>
                    </div>
                    <div className={styles.statContainer}>
                        <Paragraph color={'--primary-font-color'}>Streak</Paragraph>
                        <PrimaryHeading color={'--primary-font-color'}>{data?.streak}</PrimaryHeading>
                    </div>
                </div>
            </div>
        </StatsContainer>
    );
};

export default GitHub;
