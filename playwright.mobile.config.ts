// The phone's E2E (T305): the built web app (`npm run build:mobile:e2e`) in a browser the size of an iPhone, with the
// fake OneDrive on a local server (`tests/e2e-mobile/server.ts`). Chromium by default (the Linux CI); FI_PHONE_BROWSER=
// webkit runs it in the iPhone's engine (macOS CI).
import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

const browser = (process.env.FI_PHONE_BROWSER as 'chromium' | 'webkit' | undefined) ?? 'chromium'
// The browser of this container when Playwright's own of its version is not installed.
const chromium = process.env.FI_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

export default defineConfig({
  testDir: 'tests/e2e-mobile',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/mobile',
  use: {
    ...devices['iPhone 13'],
    browserName: browser,
    ...(browser === 'chromium' && chromium ? { launchOptions: { executablePath: chromium } } : {}),
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw'
  }
})
