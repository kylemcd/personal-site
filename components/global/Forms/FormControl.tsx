import styles from './FormControl.module.css';
const FormControl = () => {
    return (
        <div>
            <label className={styles.label}>Name</label>
            <input className={styles.field} type="text" />
        </div>
    );
};
export default FormControl;
