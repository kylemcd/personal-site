import Image from 'next/image';

import { FormattedSteamData } from '@/types/steam';
import { StatsContainer } from '@/components/home/StatsContainer';
import { TertiaryHeading, Paragraph } from '@/components/global/Typography';
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
                                <TertiaryHeading color={`--primary-font-color`}>{data?.name}</TertiaryHeading>
                            </div>
                        </div>
                        <div className={styles.gameTimeContainer}>
                            <div className={styles.gameTime}>
                                <Paragraph color={`--primary-font-color`}>Last played</Paragraph>
                                <Paragraph color={`--secondary-font-color`}>{data?.lastPlayed}</Paragraph>
                            </div>
                            <div className={styles.gameTime}>
                                <Paragraph color={`--primary-font-color`}>Last 2 weeks</Paragraph>
                                <Paragraph color={`--secondary-font-color`}>
                                    {data?.lastTwoWeeksPlayTime.days} {data?.lastTwoWeeksPlayTime.hours}
                                </Paragraph>
                            </div>
                            <div className={styles.gameTime}>
                                <Paragraph color={`--primary-font-color`}>All time</Paragraph>
                                <Paragraph color={`--secondary-font-color`}>
                                    {data?.totalPlayTime.days} {data?.totalPlayTime.hours}
                                </Paragraph>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.bottomContainer}>
                    <div className={styles.recentlyGamedContainer}>
                        <Paragraph color={`--secondary-font-color`}>Recently Gamed</Paragraph>
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
