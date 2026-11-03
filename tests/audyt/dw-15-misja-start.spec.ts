// DW, przebieg 15 (DW.37 / DW.26 – potwierdzenie): „rok-przerwa” otwarty bez skróconych czasów zamrażania – panel „Misja
// tygodnia” i odprawa w pierwszych minutach, zanim powstanie misja bieżącego tygodnia. Narzędzie obserwacji.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { addDay, briefing, go, makeBreak, out, textOf } from './dw-pomoc'

test('DW.37 – panel misji przed pierwszym zamrożeniem', async () => {
  const RUN = 'dw-15'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  makeBreak(st.dataDir, addDay('2026-11-03', -16))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, env: { FI_FREEZE_AFTER_OPEN_MS: String(3 * 60_000), FI_FREEZE_QUIET_MS: String(60_000) } })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(3000)
    const s: Record<string, unknown> = { odprawa: (await briefing(r.page)).filter((x) => /mission|Misja/i.test(x)) }
    await go(r.page, '8', 'page-command')
    s.misja = await textOf(r.page.getByTestId('command-mission'))
    s.naglowek = await textOf(r.page.getByTestId('page-command').locator('h1').locator('..'))
    await shot(r.page, 'DW.37-misja-przed-zamrozeniem')
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})
