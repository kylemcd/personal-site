import { HorizontalScrollContainer } from '@/components/HorizontalScrollContainer';
import { Text } from '@/components/Text';
import { TrackItemSchema } from '@/lib/spotify/schema';

import './Album.styles.css';

type AlbumShelfProps = {
    albums: ReadonlyArray<typeof TrackItemSchema.Type>;
};

function AlbumShelf({ albums }: AlbumShelfProps) {
    return (
        <HorizontalScrollContainer className="album-shelf">
            {albums.map((album) => (
                <a
                    className="album"
                    key={album.track.id}
                    href={`https://open.spotify.com/track/${album.track.id}`}
                    target="_blank"
                >
                    <img src={album.track.album.images[0].url} alt={album.track.name} className="album-image" />
                    <div className="album-info">
                        <Text as="p" size="1">
                            {album.track.name}
                        </Text>
                        <Text as="p" size="0" color="2">
                            {album.track.artists.map((artist) => artist.name).join(', ')}
                        </Text>
                    </div>
                </a>
            ))}
        </HorizontalScrollContainer>
    );
}

export { AlbumShelf };
