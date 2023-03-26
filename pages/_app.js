import { DefaultLayout } from '@/components/global/DefaultLayout';
import '@/app/globals.css';

function MyApp({ Component, pageProps }) {
    return (
        <DefaultLayout>
            <Component {...pageProps} />
        </DefaultLayout>
    );
}

export default MyApp;
