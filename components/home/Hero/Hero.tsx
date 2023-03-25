'use client';
import styles from './Hero.module.css';

import { HeroHeading } from '@/components/global/Typography';

import { Playfair_Display } from '@next/font/google';
const playfairDisplay = Playfair_Display({ subsets: ['latin'] });

const Hero = () => {
    return (
        <div className={styles.container}>
            <div className={styles.contentContainer}>
                <HeroHeading className={playfairDisplay.className} style={{ fontWeight: '500' }}>
                    Director of Engineering at Foxtrot. Just <span>putzing</span> around.
                </HeroHeading>
            </div>
        </div>
    );
};

export default Hero;
