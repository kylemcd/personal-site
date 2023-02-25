import Image, { ImageLoaderProps } from 'next/image';

import { FormattedSpotifyData } from '@/types/spotify';

import styles from './RecentlyPlayed.module.css';

const spotifyImageLoader = ({ src }: ImageLoaderProps): string => {
    return src;
};

const RecentlyPlayed = ({ data }: { data: FormattedSpotifyData }) => {
    // if(data?.){

    // }

    if (data?.error) {
        return <div>error</div>;
    }

    return (
        <div className={styles.container}>
            <Image
                src={data?.albumArt?.url!}
                width={data?.albumArt?.width}
                height={data?.albumArt?.height}
                alt={`${data?.songName} by ${data?.artistName}`}
            />
        </div>
    );
};

export default RecentlyPlayed;
