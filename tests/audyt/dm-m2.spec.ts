/**
 * DM.15 – Babcia's opening balance dated by her oldest purchase 40 days ago: state „rok+dm-m2” – the persona's Anna
 * renamed „A. Testowa”; „Anna” bought 70,00 zł 29.09.2026 and 40,00 zł 01.10.2026; „Tata” 90,00 zł 14.10.2026;
 * „Babcia” (przekazuje przez: Tata) 300,00 zł 24.09.2026 „Apteka Babci 24.09” (mBank). In the window: Ustawienia →
 * Domownicy → „od dziś”, then „Rozliczenia od” 01.10.2026 – Babcia's 300 zł becomes her opening balance (dated 24.09).
 */
import { test } from '@playwright/test'
import { DMM, addRecords, buy, log, members, odprawa, radar, rd, runRok, snap, typeIn, ustawieniaDomownicy } from './dm-pomoc'

const S = 'rok+dm-m2'

test('DM.15 – saldo na start sprzed 40 dni', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'dm-m2'
  const { page, app, dataDir } = await runRok(run, (d) => {
    members(d, [
      { id: DMM.anna, name: 'Anna', inflow: 'advance' },
      { id: DMM.tata, name: 'Tata', inflow: 'advance' },
      { id: DMM.babcia, name: 'Babcia', inflow: 'ask', via: DMM.tata }
    ])
    addRecords(d, 'transactions', [
      buy({ date: '2026-09-29', amount: 70, member: DMM.anna, counterparty: 'Sklep Anny 29.09' }),
      buy({ date: '2026-10-01', amount: 40, member: DMM.anna, counterparty: 'Sklep Anny 01.10' }),
      buy({ date: '2026-10-14', amount: 90, member: DMM.tata, counterparty: 'Sklep Taty 14.10' }),
      buy({ date: '2026-09-24', amount: 300, member: DMM.babcia, counterparty: 'Apteka Babci 24.09' })
    ])
  })
  try {
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-household').click()
    await page.waitForTimeout(600)
    await page.getByTestId('household-since-today').click()
    await page.waitForTimeout(1500)
    await typeIn(page, 'household-since', '01.10.2026')
    await page.waitForTimeout(1500)
    const u = await ustawieniaDomownicy(page)
    const o = (await odprawa(page)).filter((x) => /^(Anna|Babcia|Tata|Marek):/.test(x))
    const r = await radar(page)
    await snap(page, 'DM.15-babcia-40-dni')
    log(run, 'DM.15c', u.osoby, '|', o, '|', r.domownicy)
    await rd(page, 'DM.15', S, { etap: 'rozliczenia od 01.10.2026, Babcia – saldo na start z 24.09', ustawienia: u.osoby, odprawa: o.join(' || '), radar: r.domownicy }, dataDir)
    void app
  } finally {
    await app.close()
  }
})
