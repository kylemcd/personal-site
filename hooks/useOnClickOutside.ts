import React from 'react';

type ClickTypes = HTMLElement | HTMLDivElement;

const useOnClickOutside = ({ ref, handler }: { ref: React.RefObject<ClickTypes>; handler: Function }) => {
    React.useEffect(() => {
        // TOOD: Make this event an actual type
        const listener = (event: any) => {
            if (!ref?.current || ref?.current?.contains(<Node>event.target)) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};
export default useOnClickOutside;
