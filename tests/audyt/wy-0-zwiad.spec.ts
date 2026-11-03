// WY / RY, przebieg 0 (persona „rok”, tylko odczyt): Wywiad – wszystkie panele, dane wykresów, dymki Killzones; Mostek –
// odprawa i krzywa; Raporty – Odprawa, Raport wachty, Debriefing, Przegląd roczny; Plan miesiąca – debriefing października.
// Narzędzie obserwacji – oceny w docs/audyt/raport/WY.md i RY.md.
import { test } from '@playwright/test'
import { recorded, shot, start, text, useState } from './lab'
import { catchSpeech, go, out, panels, propsOf, shotEl, spoken, stepper, textOf } from './wy-pomoc'

const RUN = 'wy-0'

test('WY/RY przebieg 0 – rozpoznanie persony rok', async () => {
  const st = useState('rok', RUN)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    dump('viewport', await page.evaluate(() => ({ w: innerWidth, h: innerHeight })))

    await step('mostek', async () => {
      const odprawa = page.locator('section[data-panel="bridge:Odprawa"]').first()
      dump('mostek-odprawa', await odprawa.innerText())
      dump('mostek-bias', { bias: await textOf(page.getByTestId('bridge-bias')), title: await page.getByTestId('bridge-bias').getAttribute('title') })
      dump('mostek-krzywa', await textOf(page.getByTestId('bridge-wealth')))
      dump('mostek-krzywa-dane', await propsOf(page, '[data-testid="bridge-wealth-chart"]', 'points'))
      await shotEl(page.getByTestId('bridge-wealth'), 'WY.7-mostek')
      await catchSpeech(page)
      await page.getByTestId('briefing-speak').click().catch(() => undefined)
      await page.waitForTimeout(500)
      dump('mostek-odsluch', { spoken: await spoken(page), noVoice: await textOf(page.getByTestId('briefing-no-voice')), voices: await page.evaluate(() => speechSynthesis.getVoices().map((v) => `${v.name} ${v.lang}`)) })
    })

    await step('wywiad', async () => {
      await go(page, '9', 'page-intel')
      await page.waitForTimeout(3000)
      const root = page.getByTestId('page-intel')
      dump('wywiad-caly', await text(page, '[data-testid="page-intel"]'))
      dump('wywiad-panele', await panels(root))
      await shot(page, 'WY-0-wywiad')
      dump('wywiad-krzywa-dane', await propsOf(page, '[data-testid="intel-wealth-chart"]', 'points'))
      dump('wywiad-killzones-pola', await page.locator('[data-testid="intel-killzones"] rect').evaluateAll((els) => els.filter((e) => e.getAttribute('data-testid')).map((e) => `${e.querySelector('title')?.textContent} | stroke=${e.getAttribute('stroke')} fill=${e.getAttribute('fill')}`)))
      for (const id of ['intel-wealth', 'intel-fuel', 'intel-spending', 'intel-targets', 'intel-killzones-panel', 'intel-fvg', 'intel-comparison', 'intel-range', 'intel-course', 'intel-maneuver', 'intel-expeditions', 'intel-inflation', 'intel-log']) {
        const l = page.getByTestId(id)
        if (await l.count()) await shotEl(l, `WY-0-${id}`)
        else dump(`brak-${id}`, '')
      }
      dump('wywiad-sekcje-id', await root.locator('section').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')} | ${e.getAttribute('data-panel')} | ${(e as HTMLElement).innerText.split('\n')[0]}`)))
    })

    await step('raporty', async () => {
      await go(page, '0', 'page-reports')
      for (const tab of ['Odprawa', 'Raport wachty', 'Debriefing', 'Przegląd roczny']) {
        await page.getByRole('radio', { name: tab }).click()
        await page.waitForTimeout(1500)
        dump(`raporty-${tab}`, await text(page, '[data-testid="page-reports"]'))
        dump(`raporty-${tab}-dymki`, await page.getByTestId('page-reports').locator('[title]').evaluateAll((els) => els.map((t) => `${((t as HTMLElement).innerText || '').trim().slice(0, 60)} => ${t.getAttribute('title')}`)))
        await shot(page, `RY-0-raporty-${tab}`)
      }
      dump('raporty-selecty', await page.getByTestId('page-reports').locator('select').evaluateAll((els) => els.map((s) => `${s.getAttribute('data-testid')} = ${(s as HTMLSelectElement).value} [${Array.from((s as HTMLSelectElement).options).map((o) => o.value + ':' + o.text).join(', ')}]`)))
    })

    await step('plan', async () => {
      await go(page, '4', 'page-month')
      dump('plan-listopad', await text(page, '[data-testid="page-month"]'))
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(1500)
      dump('plan-pazdziernik', await text(page, '[data-testid="page-month"]'))
      const d = page.getByTestId('month-debrief')
      if (await d.count()) await shotEl(d, 'RY-0-plan-debrief-pazdziernik')
    })
    dump('zapis', await recorded(app))
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
