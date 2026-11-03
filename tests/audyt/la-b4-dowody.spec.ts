// LA, przebieg B4 (dowody do LA.3, LA.4, LA.8, LA.10 na stanie B): zrzuty podpowiedzi edytora, fałszywej „nowej ceny”
// Wywozu śmieci i planu następnego miesiąca po dodaniu kontenera z ratą wyrównawczą. Narzędzie obserwacji.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { build, go, monthAt, openContainer, out, rd, ready, textOf } from './la-pomoc'

test('LA przebieg B4 – zrzuty dowodów (LA.3, LA.4, LA.8, LA.10)', async () => {
  const RUN = 'la-b4'
  const STATE = 'rok + opłaty okresowe (la-b4)'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('stan', build(st.dataDir, ['okresowe']))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  const s: Record<string, unknown> = {}
  try {
    await ready(page)
    const item = page.locator('[data-testid="briefing-item"]').filter({ hasText: 'Wywóz śmieci' }).first()
    if (await item.count()) {
      await item.scrollIntoViewIfNeeded()
      s.odprawaWywoz = await item.innerText()
      await shot(page, 'LA.10-odprawa-wywoz')
    }
    await go(page, '5', 'page-cargo')
    for (const [name, id] of [
      ['OC samochodu', 'LA.3-edytor'],
      ['Podatek od nieruchomości', 'LA.4-podatek-edytor'],
      ['Wywóz śmieci', 'LA.10-wywoz-edytor']
    ] as const) {
      await openContainer(page, name)
      const hint = page.getByTestId('cargo-editor').getByText('Opłata okresowa:', { exact: false }).first()
      if (await hint.count()) {
        await hint.scrollIntoViewIfNeeded()
        s[name] = await hint.innerText()
      }
      await shot(page, id)
      if (name === 'Wywóz śmieci') {
        await page.getByTestId('container-month').scrollIntoViewIfNeeded()
        s.wywozMiesiac = await textOf(page.getByTestId('container-month'))
        s.wywozWiersz = await textOf(page.locator('[data-testid="cargo-row"][data-name="Wywóz śmieci"]'))
        await shot(page, 'LA.10-wywoz-w-tym-miesiacu')
      }
    }
    // LA.8: the new container 900 zł co rok, termin 10.02.2027, then the plan of December.
    await page.getByTestId('cargo-add').click()
    const f = page.getByTestId('cargo-new')
    await f.getByTestId('container-name').fill('Ubezpieczenie domu')
    const a = f.getByTestId('container-amount')
    await a.click()
    await a.fill('900')
    await a.press('Tab')
    await f.getByTestId('container-cycle').selectOption('12')
    const due = f.getByTestId('container-due')
    await due.click()
    await due.fill('10.02.2027')
    await due.press('Tab')
    await page.getByTestId('cargo-new-save').click()
    await page.waitForTimeout(1200)
    const tank = page.locator('[data-testid="cargo-tank"][data-name="Ubezpieczenie domu"]')
    await tank.scrollIntoViewIfNeeded()
    s.zbiornik = await textOf(tank)
    await shot(page, 'LA.8-odkladki')
    const plans: Record<string, string> = {}
    for (const d of [0, 1, 2, 3, 4]) {
      const m = await monthAt(page, d)
      const row = page.getByTestId('month-split').getByText('Ubezpieczenie domu').first()
      if (await row.count()) await row.scrollIntoViewIfNeeded()
      plans[m.miesiac] = m.odkladki + ' | ' + (m.podzial.match(/Ubezpieczenie domu \| [^|]+\| [^|]+/)?.[0] ?? '(brak)')
      if (d === 1) await shot(page, 'LA.8-plan-M+1')
    }
    s.plany = plans
    dump('B4', s)
    rd('LA.8', `${STATE} + „Ubezpieczenie domu” 900 zł co rok, termin 10.02.2027 (dodany 03.11.2026) – plan M0…M+4`, { zbiornik: String(s.zbiornik), plany: plans }, st)
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
