import { Heading, Paragraph } from '@/components/global/Typography';
import { FormControl } from '@/components/global/Forms';
import { Button } from '@/components/global/Button';

import styles from './page.module.css';

const Contact = () => {
    return (
        <div className={styles.container}>
            <div className={styles.topContainer}>
                <Heading element="h1" size="lg" color="--primary-font-color">
                    Contact Me!
                </Heading>
                <Paragraph size="md" color="--secondary-font-color">
                    Whether it's for a project or just to stop and say "Hi!", use this form.
                </Paragraph>
            </div>
            <form method="POST" action="https://formspree.io/hello@kylemcd.com">
                <FormControl name="name" label="Name" fieldType="text" required={true} />

                <FormControl name="email" label="Email" fieldType="email" required={true} />

                <FormControl name="message" label="Message" fieldType="textarea" required={true} />
                <div className={styles.buttonContainer}>
                    <Button color="--primary-color" size="md" type="button" buttonType="submit">
                        Submit
                    </Button>
                </div>
            </form>
        </div>
    );
};
export default Contact;
