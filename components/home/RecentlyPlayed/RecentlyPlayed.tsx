import Image from 'next/image';

import { FormattedSpotifyData } from '@/types/spotify';

import { StatsContainer } from '@/components/home/StatsContainer';
import { TertiaryHeading, Paragraph } from '@/components/global/Typography';
import { Button } from '@/components/global/Button';

import styles from './RecentlyPlayed.module.css';

const RecentlyPlayed = ({ data }: { data: FormattedSpotifyData }) => {
    return (
        <StatsContainer>
            <div className={styles.container}>
                <div className={styles.infoContainer}>
                    <Image
                        src={data?.image?.url!}
                        width={data?.image?.width}
                        height={data?.image?.height}
                        alt={`${data?.name}`}
                        className={styles.albumArt}
                    />
                    <div className={styles.copyContainer}>
                        <TertiaryHeading color={`--primary-font-color`}>{data?.name}</TertiaryHeading>
                    </div>
                </div>
                <div className={styles.trackContainer}>
                    {data?.tracks.map((track) => (
                        <div className={styles.track}>
                            <div>
                                <Paragraph color={`--primary-font-color`} style={{ fontWeight: 500 }}>
                                    {track.songName}
                                </Paragraph>
                            </div>
                            <div className={styles.trackInfo}>
                                <Paragraph color={`--primary-font-color`}>{track.artistName}</Paragraph>
                                <Paragraph color={`--secondary-font-color`}>{track.duration}</Paragraph>
                            </div>
                        </div>
                    ))}
                </div>
                <div className={styles.bottomContainer}>
                    <div className={styles.nowPlayingContainer}>
                        <Paragraph color={`--secondary-font-color`}>Recently Played</Paragraph>
                        <span className={styles.musicBars}>
                            <span className={styles.musicBar + ' ' + styles.musicBar1} />
                            <span className={styles.musicBar + ' ' + styles.musicBar2} />
                            <span className={styles.musicBar + ' ' + styles.musicBar3} />
                        </span>
                    </div>
                    <Button type="a" href={data?.href!} target="_blank" color={'--primary-color'} size="sm">
                        Open on Spotify
                    </Button>
                </div>
            </div>
        </StatsContainer>
    );
};

export default RecentlyPlayed;
