// MO, przebieg B2 (persona „rok” + nowy plik mBanku w pobranych): pozycja nowego pliku i jej kliknięcie (MO.12),
// zapamiętany filtr Operacji (Konto: mBank) a kliknięcie wiersza „Ostatnich operacji” (MO.31), łupy października
// 300 zł „na następny miesiąc” i rozbicie energii (MO.5).
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, reading, shot, start, text, useState } from './lab'
import { briefingItems, go, out, readBridge, textOf, where } from './mo-pomoc'

const RUN = 'mo-b2'

test('MO przebieg B2 – nowy plik z banku, zapamiętany filtr, łupy na następny miesiąc', async () => {
  const st = useState('rok', RUN)
  const dir = join(LAB, 'przebiegi', RUN)
  mkdirSync(join(dir, 'pobrane'), { recursive: true })
  copyFileSync(join(LAB, 'pliki', 'rok-nowe-historia.csv'), join(dir, 'pobrane', 'rok-nowe-historia.csv'))
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
    }
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    await step('MO.12', async () => {
      const items = await briefingItems(page.locator('section[data-panel="bridge:Odprawa"]').first())
      dump('MO.12-odprawa', items.filter((x) => x.kind === 'import'))
      const it = page.locator('section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"][data-kind="import"]').filter({ hasText: 'importuj.' }).first()
      await it.click()
      await page.waitForTimeout(5000)
      dump('MO.12-import', { gdzie: await where(page), tekst: (await text(page, '[data-testid="page-import"]')).slice(0, 2000) })
      await shot(page, 'MO.12-import')
      await go(page, '1', 'page-bridge')
    })
    await step('MO.31-filtr', async () => {
      await go(page, '2', 'page-operations')
      await page.getByTestId('operations-accounts').click()
      await page.getByTestId('operations-accounts-01KDEFACC00000000000000001').click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      dump('MO.31-filtr-ustawiony', (await text(page, '[data-testid="page-operations"]')).slice(0, 300))
      await go(page, '1', 'page-bridge')
      const older = page.locator('[data-testid="bridge-recent-row"]').filter({ hasText: /30\.10/ }).first()
      dump('MO.31-klik', await older.innerText())
      await older.click()
      await page.waitForTimeout(1500)
      dump('MO.31-po-kliknieciu', (await text(page, '[data-testid="page-operations"]')).slice(0, 900))
      await shot(page, 'MO.31-po-kliknieciu')
      await go(page, '1', 'page-bridge')
      await go(page, '2', 'page-operations')
      dump('MO.31-z-menu', (await text(page, '[data-testid="page-operations"]')).slice(0, 400))
      await shot(page, 'MO.31-z-menu')
      const mine = page.getByText('mój filtr', { exact: true })
      if (await mine.count()) {
        await mine.first().click()
        await page.waitForTimeout(800)
        dump('MO.31-moj-filtr', (await text(page, '[data-testid="page-operations"]')).slice(0, 400))
        await shot(page, 'MO.31-moj-filtr')
      } else dump('MO.31-moj-filtr', '(brak „mój filtr”)')
    })
    await step('MO.5-lupy', async () => {
      await go(page, '1', 'page-bridge')
      const before = await readBridge(page)
      await go(page, '4', 'page-month')
      const next = page.getByTestId('loot-next')
      await next.click()
      await next.fill('300')
      await next.press('Tab')
      await page.waitForTimeout(300)
      await page.getByTestId('loot-confirm').click()
      await page.waitForTimeout(1500)
      dump('MO.5-lupy-po', await textOf(page.getByTestId('loot')))
      dump('MO.5-plan-podzial', (await text(page, '[data-testid="page-month"]')).slice(0, 2200))
      await go(page, '1', 'page-bridge')
      const after = await readBridge(page)
      dump('MO.5-lupy-rozbicie', { przed: before.rozbicie, po: after.rozbicie, energiaPrzed: before.energia, energiaPo: after.energia, podpisPo: after.podpis, stanPo: after.stan, odprawaPo: (after.odprawa as Array<{ text: string }>).map((x) => x.text).slice(0, 6) })
      await page.getByTestId('bridge-energy-why').click()
      await shot(page, 'MO.5-lupy')
      reading('mo', 'MO.5', 'rok + łupy 300 na następny miesiąc', { rozbicie: JSON.stringify(after.rozbicie), energia: String(after.energia) })
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
