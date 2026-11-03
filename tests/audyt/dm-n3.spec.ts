/**
 * DM.18 – the same through the window only: state „rok”; Radar → „Nowa pożyczka” „Pożyczam komuś” „Pożyczka dla Oli”
 * 1 000 zł, 1 rata (podpowiedź), then „spłata otrzymana” 1 050,00 zł (50 zł odsetek) → Mostek, Raporty.
 */
import { test, type Page } from '@playwright/test'
import { log, mostek, raport, rd, runRok, snap, toastsAfter, typeIn, line, radar } from './dm-pomoc'

const S = 'rok+dm-n3'
const row = (page: Page) => page.locator('[data-testid="loan-row"][data-name="Pożyczka dla Oli"]')

test('DM.18 – nadpłata pożyczki udzielonej (tylko okno)', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'dm-n3'
  const { page, app, dataDir } = await runRok(run)
  try {
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    const p = page.getByTestId('radar-new-loan')
    await p.locator('[role="radiogroup"][aria-label="Kierunek pożyczki"]').getByRole('radio', { name: 'Pożyczam komuś' }).click()
    await p.getByTestId('loan-name').fill('Pożyczka dla Oli')
    await p.getByTestId('loan-counterparty').fill('ALEKSANDRA TESTOWA')
    await typeIn(page, p.getByTestId('loan-amount'), '1000', 'Tab')
    log(run, 'DM.18b zapis', await toastsAfter(page, () => p.getByTestId('loan-save').click(), 1500))
    const m0 = await mostek(page)
    const n0 = await raport(page, '2026-11')
    log(run, 'DM.18b przed spłatą', m0.oslony, '|', m0.rozliczenia.slice(0, 400), '|', line(n0, 'Bilans paliwa'))
    await rd(page, 'DM.18', S, { etap: 'pożyczka 1 000 zł z okna, przed spłatą', oslony: m0.oslony, rozliczenia: m0.rozliczenia, bilansPaliwaM0: line(n0, 'Bilans paliwa') }, dataDir)
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    await row(page).getByTestId('loan-pay-open').click()
    await typeIn(page, row(page).getByTestId('loan-pay-amount'), '1050', 'Tab')
    const t = await toastsAfter(page, () => row(page).getByTestId('loan-pay').click(), 2000)
    const r1 = await radar(page)
    const m1 = await mostek(page)
    const n1 = await raport(page, '2026-11')
    log(run, 'DM.18b po spłacie 1 050', t, '|', m1.oslony, '|', m1.rozliczenia.slice(0, 400), '|', line(n1, 'Bilans paliwa'), '|', r1.pozyczki.slice(0, 600))
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(500)
    await snap(page, 'DM.18-nadplata-raport')
    await rd(page, 'DM.18', S, { etap: 'po „spłata otrzymana” 1 050,00 zł', toast: t.join(' || '), oslony: m1.oslony, rozliczenia: m1.rozliczenia, pozyczki: r1.pozyczki, bilansPaliwaM0: line(n1, 'Bilans paliwa') }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
