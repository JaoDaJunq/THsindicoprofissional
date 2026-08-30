import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.tsx',
        'application/**/*.ts',
        'domain/**/*.ts',
        'infrastructure/**/*.ts',
        'shared/**/*.ts',
      ],
      // Composition roots: they only wire libraries together and hold no branch
      // of our own. Testing them would assert that the framework was called,
      // not that anything of ours works. Exercised by the running app instead.
      exclude: ['infrastructure/auth/auth.ts', 'app/api/**'],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
})
