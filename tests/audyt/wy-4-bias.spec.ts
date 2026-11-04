// WY, przebieg 4 (kopie persony „rok” zmienione przed startem): Daily Bias w wariantach energii, kopert i osłon – Mostek,
// Raporty → Odprawa i odsłuch (syntezator podstawiony). Narzędzie obserwacji – oceny w docs/audyt/raport/WY.md.
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, start, useState } from './lab'
import { auditId, CAT, catchSpeech, colorOf, editJson, go, out, shotEl, spoken, stepper, textOf, TODAY_MOKKA, writeTx } from './wy-pomoc'

type Variant = { id: string; opis: string; prep: (dataDir: string) => void }
const mokka = (amount: number | null) => (d: string) => {
  if (amount == null) rmSync(join(d, TODAY_MOKKA))
  else editJson(join(d, TODAY_MOKKA), (j) => void (j.amount = -amount))
}
const VARIANTS: Variant[] = [
  { id: 'bullish', opis: 'bez dzisiejszego zakupu (energia = przydział 89,28)', prep: mokka(null) },
  { id: 'bearish-energia', opis: 'dziś Mokka 50,00 (energia 39,28 < połowy 41,665)', prep: mokka(5000) },
  {
    id: 'bearish-oslony',
    opis: 'bez dzisiejszego zakupu, minimum osłon 3 pensje (19 500 > 13 000)',
    prep: (d) => {
      mokka(null)(d)
      editJson(join(d, 'fi.json'), (j) => void (j.settings.orders.minShieldSalaries = 3))
    }
  },
  { id: 'rowna-podstawowemu', opis: 'dziś Mokka 5,95 (energia 83,33 = podstawowy)', prep: mokka(595) },
  { id: 'polowa-w-gore', opis: 'dziś Mokka 47,61 (energia 41,67 – połowa 41,665 zaokrąglona w górę)', prep: mokka(4761) },
  { id: 'polowa-w-dol', opis: 'dziś Mokka 47,62 (energia 41,66 – poniżej połowy 41,665)', prep: mokka(4762) },
  {
    id: 'planowa-ponad',
    opis: 'bez dzisiejszego zakupu, 01.11 Auto 700,00 (koperta planowa 650) – pełna energia',
    prep: (d) => {
      mokka(null)(d)
      writeTx(d, { id: auditId(1), date: '2026-11-01', amount: -70000, categoryId: CAT.fuel, counterparty: 'ORLEN AUDYT' })
    }
  },
  {
    id: 'codzienna-ponad',
    opis: 'plan listopada: Osobiste 50 zł, Jedzenie 1 900 zł (pula 2 500); 01.11 Osobiste 100,00; bez dzisiejszego zakupu',
    prep: (d) => {
      mokka(null)(d)
      editJson(join(d, 'months', '2026-11.json'), (j) => {
        j.envelopes[CAT.personal] = 5000
        j.envelopes[CAT.food] = 190000
      })
      writeTx(d, { id: auditId(2), date: '2026-11-01', amount: -10000, categoryId: CAT.personal, counterparty: 'ROSSMANN AUDYT' })
    }
  }
]

test('WY przebieg 4 – Daily Bias w wariantach', async () => {
  test.setTimeout(40 * 60_000)
  const only = process.env.WY_BIAS?.split(',')
  for (const v of VARIANTS.filter((x) => !only || only.includes(x.id))) {
    const run = `wy-4-${v.id}`
    const st = useState('rok', run)
    v.prep(st.dataDir)
    const { app, page, errors } = await start(run, { dataDir: st.dataDir, ictjDir: st.ictjDir })
    const dump = out(run)
    const step = stepper(dump)
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(4000)
      const r: Record<string, string> = { opis: v.opis }
      await step('mostek', async () => {
        r.energia = await textOf(page.getByTestId('bridge-energy'))
        r.podpis = await textOf(page.getByTestId('bridge-energy-why'))
        r.bias = await textOf(page.getByTestId('bridge-bias'))
        r.biasKolor = await colorOf(page.getByTestId('bridge-bias'))
        r.oslony = (await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]'))).split('\n').slice(0, 3).join(' ')
        r.koperty = (await textOf(page.locator('section[data-panel="bridge:Koperty"]'))).replace(/\n/g, ' | ').slice(0, 600)
        r.alarmy = (await page.locator('section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"]').allInnerTexts()).slice(0, 4).join(' || ')
        await shotEl(page.locator('section[data-panel="bridge:Odprawa"]').first(), `WY.1-${v.id}`)
        await catchSpeech(page)
        await page.getByTestId('briefing-speak').click()
        await page.waitForTimeout(500)
        r.odsluch = (await spoken(page)).join(' ').slice(0, 260)
      })
      await step('raporty', async () => {
        await go(page, '0', 'page-reports')
        await page.getByRole('radio', { name: 'Odprawa' }).click()
        await page.waitForTimeout(800)
        r.raportyBias = await textOf(page.getByTestId('reports-briefing-bias'))
        r.raportyBiasKolor = await colorOf(page.getByTestId('reports-briefing-bias'))
      })
      dump('WY.1', r)
      reading('wy', v.id.startsWith('bullish') || v.id.startsWith('bearish') ? 'WY.1' : 'WY.2', `rok: ${v.opis}`, r)
      dump('bledy', errors)
    } finally {
      await app.close().catch((e) => out(run)('problem-zamkniecia', String(e).slice(0, 200)))
    }
  }
})
