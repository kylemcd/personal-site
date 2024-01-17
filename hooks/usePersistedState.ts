import React from 'react';
import { parseCookies, setCookie } from 'nookies';

const usePersistedState = (name: string, defaultValue: any) => {
    const cookies = parseCookies();
    const cookieValue = cookies[`persisted-${name}`];

    const [value, setValue] = React.useState(cookieValue || defaultValue);

    React.useEffect(() => {
        if (value) {
            setCookie(null, `persisted-${name}`, value, {
                maxAge: 10000 * 24 * 60 * 60 * 1000,
                path: '/',
            });
            setValue(value);
        }
    }, [value]);

    return [value, setValue];
};

export default usePersistedState;
