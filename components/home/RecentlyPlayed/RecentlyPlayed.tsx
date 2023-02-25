import Image, { ImageLoaderProps } from 'next/image';
import dynamic from 'next/dynamic';

import { FormattedSpotifyData } from '@/types/spotify';

import styles from './RecentlyPlayed.module.css';
import { StatsContainer } from '@/components/home/StatsContainer';
import { SecondaryHeading, Paragraph } from '@/components/global/Typography';
const Button = dynamic(() => import('../../global/Button/Button'), { ssr: false });
// import { Button } from '@/components/global/Button';

const RecentlyPlayed = ({ data }: { data: FormattedSpotifyData }) => {
    if (data?.error) {
        return <div>error</div>;
    }

    return (
        <StatsContainer className={styles.container}>
            <>
                <Image
                    src={data?.albumArt?.url!}
                    width={data?.albumArt?.width}
                    height={data?.albumArt?.height}
                    alt={`${data?.songName} by ${data?.artistName}`}
                    className={styles.albumArt}
                />
                <SecondaryHeading color={`--primary-font-color`}>{data?.songName}</SecondaryHeading>
                <Paragraph color={`--secondary-font-color`}>{data?.artistName}</Paragraph>
                <Button type="a" href={data?.href!} target="_blank" color={'--primary-color'}>
                    Open on Spotify
                </Button>
            </>
        </StatsContainer>
    );
};

export default RecentlyPlayed;
