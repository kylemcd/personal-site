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
    track: {
        name: string;
        artists: RawSpotifyArtist[];
        album: {
            images: RawSpotifyImage[];
        };
        external_urls: {
            spotify: string;
        };
        duration_ms: number;
    };
}

export interface RawSpotifyPlaylistData {
    images: RawSpotifyImage[];
    name: string;
    tracks: {
        items: RawSpotifyTrack[];
    };
    external_urls: {
        spotify: string;
    };
}

export interface FormattedSpotifyTrack {
    songName?: string | null;
    artistName?: string | null;
    albumArt?: RawSpotifyImage | null;
    href?: string | null;
    duration: string;
    error?: ErrorResponse;
}

export interface FormattedSpotifyData {
    name: string;
    image: RawSpotifyImage;
    href: string;
    tracks: FormattedSpotifyTrack[];
}
