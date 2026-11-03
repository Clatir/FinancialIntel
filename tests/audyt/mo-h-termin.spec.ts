// MO, przebieg H (persona „rok”): zmiana dnia płatności kontenera z interfejsu (Ładownia → OC samochodu → „Płatność”
// 06.11.2025 zamiast 25.11) i ta sama opłata na Mostku (asteroida), w Ładowni i na Radarze (MO.11 – potwierdzenie
// rozjazdu dat z przebiegu C3).
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import { briefingItems, go, out, textOf, where } from './mo-pomoc'

const RUN = 'mo-h'

test('MO przebieg H – dzień płatności kontenera a asteroida', async () => {
  const st = useState('rok', RUN)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)
    await go(page, '5', 'page-cargo')
    await page.getByTestId('page-cargo').getByText('OC samochodu', { exact: true }).first().click()
    await page.waitForTimeout(800)
    const due = page.getByTestId('container-due')
    dump('przed', { pole: await due.inputValue(), szczegoly: (await text(page, '[data-testid="page-cargo"]')).slice(0, 2500) })
    await due.click()
    await due.fill('06.11.2025')
    await due.press('Tab')
    await page.waitForTimeout(1500)
    dump('po-zmianie', { pole: await due.inputValue(), ladownia: (await text(page, '[data-testid="page-cargo"]')).slice(0, 3000) })
    await shot(page, 'MO.11-ladownia-po-zmianie')
    await go(page, '7', 'page-radar')
    dump('radar', (await text(page, '[data-testid="page-radar"]')).slice(0, 1800))
    await go(page, '1', 'page-bridge')
    await page.waitForTimeout(1500)
    dump('odprawa', (await briefingItems(page.locator('section[data-panel="bridge:Odprawa"]').first())).filter((i) => i.kind === 'asteroid'))
    await shot(page, 'MO.11-mostek-po-zmianie')
    // MO.24 – kafelek „Masa ładunku”; MO.30 – „Wywiad →”; MO.26 – „wydatki domowników ›”.
    const state = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
    await state.getByText('Masa ładunku').click()
    await page.waitForTimeout(1200)
    const cargo = await text(page, '[data-testid="page-cargo"]')
    dump('MO.24-klik', { gdzie: await where(page), linia: cargo.slice(Math.max(0, cargo.indexOf('Masa ładunku')), cargo.indexOf('Masa ładunku') + 120) })
    await go(page, '1', 'page-bridge')
    await page.getByTestId('bridge-wealth-open').click()
    await page.waitForTimeout(1200)
    dump('MO.30-klik', await where(page))
    await go(page, '1', 'page-bridge')
    await page.getByText('wydatki domowników ›').click()
    await page.waitForTimeout(1200)
    dump('MO.26-klik', { gdzie: await where(page), filtr: (await text(page, '[data-testid="page-operations"]')).slice(0, 200) })
    dump('bledy-okna', { errors, plik: await textOf(page.getByTestId('ship-name')) })
  } finally {
    await app.close()
  }
})
