import { Text } from '@/components/lib/Text';
import { GithubLogo, XLogo, LinkedinLogo } from '@phosphor-icons/react/dist/ssr';

const Footer = () => {
    return (
        <div className="footer">
            <Text as="p" size="0" color="secondary">
                &copy; 2011-{new Date().getFullYear()} — Kyle McDonald
            </Text>
            <ul className="footer-links">
                <li className="footer-link">
                    <Text
                        as="a"
                        href="https://github.com/kylemcd"
                        target="_blank"
                        aria-label="GitHub"
                        color="secondary"
                    >
                        <GithubLogo />
                    </Text>
                </li>
                <li className="footer-link">
                    <Text
                        as="a"
                        href="https://twitter.com/kpmdev"
                        target="_blank"
                        aria-label="Twitter"
                        color="secondary"
                    >
                        <XLogo />
                    </Text>
                </li>
                <li className="footer-link">
                    <Text
                        as="a"
                        href="https://www.linkedin.com/in/kylemcd1/"
                        target="_blank"
                        aria-label="LinkedIn"
                        color="secondary"
                    >
                        <LinkedinLogo />
                    </Text>
                </li>
            </ul>
        </div>
    );
};

export { Footer };
