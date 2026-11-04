// LA, przebieg B3 (LA.9 – brzeg): stan B + płatność OC samochodu 1 300,00 zł 02.11.2026 (wpisana, połączona z kontenerem),
// zbiornik 1 240,00 zł – brak 60,00 zł w bieżącym miesiącu (odprawa pokazuje alarmy tego miesiąca). Narzędzie obserwacji.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { briefing, bridgeState, build, cargoScreen, CAT, go, monthAt, out, rd, ready, writeTx } from './la-pomoc'

test('LA przebieg B3 – płatność ponad zbiornik w bieżącym miesiącu (LA.9)', async () => {
  const RUN = 'la-b3'
  const STATE = 'rok + opłaty okresowe + OC samochodu 1 300,00 zł 02.11.2026 (la-b3)'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const log = build(st.dataDir, ['okresowe'])
  writeTx(st.dataDir, { date: '2026-11-02', amount: 130000, counterparty: 'PZU SA', title: 'OC POJAZDU', categoryId: CAT.ubezpieczenie, containerId: '01KAZ400000000000000000007' })
  log.push('OC samochodu: płatność 1 300,00 zł 2026-11-02 wpisana ręcznie, połączona z kontenerem (zbiornik 1 240,00 zł)')
  dump('stan', log)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  try {
    await ready(page)
    const b = await bridgeState(page)
    const o = await briefing(page)
    await shot(page, 'LA.9-mostek-brak')
    await go(page, '5', 'page-cargo')
    const c = await cargoScreen(page)
    await shot(page, 'LA.9-odkladki-brak')
    const m = await monthAt(page, 0)
    const m1 = await monthAt(page, 1)
    await shot(page, 'LA.9-plan-M+1')
    dump('B3', { b, o, c, m, m1 })
    rd('LA.9', STATE, { energia: b.energia, mostek: b.stan, odprawa: o.map((x) => `${x.kind}: ${x.text}`), odkladki: c.odkladki, przydzial: m.przydzial, podzialM0: m.podzial, podzialM1: m1.podzial }, st)
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
