/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        colors: {
            transparent: 'transparent',
            accent: 'var(--accent-color)',
            gray: {
                1: 'rgba(var(--gray-1) / <alpha-value>)',
                2: 'rgba(var(--gray-2) / <alpha-value>)',
                3: 'rgba(var(--gray-3) / <alpha-value>)',
                4: 'rgba(var(--gray-4) / <alpha-value>)',
                5: 'rgba(var(--gray-5) / <alpha-value>)',
                6: 'rgba(var(--gray-6) / <alpha-value>)',
                7: 'rgba(var(--gray-7) / <alpha-value>)',
                8: 'rgba(var(--gray-8) / <alpha-value>)',
                9: 'rgba(var(--gray-9) / <alpha-value>)',
                10: 'rgba(var(--gray-10) / <alpha-value>)',
                11: 'rgba(var(--gray-11) / <alpha-value>)',
                12: 'rgba(var(--gray-12) / <alpha-value>)',
            },
        },
        fontFamily: {
            sans: 'var(--font-geist-sans)',
            mono: 'var(--font-geist-mono)',
        },
        extend: {},
    },
    plugins: [],
};
