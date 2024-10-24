import { List, ListItem } from '@/components/lib/List';
import { Heading } from '@/components/lib/Heading';
import { Text } from '@/components/lib/Text';

const Experience = () => {
    return (
        <List>
            <Heading as="h2" size="1">
                Experience
            </Heading>
            <ListItem>
                <Text as="span" color="secondary">
                    Software Engineer, Knock
                </Text>
            </ListItem>
            <ListItem>
                <Text as="span" color="secondary">
                    Director of Engineering, Foxtrot
                </Text>
            </ListItem>
            <ListItem>
                <Text as="span" color="secondary">
                    Software Engineer, Designory
                </Text>
            </ListItem>
        </List>
    );
};

export { Experience };
