import './HorizontalScrollContainer.styles.css';

type HorizontalScrollContainerProps = {
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

function HorizontalScrollContainer({ children, ...props }: HorizontalScrollContainerProps) {
    return (
        <div className="horizontal-scroll-container">
            <div {...props} className={`horizontal-scroll-container-items ${props.className}`}>
                {children}
            </div>
        </div>
    );
}

export { HorizontalScrollContainer };
