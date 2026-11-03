/**
 * DM.19 – „zamknij” → „Cofnij” at once (the toast lasts 6 s) and „usuń” of a loan with operations: state „rok” (the
 * persona's loans); „Pożyczka od Ewy” made in the window as in dm-n (3 000 / 3 150, 6 rat, kontener w Ładowni).
 */
import { test, type Page } from '@playwright/test'
import { log, mostek, rd, recs, runRok, snap, toastsAfter, typeIn } from './dm-pomoc'

const S = 'rok+dm-n2'
const row = (page: Page) => page.locator('[data-testid="loan-row"][data-name="Pożyczka od Ewy"]')

async function cargoRow(page: Page): Promise<string> {
  await page.keyboard.press('Control+5')
  await page.waitForTimeout(700)
  return (await page.locator('[data-testid="cargo-row"][data-name="Rata: Pożyczka od Ewy"]').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
}

test('DM.19 – zamknij, Cofnij, usuń', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'dm-n2'
  const { page, app, dataDir } = await runRok(run)
  try {
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    const p = page.getByTestId('radar-new-loan')
    await p.locator('[role="radiogroup"][aria-label="Kierunek pożyczki"]').getByRole('radio', { name: 'Biorę pożyczkę' }).click()
    await p.getByTestId('loan-name').fill('Pożyczka od Ewy')
    await p.getByTestId('loan-counterparty').fill('EWA TESTOWA')
    await typeIn(page, p.getByTestId('loan-amount'), '3000', 'Tab')
    await typeIn(page, p.getByTestId('loan-total'), '3150', 'Tab')
    await typeIn(page, p.getByTestId('loan-installments'), '6', 'Tab')
    log(run, 'DM.19b zapis', await toastsAfter(page, () => p.getByTestId('loan-save').click(), 1500))
    const m0 = await mostek(page)
    const c0 = await cargoRow(page)
    log(run, 'DM.19b po zapisie', m0.dlug, m0.zasieg, '| kontener', c0)
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    const t = await toastsAfter(page, () => row(page).getByTestId('loan-close').click(), 500)
    const undo = page.getByRole('status').getByRole('button', { name: 'Cofnij' })
    const shown = await undo.count()
    await snap(page, 'DM.19-zamknij')
    if (shown) await undo.first().click()
    await page.waitForTimeout(1200)
    const m1 = await mostek(page)
    const c1 = await cargoRow(page)
    const loan = (await recs(dataDir, 'loans')).find((l) => l.name === 'Pożyczka od Ewy')
    const cont = (await recs(dataDir, 'containers')).find((c) => c.name === 'Rata: Pożyczka od Ewy')
    log(run, 'DM.19b zamknij → Cofnij', t, '| przycisk', shown, '| po', m1.dlug, m1.zasieg, '| kontener', c1, '| plik', loan?.closedAt, cont?.archived)
    await rd(page, 'DM.19', S, { etap: 'zamknij → od razu Cofnij', toast: t.join(' || '), dlug: m1.dlug, zasieg: m1.zasieg, masa: m1.masa, kontener: c1 }, dataDir)
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    const tDel = await toastsAfter(page, () => row(page).getByRole('button', { name: 'usuń' }).click(), 2000)
    log(run, 'DM.19b usuń', tDel, '| pliki', (await recs(dataDir, 'loans')).filter((l) => l.name === 'Pożyczka od Ewy').length)
    await snap(page, 'DM.19-usun')
    void app
  } finally {
    await app.close()
  }
})
