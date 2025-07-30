import { useRef } from 'react';

import { Text } from '@/components/Text';

import './HomeHero.styles.css';

function HomeHero() {
    const homeHeroFullImageRef = useRef<HTMLImageElement>(null);
    return (
        <div>
            <div className="home-hero-top-container">
                <Text as="h1" size="2">
                    Kyle McDonald
                </Text>
            </div>
            <div className="home-hero">
                <div
                    className="home-hero-image-container"
                    onMouseEnter={() => {
                        if (homeHeroFullImageRef.current) {
                            homeHeroFullImageRef.current.style.opacity = '1';
                            homeHeroFullImageRef.current.style.transition = 'opacity 2s ease-in-out';
                        }
                    }}
                    onMouseLeave={() => {
                        if (homeHeroFullImageRef.current) {
                            homeHeroFullImageRef.current.style.opacity = '0';
                            homeHeroFullImageRef.current.style.transition = 'opacity 2s ease-in-out';
                        }
                    }}
                >
                    <img src="/images/ascii-picture.png" alt="Kyle" className="home-hero-ascii-image" />
                    <img
                        src="/images/full-picture.png"
                        alt="Kyle"
                        className="home-hero-full-image"
                        ref={homeHeroFullImageRef}
                    />
                </div>
                <div className="home-hero-text-container">
                    <Text as="p" size="1">
                        Hey, I'm Kyle and I like building things. Whether it’s front-end interfaces, developer tools, or
                        the perfect iRacing setup. I spend most of my time working with React, making software feel fast
                        and seamless, and obsessing over the little details that make a great user experience. I also
                        care a lot about good keyboard shortcuts and not making people fight with their tools.
                        <br />
                        <br />
                        When I’m not deep in code, I’m probably chasing lap times in iRacing, watching F1 and convincing
                        myself I could totally be an engineer for Red Bull, or tweaking setups until I forget what
                        “optimal” even looks like. Off the track, I spend a lot of time biking through the city,
                        tinkering with mechanical keyboards, and hanging out with my dog, Wallie, who has no idea what I
                        do all day but is very supportive.
                    </Text>
                </div>
            </div>
        </div>
    );
}

export { HomeHero };
