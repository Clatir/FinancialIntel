// DW, przebieg 18 (DW.29 – „Dzień bez wydatków”): misja W45 podmieniona na „nospend”; dzisiejsza Mokka usunięta;
// wieczorny raport (godzina przypomnienia 00:00 na tym komputerze) → „Dziś bez wydatków” → „Na razie …”. Narzędzie obserwacji.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState } from './lab'
import { deleteOpen, editJson, go, goOps, openOp, out, textOf } from './dw-pomoc'

test('DW.29 – „Dziś bez wydatków” a misja', async () => {
  const RUN = 'dw-18'
  const st = useState('rok', RUN)
  editJson(join(st.dataDir, 'game', '2026-11.json'), (g) => {
    g.missions = g.missions.map((m: { week: string }) => (m.week === '2026-W45' ? { ...m, template: 'nospend', params: {} } : m))
  })
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  const status = async (p: Page) => {
    await go(p, '8', 'page-command')
    return (await textOf(p.getByTestId('command-mission-status'))).replace(/\s+/g, ' ')
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    const s: Record<string, unknown> = { przed: await status(page) }
    await goOps(page)
    await openOp(page, 'Mokka', /03\.11/)
    s.usuniecie = await deleteOpen(page)
    s.poUsunieciu = await status(page)
    await page.evaluate(() => (globalThis as unknown as { fi: { setMachinePrefs(p: unknown): Promise<unknown> } }).fi.setMachinePrefs({ notify: { eveningTime: '00:00' } }))
    await goOps(page)
    await page.waitForTimeout(800)
    s.raport = await textOf(page.getByTestId('evening-report'))
    if (await page.getByTestId('evening-nospend').count()) {
      await page.getByTestId('evening-nospend').click()
      await page.waitForTimeout(1000)
    }
    if (!(await page.getByTestId('evening-nospend').count())) {
      // The tray's „Dziś bez wydatków” (menu zasobnika) – the same action as the evening report's button.
      await r.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().includes('quick='))!.webContents.send('fi:notificationClick', 'evening:nospend'))
      await page.waitForTimeout(1500)
      s.zZasobnika = true
    }
    s.noSpendWPliku = JSON.parse(readFileSync(join(st.dataDir, 'fi.json'), 'utf8')).settings.game.noSpend
    s.poPotwierdzeniu = await status(page)
    await shot(page, 'DW.29-dzis-bez-wydatkow')
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})
