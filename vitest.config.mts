// adapted from ICTTJ vitest.config.mts @ 84a8339
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
      '@renderer': resolve(root, 'src/renderer')
    }
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/fs/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
    // The data store checks its views updated in place against views built whole after every change (W8).
    env: { FI_VERIFY_VIEWS: '1' }
  }
})
