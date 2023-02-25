import styles from './StatsContainer.module.css';

interface StatsProps {
    children: React.ReactElement;
    [key: string]: any; // Rest Props
}

const StatsContainer = ({ type, children, ...otherProps }: StatsProps): React.ReactElement => {
    return (
        <div className={styles.container} {...otherProps}>
            {children}
        </div>
    );
};

export default StatsContainer;
