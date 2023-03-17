'use client';
import React, { useEffect, useRef } from 'react';

import styles from './Hero.module.css';

import { HeroHeading } from '@/components/global/Typography';

import { Playfair_Display } from '@next/font/google';
const playfairDisplay = Playfair_Display({ subsets: ['latin'] });

const Hero = () => {
    const heroRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        const hero = heroRef?.current!;
        const heroOffsetTop = hero?.offsetTop - hero?.offsetHeight;
        const heroScrollTop = hero?.scrollTop;
        const bottomOfHeroDistanceFromNav = heroOffsetTop! - heroScrollTop!;
        const borderSize = 2;

        const topNavigation = document.querySelector('.top-navigation') as HTMLElement;

        if (bottomOfHeroDistanceFromNav - borderSize > 0 && topNavigation) {
            topNavigation.style.transform = `translateY(-${bottomOfHeroDistanceFromNav - borderSize}px)`;
        } else {
            topNavigation.style.transform = `translateY(0px)`;
        }
    };

    useEffect(() => {
        if (heroRef.current) {
            handleScroll();
            document.addEventListener('scroll', handleScroll);

            return () => {
                document.removeEventListener('scroll', handleScroll);
            };
        }
    }, []);

    return (
        <div className={styles.container} ref={heroRef}>
            <div className={styles.contentContainer}>
                <HeroHeading className={playfairDisplay.className} style={{ fontWeight: '500' }}>
                    Director of Engineering at Foxtrot. Just <span>putzing</span> around.
                </HeroHeading>
            </div>
        </div>
    );
};

export default Hero;
