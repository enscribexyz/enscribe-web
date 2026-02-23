import { FlatCompat } from '@eslint/eslintrc'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const config = [
  // Extend Next.js recommended config
  ...compat.extends('next/core-web-vitals'),

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Disallow boxed primitive types (String, Number, Boolean, etc.)
      '@typescript-eslint/no-wrapper-object-types': 'error',

      // Warn on explicit any
      '@typescript-eslint/no-explicit-any': 'warn',

      // Warn on unused variables (but allow _ prefix to opt out)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Prefer const
      'prefer-const': 'error',

      // Warn on console.log (allow warn and error)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Disallow debugger
      'no-debugger': 'error',
    },
  },

  // Ignore patterns
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'docs/**',
      'out/**',
      '*.config.mjs',
      '*.config.js',
    ],
  },
]

export default config
