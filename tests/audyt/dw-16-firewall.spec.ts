// DW, przebieg 16 (DW.12, przypadek drugi): pełne warstwy – cel osłon 1 pensja, kadłub 3 miesiące (fi.json) – i dziś
// dopłata 500 zł do XTB (wpis dopisany do folderu). Odczyt stanu okrętu, odprawy i „Dziś na razie”. Narzędzie obserwacji.
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import { addRecords, briefing, editSettings, MBANK, out, todayLine } from './dw-pomoc'

test('DW.12 – dopłata z wolnego przy pełnych warstwach', async () => {
  const RUN = 'dw-16'
  const st = useState('rok', RUN)
  editSettings(st.dataDir, (s) => {
    s.layers.shieldSalaries = 1
    s.layers.hullMonths = 3
  })
  addRecords(st.dataDir, 'transactions', [{ date: '2026-11-03', time: '09:00', accountId: MBANK, kind: 'trading', amount: -50000, counterparty: 'XTB S.A.', note: 'dopłata DW', createdAt: new Date().toISOString() }])
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(4000)
    const t = await text(r.page, '[data-testid="page-bridge"]')
    const s: Record<string, unknown> = { stan: t.slice(t.indexOf('STAN OKRĘTU'), t.indexOf('STAN OKRĘTU') + 500).replace(/\s+/g, ' ') }
    s.odprawa = (await briefing(r.page)).slice(0, 3)
    await shot(r.page, 'DW.12-pelne-warstwy')
    s.dzis = await todayLine(r.page)
    out(RUN)('kroki', s)
  } finally {
    await r.app.close()
  }
})

