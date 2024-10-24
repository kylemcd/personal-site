import { Heading } from '@/components/lib/Heading';
import { Text } from '@/components/lib/Text';

const HomeHero = () => {
    return (
        <div className="home-hero--container">
            <div className="home-hero--content-container">
                <Heading as="h1" size="999" family="serif">
                    Kyle McDonald
                </Heading>
                <div className="home-hero--subtitle-container">
                    <Text as="span" size="2" color="secondary" family="mono">
                        Software Engineer @ Knock
                    </Text>
                </div>
            </div>
        </div>
    );
};

export { HomeHero };
