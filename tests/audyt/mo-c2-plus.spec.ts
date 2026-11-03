// MO, przebieg C2 – kopia persony „rok” bez dzisiejszego zakupu (Mokka 12 zł), z kopertą 0 zł (Subskrypcje) i z dzisiejszymi
// operacjami różnych rodzajów (zwrot towaru, zakup za domownika, wpłata domownika, przelew własny). Potem szybkie wpisy:
// Orlen 100 zł (Auto – Premium), Apteka 160 zł (Zdrowie ponad limit). Punkty MO.8 (Bullish / Neutral), MO.25, MO.31.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { ACC, CAT, auditId, colorOf, editJson, go, out, quickWindow, readBridge, textOf, where, writeTx } from './mo-pomoc'

const RUN = 'mo-c2'
const ANNA = '01KDEFMEM00000000000000001'

async function quick(app: ElectronApplication, page: Page, amount: string, who: string, dump: (n: string, c: unknown) => void, name: string): Promise<void> {
  const q = await quickWindow(app, page)
  await q.getByTestId('quick-amount').click()
  await q.getByTestId('quick-amount').fill(amount)
  await q.getByTestId('quick-counterparty').fill(who)
  await q.getByTestId('quick-counterparty').press('Tab')
  await q.getByTestId('quick-time').fill('12:00')
  await q.getByTestId('quick-time').press('Tab')
  await q.waitForTimeout(500)
  dump(`${name}-okno`, { kategoria: await q.getByTestId('quick-category').inputValue().catch(() => '?'), tekst: await textOf(q.getByTestId('quick-entry')) })
  await q.getByTestId('quick-save').click()
  await page.waitForTimeout(2000)
}

test('MO przebieg C2 – Bullish, koperty Premium / przekroczona / 0 zł, ostatnie operacje', async () => {
  const st = useState('rok', RUN)
  const d = st.dataDir
  rmSync(join(d, 'transactions', '2026', '2026-11-03_01KAZ600000000000000000072.json'))
  editJson(join(d, 'months', '2026-11.json'), (j) => {
    j.envelopes['01KDEFCAT00000000000000700'] = 0
  })
  writeTx(d, { id: auditId(21), date: '2026-11-03', time: '10:00', amount: 4999, categoryId: CAT.clothes, counterparty: 'ZARA POLSKA', note: 'zwrot towaru' })
  writeTx(d, { id: auditId(22), date: '2026-11-03', time: '10:30', amount: -8000, categoryId: '01KDEFCAT00000000000000802', counterparty: 'ROSSMANN', refundable: true, memberId: ANNA })
  writeTx(d, { id: auditId(23), date: '2026-11-03', time: '11:00', amount: 10000, kind: 'income', counterparty: 'ANNA TESTOWA', memberId: ANNA, inflowKind: 'advance' })
  writeTx(d, { id: auditId(24), date: '2026-11-03', time: '11:30', amount: -50000, kind: 'transfer', counterparty: 'JAN KAPITAN', title: 'PRZELEW WŁASNY', counterAccountId: ACC.cash })
  const { app, page, errors } = await start(RUN, { dataDir: d, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
    }
  }
  const reports = async (name: string) => {
    await go(page, '0', 'page-reports')
    await page.getByTestId('page-reports').getByText('Odprawa', { exact: true }).first().click()
    await page.waitForTimeout(600)
    dump(name, { bias: await textOf(page.getByTestId('reports-briefing-bias')), odprawa: (await textOf(page.getByTestId('reports-briefing'))).slice(0, 300) })
    await go(page, '1', 'page-bridge')
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    const b1 = await readBridge(page)
    dump('mostek-1', b1)
    await shot(page, 'MO.8-bullish')
    reading('mo', 'MO.8', 'rok-c2 bez zakupu dziś', { bias: String(b1.bias), energia: String(b1.energia), podpis: String(b1.podpis) })
    await step('raporty-1', () => reports('raporty-1'))

    // MO.31 – ostatnie operacje z dzisiejszymi rodzajami.
    await step('MO.31', async () => {
      const recent = page.locator('[data-testid="bridge-recent-row"]')
      const rows: string[] = []
      for (let i = 0; i < (await recent.count()); i++) rows.push(`${(await recent.nth(i).innerText()).replace(/\s+/g, ' ')} [${await colorOf(recent.nth(i).locator('span').nth(3))}]`)
      dump('MO.31-wiersze', rows)
      await page.locator('section[data-panel="bridge:Ostatnie operacje"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.31-dzis.png' })
      // Zapamiętany filtr Operacji: wyszukiwanie „Biedronka” i miesiąc wcześniej.
      await go(page, '2', 'page-operations')
      const search = page.getByPlaceholder(/Szukaj/)
      await search.fill('Biedronka')
      await search.press('Enter')
      await page.waitForTimeout(800)
      dump('MO.31-operacje-filtr-przed', (await text(page, '[data-testid="page-operations"]')).slice(0, 400))
      await go(page, '1', 'page-bridge')
      const older = page.locator('[data-testid="bridge-recent-row"]').filter({ hasText: /^\s*30\.10/ }).first()
      dump('MO.31-klik', await older.innerText())
      await older.click()
      await page.waitForTimeout(1500)
      dump('MO.31-po-kliknieciu', { gdzie: await where(page), tekst: (await text(page, '[data-testid="page-operations"]')).slice(0, 600), szukaj: await search.inputValue().catch(() => '?') })
      await shot(page, 'MO.31-klik')
      await go(page, '1', 'page-bridge')
      await go(page, '2', 'page-operations')
      dump('MO.31-operacje-z-menu', { tekst: (await text(page, '[data-testid="page-operations"]')).slice(0, 400), szukaj: await search.inputValue().catch(() => '?') })
      await shot(page, 'MO.31-menu')
      await go(page, '1', 'page-bridge')
    })

    // MO.8 / MO.25 – Orlen 100 zł (Auto planowa, w limicie) i Apteka 160 zł (Zdrowie ponad limit).
    await step('orlen', async () => {
      await quick(app, page, '100', 'Orlen', dump, 'orlen')
      const b = await readBridge(page)
      dump('mostek-2-orlen', b)
      reading('mo', 'MO.8', 'rok-c2 + Orlen 100 (Auto)', { bias: String(b.bias), energia: String(b.energia), koperty: String(b.koperty) })
    })
    await step('apteka', async () => {
      await quick(app, page, '160', 'Apteka', dump, 'apteka')
      const b = await readBridge(page)
      dump('mostek-3-apteka', b)
      await shot(page, 'MO.8-neutral')
      await page.locator('section[data-panel="bridge:Koperty"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.25-c2.png' })
      reading('mo', 'MO.8', 'rok-c2 + Apteka 160 (Zdrowie ponad limit)', { bias: String(b.bias), energia: String(b.energia) })
      reading('mo', 'MO.25', 'rok-c2', { koperty: String(b.koperty) })
    })
    await step('raporty-2', () => reports('raporty-2'))
    await step('plan', async () => {
      await go(page, '4', 'page-month')
      dump('plan', (await text(page, '[data-testid="page-month"]')).slice(0, 3800))
      await go(page, '1', 'page-bridge')
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
