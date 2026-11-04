import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

// The functional audit (docs/audyt/plan.md, D97): the released app unpacked in the lab, run on folders of the lab.
// Never part of CI or `npm test`: `npx playwright test -c playwright.audyt.config.ts [file]`.
const LAB = process.env.FI_AUDIT_LAB ?? 'C:\\FI-audyt'
process.env.FI_E2E_EXECUTABLE ??= join(LAB, 'wydanie', '1.15.4', 'app', 'Financial Intel.exe')

export default defineConfig({
  testDir: 'tests/audyt',
  timeout: 30 * 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  // One folder per run: several runs of the audit go at once (one per area) and each cleans its own folder at start.
  outputDir: join(LAB, 'test-results', process.env.FI_AUDIT_OUT ?? String(process.pid))
})
