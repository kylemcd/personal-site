import Image from 'next/image';

import { FormattedSteamData } from '@/types/steam';
import { StatsContainer } from '@/components/home/StatsContainer';
import { Heading, Paragraph } from '@/components/global/Typography';
import { Button } from '@/components/global/Button';

import styles from './RecentlyGamed.module.css';

const RecentlyGamed = ({ data }: { data: FormattedSteamData }) => {
    return (
        <StatsContainer>
            <div className={styles.container}>
                <div className={styles.infoContainer}>
                    <div className={styles.copyContainer}>
                        <div className={styles.copyContainerTop}>
                            <Image
                                src={data?.image}
                                width={231}
                                height={88}
                                alt={`${data?.name}`}
                                className={styles.gameArt}
                            />
                            <div className={styles.copy}>
                                <Heading color={`--primary-font-color`} size="md" element="h3">
                                    {data?.name}
                                </Heading>
                            </div>
                        </div>
                        <div className={styles.gameTimeContainer}>
                            <div className={styles.gameTime}>
                                <Paragraph color={`--primary-font-color`} size="md">
                                    Last played
                                </Paragraph>
                                <Paragraph color={`--secondary-font-color`} size="md">
                                    {data?.lastPlayed}
                                </Paragraph>
                            </div>
                            <div className={styles.gameTime}>
                                <Paragraph color={`--primary-font-color`} size="md">
                                    Last 2 weeks
                                </Paragraph>
                                <Paragraph color={`--secondary-font-color`} size="md">
                                    {data?.lastTwoWeeksPlayTime.days} {data?.lastTwoWeeksPlayTime.hours}
                                </Paragraph>
                            </div>
                            <div className={styles.gameTime}>
                                <Paragraph color={`--primary-font-color`} size="md">
                                    All time
                                </Paragraph>
                                <Paragraph color={`--secondary-font-color`} size="md">
                                    {data?.totalPlayTime.days} {data?.totalPlayTime.hours}
                                </Paragraph>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.bottomContainer}>
                    <div className={styles.recentlyGamedContainer}>
                        <Paragraph color={`--secondary-font-color`} size="md">
                            Recently Gamed
                        </Paragraph>
                    </div>
                    <Button type="a" href={data?.link} target="_blank" color={'--primary-color'} size="sm">
                        Open on Steam
                    </Button>
                </div>
            </div>
        </StatsContainer>
    );
};

export default RecentlyGamed;
