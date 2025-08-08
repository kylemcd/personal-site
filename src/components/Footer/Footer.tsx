import { Text } from '@/components/Text';

import './Footer.styles.css';

function Footer() {
    return (
        <div className="footer-container">
            <Text as="span" size="0" color="2">
                &copy; 2011-{new Date().getFullYear()} — Kyle McDonald
            </Text>
        </div>
    );
}

export { Footer };
