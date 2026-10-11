// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const stylistic = require('@stylistic/eslint-plugin');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      // Blank line before and after every function, class and export
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: ['function', 'class', 'export'] },
        { blankLine: 'always', prev: ['function', 'class', 'export'], next: '*' },
        // ...but allow consecutive one-line exports to stay grouped
        { blankLine: 'any', prev: 'singleline-export', next: 'singleline-export' },
      ],
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'web-build/*', 'node_modules/*'],
  },
]);
