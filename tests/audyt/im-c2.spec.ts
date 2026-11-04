// Area IM – run im-c2 (rok): „Cofnij import” of L1 from the result panel (IM.30), HL after L1 (IM.41), eleven daily
// imports and the copies before them (IM.28).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { reading, start, useState } from './lab'
import { MBANK, Obs, PLIKI, cardL, counters, importAs, listaText, openFile, readable, short, statuses, step, txs } from './im-pomoc'
import { cp1250 } from './persona'

async function mbankBalance(page: Page): Promise<string> {
  await page.keyboard.press('Control+3')
  await page.waitForTimeout(600)
  const t = await readable(page, '[data-testid="balance-check"]').catch(async () => readable(page, '[data-testid="page-import"]'))
  return (/mBank\noperacje: ([^\n]+)/.exec(t) ?? [])[1] ?? t.slice(0, 200)
}

const listBackups = (dataDir: string) => (existsSync(join(dataDir, 'backups', 'pre-import')) ? readdirSync(join(dataDir, 'backups', 'pre-import')).sort() : [])

test('im-c2: Cofnij import, lista + historia, kopie przed importem', async () => {
  const o = new Obs('im-c2')
  const { dataDir, ictjDir } = useState('rok', 'im-c2')
  const run = await start('im-c2', { dataDir, ictjDir })
  const { app, page, userData } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    const tx0 = await txs(dataDir)
    const s0 = await mbankBalance(page)
    o.log('przed: saldo mBank / operacji / kopie', { saldo: s0, ops: tx0.length, kopie: listBackups(dataDir) })

    // ---------------- IM.30
    let importedIds: string[] = []
    await step(o, page, 'IM.30', async () => {
      await openFile(app, page, join(PLIKI, 'L1.csv'))
      o.log('IM.30 podgląd', await counters(page))
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(800)
      o.log('IM.30 wynik', await readable(page, '[data-testid="import-done"]'))
      const tx1 = await txs(dataDir)
      importedIds = tx1.filter((t) => !tx0.some((x) => x.id === t.id)).map((t) => String(t.id))
      const s1 = await mbankBalance(page)
      o.log('IM.30 po imporcie: saldo / operacji', { saldo: s1, ops: tx1.length })
      // one new operation changed by the user
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-period-menu').click()
      await page.getByTestId('operations-period-all').click()
      await page.getByTestId('operations-search').fill('ślusarz')
      await page.waitForTimeout(700)
      await page.getByTestId('operation-row').first().click()
      await page.getByTestId('operation-category').selectOption({ label: 'Dom · wyposażenie' })
      await page.waitForTimeout(800)
      await page.getByTestId('operations-search').fill('')
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1000)
      o.log('IM.30 ekran Import po powrocie z Operacji', (await readable(page, '[data-testid="page-import"]')).slice(0, 1500))
      let undoBtn = page.getByTestId('import-done').getByRole('button', { name: 'Cofnij import' })
      if (!(await undoBtn.count())) {
        o.log('IM.30 brak panelu wyniku – cofam z Ustawień', '')
        await page.keyboard.press('Control+,')
        await page.getByTestId('settings-tab-import').click()
        await page.waitForTimeout(1200)
        undoBtn = page.getByTestId('recent-import-undo').first()
      }
      await undoBtn.click()
      await page.waitForTimeout(600)
      o.log('IM.30 okno „Cofnij import”', await readable(page, '[data-testid="import-undo-dialog"]').catch(async () => (await page.getByRole('dialog').allInnerTexts()).join('\n')))
      await o.shot(page, 'IM.30-okno')
      await page.getByTestId('import-undo-confirm').click()
      await page.waitForTimeout(2500)
      o.log('IM.30 cofnięcie – toast', await statuses(page))
      await o.shot(page, 'IM.30-toast')
      const tx2 = await txs(dataDir)
      o.log('IM.30 po cofnięciu: operacji / zostały z importu', { ops: tx2.length, left: tx2.filter((t) => importedIds.includes(String(t.id))).map(short) })
      o.log('IM.30 po cofnięciu: wpisy połączone (Bar pod Lipą, Apteka)', tx2.filter((t) => /bar pod lip|^apteka$/i.test(String(t.counterparty)) && (t.date as string) >= '2026-10-27').map(short))
      // „Cofnij” in the toast
      const undo = page.getByRole('button', { name: 'Cofnij', exact: true })
      o.log('IM.30 Cofnij w toaście', await undo.count())
      const sAfterUndo = await mbankBalance(page)
      o.log('IM.30 saldo po cofnięciu (powinno = przed importem)', { przed: s0, po: sAfterUndo })
      reading('im', 'IM.30', 'rok – saldo mBank: przed / po imporcie L1 / po cofnięciu', { przed: s0, po: s1, cofniety: sAfterUndo })
      if (await undo.count()) {
        await undo.first().click()
        await page.waitForTimeout(2500)
        o.log('IM.30 Cofnij cofnięcia – toast', await statuses(page))
        const tx3 = await txs(dataDir)
        const s3 = await mbankBalance(page)
        o.log('IM.30 po Cofnij cofnięcia: operacji / saldo', { ops: tx3.length, saldo: s3 })
        reading('im', 'IM.30', 'rok – saldo mBank po „Cofnij” cofnięcia', { saldo: s3 })
        o.log('IM.30 ŚLUSARZ po Cofnij cofnięcia', tx3.filter((t) => /ŚLUSARZ/i.test(String(t.counterparty))).map(short))
      }
      // undo again (Ustawienia → Ostatnie importy) and the file again
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1200)
      o.log('IM.30 Ostatnie importy', await readable(page, '[data-testid="recent-imports"]'))
      await page.getByTestId('recent-import-undo').first().click()
      await page.waitForTimeout(500)
      o.log('IM.30 okno (drugi raz)', await readable(page, '[data-testid="import-undo-dialog"]').catch(() => '-'))
      await page.getByTestId('import-undo-confirm').click()
      await page.waitForTimeout(2500)
      o.log('IM.30 drugie cofnięcie – toast', await statuses(page))
      await page.getByTestId('nav-sync').click()
      await page.waitForTimeout(1500)
      o.log('IM.30 Synchronizacja (Usunięte wpisy)', await readable(page, 'main'))
      await o.shot(page, 'IM.30-usuniete-wpisy')
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'L1.csv'))
      o.log('IM.30 L1 po cofnięciu – podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.30 L1 po cofnięciu – liczniki', await counters(page))
    })

    // ---------------- IM.41 – L1 imported, then HL (the same days as the account history)
    await step(o, page, 'IM.41', async () => {
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(800)
      o.log('IM.41 L1 wynik', await readable(page, '[data-testid="import-done"]'))
      const sA = await mbankBalance(page)
      const nA = (await txs(dataDir)).length
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'HL.csv'))
      o.log('IM.41 HL plik', await readable(page, '[data-testid="import-file"]'))
      o.log('IM.41 HL podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.41 HL liczniki', await counters(page))
      o.log('IM.41 HL dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      await o.shot(page, 'IM.41-HL')
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(800)
      o.log('IM.41 HL wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.41 HL telemetria', await readable(page, '[data-testid="bank-telemetry"]').catch(() => '(brak)'))
      const sB = await mbankBalance(page)
      const nB = (await txs(dataDir)).length
      o.log('IM.41 saldo i operacje przed / po HL', { saldo: [sA, sB], ops: [nA, nB] })
      reading('im', 'IM.41', 'rok + L1, potem HL – saldo mBank', { przed: sA, po: sB })
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await page.waitForTimeout(800)
      o.log('IM.41 Duplikaty operacji', await readable(page, '[data-testid="duplicates"]').catch(() => '(brak panelu)'))
    })

    // ---------------- IM.28 – eleven daily imports
    await step(o, page, 'IM.28', async () => {
      const dir = join(PLIKI, 'dzienne')
      mkdirSync(dir, { recursive: true })
      const b0 = listBackups(dataDir)
      o.log('IM.28 kopie przed serią', b0)
      for (let i = 1; i <= 11; i++) {
        const f = join(dir, `D${String(i).padStart(2, '0')}.csv`)
        writeFileSync(f, cp1250(listaText([cardL('2026-11-02', `SKLEP DZIENNY ${i}`, -100 - i)], '2026-11-02', '2026-11-02')))
        const res = await importAs(app, page, userData, f)
        o.log(`IM.28 import ${i}`, res.split('\n').slice(0, 2).join(' | '))
      }
      const b1 = listBackups(dataDir)
      o.log('IM.28 kopie po 11 importach', { count: b1.length, files: b1 })
      const ictjZips: string[] = []
      const walk = (d: string) => {
        for (const n of readdirSync(d, { withFileTypes: true })) {
          if (n.isDirectory()) walk(join(d, n.name))
          else if (/\.zip$/i.test(n.name)) ictjZips.push(join(d, n.name))
        }
      }
      if (ictjDir) walk(ictjDir)
      o.log('IM.28 ZIP w folderze ICTTJ', ictjZips)
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
  void MBANK
})
