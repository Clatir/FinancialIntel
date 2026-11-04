/**
 * DM.17 (a loan given with a schedule), DM.18 (a repayment of a loan given is no income) and DM.19 (a loan taken with
 * its installments in the cargo hold). State „rok+dm-n” – the persona „rok” (its „Pożyczka dla Tomka”, „Pożyczka od
 * rodziców”) plus, mBank:
 * - „Pożyczka dla Oli” given 1 000,00 zł 30.09.2026 (out −1 000,00), installments 350,00 on 30.10, 30.11, 30.12.2026
 *   (total 1 050,00 – 50,00 of interest), the first 4 days late;
 * - „Pożyczka dla Igi” given 500,00 zł 02.10.2026 (out −500,00), one installment 500,00 on 02.11.2026 (1 day late);
 * - „Pożyczka dla Zosi” given 300,00 zł 01.10.2026 (out −300,00), one installment 300,00 on 31.10.2026 (3 days late);
 * - „Kredyt X” taken 1 200,00 zł 30.09.2026 (in +1 200,00), installments 600,00 on 31.10 (3 days late) and 30.11.2026;
 * - „Kredyt Y” taken 600,00 zł 01.10.2026 (in +600,00), installments 300,00 on 01.11 (2 days late) and 01.12.2026;
 * - an operation „Pożyczka” +200,00 zł 02.11.2026 „Zwrot od kolegi” with no loan of Radar.
 */
import { test, type Page } from '@playwright/test'
import { ACC, addRecords, editorText, fixedId, log, mostek, openOp, przychody, radar, raport, rd, runRok, snap, toastsAfter, line, typeIn, recs, rowsOf } from './dm-pomoc'

const S = 'rok+dm-n'
const L = { ola: fixedId(401), iga: fixedId(402), zosia: fixedId(403), x: fixedId(404), y: fixedId(405) }

function prepare(d: string): void {
  const sch = (n: number, list: Array<[string, number]>) => list.map(([date, zl], i) => ({ id: fixedId(n * 10 + i), date, amount: Math.round(zl * 100) }))
  const loan = (id: string, name: string, direction: 'given' | 'taken', amount: number, date: string, schedule: Array<{ id: string; date: string; amount: number }>, counterparty: string) => ({
    id, name, direction, counterparty, amount: Math.round(amount * 100), date, accountId: ACC.mbank, schedule, closedAt: null, note: ''
  })
  addRecords(d, 'loans', [
    loan(L.ola, 'Pożyczka dla Oli', 'given', 1000, '2026-09-30', sch(50, [['2026-10-30', 350], ['2026-11-30', 350], ['2026-12-30', 350]]), 'ALEKSANDRA TESTOWA'),
    loan(L.iga, 'Pożyczka dla Igi', 'given', 500, '2026-10-02', sch(51, [['2026-11-02', 500]]), 'IGA TESTOWA'),
    loan(L.zosia, 'Pożyczka dla Zosi', 'given', 300, '2026-10-01', sch(52, [['2026-10-31', 300]]), 'ZOFIA TESTOWA'),
    loan(L.x, 'Kredyt X', 'taken', 1200, '2026-09-30', sch(53, [['2026-10-31', 600], ['2026-11-30', 600]]), 'BANK X'),
    loan(L.y, 'Kredyt Y', 'taken', 600, '2026-10-01', sch(54, [['2026-11-01', 300], ['2026-12-01', 300]]), 'BANK Y')
  ])
  const op = (date: string, amount: number, counterparty: string, loanId: string | null) => ({ date, accountId: ACC.mbank, kind: 'loan', amount: Math.round(amount * 100), counterparty, loanId })
  addRecords(d, 'transactions', [
    op('2026-09-30', -1000, 'ALEKSANDRA TESTOWA', L.ola),
    op('2026-10-02', -500, 'IGA TESTOWA', L.iga),
    op('2026-10-01', -300, 'ZOFIA TESTOWA', L.zosia),
    op('2026-09-30', 1200, 'BANK X', L.x),
    op('2026-10-01', 600, 'BANK Y', L.y),
    op('2026-11-02', 200, 'Zwrot od kolegi', null)
  ])
}

async function newLoanPanel(page: Page) {
  await page.keyboard.press('Control+7')
  await page.getByTestId('page-radar').waitFor()
  await page.waitForTimeout(600)
  return page.getByTestId('radar-new-loan')
}

async function readAll(page: Page) {
  const m = await mostek(page)
  const r = await radar(page)
  const inc = await przychody(page)
  const nov = await raport(page, '2026-11')
  return { m, r, inc, nov }
}

const loanRow = (page: Page, name: string) => page.locator(`[data-testid="loan-row"][data-name="${name}"]`)

test('DM.17, DM.18, DM.19', async () => {
  test.setTimeout(30 * 60_000)
  const run = 'dm-n'
  const { page, app, dataDir } = await runRok(run, prepare)
  try {
    // ---------------- DM.17
    const a0 = await readAll(page)
    log(run, 'DM.17 przed', a0.m.oslony, '|', a0.m.rozliczenia, '|', a0.r.pozyczki, '|', line(a0.nov, 'Koszty netto'), line(a0.nov, 'Bilans paliwa'))
    await rd(page, 'DM.17', S, { etap: 'przed', oslony: a0.m.oslony, rozliczenia: a0.m.rozliczenia, naleznosci: a0.r.naleznosci, pozyczki: a0.r.pozyczki, kosztyNettoM0: line(a0.nov, 'Koszty netto'), bilansPaliwaM0: line(a0.nov, 'Bilans paliwa'), przychody: a0.inc }, dataDir)
    let p = await newLoanPanel(page)
    await p.locator('[role="radiogroup"][aria-label="Kierunek pożyczki"]').getByRole('radio', { name: 'Pożyczam komuś' }).click()
    await p.getByTestId('loan-name').fill('Pożyczka dla Kuby')
    await p.getByTestId('loan-counterparty').fill('JAKUB TESTOWY')
    await typeIn(page, p.getByTestId('loan-amount'), '1000', 'Tab')
    log(run, 'DM.17 pole Do spłaty razem', await p.getByTestId('loan-total').count())
    await typeIn(page, p.getByTestId('loan-installments'), '3', 'Tab')
    await typeIn(page, p.locator('[aria-label="Pierwsza rata"]'), '31.12.2026', 'Tab')
    log(run, 'DM.17 formularz', (await p.innerText()).replace(/\s+/g, ' '))
    await snap(page, 'DM.17-formularz')
    const t17 = await toastsAfter(page, () => p.getByTestId('loan-save').click(), 2500)
    log(run, 'DM.17 toast', t17)
    const kuba = (await recs(dataDir, 'loans')).find((l) => l.name === 'Pożyczka dla Kuby')
    log(run, 'DM.17 plik', JSON.stringify(kuba?.schedule), kuba?.amount)
    const a1 = await readAll(page)
    const ops17 = await rowsOf(page, 'Kuby')
    log(run, 'DM.17 po', a1.m.oslony, '|', a1.m.rozliczenia, '|', a1.r.pozyczki, '|', line(a1.nov, 'Koszty netto'), line(a1.nov, 'Bilans paliwa'), '|', ops17)
    log(run, 'DM.17 na radarze', a1.r.naRadarze.split('Kuby').length - 1, a1.r.naRadarze.match(/[^|]{0,80}Kuby[^|]{0,60}/g))
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(600)
    await snap(page, 'DM.17-radar')
    await rd(page, 'DM.17', S, { etap: 'po zapisie „Pożyczka dla Kuby”', toast: t17.join(' || '), raty: JSON.stringify(kuba?.schedule ?? null), oslony: a1.m.oslony, rozliczenia: a1.m.rozliczenia, naleznosci: a1.r.naleznosci, pozyczki: a1.r.pozyczki, kosztyNettoM0: line(a1.nov, 'Koszty netto'), bilansPaliwaM0: line(a1.nov, 'Bilans paliwa'), przychody: a1.inc, operacje: ops17.join(' || ') }, dataDir)

    // ---------------- DM.18
    const ed0 = await (async () => {
      await openOp(page, 'Zwrot od kolegi')
      return editorText(page)
    })()
    log(run, 'DM.18 edytor wpływu bez pożyczki (3 otwarte udzielone + Kuba)', ed0)
    await snap(page, 'DM.18-edytor-bez-pozyczki')
    const b0 = await readAll(page)
    log(run, 'DM.18 przed', b0.m.oslony, '|', b0.r.pozyczki, '|', b0.r.naRadarze.match(/[^|]{0,60}(Oli|Igi|Zosi|Kredyt)[^|]{0,60}/g), '|', line(b0.nov, 'Bilans paliwa'))
    await rd(page, 'DM.18', S, { etap: 'przed', oslony: b0.m.oslony, rozliczenia: b0.m.rozliczenia, pozyczki: b0.r.pozyczki, naleznosci: b0.r.naleznosci, naRadarze: b0.r.naRadarze.slice(0, 1500), bilansPaliwaM0: line(b0.nov, 'Bilans paliwa'), przychody: b0.inc }, dataDir)
    for (let i = 1; i <= 3; i++) {
      await page.keyboard.press('Control+7')
      await page.waitForTimeout(600)
      const row = loanRow(page, 'Pożyczka dla Oli')
      await row.getByTestId('loan-pay-open').click()
      await page.waitForTimeout(300)
      const amt = await row.getByTestId('loan-pay-amount').inputValue()
      const t = await toastsAfter(page, () => row.getByTestId('loan-pay').click(), 2000)
      const b = await readAll(page)
      log(run, `DM.18 spłata ${i}`, amt, t, '|', b.m.oslony, '|', b.r.pozyczki, '|', line(b.nov, 'Bilans paliwa'), '|', b.m.rozliczenia)
      await rd(page, 'DM.18', S, { etap: `po spłacie ${i} („spłata otrzymana”, kwota ${amt})`, toast: t.join(' || '), oslony: b.m.oslony, rozliczenia: b.m.rozliczenia, pozyczki: b.r.pozyczki, naleznosci: b.r.naleznosci, bilansPaliwaM0: line(b.nov, 'Bilans paliwa'), przychody: b.inc }, dataDir)
    }
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(600)
    await snap(page, 'DM.18-radar')
    // the hint with one given loan open only: Igi, Zosia, Tomek closed (Ola paid)
    for (const name of ['Pożyczka dla Zosi', 'Pożyczka dla Tomka', 'Pożyczka dla Kuby']) {
      if (await loanRow(page, name).count()) {
        await loanRow(page, name).getByTestId('loan-close').click()
        await page.waitForTimeout(500)
      }
    }
    await openOp(page, 'Zwrot od kolegi')
    const ed1 = await editorText(page)
    log(run, 'DM.18 edytor wpływu bez pożyczki (jedna otwarta udzielona)', ed1)
    await snap(page, 'DM.18-edytor-jedna')

    // ---------------- DM.19
    const c0 = await readAll(page)
    await page.keyboard.press('Control+5')
    await page.waitForTimeout(800)
    const cargo0 = (await page.getByTestId('cargo-load-line').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    log(run, 'DM.19 przed', c0.m.oslony, '|', c0.m.kadlub, '|', c0.m.dlug, '|', c0.m.zasieg, '|', c0.m.masa, '|', c0.r.dlug, '|', cargo0.slice(0, 300))
    await rd(page, 'DM.19', S, { etap: 'przed', oslony: c0.m.oslony, kadlub: c0.m.kadlub, dlug: c0.m.dlug, radarDlug: c0.r.dlug, zasieg: c0.m.zasieg, masa: c0.m.masa, stan: c0.m.stan, ladownia: cargo0.slice(0, 600), bilansPaliwaM0: line(c0.nov, 'Bilans paliwa'), przychody: c0.inc }, dataDir)
    p = await newLoanPanel(page)
    await p.locator('[role="radiogroup"][aria-label="Kierunek pożyczki"]').getByRole('radio', { name: 'Biorę pożyczkę' }).click()
    await page.waitForTimeout(300)
    await p.getByTestId('loan-name').fill('Pożyczka od Ewy')
    await p.getByTestId('loan-counterparty').fill('EWA TESTOWA')
    await typeIn(page, p.getByTestId('loan-amount'), '3000', 'Tab')
    await typeIn(page, p.getByTestId('loan-total'), '2900', 'Tab')
    await typeIn(page, p.getByTestId('loan-installments'), '6', 'Tab')
    log(run, 'DM.19 przełącznik kontenera', await p.getByTestId('loan-with-container').evaluate((e) => (e.querySelector('input') as HTMLInputElement | null)?.checked ?? e.getAttribute('aria-checked')))
    const t2900 = await toastsAfter(page, () => p.getByTestId('loan-save').click(), 2500)
    log(run, 'DM.19 2900', t2900, '| pliki', (await recs(dataDir, 'loans')).filter((l) => l.name === 'Pożyczka od Ewy').length)
    await snap(page, 'DM.19-2900')
    await typeIn(page, p.getByTestId('loan-total'), '3150', 'Tab')
    log(run, 'DM.19 formularz', (await p.innerText()).replace(/\s+/g, ' '))
    const t19 = await toastsAfter(page, () => p.getByTestId('loan-save').click(), 2500)
    const ewa = (await recs(dataDir, 'loans')).find((l) => l.name === 'Pożyczka od Ewy')
    log(run, 'DM.19 toast', t19, '| plik', JSON.stringify(ewa?.schedule), ewa?.amount)
    const c1 = await readAll(page)
    await page.keyboard.press('Control+5')
    await page.waitForTimeout(800)
    const cont = (await page.locator('[data-testid="cargo-row"][data-name="Rata: Pożyczka od Ewy"]').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    const cargo1 = (await page.getByTestId('cargo-load-line').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    await snap(page, 'DM.19-ladownia')
    const contRec = (await recs(dataDir, 'containers')).find((c) => c.name === 'Rata: Pożyczka od Ewy')
    log(run, 'DM.19 kontener', cont, '| plik', JSON.stringify(contRec && { amount: contRec.amount, from: contRec.from, until: contRec.until, dueDay: contRec.dueDay, type: contRec.type }))
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(500)
    await page.getByTestId('state-range-why').click()
    await page.waitForTimeout(300)
    const rangeWhy = (await page.getByTestId('state-range-lines').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    await snap(page, 'DM.19-mostek')
    log(run, 'DM.19 po', c1.m.oslony, '|', c1.m.kadlub, '|', c1.m.dlug, '|', c1.m.zasieg, '|', c1.m.masa, '|', c1.r.dlug, '|', rangeWhy, '|', line(c1.nov, 'Bilans paliwa'), '|', c1.inc)
    await rd(page, 'DM.19', S, { etap: 'po zapisie „Pożyczka od Ewy” 3 000 / 3 150, 6 rat, kontener', toast: t19.join(' || '), raty: JSON.stringify(ewa?.schedule ?? null), oslony: c1.m.oslony, kadlub: c1.m.kadlub, dlug: c1.m.dlug, radarDlug: c1.r.dlug, zasieg: c1.m.zasieg, zasiegSkad: rangeWhy, masa: c1.m.masa, kontener: cont, ladownia: cargo1.slice(0, 600), stan: c1.m.stan, bilansPaliwaM0: line(c1.nov, 'Bilans paliwa'), przychody: c1.inc }, dataDir)

    // overdue installments of loans taken (Kredyt X 3 days, Kredyt Y 2 days) and given (Zosia 3 days – closed above)
    log(run, 'DM.19 pożyczki na Radarze', c1.r.pozyczki, '|', c1.r.naRadarze.match(/[^|]{0,60}(Kredyt|Ewy|Igi)[^|]{0,60}/g))
    // close → „Cofnij”
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(600)
    const tClose = await toastsAfter(page, () => loanRow(page, 'Pożyczka od Ewy').getByTestId('loan-close').click(), 600)
    const c2 = await mostek(page)
    await page.keyboard.press('Control+5')
    await page.waitForTimeout(600)
    const contClosed = (await page.locator('[data-testid="cargo-row"][data-name="Rata: Pożyczka od Ewy"]').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    const cargo2 = (await page.getByTestId('cargo-load-line').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    let undone = 'brak przycisku'
    if (await page.getByRole('status').getByRole('button', { name: 'Cofnij' }).count()) {
      await page.getByRole('status').getByRole('button', { name: 'Cofnij' }).first().click()
      undone = 'kliknięte'
    }
    await page.waitForTimeout(800)
    const c3 = await mostek(page)
    await page.keyboard.press('Control+5')
    await page.waitForTimeout(600)
    const contBack = (await page.locator('[data-testid="cargo-row"][data-name="Rata: Pożyczka od Ewy"]').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    log(run, 'DM.19 zamknij', tClose, '| mostek', c2.dlug, c2.zasieg, c2.masa, '| kontener', contClosed, '| linia', cargo2.slice(0, 200), '| Cofnij', undone, '| po', c3.dlug, c3.zasieg, c3.masa, '| kontener', contBack)
    await rd(page, 'DM.19', S, { etap: 'zamknij → Cofnij', toast: tClose.join(' || '), dlugZamk: c2.dlug, zasiegZamk: c2.zasieg, masaZamk: c2.masa, kontenerZamk: contClosed, cofnij: undone, dlugPo: c3.dlug, zasiegPo: c3.zasieg, masaPo: c3.masa, kontenerPo: contBack }, dataDir)
    // delete a loan with operations
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(600)
    const tDel = await toastsAfter(page, () => loanRow(page, 'Pożyczka od Ewy').getByRole('button', { name: 'usuń' }).click(), 2000)
    log(run, 'DM.19 usuń', tDel, '| pliki', (await recs(dataDir, 'loans')).filter((l) => l.name === 'Pożyczka od Ewy').length)
    await snap(page, 'DM.19-usun')
    void app
  } finally {
    await app.close()
  }
})
