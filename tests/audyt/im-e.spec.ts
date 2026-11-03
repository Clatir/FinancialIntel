// Area IM – runs im-e*: new files of mBank in the run's Pobrane (IM.35, IM.36) and the overdue import in the briefing
// (IM.52: 4 days, 3 days).
import { copyFileSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LAB, recorded, start, useState } from './lab'
import { Obs, PLIKI, cardL, listaText, openFile, readFi, readable, statuses, step, writeFi } from './im-pomoc'
import { cp1250 } from './persona'

async function briefing(page: Page): Promise<string[]> {
  await page.keyboard.press('Control+1')
  await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  const t = await readable(page, '[data-testid="page-bridge"]')
  return t.split('\n').filter((l) => /import|mBank|Portfel|meldunek/i.test(l)).slice(0, 25)
}

test('im-e: nowe pliki z mBanku w Pobranych', async () => {
  test.setTimeout(20 * 60_000)
  const o = new Obs('im-e')
  const { dataDir, ictjDir } = useState('rok', 'im-e')
  const run = await start('im-e', { dataDir, ictjDir })
  const { app, page } = run
  const pobrane = join(LAB, 'przebiegi', 'im-e', 'pobrane')
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    o.log('IM.35 odprawa przed', await briefing(page))
    await page.keyboard.press('Control+3')
    await page.waitForTimeout(1500)
    o.log('IM.35 Import przed (lista plików)', await readable(page, '[data-testid="import-bank-files"]').catch(() => '(brak listy)'))
    const t0 = Date.now()
    await step(o, page, 'IM.35-pliki', async () => {
      mkdirSync(pobrane, { recursive: true })
      copyFileSync(join(PLIKI, 'L2.csv'), join(pobrane, 'lista_operacji_L2.csv'))
      copyFileSync(join(PLIKI, 'Z.csv'), join(pobrane, 'kontakty.csv'))
      copyFileSync(join(PLIKI, 'X.csv'), join(pobrane, 'inny_bank.csv'))
      const old = join(pobrane, 'lista_stara.csv')
      writeFileSync(old, cp1250(listaText([cardL('2026-10-10', 'SKLEP STARY', -1000)], '2026-10-01', '2026-10-18')))
      const d = new Date(Date.now() - 15 * 86_400_000)
      utimesSync(old, d, d)
      const done = join(pobrane, 'rok-historia.csv')
      copyFileSync(join(LAB, 'pliki', 'rok-historia.csv'), done)
      const d2 = new Date('2026-10-27T09:00:00Z')
      utimesSync(done, d2, d2)
      o.log('IM.35 położone pliki', ['lista_operacji_L2.csv (nowy)', 'kontakty.csv (Z)', 'inny_bank.csv (X)', 'lista_stara.csv (data pliku −15 dni)', 'rok-historia.csv (już zaimportowany, data pliku 27.10)'])
    })
    // wait for the list
    let seen = ''
    for (let i = 0; i < 40; i++) {
      seen = await readable(page, '[data-testid="import-bank-files"]').catch(() => '')
      if (/lista_operacji_L2/.test(seen)) break
      await page.waitForTimeout(2000)
    }
    o.log('IM.35 czas do pojawienia się (s)', Math.round((Date.now() - t0) / 1000))
    o.log('IM.35 Import – Nowe pliki z mBanku', seen)
    await o.shot(page, 'IM.35-lista')
    o.log('IM.35 odprawa', await briefing(page))
    o.log('IM.35 zapis powiadomień', (await recorded(app)).toasts)
    // three clicks: Importuj → Przyjmij pewne → Importuj (N)
    await step(o, page, 'IM.35-import', async () => {
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1000)
      const item = page.getByTestId('import-bank-file').filter({ hasText: 'lista_operacji_L2' })
      await item.getByTestId('import-bank-file-open').click()
      await page.getByTestId('import-file').waitFor({ timeout: 30_000 })
      await page.waitForTimeout(800)
      o.log('IM.35 klik 1 – plik', await readable(page, '[data-testid="import-file"]'))
      o.log('IM.35 klik 1 – podgląd', await readable(page, '[data-testid="import-summary"]'))
      const sure = page.getByTestId('import-accept-sure')
      if (await sure.count()) {
        await sure.click()
        o.log('IM.35 klik 2 – Przyjmij pewne', 'tak')
      }
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1500)
      o.log('IM.35 klik 3 – wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.36 notka i przycisk (nie klikam – Kosz Windows)', await readable(page, '[data-testid="import-trash"]').catch(() => '(brak)'))
      await o.shot(page, 'IM.36-notka')
      await page.waitForTimeout(3000)
      o.log('IM.35 lista po imporcie', await readable(page, '[data-testid="import-bank-files"]').catch(() => '(brak listy)'))
      o.log('IM.35 odprawa po imporcie', await briefing(page))
    })
    // watching off, another file
    await step(o, page, 'IM.35-wylaczone', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1000)
      const toggle = page.getByTestId('settings-bank-files')
      o.log('IM.35 przełącznik przed', await readable(page, '[data-testid="settings-bank-files"]').catch(() => '-'))
      await toggle.locator('input, button, [role="switch"]').first().click().catch(async () => toggle.click())
      await page.waitForTimeout(1000)
      o.log('IM.35 przełącznik po', await readable(page, '[data-testid="settings-bank-files"]').catch(() => '-'))
      copyFileSync(join(PLIKI, 'K2.csv'), join(pobrane, 'lista_po_wylaczeniu.csv'))
      const n0 = (await recorded(app)).toasts.length
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(75_000)
      o.log('IM.35 po wyłączeniu – lista', await readable(page, '[data-testid="import-bank-files"]').catch(() => '(brak listy)'))
      o.log('IM.35 po wyłączeniu – nowe powiadomienia', (await recorded(app)).toasts.slice(n0))
      o.log('IM.35 wszystkie powiadomienia', (await recorded(app)).toasts)
    })
    o.log('statusy', await statuses(page))
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})

for (const [days, at] of [
  [4, '2026-10-30T10:00:00.000Z'],
  [3, '2026-10-31T10:00:00.000Z']
] as const) {
  test(`im-e52-${days}: zaległy import w odprawie (${days} dni)`, async () => {
    const o = new Obs(`im-e52-${days}`)
    const { dataDir, ictjDir } = useState('rok', `im-e52-${days}`)
    const fi = readFi(dataDir)
    fi.settings.import.lastImport = { [Object.keys(fi.settings.import.lastImport)[0]!]: at }
    fi.settings.import.log = { [at]: Object.keys(fi.settings.import.lastImport)[0]! }
    writeFi(dataDir, fi)
    o.log('stan', `ostatni import mBanku ustawiony na ${at} (${days} dni przed 03.11)`)
    const run = await start(`im-e52-${days}`, { dataDir, ictjDir })
    const { app, page } = run
    try {
      await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
      await page.waitForTimeout(3000)
      o.log(`IM.52 odprawa (${days} dni)`, await briefing(page))
      await o.shot(page, `IM.52-${days}-dni`)
      if (days === 4) {
        await step(o, page, 'IM.52-zapis', async () => {
          await openFile(app, page, join(PLIKI, 'L0-znane.csv'))
          o.log('IM.52 L0-znane – podgląd', await readable(page, '[data-testid="import-summary"]'))
          await page.getByTestId('import-run').click()
          await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
          o.log('IM.52 wynik', await readable(page, '[data-testid="import-done"]'))
          o.log('IM.52 odprawa po zapisie bez zmian', await briefing(page))
        })
      }
      o.log('powiadomienia', (await recorded(app)).toasts)
      o.log('błędy okna', run.errors)
    } finally {
      await app.close()
    }
  })
}
