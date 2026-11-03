// W5 (AU-11, weryfikacja sceptyczna): odtworzenie znalezisk LA.3, LA.8, LA.10 (migawka la\LA.8-2), DO.5 (do\DO.5-1)
// i C15 (do\DO.1-1) w wydanej aplikacji. Migawka kopiowana do folderu przebiegu (nietknięta); kopia ICTTJ – sumy SHA-256
// przed i po. Narzędzie obserwacji – nic nie zapisuje w danych poza tym, co robi sama aplikacja przy otwarciu.
import { test } from '@playwright/test'
import { shot, start } from './lab'
import { cargoScreen, go, monthAt, openContainer, ready, textOf } from './la-pomoc'
import { bridgeValues, dockPanel } from './do-pomoc'

import { allBriefing, boundary, prepare } from './w5-pomoc'

test('W5 – LA.3, LA.8, LA.10 (migawka LA.8-2)', async () => {
  const p = prepare('w5-la', 'la\\LA.8-2')
  const r = await start('w5-la', { dataDir: p.dataDir, ictjDir: p.ictjDir })
  const page = r.page
  try {
    await ready(page)
    await page.waitForTimeout(3000)
    p.log('odprawa', await allBriefing(page))
    const w = page.locator('[data-testid="briefing-item"]').filter({ hasText: 'Wywóz śmieci' }).first()
    if (await w.count()) {
      await w.scrollIntoViewIfNeeded()
      await shot(page, 'W5-LA.10-odprawa')
    }
    await go(page, '5', 'page-cargo')
    p.log('ladownia', await cargoScreen(page))
    for (const [name, id] of [
      ['OC samochodu', 'W5-LA.3-edytor'],
      ['OC motocykla', 'W5-LA.3-ocmoto-edytor'],
      ['Ubezpieczenie domu', 'W5-LA.8-edytor'],
      ['Wywóz śmieci', 'W5-LA.10-edytor']
    ] as const) {
      const ed = await openContainer(page, name)
      p.log(`edytor ${name}`, ed)
      const hint = page.getByTestId('cargo-editor').getByText('Opłata okresowa:', { exact: false }).first()
      if (await hint.count()) {
        await hint.scrollIntoViewIfNeeded()
        p.log(`podpowiedź ${name}`, await hint.innerText())
      }
      await shot(page, id)
      const month = page.getByTestId('container-month')
      if (await month.count()) p.log(`w tym miesiącu ${name}`, await textOf(month))
    }
    const tanks = await textOf(page.getByTestId('cargo-tanks'))
    p.log('odkładki', tanks)
    const plans: Record<string, string[]> = {}
    for (const d of [-1, 0, 1, 2, 3, 4]) {
      const m = await monthAt(page, d)
      plans[m.miesiac] = m.podzial.split(' | ').filter((l) => /Ubezpieczenie domu|OC samochodu|OC motocykla|Wywóz śmieci|Odkładki|Woda/.test(l))
      p.log(`plan ${d}`, m)
      if (d === 1) await shot(page, 'W5-LA.8-plan-M+1')
    }
    p.log('plany', plans)
  } finally {
    await r.app.close().catch(() => undefined)
    boundary(p)
  }
})

test('W5 – DO.5 (migawka DO.5-1)', async () => {
  const p = prepare('w5-do5', 'do\\DO.5-1')
  const r = await start('w5-do5', { dataDir: p.dataDir, ictjDir: p.ictjDir })
  const page = r.page
  try {
    await ready(page)
    await page.waitForTimeout(4000)
    p.log('mostek', await bridgeValues(page))
    p.log('odprawa', await allBriefing(page))
    await shot(page, 'W5-DO.5-mostek')
    await go(page, '8', 'page-command')
    p.log('dowództwo', (await page.getByTestId('page-command').innerText()).split('\n').filter((l) => /narusz|irewall|wbrew|Dziś/.test(l)))
    await shot(page, 'W5-DO.5-dowodztwo')
  } finally {
    await r.app.close().catch(() => undefined)
    boundary(p)
  }
})

test('W5 – C15 (migawka DO.1-1)', async () => {
  const p = prepare('w5-c15', 'do\\DO.1-1')
  const r = await start('w5-c15', { dataDir: p.dataDir, ictjDir: p.ictjDir })
  const page = r.page
  try {
    await ready(page)
    await page.waitForTimeout(4000)
    p.log('mostek', await bridgeValues(page))
    p.log('dokowanie', await dockPanel(page))
    const rest = page.getByText(/Pominięte i sprzed startu/).first()
    if (await rest.count()) {
      await rest.click().catch(() => undefined)
      await page.waitForTimeout(500)
      p.log('dokowanie po rozwinięciu', await dockPanel(page))
    }
    p.log('odprawa', await allBriefing(page))
    await shot(page, 'W5-C15-mostek')
  } finally {
    await r.app.close().catch(() => undefined)
    boundary(p)
  }
})
