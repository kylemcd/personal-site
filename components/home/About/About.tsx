import { Paragraph } from '@/components/global/Typography';
import styles from './About.module.css';

const About = () => {
    return (
        <div className={styles.container}>
            <Paragraph size="lg" color="--primary-font-color">
                Hey there, I'm Kyle McDonald - a software engineer currently based out of the beautiful city of Chicago
                ✶✶✶✶. My passion lies in crafting visually stunning front-end interfaces with React and pushing the
                limits of what can be achieved. I also have a knack for leadership, process development, and shipping
                top-notch software with my team. When I'm not busy coding, you'll find me hanging out with my loyal
                furry companion, cruising around the city on my bike, playing an egregious amount of Hell Let Loose, or
                indulging in my latest interest, which is currently tinkering with mechanical keyboards.
            </Paragraph>
        </div>
    );
};

export default About;
