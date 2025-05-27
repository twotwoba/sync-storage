module.exports = {
    ignoreFiles: ['node_modules/**', 'dist/**'],
    extends: ['stylelint-config-standard', 'stylelint-config-standard-scss', 'stylelint-config-recess-order'],
    overrides: [
        {
            files: ['**/*.(scss|css|html|tsx)'],
            customSyntax: 'postcss-scss'
        },
        {
            files: ['**/*.(html|tsx)'],
            customSyntax: 'postcss-html'
        }
    ],
    rules: {
        'value-keyword-case': null,
        'no-descending-specificity': null
    }
}
