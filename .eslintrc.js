const getModuleBoundariesRule = (allowCircularSelfDependency) => [
    'error',
    {
        allowCircularSelfDependency,
        enforceBuildableLibDependency: true,
        allow: [],
        depConstraints: [
            {
                sourceTag: '*',
                onlyDependOnLibsWithTags: ['*'],
            },
        ],
    },
];

module.exports = {
    root: true,
    ignorePatterns: ['**/*'],
    plugins: ['@nrwl/nx'],
    parserOptions: {
        ecmaVersion: 2020,
    },
    overrides: [
        {
            files: ['*.js', '*.jsx'],
            extends: ['airbnb-base', 'prettier'],
            rules: {
                // This gets very noisy when you have a bunch of attributes
                // Specified separately for ts
                'lines-between-class-members': [
                    'error',
                    'always',
                    { exceptAfterSingleLine: true },
                ],
            },
        },
        {
            files: ['*.ts', '*.tsx'],
            extends: [
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
                'airbnb-typescript/base',
                'prettier',
            ],
            plugins: ['@typescript-eslint'],
            rules: {
                // default-case doesn't understand the idea of exhaustivity (because it doesn't understand types),
                // but switch-exhaustiveness-check does
                'default-case': 'off',
                '@typescript-eslint/switch-exhaustiveness-check': 'error',
                // This is generally covered by typescript - and it will run into issues with switch exhaustivity too
                'consistent-return': 'off',
                // We'll let typescript noUnusedLocals/noUnusedParams handle this
                '@typescript-eslint/no-unused-vars': 'off',
                // This gets very noisy when you have a bunch of attributes
                // Specified separately for js
                '@typescript-eslint/lines-between-class-members': [
                    'error',
                    'always',
                    { exceptAfterSingleLine: true },
                ],
                // This rule frequently throws up false positives with subclasses https://github.com/typescript-eslint/typescript-eslint/issues/52
                'class-methods-use-this': 'off',
                // It's nice to put the primary class up front in a file
                '@typescript-eslint/no-use-before-define': [
                    'error',
                    { classes: false },
                ],
            },
        },
        {
            files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
            rules: {
                '@nrwl/nx/enforce-module-boundaries':
                    getModuleBoundariesRule(false),
                // Don't bother complaining too much about these while we're developing - but we do want our
                // commit hooks/CI to fail if they're there
                'no-console':
                    process.env.NODE_ENV === 'development' ? 'warn' : 'error',
                'no-debugger':
                    process.env.NODE_ENV === 'development' ? 'warn' : 'error',
                // We like using for..of statements, so we have to redefine with everything else via the airbnb config
                // (https://github.com/airbnb/javascript/blob/a510095acf20e3d96a94e6d0d0b26cfac71d2c7f/packages/eslint-config-airbnb-base/rules/style.js#L334)
                'no-restricted-syntax': [
                    'error',
                    {
                        selector: 'ForInStatement',
                        message:
                            'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
                    },
                    {
                        selector: 'LabeledStatement',
                        message:
                            'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
                    },
                    {
                        selector: 'WithStatement',
                        message:
                            '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
                    },
                ],
                // We use this extensively to be clear about private members
                'no-underscore-dangle': 'off',
                // It requires being a bit careful, but these allow for a bit cleaner arithmatic
                'no-bitwise': 'off',
                'no-plusplus': 'off',
                // We might want to do this with small utility classes
                'max-classes-per-file': 'off',
            },
        },
        {
            files: [
                '**/__tests__/*.{j,t}s?(x)',
                '**/tests/e2e/custom-assertions/*.{j,t}s?(x)',
                '**/tests/e2e/custom-commands/*.{j,t}s?(x)',
                '**/tests/e2e/page-objects/*.{j,t}s?(x)',
                '**/*.test.{j,t}s?(x)',
                '**/*.spec.{j,t}s?(x)',
            ],
            rules: {
                // Allow tests to import parts of a package via the public interface, which is handy when
                // we have one folder of tests for an entire package
                '@nrwl/nx/enforce-module-boundaries':
                    getModuleBoundariesRule(true),
                // Using dev dependancies is perfectly valid in tests
                'import/no-extraneous-dependencies': [
                    'error',
                    { devDependencies: true },
                ],
                // We may want to add some lightweight classes used for mocking, for example
                // (plus the point of this rule doesn't really apply for tests in general)
                'max-classes-per-file': 'off',
            },
        },
    ],
};
