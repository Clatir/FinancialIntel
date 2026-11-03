// DO, przebieg 0 (persona „rok” z folderem ICTTJ): rozpoznanie – Mostek (Stan okrętu, Dokowanie, odprawa), okna
// wszystkich dostaw (zamykane Esc), Mapa gwiezdna, Ustawienia → ICTTJ. Niczego nie zapisuje. Granica ICTTJ: sumy przed
// start() i po zamknięciu.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { Boundary, Log, briefing, dialogState, dockPanel, go, mainLog, settingsTab, shipClass, shipState, starmap } from './do-pomoc'

const RUN = 'do-0'

test('DO przebieg 0 – rozpoznanie stanu rok', async () => {
  test.setTimeout(15 * 60_000)
  const st = useState('rok', RUN)
  const log = new Log(RUN)
  const b = new Boundary(RUN, st.ictjDir!)
  const { app, page, errors, userData } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    await log.step('mostek', async () => {
      log.obj('stan', await shipState(page))
      log.obj('klasa', await shipClass(page))
      log.obj('dokowanie', await dockPanel(page))
      log.obj('odprawa', await briefing(page))
      await shot(page, 'DO.0-mostek')
    })
    await log.step('pominiete', async () => {
      const s = page.getByTestId('bridge-docking').locator('summary')
      if (await s.count()) {
        await s.click()
        await page.waitForTimeout(400)
      }
      log.obj('dokowanie-rozwiniete', await dockPanel(page))
    })
    const rows = await page.locator('[data-testid="docking-row"]').count()
    for (let i = 0; i < rows; i++) {
      await log.step(`okno ${i}`, async () => {
        await go(page, '1', 'page-bridge')
        await page.locator('[data-testid="docking-row"]').nth(i).click()
        await page.getByTestId('docking-dialog').waitFor({ timeout: 10_000 })
        await page.waitForTimeout(600)
        log.obj(`okno ${i}`, await dialogState(page))
        await shot(page, `DO.0-okno-${i}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
      })
    }
    await log.step('mapa', async () => log.obj('mapa', await starmap(page)))
    await log.step('ustawienia ictj', async () => {
      await settingsTab(page, 'ictj')
      log.obj('ictj', (await page.locator('main').innerText()).replace(/\n+/g, ' | '))
      await shot(page, 'DO.0-ustawienia-ictj')
    })
    log.obj('bledy-okna', errors)
  } finally {
    await app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    log.obj('main.log ICTTJ', mainLog(userData).split(/\r?\n/).filter((l) => /ictj|ICTTJ/i.test(l)).slice(-30).join('\n'))
    log.obj('granica', b.end('rozpoznanie'))
  }
})
