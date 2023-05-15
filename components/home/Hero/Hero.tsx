import { Playfair_Display } from 'next/font/google';

import { Heading } from '@/components/global/Typography';

import styles from './Hero.module.css';

const playfairDisplay = Playfair_Display({ subsets: ['latin'] });

const Hero = () => {
    return (
        <div className={styles.container}>
            <div className={styles.contentContainer}>
                <Heading className={playfairDisplay.className} element="h2" size="xl" style={{ fontWeight: '500' }}>
                    Director of Engineering at Foxtrot. Just <span>tinkering</span> around.
                </Heading>
            </div>
        </div>
    );
};

export default Hero;
