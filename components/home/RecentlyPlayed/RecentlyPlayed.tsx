import Image from 'next/image';

import { FormattedSpotifyData } from '@/types/spotify';

import { StatsContainer } from '@/components/home/StatsContainer';
import { Heading, Paragraph } from '@/components/global/Typography';
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
                        <Heading color={`--primary-font-color`} size="md" element="h3">
                            {data?.name}
                        </Heading>
                    </div>
                </div>
                <div className={styles.trackContainer}>
                    {data?.tracks.map((track, index) => (
                        <div className={styles.track} key={index}>
                            <div>
                                <Paragraph color={`--primary-font-color`} size="md" style={{ fontWeight: 500 }}>
                                    {track.songName}
                                </Paragraph>
                            </div>
                            <div className={styles.trackInfo}>
                                <Paragraph color={`--primary-font-color`} size="md">
                                    {track.artistName}
                                </Paragraph>
                                <Paragraph color={`--secondary-font-color`} size="md">
                                    {track.duration}
                                </Paragraph>
                            </div>
                        </div>
                    ))}
                </div>
                <div className={styles.bottomContainer}>
                    <div className={styles.nowPlayingContainer}>
                        <Paragraph color={`--secondary-font-color`} size="md">
                            Recently Played
                        </Paragraph>
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
