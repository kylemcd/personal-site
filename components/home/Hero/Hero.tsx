import { Heading } from '@/components/global/Typography';

import styles from './Hero.module.css';

const Hero = () => {
    return (
        <div className={styles.container}>
            <div className={styles.contentContainer}>
                <Heading className="font-black" element="h2" size="xl" style={{ fontWeight: '500' }}>
                Idk
                </Heading>
            </div>
        </div>
    );
};

export default Hero;
