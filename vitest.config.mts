// adapted from ICTTJ vitest.config.mts @ 84a8339
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { mobileNodeAliases } from './scripts/mobile-aliases.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(root, 'src/shared'),
      '@renderer': resolve(root, 'src/renderer')
    }
  },
  test: {
    testTimeout: 30000,
    // The data store checks its views updated in place against views built whole after every change (W8).
    env: { FI_VERIFY_VIEWS: '1' },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/fs/**/*.test.ts'],
          environment: 'node'
        }
      },
      {
        // The phone (T303): the data store of the computers over the mirror of OneDrive – `node:fs`, `node:path` and
        // `node:crypto` are the phone's, as in its build (`vite.mobile.config.mts`).
        extends: true,
        resolve: { alias: mobileNodeAliases(root) },
        test: {
          name: 'mobile',
          include: ['tests/mobile/**/*.test.ts'],
          environment: 'node'
        }
      }
    ]
  }
})
