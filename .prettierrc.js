/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
export default {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 120,
    tabWidth: 4,
    useTabs: false,
    importOrder: ['<THIRD_PARTY_MODULES>', '^@/(.*|\\/.)', '^(..)\\/.*', '^(.)\\/.*'],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
    plugins: ['@trivago/prettier-plugin-sort-imports'],
};
