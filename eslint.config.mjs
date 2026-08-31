import webVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const configuration = [
  {
    ignores: [
      '.old/**',
      '.next/**',
      'coverage/**',
      'generated/**',
      'node_modules/**',
      '.claude/**',
      '.playwright-mcp/**',
    ],
  },
  ...webVitals,
  ...typescript,
  {
    // Everything is typed: no `any`, no implicit return types.
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: false, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Non-page units stay small.
    files: ['components/**/*.tsx', 'application/**/*.ts', 'domain/**/*.ts', 'infrastructure/**/*.ts'],
    rules: { 'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['app/**/*.tsx'],
    rules: { 'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
]

export default configuration
