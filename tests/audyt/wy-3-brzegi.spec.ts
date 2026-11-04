// WY, przebieg 3 (kopia persony „rok” zmieniona przed startem): wydatek na samej kategorii głównej Jedzenie (15.10, 50 zł),
// zwrot z godziną w piątek 19:30 (30.10, +50 zł Osobiste), sierpień bez kopert, listopad bez wydatków (bez Mokki);
// powtórzenie pól symulatora pisanych znak po znaku. Narzędzie obserwacji – oceny w docs/audyt/raport/WY.md.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { start, useState } from './lab'
import { auditId, CAT, editJson, go, out, shotEl, stepper, textOf, TODAY_MOKKA, writeTx } from './wy-pomoc'

const RUN = 'wy-3'

test('WY przebieg 3 – brzegi Wywiadu', async () => {
  const st = useState('rok', RUN)
  writeTx(st.dataDir, { id: auditId(10), date: '2026-10-15', amount: -5000, categoryId: CAT.food, counterparty: 'SKLEP AUDYT' })
  writeTx(st.dataDir, { id: auditId(11), date: '2026-10-30', time: '19:30', amount: 5000, categoryId: CAT.personal, counterparty: 'ZWROT AUDYT' })
  editJson(join(st.dataDir, 'months', '2026-08.json'), (j) => void (j.envelopes = {}))
  rmSync(join(st.dataDir, TODAY_MOKKA))
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)
    await go(page, '9', 'page-intel')
    await page.waitForTimeout(2000)
    await step('bez-podkategorii', async () => {
      const sp = page.getByTestId('intel-spending')
      await sp.locator('[data-testid="intel-spend-row"][data-label="Jedzenie"] [data-testid="intel-spend-toggle"]').click()
      await page.waitForTimeout(600)
      const rows = await sp.locator('tr').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')} | ${(e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()} | przyciski=${e.querySelectorAll('[data-testid="intel-spend-cell"]').length}`))
      dump('WY.12-bez-podkategorii', rows)
      await shotEl(sp, 'WY.12-bez-podkategorii')
    })
    await step('killzone-zwrot', async () => {
      dump('WY.9-zwrot', { licznik: await textOf(page.getByTestId('intel-killzones-panel')), pt19: await page.locator('[data-testid="intel-killzones"] rect[data-testid] title').allTextContents() })
    })
    await step('fvg-sierpien', async () => {
      await page.getByTestId('intel-fvg-month').selectOption('2026-08')
      await page.waitForTimeout(600)
      dump('WY.10-bez-kopert', await textOf(page.getByTestId('intel-fvg')))
      await shotEl(page.getByTestId('intel-fvg'), 'WY.10-bez-kopert')
    })
    await step('porownanie-listopad', async () => {
      await page.getByTestId('intel-comparison-month').selectOption('2026-11')
      await page.waitForTimeout(600)
      dump('WY.14-bez-wydatkow', await textOf(page.getByTestId('intel-comparison')))
      await shotEl(page.getByTestId('intel-comparison'), 'WY.14-bez-wydatkow')
    })
    await step('symulator-pisanie', async () => {
      const m = page.getByTestId('intel-maneuver')
      const r: Record<string, unknown> = {}
      for (const [id, v] of [['maneuver-costs', '250'], ['maneuver-noxtb', '24']] as const) {
        await page.getByTestId(id).click()
        await page.keyboard.press('Control+A')
        await page.keyboard.type(v)
        r[`${id}-w-polu`] = { pole: await page.getByTestId(id).inputValue(), zasieg: await textOf(page.getByTestId('maneuver-range')), osłony: await textOf(m.locator('tr', { hasText: 'Osłony pełne' })) }
        await page.keyboard.press('Tab')
        await page.waitForTimeout(500)
        r[`${id}-po-wyjsciu`] = { pole: await page.getByTestId(id).inputValue(), zasieg: await textOf(page.getByTestId('maneuver-range')), osłony: await textOf(m.locator('tr', { hasText: 'Osłony pełne' })) }
        await shotEl(m, `WY.20-${id}-${v}`)
        const c = m.getByText('wyczyść manewr')
        if (await c.count()) await c.click()
        await page.waitForTimeout(400)
      }
      dump('WY.20-pisanie', r)
    })
    await step('debrief-sierpien', async () => {
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Debriefing' }).click()
      await page.getByTestId('reports-debrief-month').selectOption('2026-08')
      await page.waitForTimeout(1000)
      dump('RY.19-sierpien-bez-kopert', await textOf(page.getByTestId('reports-debrief')))
    })
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
