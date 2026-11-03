import { defineConfig } from '@playwright/test'

// The functional audit (docs/audyt/plan.md, D97): the released app unpacked in C:\FI-audyt, run on folders of the lab.
// Never part of CI or `npm test`: `npx playwright test -c playwright.audyt.config.ts [file]`.
process.env.FI_E2E_EXECUTABLE ??= 'C:\\FI-audyt\\wydanie\\1.15.4\\app\\Financial Intel.exe'

export default defineConfig({
  testDir: 'tests/audyt',
  timeout: 30 * 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  outputDir: 'C:/FI-audyt/test-results'
})
