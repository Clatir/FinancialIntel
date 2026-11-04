// LA, przebieg C1b (LA.13 uzupełnienie): stan C1, „Zapłacone” Internet Netia – energia dziś, energia miesiąca i koperty
// w chwili, gdy płatność jest zapisana (przed „Cofnij”). Narzędzie obserwacji – oceny w docs/audyt/raport/LA.md.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { bridgeState, build, go, monthAt, openContainer, out, rd, ready, recordsOf, toasts } from './la-pomoc'

test('LA przebieg C1b – „Zapłacone” bez importu: energia w chwili zapłaty (LA.13)', async () => {
  const RUN = 'la-c1b'
  const STATE = 'rok + statusy (la-c1b)'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('stan', build(st.dataDir, ['statusy']))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  try {
    await ready(page)
    const b0 = await bridgeState(page)
    const m0 = await monthAt(page, 0)
    rd('LA.13', `${STATE} – przed „Zapłacone”`, { energia: b0.energia, przydzial: m0.przydzial, koperty: m0.koperty, mostek: b0.stan }, st)
    await go(page, '5', 'page-cargo')
    await openContainer(page, 'Internet Netia')
    await page.getByTestId('container-paid').click()
    await page.waitForTimeout(800)
    const t = await toasts(page)
    await go(page, '1', 'page-bridge')
    const b1 = await bridgeState(page)
    const m1 = await monthAt(page, 0)
    await shot(page, 'LA.13-plan-po-zaplacone')
    const tx = recordsOf(st.dataDir, 'transactions').filter((x) => /NETIA/.test(x.counterparty) && x.date >= '2026-11-01').map((x) => `${x.date} ${x.amount} c=${x.containerId}`)
    rd('LA.13', `${STATE} – po „Zapłacone” Internet Netia 60 zł (przed „Cofnij”)`, { energia: b1.energia, przydzial: m1.przydzial, koperty: m1.koperty, mostek: b1.stan, operacje: JSON.stringify(tx) }, st)
    dump('C1b', { b0, m0, t, b1, m1, tx })
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
