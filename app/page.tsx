import '@/app/home.css';

import { Text } from '@/components/lib/Text';
import { PostList } from '@/components/shared/PostList';
import { Reading } from '@/components/home/Reading';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import { Experience } from '@/components/home/Experience';
const Home = async () => {
    return (
        <div className="home-container">
            <div className="about-me-container">
                <Image src="/avatar.png" alt="Kyle" width={75} height={75} className="about-me-avatar" />
                <Text as="h2" size="2" weight="600">
                    About me
                </Text>
                <Text as="p" className="about-me-text">
                    Hey, I'm Kyle. I like building things—whether it’s front-end interfaces, developer tools, or finding
                    the perfect racing line in iRacing. I spend most of my time working with React, making software feel
                    fast and seamless, and obsessing over the little details that make a great user experience. I also
                    care a lot about good keyboard shortcuts and not making people fight with their tools.
                    <br />
                    <br />
                    When I’m not deep in code, I’m probably chasing lap times in iRacing, watching F1 and convincing
                    myself I could totally be an engineer for Red Bull, or tweaking setups until I forget what “optimal”
                    even looks like. Off the track, I spend a lot of time biking through the city, tinkering with
                    mechanical keyboards, and hanging out with my dog, Wallie—who has no idea what I do all day but is
                    very supportive.
                </Text>
            </div>
            <div className="experience-container">
                <Text as="h2" size="2" weight="600">
                    Work
                </Text>
                <Experience />
            </div>
            <div className="posts-container">
                <Text as="h2" size="2" weight="600">
                    Writing
                </Text>
                <PostList />
            </div>
            <div className="reading-container">
                <div className="reading-header">
                    <Text as="h2" size="2" weight="600">
                        Reading
                    </Text>
                    <Text
                        as="a"
                        href="https://literal.club/kpm"
                        target="_blank"
                        size="1"
                        color="secondary"
                        className="reading-header-link"
                    >
                        <div>View all</div>
                        <ArrowRight />
                    </Text>
                </div>
                <Reading />
            </div>
        </div>
    );
};

export default Home;
