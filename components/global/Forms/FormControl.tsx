import { ChangeEventHandler, ReactElement } from 'react';
import styles from './FormControl.module.css';

type FieldType = 'text' | 'email' | 'textarea';

interface FormControlProps {
    name: string;
    label: string;
    required?: boolean;
    value?: any;
    onChange?: ChangeEventHandler;
    fieldType: FieldType;
}

const FormControl = ({ name, label, required, value, onChange, fieldType }: FormControlProps) => {
    return (
        <div className={styles.container}>
            <label className={styles.label} htmlFor={name}>
                {label}
            </label>
            {fieldType === 'text' && (
                <input
                    className={styles.field}
                    type="text"
                    value={value}
                    onChange={onChange}
                    id={name}
                    name={name}
                    required={required}
                />
            )}
            {fieldType === 'email' && (
                <input
                    className={styles.field}
                    type="email"
                    value={value}
                    onChange={onChange}
                    id={name}
                    name={name}
                    required={required}
                />
            )}
            {fieldType === 'textarea' && (
                <textarea
                    className={styles.textarea}
                    value={value}
                    onChange={onChange}
                    id={name}
                    name={name}
                    required={required}
                />
            )}
        </div>
    );
};
export default FormControl;
