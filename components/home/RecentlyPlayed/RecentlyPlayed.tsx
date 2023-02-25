import Image, { ImageLoaderProps } from 'next/image';

import { FormattedSpotifyData } from '@/types/spotify';

import styles from './RecentlyPlayed.module.css';
import { StatsContainer } from '@/components/home/StatsContainer';
import { SecondaryHeading, Paragraph } from '@/components/global/Typography';
import { Button } from '@/components/global/Button';

const RecentlyPlayed = ({ data }: { data: FormattedSpotifyData }) => {
    if (data?.error) {
        return <div>error</div>;
    }

    return (
        <StatsContainer>
            <div className={styles.container}>
                <Image
                    src={data?.albumArt?.url!}
                    width={data?.albumArt?.width}
                    height={data?.albumArt?.height}
                    alt={`${data?.songName} by ${data?.artistName}`}
                    className={styles.albumArt}
                />
                <SecondaryHeading color={`--primary-font-color`}>{data?.songName}</SecondaryHeading>
                <Paragraph color={`--secondary-font-color`}>{data?.artistName}</Paragraph>
                {/* <Button type="a" href={data?.href!} target="_blank" color={'--primary-color'} size="sm">
                    Open on Spotify
                </Button> */}
            </div>
        </StatsContainer>
    );
};

export default RecentlyPlayed;
