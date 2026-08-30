import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Integration suite: runs against the real Postgres from docker compose.
 * Mocks cannot catch an invalid Prisma query or a schema/adapter mismatch —
 * these tests can, because they actually hit the database.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
})
