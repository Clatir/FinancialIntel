// MO, przebieg C1b – kopia persony „rok”: energia miesiąca wyczerpana dwa razy (prezenty 01.11 4 000 zł i 02.11 3 000 zł,
// energia miesiąca 6 204,63 zł), potem korekta salda Gotówki z interfejsu („Tak – zapisz korektę”). Punkty MO.9, MO.10.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { CAT, auditId, briefingItems, go, out, readBridge, where, writeTx } from './mo-pomoc'

const RUN = 'mo-c1b'

test('MO przebieg C1b – energia wyczerpana, korekta salda', async () => {
  const st = useState('rok', RUN)
  const d = st.dataDir
  writeTx(d, { id: auditId(31), date: '2026-11-01', time: '12:00', amount: -400000, categoryId: CAT.gifts, counterparty: 'JUBILER' })
  writeTx(d, { id: auditId(32), date: '2026-11-02', time: '12:00', amount: -300000, categoryId: CAT.gifts, counterparty: 'APART' })
  const { app, page, errors } = await start(RUN, { dataDir: d, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const odprawa = () => page.locator('section[data-panel="bridge:Odprawa"]').first()
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    const b = await readBridge(page)
    dump('mostek-1', { energia: b.energia, podpis: b.podpis, bias: b.bias, stan: b.stan, alarmy: (b.odprawa as Array<{ kind: string; text: string; dot: string; color: string }>).filter((i) => i.kind === 'alarm') })
    reading('mo', 'MO.9', 'rok-c1b energia wyczerpana', { odprawa: JSON.stringify((b.odprawa as Array<{ kind: string; text: string }>).filter((i) => i.kind === 'alarm')) })
    await go(page, '4', 'page-month')
    dump('plan', (await text(page, '[data-testid="page-month"]')).slice(0, 2500))
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(600)
    const amt = page.getByTestId('account-confirm-amount').nth(2)
    await amt.click()
    await amt.fill('0')
    await amt.press('Tab')
    await page.getByTestId('account-confirm').nth(2).click()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: 'Tak – zapisz korektę' }).click()
    await page.waitForTimeout(1500)
    await go(page, '1', 'page-bridge')
    await page.waitForTimeout(1000)
    const items = await briefingItems(odprawa())
    dump('mostek-2-po-korekcie', items.filter((i) => i.kind === 'alarm'))
    await odprawa().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.9-energia-korekta.png' })
    const res: string[] = []
    const sel = 'section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"][data-kind="alarm"]'
    const n = await page.locator(sel).count()
    for (let i = 0; i < n; i++) {
      await go(page, '1', 'page-bridge')
      const it = page.locator(sel).nth(i)
      const label = (await it.innerText()).slice(0, 100)
      await it.click()
      await page.waitForTimeout(1500)
      const ed = await page.evaluate(() => {
        const e = document.querySelector('[data-testid="page-operations"]') as HTMLElement | null
        return e ? e.innerText.slice(-600).replace(/\s+/g, ' ') : ''
      })
      res.push(`${i} ${label}\n   -> ${await where(page)} ${ed}`)
      await shot(page, `MO.10-c1b-${i}`)
    }
    dump('MO.10', res.join('\n'))
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
