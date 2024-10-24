import React from 'react';

type UseShortcutParams = {
    fn: (event: KeyboardEvent) => void;
    deps?: React.DependencyList;
    target?: 'window' | 'document' | React.RefObject<HTMLElement>;
    event?: 'keydown' | 'keyup';
    enabled?: boolean;
}

const getTarget = (target: UseShortcutParams['target']) => {
    if(target === 'window') return window
    if (target === 'document') return document;
    if(target?.current) return target?.current
    return window
}

const useKeyboardEvent = ({ deps = [], event = 'keydown', target = 'window', enabled = true, fn }: UseShortcutParams) => {
    React.useEffect(() => {
        if(!enabled) return;
        const derivedTarget = getTarget(target);
        derivedTarget.addEventListener(event, fn as EventListener);
        return () => derivedTarget.removeEventListener(event, fn as EventListener);
    }, [...deps, event, target, enabled]);
};

export { useKeyboardEvent}