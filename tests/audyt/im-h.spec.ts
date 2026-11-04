// Area IM – run im-h (rok): a large file and a large import (IM.55); im-e2: the notification of a new file (IM.35), one
// more look at „rozłącz” (IM.13), deleting a rule (IM.48) and bank fees without the bank's category (IM.19).
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { LAB, recorded, start, useState } from './lab'
import { Obs, PLIKI, cardL, counters, expandAll, listaText, openFile, rawL, readable, statuses, step, txs, type LRow } from './im-pomoc'
import { cp1250 } from './persona'

const word = (n: number) => {
  const a = 'ABCDEFGHIJKLMNOPRSTUWZ'
  let s = ''
  let x = n + 23
  do {
    s += a[x % a.length]
    x = Math.floor(x / a.length)
  } while (x > 0)
  return `${s}${a[(n * 7) % a.length]}${a[(n * 13) % a.length]}OWO`
}

function bigRows(n: number, brands: number, from: string, days: number, seed: number): LRow[] {
  const rows: LRow[] = []
  let x = seed
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648)
  const d0 = Date.parse(`${from}T12:00:00Z`)
  for (let i = 0; i < n; i++) {
    const day = new Date(d0 + Math.floor(rnd() * days) * 86_400_000).toISOString().slice(0, 10)
    const b = Math.floor(rnd() * brands)
    rows.push(cardL(day, `SKLEP ${word(b)}`, -(100 + Math.floor(rnd() * 20000)), { cat: ['Żywność i chemia domowa', 'Jedzenie poza domem', 'Zakupy - inne', ''][b % 4] }))
  }
  return rows
}

test('im-h: duży plik i duży import', async () => {
  test.setTimeout(30 * 60_000)
  const o = new Obs('im-h')
  const big = join(PLIKI, 'P30k.csv')
  writeFileSync(big, cp1250(listaText(bigRows(30_000, 3000, '2025-09-01', 425, 7), '2025-09-01', '2026-10-30')))
  const p2k = join(PLIKI, 'P2k.csv')
  writeFileSync(p2k, cp1250(listaText(bigRows(2000, 400, '2026-06-01', 150, 11).map((r) => ({ ...r, desc: r.desc.replace('SKLEP ', 'SKLEP NOWY ') })), '2026-06-01', '2026-10-28')))
  const { dataDir, ictjDir } = useState('rok', 'im-h')
  const run = await start('im-h', { dataDir, ictjDir })
  const { app, page } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'IM.55-podglad', async () => {
      await page.keyboard.press('Control+3')
      await page.waitForTimeout(1000)
      await page.evaluate(() => {
        const w = window as unknown as { __gap: number; __last: number; __on: boolean }
        w.__gap = 0
        w.__last = performance.now()
        w.__on = true
        const tick = () => {
          const t = performance.now()
          w.__gap = Math.max(w.__gap, t - w.__last)
          w.__last = t
          if (w.__on) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      const t0 = Date.now()
      await openFile(app, page, big)
      o.log('IM.55 najdłuższa przerwa w odświeżaniu okna przy wczytaniu (ms)', await page.evaluate(() => { const w = window as unknown as { __gap: number; __on: boolean }; w.__on = false; return Math.round(w.__gap) }))
      o.log('IM.55 P30k – czas do podglądu (ms, z 0,8 s czekania)', Date.now() - t0)
      o.log('IM.55 P30k – plik', await readable(page, '[data-testid="import-file"]'))
      o.log('IM.55 P30k – liczniki', await counters(page))
      o.log('IM.55 P30k – podsumowanie', await readable(page, '[data-testid="import-themes-summary"]'))
      const themes = await page.locator('[data-testid="import-theme"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-label')} | ${(e.querySelector('[data-testid="import-theme-groups"]') ? 'rozwinięty' : 'zwinięty')} | ${(e as HTMLElement).innerText.split('\n')[0]}`))
      o.log('IM.55 tematy', themes.slice(0, 20))
      // a keystroke in the search
      const s = page.getByTestId('import-search')
      const t1 = Date.now()
      await s.type('s', { delay: 0 })
      await page.getByTestId('import-search-count').waitFor({ timeout: 30_000 })
      o.log('IM.55 znak w wyszukiwarce – do licznika (ms)', Date.now() - t1)
      const t2 = Date.now()
      await s.fill('sklep ' + word(42).toLowerCase())
      await page.waitForFunction(() => /znaleziono/.test(document.querySelector('[data-testid="import-search-count"]')?.textContent ?? ''), null, { timeout: 30_000 })
      o.log('IM.55 wyszukanie marki (ms)', Date.now() - t2)
      await s.fill('')
      await page.waitForTimeout(500)
      // a theme decided
      const t3 = Date.now()
      const th = page.locator('[data-testid="import-theme"]').first()
      await th.getByTestId('import-theme-category').selectOption({ label: 'Prezenty i inne · inne' }).catch(async () => th.getByTestId('import-theme-kind').selectOption({ index: 0 }))
      await page.waitForTimeout(100)
      o.log('IM.55 decyzja tematu (ms)', Date.now() - t3)
      await expandAll(page)
      o.log('IM.55 „pokaż kolejne”', await page.getByRole('button', { name: /pokaż kolejne/ }).allInnerTexts().then((x) => x.slice(0, 5)))
      await o.shot(page, 'IM.55-podglad')
      await page.getByTestId('import-close').click()
    })
    await step(o, page, 'IM.55-import', async () => {
      await openFile(app, page, p2k)
      o.log('IM.55 P2k – liczniki', await counters(page))
      await page.evaluate(() => {
        const w = window as unknown as { __gap: number; __last: number; __on: boolean }
        w.__gap = 0
        w.__last = performance.now()
        w.__on = true
        const tick = () => {
          const t = performance.now()
          w.__gap = Math.max(w.__gap, t - w.__last)
          w.__last = t
          if (w.__on) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
      const t0 = Date.now()
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 300_000 })
      o.log('IM.55 najdłuższa przerwa w odświeżaniu okna w trakcie zapisu (ms)', await page.evaluate(() => { const w = window as unknown as { __gap: number; __on: boolean }; w.__on = false; return Math.round(w.__gap) }))
      o.log('IM.55 zapis 2000 operacji (ms)', Date.now() - t0)
      o.log('IM.55 wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.55 operacji w folderze', (await txs(dataDir)).length)
      const t1 = Date.now()
      await page.keyboard.press('Control+2')
      await page.getByTestId('operations-period-menu').click()
      await page.getByTestId('operations-period-all').click()
      await page.getByTestId('operation-row').first().waitFor({ timeout: 60_000 })
      o.log('IM.55 Operacje „Cała historia” (ms)', Date.now() - t1)
      o.log('IM.55 pasek sum', await readable(page, '[data-testid="operations-sums"]').catch(() => '-'))
      await o.shot(page, 'IM.55-operacje')
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})

test('im-e2: powiadomienie o nowym pliku, rozłącz, usunięcie reguły, opłaty banku', async () => {
  test.setTimeout(20 * 60_000)
  const o = new Obs('im-e2')
  const { dataDir, ictjDir } = useState('rok', 'im-e2')
  const run = await start('im-e2', { dataDir, ictjDir })
  const { app, page } = run
  const pobrane = join(LAB, 'przebiegi', 'im-e2', 'pobrane')
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'IM.35-powiadomienie', async () => {
      mkdirSync(pobrane, { recursive: true })
      const n0 = (await recorded(app)).toasts.length
      copyFileSync(join(PLIKI, 'L2.csv'), join(pobrane, 'lista_operacji.csv'))
      await page.waitForTimeout(75_000)
      const t1 = (await recorded(app)).toasts.slice(n0)
      o.log('IM.35 powiadomienia po 75 s', t1)
      await page.waitForTimeout(75_000)
      const t2 = (await recorded(app)).toasts.slice(n0).filter((t) => /mBanku/.test(t.title))
      o.log('IM.35 „Nowy meldunek z mBanku” po 150 s (ile)', t2)
    })
    await step(o, page, 'IM.19-oplaty', async () => {
      const f = join(PLIKI, 'F.csv')
      writeFileSync(f, cp1250(listaText([rawL('2026-11-01', `OPŁATA ZA KARTĘ${' '.repeat(40)}`, -700), rawL('2026-10-28', `PROWIZJA ZA ZAKUP  KEBAB ROMA${' '.repeat(40)}`, -150), cardL('2026-10-28', 'KEBAB ROMA', -3200)], '2026-10-28', '2026-11-01')))
      await openFile(app, page, f)
      await expandAll(page)
      o.log('IM.19 opłaty bez kategorii mBanku – kategoryzacja', await readable(page, '[data-testid="import-groups"]'))
      await page.getByTestId('import-close').click()
    })
    await step(o, page, 'IM.13-rozlacz', async () => {
      await openFile(app, page, join(PLIKI, 'S.csv'))
      await page.getByTestId('similar-pair').first().getByTestId('similar-merge').click()
      await page.waitForTimeout(800)
      await page.getByTestId('import-close').click()
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(1200)
      o.log('IM.13 Połączone nazwy', await readable(page, '[data-testid="aliases"]'))
      const n0 = (await statuses(page)).length
      await page.getByTestId('alias-unmerge').first().click()
      await page.waitForTimeout(1000)
      const st = await statuses(page)
      o.log('IM.13 „rozłącz” – nowe komunikaty', st.slice(n0))
      o.log('IM.13 po rozłącz', await readable(page, '[data-testid="aliases"]').catch(() => '(brak)'))
      await o.shot(page, 'IM.13-rozlacz')
      // IM.48 – a rule deleted (one more time)
      const rules = page.getByTestId('import-rule')
      const r0 = await rules.count()
      const name = await rules.first().innerText()
      await rules.first().getByTestId('import-rule-delete').click()
      await page.waitForTimeout(1000)
      o.log('IM.48 usunięcie reguły', { reguła: name.split('\n')[0], przed: r0, po: await rules.count(), okna: await page.getByRole('dialog').count(), komunikaty: (await statuses(page)).slice(-2) })
      await o.shot(page, 'IM.48-regula-2')
    })
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
})
