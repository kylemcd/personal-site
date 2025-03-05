import { Text } from '@/components/lib/Text';

const Experience = () => {
    return (
        <ul className="experience-list">
            <li className="experience-list-item">
                <Text as="a" href="https://knock.app" target="_blank" color="secondary">
                    Knock
                </Text>
                <div className="experience-list-item-info">
                    <Text as="span" color="secondary">
                        Software Engineer
                    </Text>
                    <Text as="span" size="0" color="secondary" family="mono" className="experience-list-item-info-date">
                        2023 - Present
                    </Text>
                </div>
            </li>
            <li className="experience-list-item">
                <Text as="a" href="https://foxtrotco.com" target="_blank" color="secondary">
                    Foxtrot
                </Text>
                <div className="experience-list-item-info">
                    <Text as="span" color="secondary">
                        Director of Engineering
                    </Text>
                    <Text as="span" size="0" color="secondary" family="mono" className="experience-list-item-info-date">
                        2019-2023
                    </Text>
                </div>
            </li>
            <li className="experience-list-item">
                <Text as="a" href="https://designory.com" target="_blank" color="secondary">
                    Designory
                </Text>
                <div className="experience-list-item-info">
                    <Text as="span" color="secondary">
                        Software Engineer
                    </Text>
                    <Text as="span" size="0" color="secondary" family="mono" className="experience-list-item-info-date">
                        2017 - 2019
                    </Text>
                </div>
            </li>
        </ul>
    );
};

export { Experience };
