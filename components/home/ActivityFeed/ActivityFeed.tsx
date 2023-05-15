'use client';
import { RecentlyPlayed } from '@/components/home/RecentlyPlayed';
import { RecentlyGamed } from '@/components/home/RecentlyGamed';
import { GitHub } from '@/components/home/GitHub';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import style from './ActivityFeed.module.css';

const ActivityFeed = ({ data }: { data: any }) => {
    const { github, playlist, steam } = data;
    return (
        <SimpleBar
            scrollbarMaxSize={300}
            autoHide={false}
            classNames={{
                scrollbar: style.scrollbar + ' scrollbar',
                track: style.track,
                contentEl: style.statsScrollContainer,
                dragging: style.dragging,
                contentWrapper: style.contentWrapper,
            }}
        >
            <GitHub data={github} />
            <RecentlyPlayed data={playlist!} />
            <RecentlyGamed data={steam!} />
        </SimpleBar>
    );
};

export default ActivityFeed;
