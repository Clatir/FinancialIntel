/**
 * AU-11 skeptical check W2 – MO.20 (the household deposit vs the advances shown at the members) and MO.11 / MO.15 (the
 * asteroid's day on the Mostek vs Ładownia and Radar after the container's payment day changed in the interface).
 * State: persona „rok” unchanged (copy); in the run: Ładownia → OC samochodu → „Płatność” 06.11.2025 (was 25.11).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { note, reading, shot, start, text, useState } from './lab'
import { briefingItems, go } from './mo-pomoc'

const RUN = 'w2-mo'
const log = (s: string) => note(RUN, s)

test('W2 – MO.20, MO.11 / MO.15', async () => {
  test.setTimeout(15 * 60_000)
  const st = useState('rok', RUN)
  const fi = JSON.parse(readFileSync(join(st.dataDir, 'fi.json'), 'utf8'))
  log(`domownicy w fi.json: ${JSON.stringify(fi.settings.household.members.map((m: any) => [m.name, m.inflow, m.opening]))}`)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)
    // ---- MO.20
    const state = (await text(page, 'section[data-panel="bridge:Stan okrętu"]')).replace(/\s+/g, ' ')
    log(`MO.20 Stan okrętu: ${state}`)
    const house = (await text(page, 'section[data-panel="bridge:Rozliczenia z domownikami"]')).replace(/\s+/g, ' ')
    log(`MO.20 Rozliczenia z domownikami: ${house}`)
    await page.locator('section[data-panel="bridge:Stan okrętu"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\W2-MO.20-stan.png' }).catch(() => undefined)
    await page.locator('section[data-panel="bridge:Rozliczenia z domownikami"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\W2-MO.20-rozliczenia.png' }).catch(() => undefined)
    reading('w2', 'MO.20', 'rok (w2-mo)', { stan: state.slice(0, 900), rozliczenia: house.slice(0, 900) })
    await go(page, '7', 'page-radar')
    const radar = await text(page, '[data-testid="page-radar"]')
    const i = radar.indexOf('Należności')
    log(`MO.20 Radar – Należności: ${radar.slice(Math.max(0, i), i + 900).replace(/\s+/g, ' ')}`)
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-household').click()
    await page.waitForTimeout(800)
    const rows = page.getByTestId('member-row')
    for (let k = 0; k < (await rows.count()); k++) {
      const r = rows.nth(k)
      log(`MO.20 Ustawienia – ${await r.getAttribute('data-name')}: ${(await r.innerText()).replace(/\s+/g, ' ').slice(0, 400)}`)
    }
    await shot(page, 'W2-MO.20-ustawienia')
    // ---- MO.11 / MO.15
    await go(page, '5', 'page-cargo')
    await page.getByTestId('page-cargo').getByText('OC samochodu', { exact: true }).first().click()
    await page.waitForTimeout(800)
    const due = page.getByTestId('container-due')
    log(`MO.11 przed: pole „${await due.inputValue()}”`)
    await due.click()
    await due.fill('06.11.2025')
    await due.press('Tab')
    await page.waitForTimeout(1500)
    const cargo = await text(page, '[data-testid="page-cargo"]')
    log(`MO.11 po zmianie: pole „${await due.inputValue()}”`)
    for (const m of cargo.matchAll(/[^\n]*(?:OC samochodu|Termin:|termin|dzień płatności)[^\n]*/g)) log(`MO.11 Ładownia: ${m[0].trim()}`)
    await shot(page, 'W2-MO.11-ladownia')
    await go(page, '7', 'page-radar')
    const r2 = await text(page, '[data-testid="page-radar"]')
    for (const m of r2.matchAll(/[^\n]*(?:asteroida|OC samochodu|Prąd|Podatek)[^\n]*/gi)) log(`MO.11 Radar: ${m[0].trim()}`)
    await go(page, '1', 'page-bridge')
    await page.waitForTimeout(1500)
    const items = await briefingItems(page.locator('section[data-panel="bridge:Odprawa"]').first())
    for (const it of items) log(`MO.11 Odprawa [${it.kind}]: ${it.text}`)
    await page.locator('section[data-panel="bridge:Odprawa"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\W2-MO.11-odprawa.png' }).catch(() => undefined)
    reading('w2', 'MO.11', 'rok + OC „Płatność” 06.11.2025 z interfejsu (w2-mo)', { odprawa: items.map((x) => x.text).join(' | ').slice(0, 1500) })
    const fi2 = JSON.parse(readFileSync(join(st.dataDir, 'fi.json'), 'utf8'))
    void fi2
    log(`błędy okna: ${errors.length ? errors.join(' | ') : 'brak'}`)
  } finally {
    await app.close()
  }
})
