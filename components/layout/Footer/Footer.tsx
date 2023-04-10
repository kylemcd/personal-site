import { Paragraph } from '@/components/global/Typography';
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <div className={styles.container}>
            <Paragraph size="md">&copy; 2011-{new Date().getFullYear()} &mdash; Kyle McDonald</Paragraph>
            <ul className={styles.linksList}>
                <li className={styles.linksListItem}>
                    <a href="https://twitter.com/kpmdev" target="_blank">
                        Twitter
                    </a>
                </li>
                <li className={styles.linksListItem}>
                    <a href="https://github.com/kylemcd" target="_blank">
                        GitHub
                    </a>
                </li>
                <li className={styles.linksListItem}>
                    <a href="https://linkedin.com/in/kylemcd1" target="_blank">
                        Linkedin
                    </a>
                </li>
            </ul>
        </div>
    );
};
export default Footer;
