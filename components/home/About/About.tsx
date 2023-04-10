import { Paragraph } from '@/components/global/Typography';
import styles from './About.module.css';

const About = () => {
    return (
        <div className={styles.container}>
            <Paragraph size="lg" color="--primary-font-color">
                Hi, I'm Kyle McDonald, I work in tech and am currently based out of Chicago ✶✶✶✶. I like to build
                beautiful things on front-end in React and pushing the boundaries of what is possible. I also enjoy
                leading teams, establishing processes, empowering engineers, and shipping high quality software. Outside
                of work I enjoy hanging out with my dog, going for rides on my bike, playing an egregious amount of Hell
                Let Loose, tinkering with mechanical keyboards, and whatever else is currently piquing my interest.
            </Paragraph>
        </div>
    );
};

export default About;
