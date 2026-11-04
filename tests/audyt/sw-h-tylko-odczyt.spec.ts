/**
 * SW.34 – the quick entry on a read-only folder and with no folder. Variants: (a) fi.json of a newer format (the app's
 * own „tylko do odczytu”), (b) the Windows read-only attribute on the folder's files and folders, (c) the first-run
 * screen (no folder open).
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { start, text } from './lab'
import { CAT, added, brief, category, editFi, enterSave, log, openFresh, openRok, ops, qread, quickPage, quickVisible, snap, typeAmount } from './sw-pomoc'
import { expect } from '@playwright/test'

test('SW.34 (a) folder w nowszym formacie', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'sw-h-a'
  const { app, page, dataDir } = await openRok(run, (d) => editFi(d, (fi) => void ((fi as { schemaVersion?: number }).schemaVersion = 2)))
  try {
    log(run, 'Mostek – tylko do odczytu?', (await text(page)).match(/[^\n]*(tylko do odczytu|format)[^\n]*/gi)?.slice(0, 3))
    const before = await ops(dataDir)
    const q = await openFresh(app, page)
    await typeAmount(q, '25,00')
    await category(q, CAT.groceries)
    log(run, 'SW.34a przed zapisem', await qread(q))
    log(run, 'SW.34a Enter', await enterSave(app, q, 'quick-category'), '| okno widoczne', await quickVisible(app), '| kwota', (await qread(q)).amount)
    await snap(q, 'SW.34-tylko-odczyt')
    await page.waitForTimeout(800)
    log(run, 'SW.34a nowe', (await added(dataDir, before)).map(brief))
  } finally {
    await app.close()
  }
})

test('SW.34 (b) atrybut tylko do odczytu', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'sw-h-b'
  let dir = ''
  const { app, page, dataDir } = await openRok(run, (d) => {
    dir = d
    execFileSync('attrib', ['+R', join(d, '*'), '/S', '/D'])
  })
  try {
    const before = await ops(dataDir)
    const q = await openFresh(app, page)
    await typeAmount(q, '25,00')
    await category(q, CAT.groceries)
    log(run, 'SW.34b Enter', await enterSave(app, q, 'quick-category'), '| okno widoczne', await quickVisible(app))
    await page.waitForTimeout(1500)
    const n = await added(dataDir, before)
    log(run, 'SW.34b nowe', n.map(brief))
    log(run, 'SW.34b główne okno – komunikaty', (await page.getByRole('status').allInnerTexts().catch(() => [])).join(' | '), '| tekst', (await text(page)).match(/[^\n]*(zapis|odczytu|błąd)[^\n]*/gi)?.slice(0, 4))
    await snap(page, 'SW.34-atrybut-mostek')
  } finally {
    await app.close()
    if (dir) execFileSync('attrib', ['-R', join(dir, '*'), '/S', '/D'])
  }
})

test('SW.34 (c) bez folderu', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'sw-h-c'
  const { app, page } = await start(run, { usePreset: false })
  try {
    await page.getByTestId('folder-setup').waitFor({ timeout: 60_000 })
    await page.evaluate('window.fi.quickOpen()')
    let q: ReturnType<typeof quickPage>
    await expect.poll(() => (q = quickPage(app)), { timeout: 20_000 }).toBeTruthy()
    await q!.waitForTimeout(1500)
    log(run, 'SW.34c okno', (await q!.locator('body').innerText()).replace(/\s+/g, ' '), '| widoczne', await quickVisible(app))
    await snap(q!, 'SW.34-bez-folderu')
  } finally {
    await app.close()
  }
})
