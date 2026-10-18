import { mkdtempSync, promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launch, withMainLog } from './app'
import { seedFolder, zl } from './seed'

const shots = (name: string) => join('test-results', 'screens', `${name}.png`)
const MBANK = '01KDEFACC00000000000000001'

test('wczytywanie folderu (1.4.1): postęp, wolne pliki z chmury, Przerwij i ponowna próba, log', async () => {
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-open-')), 'FinancialIntel')
  seedFolder(dataDir, {
    records: { transactions: Array.from({ length: 60 }, (_, i) => ({ date: '2026-09-10', accountId: MBANK, amount: -zl(10 + i), counterparty: 'Sklep' })) }
  })
  // Every read waits 1.5 s and 1 s already counts as slow: a folder OneDrive fetches from the cloud, in miniature.
  const { app, page, userData, errors } = await launch({ dataDir, env: { FI_OPEN_DELAY_MS: '1500', FI_OPEN_SLOW_MS: '1000' } })
  const mainLog = () => fs.readFile(join(userData, 'logs', 'main.log'), 'utf8')
  try {
    await withMainLog(userData, async () => {
      // Starting with the remembered folder: the reading step by step.
      const progress = page.getByTestId('open-progress')
      await expect(progress).toBeVisible()
      await expect(page.getByTestId('open-progress-step')).toContainText(/Wczytywanie plików: \d+ z 61/)
      await expect(page.getByTestId('open-progress-waiting')).toContainText('transactions/2026/')
      await expect(page.getByTestId('open-progress-cloud')).toContainText('Zawsze zachowuj na tym urządzeniu')
      await page.screenshot({ path: shots('19-wczytywanie-folderu') })

      // „Przerwij”: back to choosing a folder, a retry at hand, the log says where it stopped.
      await page.getByTestId('open-cancel').click()
      await expect(page.getByTestId('folder-setup')).toBeVisible()
      await expect(page.getByTestId('setup-message')).toContainText('Przerwano wczytywanie folderu')
      await expect.poll(mainLog).toMatch(/open aborted .*step read, \d+\/61 files/)

      // The retry reads it to the end, with the progress on the setup screen.
      await page.getByTestId('retry-folder').click()
      await expect(page.getByTestId('folder-setup').getByTestId('open-progress')).toBeVisible()
      await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 30_000 })
      await expect.poll(mainLog).toMatch(/opened .*: 60 records.*read \d+ ms of 61 files, 61 slow/)
      await expect.poll(mainLog).toMatch(/open slowest files: \S+ \d+ ms/)
    })
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
