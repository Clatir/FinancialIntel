// MO, przebieg C1 – stan szczególny „brzegi” zrobiony na kopii persony „rok” (opis w raporcie MO.md):
// rozkazy: linia zanurzenia 25 %, minimum osłon 3 pensje (osłony poniżej minimum); listopad: przekroczenie dnia 01.11
// i 02.11, Auto +15 %, Zdrowie +35 %, dwie dopłaty do XTB 02.11, dziś zakup ponad przydział; potem korekta salda Gotówki
// z interfejsu. Punkty MO.3, MO.8 (Bearish), MO.9, MO.10 (alarmy), MO.24 (ponad linią).
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { ACC, CAT, auditId, editJson, go, out, readBridge, textOf, where, writeTx } from './mo-pomoc'

const RUN = 'mo-c1'

test('MO przebieg C1 – brzegi: alarmy, przekroczenie, masa ponad linią', async () => {
  const st = useState('rok', RUN)
  const d = st.dataDir
  editJson(join(d, 'fi.json'), (j) => {
    j.settings.orders.cargoLimitPct = 25
    j.settings.orders.minShieldSalaries = 3
  })
  writeTx(d, { id: auditId(1), date: '2026-11-01', time: '12:00', amount: -15000, categoryId: CAT.food, counterparty: 'Biedronka' })
  writeTx(d, { id: auditId(2), date: '2026-11-02', time: '12:00', amount: -15000, categoryId: CAT.food, counterparty: 'Biedronka' })
  writeTx(d, { id: auditId(3), date: '2026-11-02', time: '13:00', amount: -74750, categoryId: CAT.fuel, counterparty: 'ORLEN' })
  writeTx(d, { id: auditId(4), date: '2026-11-02', time: '14:00', amount: -20250, categoryId: CAT.meds, counterparty: 'Apteka' })
  writeTx(d, { id: auditId(5), date: '2026-11-02', amount: -20000, kind: 'trading', counterparty: 'XTB S.A.', title: 'ZASILENIE RACHUNKU 4421987' })
  writeTx(d, { id: auditId(6), date: '2026-11-02', amount: -30000, kind: 'trading', counterparty: 'XTB S.A.', title: 'ZASILENIE RACHUNKU 4421987' })
  writeTx(d, { id: auditId(7), date: '2026-11-03', time: '09:30', amount: -12000, categoryId: CAT.food, counterparty: 'Lidl', accountId: ACC.mbank })
  const { app, page, errors } = await start(RUN, { dataDir: d, ictjDir: st.ictjDir })
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
    const b = await readBridge(page)
    dump('mostek-1', b)
    await shot(page, 'MO.3')
    reading('mo', 'MO.3', 'brzegi-c1', { energia: String(b.energia), podpis: String(b.podpis), odprawa: JSON.stringify(b.odprawa), rozbicie: JSON.stringify(b.rozbicie) })
    reading('mo', 'MO.9', 'brzegi-c1', { odprawa: JSON.stringify(b.odprawa) })
    await page.locator('section[data-panel="bridge:Odprawa"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.9.png' })
    await page.locator('section[data-panel="bridge:Stan okrętu"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.24-brzegi.png' })
    await page.locator('section[data-panel="bridge:Koperty"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.25-brzegi.png' })

    await step('raporty', async () => {
      await go(page, '0', 'page-reports')
      await page.getByTestId('page-reports').getByText('Odprawa', { exact: true }).first().click()
      await page.waitForTimeout(800)
      dump('raporty-odprawa', await textOf(page.getByTestId('reports-briefing')))
      dump('raporty-bias', await textOf(page.getByTestId('reports-briefing-bias')))
      await shot(page, 'MO.8-raporty-brzegi')
    })
    await step('plan', async () => {
      await go(page, '4', 'page-month')
      dump('plan', (await text(page, '[data-testid="page-month"]')).slice(0, 3500))
    })
    await step('ladownia', async () => {
      await go(page, '5', 'page-cargo')
      dump('ladownia', (await text(page, '[data-testid="page-cargo"]')).slice(0, 2500))
      await shot(page, 'MO.24-ladownia-brzegi')
    })
    await step('korekta', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-accounts').click()
      await page.waitForTimeout(600)
      const amt = page.getByTestId('account-confirm-amount').nth(2)
      await amt.click()
      await amt.fill('0')
      await amt.press('Tab')
      await page.getByTestId('account-confirm').nth(2).click()
      await page.waitForTimeout(1500)
      dump('korekta-ustawienia', (await text(page, 'main')).slice(0, 2500))
      await go(page, '1', 'page-bridge')
      await page.waitForTimeout(1500)
      const b2 = await readBridge(page)
      dump('mostek-2-po-korekcie', b2)
      reading('mo', 'MO.9', 'brzegi-c1+korekta', { odprawa: JSON.stringify(b2.odprawa) })
      await page.locator('section[data-panel="bridge:Odprawa"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.9-korekta.png' })
    })
    await step('MO.10', async () => {
      const sel = 'section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"]'
      const n = await page.locator(sel).count()
      const res: string[] = []
      for (let i = 0; i < n; i++) {
        await go(page, '1', 'page-bridge')
        const it = page.locator(sel).nth(i)
        const kind = await it.getAttribute('data-kind')
        if (kind !== 'alarm') continue
        const label = `${kind}: ${(await it.innerText()).slice(0, 100)}`
        await it.click()
        await page.waitForTimeout(1500)
        const w = await where(page)
        const detail = await page.evaluate(() => {
          const ed = document.querySelector('[data-testid="operation-editor"], [data-testid^="operation-form"]') as HTMLElement | null
          return ed ? ed.innerText.slice(0, 200).replace(/\s+/g, ' ') : ''
        })
        res.push(`${i} ${label}\n   -> ${w} edytor=${detail}`)
        await shot(page, `MO.10-alarm-${i}`)
      }
      dump('MO.10-alarmy', res.join('\n'))
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
