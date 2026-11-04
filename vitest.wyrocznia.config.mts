// AP-32: the oracle's regression on the audit's snapshots (tests/audyt/wyrocznia/regresja.test.ts) – local, slow, never
// part of `npm test` or CI: `npm run test:wyrocznia` (the lab: FI_AUDIT_LAB, default C:\FI-audyt).
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
    name: 'wyrocznia',
    include: ['tests/audyt/wyrocznia/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60 * 60_000
  }
})
