/**
 * DM.12 – „Cofnij” of one change of „Rozliczenia od” (one toast on the screen): state „rok+dm-j” (as dm-j.spec.ts).
 * „od dziś” → 01.09.2026 (the point's state), the toasts gone (9 s), then 01.10.2026 and at once its „Cofnij”.
 */
import { test, type Page } from '@playwright/test'
import { DMM, addRecords, buy, pay, log, members, mostek, przychody, rd, runRok, snap, toasts, typeIn } from './dm-pomoc'

const S = 'rok+dm-j'

async function household(page: Page): Promise<void> {
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('settings-tab-household').click()
  await page.waitForTimeout(600)
}

async function since(page: Page): Promise<string> {
  await household(page)
  return (await page.getByTestId('household-since').count()) ? await page.getByTestId('household-since').inputValue() : (await page.getByTestId('household-since-row').innerText()).replace(/\s+/g, ' ')
}

async function babciaStart(page: Page): Promise<string> {
  await household(page)
  const r = page.locator('[data-testid="member-row"][data-name="Babcia"]')
  const kind = await r.locator('[role="radiogroup"][aria-label="Saldo na start rozliczeń"] [aria-checked="true"]').innerText().catch(() => '?')
  return `${kind} ${await r.getByTestId('member-opening').inputValue()}`
}

test('DM.12 – Cofnij', async () => {
  test.setTimeout(15 * 60_000)
  const run = 'dm-j2'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [
      { id: DMM.babcia, name: 'Babcia', inflow: 'ask' },
      { id: DMM.tata, name: 'Tata', inflow: 'income' }
    ])
    addRecords(d, 'transactions', [
      buy({ date: '2026-08-10', amount: 120, member: DMM.babcia, counterparty: 'Apteka Babci' }),
      buy({ date: '2026-08-20', amount: 180, member: DMM.babcia, counterparty: 'Sklep Babci' }),
      pay({ date: '2026-08-25', amount: 200, member: DMM.tata, counterparty: 'Tata przelew sierpień', kind: 'repay', advance: false }),
      pay({ date: '2026-09-15', amount: 100, member: DMM.tata, counterparty: 'Tata przelew wrzesień', kind: 'repay', advance: false }),
      pay({ date: '2026-10-29', amount: 150, member: DMM.tata, counterparty: 'Tata przelew październik', kind: 'repay', advance: false })
    ])
  })
  try {
    await household(page)
    await page.getByTestId('household-since-today').click()
    await page.waitForTimeout(9000)
    await typeIn(page, 'household-since', '01.09.2026')
    await page.waitForTimeout(9000)
    const m1 = await mostek(page)
    const i1 = await przychody(page)
    const s1 = await since(page)
    const b1 = await babciaStart(page)
    log(run, 'DM.12b od 01.09', s1, '| Babcia na start', b1, '|', m1.domownicy, '|', m1.depozyt, '|', m1.oslony, '|', i1, '| toasty', await toasts(page))
    await rd(page, 'DM.12', S, { etap: 'drugi przebieg: od 01.09.2026', od: s1, babciaNaStart: b1, mostek: m1.domownicy, depozyt: m1.depozyt, oslony: m1.oslony, przychody: i1 }, dataDir)

    await household(page)
    await typeIn(page, 'household-since', '01.10.2026')
    await page.waitForTimeout(400)
    const t = await toasts(page)
    await snap(page, 'DM.12-cofnij-toast')
    const undo = page.getByRole('status').getByRole('button', { name: 'Cofnij' })
    log(run, 'DM.12b toasty przed Cofnij', t, '| przyciski', await undo.count())
    const m2 = await mostek(page).catch(() => null)
    log(run, 'DM.12b od 01.10 (przed Cofnij)', m2?.domownicy, '|', m2?.depozyt)
    await household(page)
    if (await undo.count()) await undo.last().click()
    await page.waitForTimeout(1200)
    const s3 = await since(page)
    const b3 = await babciaStart(page)
    const m3 = await mostek(page)
    const i3 = await przychody(page)
    log(run, 'DM.12b po Cofnij', s3, '| Babcia na start', b3, '|', m3.domownicy, '|', m3.depozyt, '|', m3.oslony, '|', i3)
    await household(page)
    await snap(page, 'DM.12-po-cofnij')
    await rd(page, 'DM.12', S, { etap: 'drugi przebieg: 01.10.2026 i od razu „Cofnij”', komunikat: t.join(' || '), od: s3, babciaNaStart: b3, mostek: m3.domownicy, depozyt: m3.depozyt, oslony: m3.oslony, przychody: i3 }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
