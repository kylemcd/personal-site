import { ErrorResponse } from './global';

interface RawSpotifyArtist {
    name: string;
}

interface RawSpotifyImage {
    url: string;
    width: number;
    height: number;
}

export interface RawSpotifyTrack {
    name: string;
    artists: RawSpotifyArtist[];
    album: {
        images: RawSpotifyImage[];
    };
    external_urls: {
        spotify: string;
    };
}

export interface FormattedSpotifyData {
    songName?: string | null;
    artistName?: string | null;
    albumArt?: RawSpotifyImage | null;
    href?: string | null;
    error?: ErrorResponse;
}
