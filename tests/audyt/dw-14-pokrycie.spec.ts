// DW, przebieg 14 (DW.16, historia): pokrycie przekroczenia zrobione dzień wcześniej (02.11: 100 zł limitu z Dom do
// Prezenty i inne – w planie listopada limity przesunięte jak robi to „Pokryj z koperty…”, plus zapis pokrycia), dziś
// wydatek 250 zł w Prezentach (limit po pokryciu 300 zł). Odczyt „Dziś na razie”, kopert i dziennika.
// Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import { addRecords, cat, command, dwId, editJson, go, MBANK, out } from './dw-pomoc'

test('DW.16 – pokrycie z wcześniejszego dnia liczy się w ocenie', async () => {
  const RUN = 'dw-14'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  editJson(join(st.dataDir, 'months', '2026-11.json'), (m) => {
    m.envelopes[cat(900)] = 30000
    m.envelopes[cat(200)] = 20000
    m.covers = [...(m.covers ?? []), { id: dwId(), from: cat(200), to: cat(900), amount: 10000, at: '2026-11-02T10:00:00.000Z' }]
  })
  addRecords(st.dataDir, 'transactions', [{ date: '2026-11-03', time: '09:30', accountId: MBANK, kind: 'expense', amount: -25000, categoryId: cat(901), counterparty: 'Prezent DW', impulse: 'plan', logNote: 'urodziny', createdAt: new Date().toISOString() }])
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(4000)
    const env = r.page.locator('section[data-panel^="bridge:Koperty"]').first()
    const s: Record<string, unknown> = { koperty: (await env.innerText()).replace(/\s+/g, ' ') }
    await go(r.page, '8', 'page-command')
    const c = await command(r.page)
    s.dzis = c.today
    s.dziennik = (c.log as string[]).slice(0, 5)
    await shot(r.page, 'DW.16-pokrycie-wczesniej')
    await go(r.page, '4', 'page-month')
    const m = await text(r.page, '[data-testid="page-month"]')
    s.planPokrycia = m.split('\n').filter((l) => /pokry|Pokry/i.test(l)).slice(0, 6)
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})
