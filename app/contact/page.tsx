import { Heading, Paragraph } from '@/components/global/Typography';
import { FormControl } from '@/components/global/Forms';

import styles from './page.module.css';

const Contact = () => {
    return (
        <div className={styles.container}>
            <Heading element="h1" size="lg" color="--primary-font-color">
                Contact Me!
            </Heading>
            <Paragraph size="md" color="--secondary-font-color">
                Whether it's for a project or just to stop and say "Hi!", use this form.
            </Paragraph>
            <form>
                <FormControl />
            </form>
        </div>
    );
};
export default Contact;
