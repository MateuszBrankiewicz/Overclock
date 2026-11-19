import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/shared/api/generated/**'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      'no-restricted-imports': ['error', {
        paths: [{ name: 'axios', message: 'Use generated TanStack Query hooks (ADR 0007).' }],
        patterns: [{ group: ['**/features/*/**', '!./**'], message: 'Features must not import other features.' }],
      }],
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use generated TanStack Query hooks (ADR 0007).' }],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': 'off',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    // Shared code sits below features: it must never depend on a feature.
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'axios', message: 'Use generated TanStack Query hooks (ADR 0007).' }],
        patterns: [{ group: ['**/features/**'], message: 'Shared code must not import from features.' }],
      }],
    },
  },
  {
    // Non-UI layers of a feature must not reach into its components.
    files: ['src/features/*/{hooks,session,stores,utils,schemas}/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'axios', message: 'Use generated TanStack Query hooks (ADR 0007).' }],
        patterns: [
          { group: ['**/features/*/**', '!./**'], message: 'Features must not import other features.' },
          { group: ['**/components/**'], message: 'Hooks, stores, utils and schemas must not import components.' },
        ],
      }],
    },
  },
  {
    files: ['src/shared/api/**', 'src/shared/lib/**'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}'],
    ...tseslint.configs.disableTypeChecked,
  },
);