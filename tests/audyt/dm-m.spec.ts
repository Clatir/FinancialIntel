/**
 * DM.15 – the reminder after 30 days (odprawa, Radar) – and the part of DM.16 the lab can check on data from the past
 * (the notification's text and amount, once per member and oldest purchase, not again after a restart, switched off).
 * State „rok+dm-m”: the persona's Anna renamed „A. Testowa”; „Anna” (reszta: zaliczka) bought 70,00 zł 29.09.2026 „Sklep
 * Anny 29.09” (35 days) and 40,00 zł 01.10.2026 „Sklep Anny 01.10” (33 days); „Tata” (reszta: zaliczka) 90,00 zł
 * 14.10.2026 „Sklep Taty 14.10” (20 days); „Babcia” (przekazuje przez: Tata) – opening balance „ma oddać 300,00 zł” dated
 * 24.09.2026 (40 days). mBank. Before the restart (DM.16) Tata's purchase 45,00 zł 20.09.2026 „Sklep Taty 20.09” (44 days)
 * is added with the notification „Domownik nie oddał…” switched off.
 */
import { test, type Page } from '@playwright/test'
import { recorded } from './lab'
import { CAT, DMM, ROK, addRecords, buy, editorText, fill, financer, log, members, newOp, odprawa, payer, radar, rd, restart, runRok, snap } from './dm-pomoc'

const S = 'rok+dm-m'
const house = (xs: string[]) => xs.filter((x) => /^(Anna|Babcia|Tata|Marek|Kasia|A\. Testowa):/.test(x))
const houseToasts = async (app: Parameters<typeof recorded>[0]) => (await recorded(app)).toasts.filter((t) => t.title === 'Rozliczenie z domownikiem').map((t) => `${t.body} @${t.at}`)

async function readAll(page: Page) {
  const o = house(await odprawa(page))
  const r = await radar(page)
  return { o, r }
}

test('DM.15 i DM.16 (część)', async () => {
  test.setTimeout(30 * 60_000)
  const run = 'dm-m'
  let { page, app, dataDir, ictjDir } = await runRok(run, (d) => {
    members(d, [
      { id: DMM.anna, name: 'Anna', inflow: 'advance' },
      { id: DMM.tata, name: 'Tata', inflow: 'advance' },
      { id: DMM.babcia, name: 'Babcia', inflow: 'ask', via: DMM.tata, owed: 30000, openingSince: '2026-09-24' }
    ])
    addRecords(d, 'transactions', [
      buy({ date: '2026-09-29', amount: 70, member: DMM.anna, counterparty: 'Sklep Anny 29.09' }),
      buy({ date: '2026-10-01', amount: 40, member: DMM.anna, counterparty: 'Sklep Anny 01.10' }),
      buy({ date: '2026-10-14', amount: 90, member: DMM.tata, counterparty: 'Sklep Taty 14.10' })
    ])
  })
  try {
    await page.waitForTimeout(8000)
    const n0 = await houseToasts(app)
    log(run, 'DM.16 powiadomienia po starcie', n0)
    const a0 = await readAll(page)
    log(run, 'DM.15 przed', a0.o, '|', a0.r.domownicy)
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(500)
    await snap(page, 'DM.15-odprawa')
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(700)
    await snap(page, 'DM.15-radar')
    await rd(page, 'DM.15', S, { etap: 'przed', odprawa: a0.o.join(' || '), radar: a0.r.domownicy, powiadomienia: n0.join(' || ') }, dataDir, ictjDir)

    // Anna pays her oldest purchase (70 zł)
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '70', counterparty: 'Anna przelew 70' })
    await payer(page, DMM.anna)
    await page.waitForTimeout(700)
    log(run, 'DM.15 wpłata edytor', await editorText(page))
    const a1 = await readAll(page)
    log(run, 'DM.15 po spłacie najstarszego', a1.o, '|', a1.r.domownicy)
    await rd(page, 'DM.15', S, { etap: 'po spłacie najstarszego zakupu Anny (70 zł z 29.09)', odprawa: a1.o.join(' || '), radar: a1.r.domownicy }, dataDir, ictjDir)

    // a new purchase of Anna today
    await newOp(page, 'Wydatek')
    await fill(page, { amount: '25', counterparty: 'Sklep Anny dziś', categoryId: CAT.groceries })
    await financer(page, `pay:${DMM.anna}`)
    await page.waitForTimeout(700)
    const a2 = await readAll(page)
    log(run, 'DM.15 po nowym zakupie', a2.o, '|', a2.r.domownicy)
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(700)
    await snap(page, 'DM.15-radar-po')
    const n1 = await houseToasts(app)
    log(run, 'DM.16 powiadomienia w trakcie', n1)
    await rd(page, 'DM.15', S, { etap: 'po nowym zakupie Anny 25 zł (dziś)', odprawa: a2.o.join(' || '), radar: a2.r.domownicy, powiadomienia: n1.join(' || ') }, dataDir, ictjDir)

    // DM.16: switch the notification off (Ustawienia → Powiadomienia i dźwięki)
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-notify').click()
    await page.waitForTimeout(500)
    log(run, 'DM.16 przełącznik', await page.getByTestId('notify-house').innerText().catch(() => '?'))
    await page.getByTestId('notify-house').click()
    await page.waitForTimeout(800)
    await snap(page, 'DM.16-wylaczone')
    await app.close()

    // a new case while off: Tata's purchase of 20.09 (44 days)
    addRecords(dataDir, 'transactions', [buy({ date: '2026-09-20', amount: 45, member: DMM.tata, counterparty: 'Sklep Taty 20.09' })])
    ;({ page, app } = await restart(run, dataDir, ictjDir))
    await page.waitForTimeout(8000)
    const n2 = await houseToasts(app)
    const r2 = await radar(page)
    log(run, 'DM.16 po restarcie (wyłączone)', n2, '|', r2.domownicy)
    // on again: the new case only
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-notify').click()
    await page.waitForTimeout(500)
    await page.getByTestId('notify-house').click()
    await page.keyboard.press('Control+1')
    // the notifier looks every minute (and at a change of the data): up to 75 s
    let n3: string[] = []
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(3000)
      n3 = await houseToasts(app)
      if (n3.length > n2.length) break
    }
    log(run, 'DM.16 po włączeniu', n3)
    await app.close()
    ;({ page, app } = await restart(run, dataDir, ictjDir))
    await page.waitForTimeout(8000)
    const n4 = await houseToasts(app)
    log(run, 'DM.16 po kolejnym restarcie', n4)
    await rd(page, 'DM.16', S, { etap: 'powiadomienia: start, wyłączone + restart, włączone, restart', start: n0.join(' || '), wylaczone: n2.join(' || '), wlaczone: n3.join(' || '), restart: n4.join(' || '), radar: r2.domownicy }, dataDir, ictjDir)
    void ROK
  } finally {
    await app.close()
  }
})
