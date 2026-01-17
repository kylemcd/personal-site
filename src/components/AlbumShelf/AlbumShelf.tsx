import { HorizontalScrollContainer } from '@/components/HorizontalScrollContainer';
import { Text } from '@/components/Text';
import { AlbumSchema } from '@/lib/lastfm/schema';

import './Album.styles.css';

type AlbumShelfProps = {
    albums: ReadonlyArray<typeof AlbumSchema.Type>;
};

const getAlbumImage = (images: typeof AlbumSchema.Type['image']) => {
    const extralarge = images.find((img) => img.size === 'extralarge');
    return extralarge?.['#text'] ?? images[images.length - 1]?.['#text'] ?? '';
};

function AlbumShelf({ albums }: AlbumShelfProps) {
    return (
        <HorizontalScrollContainer className="album-shelf">
            {albums.map((album) => (
                <a className="album" key={album.url} href={album.url} target="_blank" rel="noopener noreferrer">
                    <img src={getAlbumImage(album.image)} alt={album.name} className="album-image" />
                    <div className="album-info">
                        <Text as="p" size="1">
                            {album.name}
                        </Text>
                        <Text as="p" size="0" color="2">
                            {album.artist.name}
                        </Text>
                    </div>
                </a>
            ))}
        </HorizontalScrollContainer>
    );
}

export { AlbumShelf };
