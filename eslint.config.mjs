import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: [
      'next-env.d.ts',
      'src/components/ai-elements/**',
      'src/components/ui/**',
      'node_modules/**',
      '.next/**',
      'storybook-static/**',
      'coverage/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      '@next/next/no-img-element': 'off',
    },
  },
]

export default eslintConfig
