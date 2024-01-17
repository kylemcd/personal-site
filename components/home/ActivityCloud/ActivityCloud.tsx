'use client';
import React from 'react';
import Image from 'next/image';
import { ActivityCloudItem } from '@/components/home/ActivityCloudItem';
import type { FormattedSpotifyData } from '@/types/spotify';
import type { FormattedSteamData } from '@/types/steam';
import type { FormattedBooks } from '@/types/books';

type ActivityCloudProps = {
    playlist: FormattedSpotifyData | null;
    steam: FormattedSteamData | null;
    books: FormattedBooks | null;
};

function ActivityCloud({ playlist, steam, books }: ActivityCloudProps) {
    if (!playlist || !steam || !books) return null;
    return (
        <div
            className={[
                'my-0 grid grid-cols-1 md:grid-cols-3 rounded-2xl',
                'border-2 border-gray-3 [&>div]:border-b-2 [&>div]:border-b-gray-3 [&>div:last-child]:border-b-transparent',
                'md:[&>div]:border-b-transparent md:[&>div]:border-r-2 md:[&>div]:border-r-gray-3 [&>div:last-child]:border-r-transparent',
            ].join(' ')}
        >
            <ActivityCloudItem
                className="rounded-tl-2xl rounded-tr-2xl md:rounded-bl-2xl md:rounded-tr-none"
                Content={() => (
                    <div className="flex flex-col h-full">
                        <div className="flex flex-row gap-8 items-center w-full h-full">
                            <Image
                                src={books.currentlyReading?.cover}
                                alt={books.currentlyReading?.title}
                                className="w-[30%] h-auto shadow-sm rounded-md"
                                width={324}
                                height={500}
                            />
                            <div className="flex flex-col justify-between">
                                <span className="font-sans text-lg">{books?.currentlyReading?.title}</span>
                                <span className="font-sans text-lg text-gray-11">
                                    {books?.currentlyReading?.authors?.[0]?.name}
                                </span>
                            </div>
                        </div>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Currently Reading</h3>
                    </div>
                )}
                ExpandedContent={() => (
                    <div className="flex flex-col h-full gap-2">
                        <ul className="list-none flex flex-col gap-2 mt-auto">
                            {books.finished.map((book, index) => (
                                <li className="flex flex-col" key={index}>
                                    <span className="text-md">{book?.title}</span>
                                    <span className="text-sm text-gray-11">{book?.authors?.[0]?.name}</span>
                                </li>
                            ))}
                        </ul>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Recently Read</h3>
                    </div>
                )}
            />
            <ActivityCloudItem
                Content={() => (
                    <div className="flex flex-col h-full">
                        <div className="flex flex-row gap-8 items-center justify-center w-full h-full">
                            <Image
                                src={playlist.image.url}
                                width={playlist.image.width}
                                height={playlist.image.height}
                                alt="Spotify"
                                className="w-[30%] h-auto shadow-sm rounded-md"
                            />
                            <div className="flex flex-col justify-between">
                                <span className="font-sans text-lg">{playlist?.name}</span>
                                <span className="text-sans text-lg text-gray-11">Playlist</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Recently Listened</h3>
                    </div>
                )}
                ExpandedContent={() => (
                    <div className="flex flex-col h-full gap-2 w-full">
                        <ul className="list-none flex flex-col gap-2 mt-auto">
                            {playlist.tracks.map((track, index) => (
                                <li className="flex flex-col" key={index}>
                                    <span className="text-md">{track.songName}</span>
                                    <span className="text-sm text-gray-11">{track.artistName}</span>
                                </li>
                            ))}
                        </ul>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Songs</h3>
                    </div>
                )}
            />
            <ActivityCloudItem
                className="rounded-bl-2xl rounded-br-2xl md:rounded-br-2xl md:rounded-bl-none"
                Content={() => (
                    <div className="flex flex-col h-full">
                        <div className="flex flex-row gap-4 items-center justify-center w-full h-full">
                            <Image
                                src={steam.image}
                                width={231}
                                height={88}
                                alt={steam.name}
                                className="w-[50%] h-auto shadow-sm rounded-md"
                            />
                            <div className="flex flex-col justify-between items-start w-full">
                                <span className="font-sans text-lg">{steam.name}</span>
                            </div>
                        </div>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Recently Gamed</h3>
                    </div>
                )}
                ExpandedContent={() => (
                    <div className="flex flex-col h-full gap-2">
                        <ul className="list-none flex flex-col gap-2 mt-auto">
                            <li className="flex flex-col">
                                <span className="text-md">
                                    {steam.totalPlayTime.days} {steam.totalPlayTime.hours}
                                </span>
                                <span className="text-sm text-gray-11">All-time</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="text-md">
                                    {steam.lastTwoWeeksPlayTime.days} {steam.lastTwoWeeksPlayTime.hours}
                                </span>
                                <span className="text-sm text-gray-11">Last Two Weeks</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="text-md">{steam.lastPlayed}</span>
                                <span className="text-sm text-gray-11">Last Played</span>
                            </li>
                        </ul>
                        <h3 className="text-sm font-mono uppercase text-gray-10 mt-auto">Play Time</h3>
                    </div>
                )}
            />
        </div>
    );
}

export { ActivityCloud };
