// adapted from ICTTJ playwright.config.ts @ 84a8339
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  // Locally dots only – a line per test fills Claude's context (T529); CI keeps the full list.
  reporter: process.env.CI ? [['list']] : [['dot']],
  outputDir: 'test-results'
})
