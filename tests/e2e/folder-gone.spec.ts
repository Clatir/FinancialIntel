// AP-1 (1.15.5, grupa N1): the data folder gone while the app runs (renamed from outside – DA.40, DA.41).
import { existsSync, mkdtempSync, readFileSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type ElectronApplication } from '@playwright/test'
import { warsawNow } from '../../src/shared/calc/dates'
import { launch, withMainLog } from './app'
import { records } from './files'
import { seedFolder, zl } from './seed'

const MBANK = '01KDEFACC00000000000000001'

/** A folder renamed from outside; Windows may hold it a moment (an antivirus, the indexer). */
async function renameRetrying(from: string, to: string): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      renameSync(from, to)
      return
    } catch (e) {
      if (i >= 20) throw e
      await new Promise((r) => setTimeout(r, 250))
    }
  }
}

/** The questions of the main process (`dialog.showMessageBoxSync`) taken down and answered „Anuluj”. */
const catchQuestions = (app: ElectronApplication) =>
  app.evaluate(({ dialog }) => {
    const g = globalThis as { __questions?: Array<{ title?: string; message?: string; detail?: string }> }
    g.__questions = []
    dialog.showMessageBoxSync = ((...args: unknown[]) => {
      const o = (args.length > 1 ? args[1] : args[0]) as { title?: string; message?: string; detail?: string }
      g.__questions!.push({ title: o.title, message: o.message, detail: o.detail })
      return 0
    }) as typeof dialog.showMessageBoxSync
  })
const questions = (app: ElectronApplication) => app.evaluate(() => (globalThis as { __questions?: Array<{ title?: string; message?: string }> }).__questions ?? [])

test('folder danych znika w trakcie pracy: baner „niedostępny”, nic nie powstaje w starym miejscu, zmiana czeka i zapisuje się sama po powrocie (AP-1)', async () => {
  const { date: today } = warsawNow()
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-gone-')), 'FinancialIntel')
  seedFolder(dataDir, { records: { transactions: [{ date: today, accountId: MBANK, amount: -zl(28.6), counterparty: 'Lody Grycan' }] } })
  const away = `${dataDir}-odlaczony`
  const { app, page, userData } = await launch({ dataDir, env: { FI_FOLDER_CHECK_MS: '400' } })
  try {
    await page.keyboard.press('Control+2')
    await page.getByTestId('operation-row').filter({ hasText: 'Lody Grycan' }).click()
    // The change typed just before the folder goes: its write comes after it (the autosave held back a moment).
    await page.evaluate(() => ((globalThis as { __FI_SAVE_DELAY__?: number }).__FI_SAVE_DELAY__ = 2500))
    const amount = page.getByTestId('operation-amount')
    await amount.click()
    await amount.fill('33,33')
    await amount.press('Tab')
    await renameRetrying(dataDir, away)

    // Seen within seconds, without any action: the banner, the folder read-only.
    await expect(page.getByTestId('banner-ro')).toContainText('Folder danych jest niedostępny', { timeout: 10_000 })
    // The write tried meanwhile waits – nothing made in the old place (no `.presence`, no record, no backup).
    await page.waitForTimeout(3500)
    expect(existsSync(dataDir)).toBe(false)
    // Ctrl+S: never „Zapisano.” – the change waits for the folder.
    await page.keyboard.press('Control+s')
    await expect(page.getByRole('status').filter({ hasText: 'Folder danych jest niedostępny' }).first()).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Zapisano.' })).toHaveCount(0)

    // The close asked now: the real reason – the folder, never „Zmiany z drugiego komputera” (AF-42); „Anuluj” stays.
    await catchQuestions(app)
    await app.evaluate(({ app: a }) => a.quit())
    await expect.poll(async () => (await questions(app)).length).toBe(1)
    const [asked] = await questions(app)
    expect(asked!.message).toMatch(/Folder danych jest niedostępny/)
    expect(asked!.title).not.toMatch(/drugiego komputera/)
    expect(existsSync(dataDir)).toBe(false)

    // The folder back: the change is written by itself, the banner goes.
    await renameRetrying(away, dataDir)
    await expect(page.getByTestId('banner-ro')).toHaveCount(0, { timeout: 10_000 })
    await expect.poll(async () => (await records(dataDir, 'transactions')).map((t) => t.amount), { timeout: 10_000 }).toEqual([-3333])
  } finally {
    await app.close()
  }
  // Nothing left unsaved at the close.
  await withMainLog(userData, async () => {
    const log = readFileSync(join(userData, 'logs', 'main.log'), 'utf8')
    expect(log).toContain('folder danych niedostępny')
    expect(log).toContain('folder danych znów dostępny')
    expect(log.split(/\r?\n/).filter((l) => l.includes('zamykanie: niezapisane zmiany'))).toHaveLength(1)
  })
})
