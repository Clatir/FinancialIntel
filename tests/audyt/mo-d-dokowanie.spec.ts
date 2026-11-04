// MO, przebieg D (persona „rok” + ICTTJ): panel „Dokowanie” – zadokowane dostawy (bankowa 19.10 i ręczna na Portfelu XTB
// 18.09), szukanie „Wycofaj dokowanie” na Mostku, w oknie dokowania i w edytorze operacji (MO.29), okno otwartej dostawy
// (MO.28). Niczego nie zapisuje (okna zamykane „Anuluj” / Esc).
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import { go, out, textOf } from './mo-pomoc'

const RUN = 'mo-d'

test('MO przebieg D – dokowanie: zadokowane dostawy i wycofanie', async () => {
  const st = useState('rok', RUN)
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
    const panel = page.locator('section[data-panel^="bridge:Dokowanie"]').first()
    dump('panel', await panel.innerText())
    dump('wycofaj-na-mostku', { liczba: await page.getByText(/Wycofaj dokowanie/i).count(), przyciski: await panel.locator('button').allInnerTexts() })
    await panel.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.28.png' })
    for (const [name, date] of [['bank-1910', '19.10.2026'], ['reczna-1809', '18.09.2026']] as const) {
      await step(name, async () => {
        await go(page, '1', 'page-bridge')
        await panel.getByRole('button').filter({ hasText: date }).first().click()
        await page.waitForTimeout(1200)
        const dlg = page.locator('[role="dialog"]').last()
        dump(`okno-${name}`, { tekst: await dlg.innerText(), przyciski: await dlg.locator('button').allInnerTexts(), wycofaj: await dlg.getByText(/Wycofaj/i).count() })
        await shot(page, `MO.29-okno-${name}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      })
    }
    // Edytor operacji zadokowanej wypłaty (bank, 20.10).
    await step('edytor', async () => {
      await go(page, '2', 'page-operations')
      const search = page.getByPlaceholder(/Szukaj/)
      await search.fill('WYPLATA SRODKOW')
      await page.waitForTimeout(800)
      await page.getByText('‹').first().click().catch(() => undefined)
      await page.waitForTimeout(800)
      const row = page.locator('[data-testid="operation-row"]').first()
      if (await row.count()) await row.click()
      else await page.getByText('XTB S.A.').first().click()
      await page.waitForTimeout(1000)
      dump('edytor-operacji', { tekst: (await text(page, '[data-testid="page-operations"]')).slice(-1500), wycofaj: await page.getByText(/Wycofaj/i).count() })
      await shot(page, 'MO.29-edytor')
    })
    await step('otwarta', async () => {
      await go(page, '1', 'page-bridge')
      await panel.getByRole('button').filter({ hasText: '14.10.2026' }).first().click()
      await page.waitForTimeout(1200)
      dump('okno-otwarta-1410', await textOf(page.locator('[role="dialog"]').last()))
      await shot(page, 'MO.28-okno-otwartej')
      await page.keyboard.press('Escape')
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
