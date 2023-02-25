import dynamic from 'next/dynamic';
const Button = dynamic(() => import('./Button'), { ssr: false });

export { Button };
