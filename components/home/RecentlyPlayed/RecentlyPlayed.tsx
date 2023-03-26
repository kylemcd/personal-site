import Image from 'next/image';

import { FormattedSpotifyData } from '@/types/spotify';

import { StatsContainer } from '@/components/home/StatsContainer';
import { TertiaryHeading, Paragraph } from '@/components/global/Typography';
import { Button } from '@/components/global/Button';

import styles from './RecentlyPlayed.module.css';

const RecentlyPlayed = ({ data }: { data: FormattedSpotifyData }) => {
    if (data?.error) {
        return <div>error</div>;
    }

    return (
        <StatsContainer>
            <>
                <div className={styles.infoContainer}>
                    <Image
                        src={data?.albumArt?.url!}
                        width={data?.albumArt?.width}
                        height={data?.albumArt?.height}
                        alt={`${data?.songName} by ${data?.artistName}`}
                        className={styles.albumArt}
                    />
                    <div className={styles.copyContainer}>
                        <TertiaryHeading color={`--primary-font-color`}>{data?.songName}</TertiaryHeading>
                        <Paragraph color={`--secondary-font-color`}>{data?.artistName}</Paragraph>
                    </div>
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
            </>
        </StatsContainer>
    );
};

export default RecentlyPlayed;
