import { Text } from '@/components/Text';

import './Navigation.styles.css';

function Navigation() {
    return (
        <div className="navigation">
            <Text as="a" size="2" href="/">
                Kyle McDonald
            </Text>
        </div>
    );
}

export { Navigation };
