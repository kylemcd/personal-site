import { Text } from '@/components/Text';

import './Experience.styles.css';

function Experience() {
    return (
        <ul className="experience-list">
            <li className="experience-list-item">
                <div className="experience-list-item-link-container">
                    <Text
                        as="a"
                        href="https://knock.app"
                        target="_blank"
                        size="1"
                        className="experience-list-item-link"
                    >
                        Knock
                    </Text>
                    <Text as="i" size="0" color="3" className="hn hn-external-link" aria-hidden="true" />
                </div>
                <div className="experience-list-item-info">
                    <Text as="span" color="2" size="0">
                        Software Engineer
                    </Text>
                    <Text as="span" size="0" color="2" family="mono" className="experience-list-item-info-date">
                        2023 - ____
                    </Text>
                </div>
            </li>
            <li className="experience-list-item">
                <div className="experience-list-item-link-container">
                    <Text
                        as="a"
                        href="https://foxtrotco.com"
                        target="_blank"
                        size="1"
                        className="experience-list-item-link"
                    >
                        Foxtrot
                    </Text>
                    <Text as="i" size="0" color="3" className="hn hn-external-link" aria-hidden="true" />
                </div>
                <div className="experience-list-item-info">
                    <Text as="span" color="2" size="0">
                        Director of Engineering
                    </Text>
                    <Text as="span" size="0" color="2" family="mono" className="experience-list-item-info-date">
                        2019 - 2023
                    </Text>
                </div>
            </li>
            <li className="experience-list-item">
                <div className="experience-list-item-link-container">
                    <Text
                        as="a"
                        href="https://designory.com"
                        target="_blank"
                        size="1"
                        className="experience-list-item-link"
                    >
                        Designory
                    </Text>
                    <Text as="i" size="0" color="3" className="hn hn-external-link" aria-hidden="true" />
                </div>
                <div className="experience-list-item-info">
                    <Text as="span" color="2" size="0">
                        Software Engineer
                    </Text>
                    <Text as="span" size="0" color="2" family="mono" className="experience-list-item-info-date">
                        2017 - 2019
                    </Text>
                </div>
            </li>
        </ul>
    );
}

export { Experience };
