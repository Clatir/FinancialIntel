// DO, przebieg do-10: DO.21 – folder ICTTJ znika i wraca. W do-7 zmiana nazwy przy otwartej aplikacji była niemożliwa
// (EPERM – aplikacja obserwuje folder), więc: wybór folderu w Ustawieniach, zamknięcie, zmiana nazwy kopii ICTTJ,
// start (folder niedostępny: Mostek, odprawa, Ustawienia, dokowania w folderze FI), przywrócenie nazwy przy otwartej
// aplikacji (czy czyta sama). DO.25 – akcja „Ustawienia” w komunikacie „Nie znaleziono ICT Trade Journal”.
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState } from './lab'
import { Boundary, Log, RUNS, briefing, dockPanel, findRecords, go, mainLog, settingsTab, toasts } from './do-pomoc'

const RUN = 'do-10'

async function status(page: Page): Promise<string> {
  await settingsTab(page, 'ictj')
  return `${await page.getByTestId('ictj-status').innerText().catch(() => '?')} | ${await page.getByTestId('ictj-dir').innerText().catch(() => '?')}`
}

test('DO.21 – folder ICTTJ znika i wraca; DO.25 – droga do Ustawień', async () => {
  test.setTimeout(15 * 60_000)
  const log = new Log(RUN)
  const st = useState('rok', RUN)
  const ICTJ = st.ictjDir!
  const dir = join(RUNS, RUN)
  const b = new Boundary(RUN, ICTJ)
  // Faza 1: folder wybrany w Ustawieniach (config.json komputera), bez FI_ICTJ_DIR.
  let run = await start(RUN, { dataDir: st.dataDir, fresh: true })
  try {
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    mkdirSync(join(dir, 'ictj-appdata', 'ICT Trade Journal'), { recursive: true })
    writeFileSync(join(dir, 'ictj-appdata', 'ICT Trade Journal', 'config.json'), JSON.stringify({ dataDir: ICTJ }, null, 2))
    await settingsTab(run.page, 'ictj')
    await run.page.getByTestId('ictj-use-suggested').click()
    await run.page.waitForTimeout(2500)
    log.line(`faza 1: ${await status(run.page)}`)
    // DO.25: „Otwórz ICTTJ” z menu – w tym przebiegu ICTTJ jest zainstalowany; akcję „Ustawienia” sprawdza faza 3.
  } finally {
    await run.app.close().catch(() => undefined)
  }
  b.check('po fazie 1')
  const dockings = findRecords(st.dataDir, 'dockings', () => true).length
  renameSync(ICTJ, `${ICTJ}-ukryty`)
  log.line(`folder ICTTJ ukryty (zmiana nazwy przy zamkniętej aplikacji); dokowań w folderze FI: ${dockings}`)
  // Faza 2: start z folderem niedostępnym; powrót nazwy przy otwartej aplikacji.
  run = await start(RUN, { dataDir: st.dataDir, fresh: false })
  try {
    const p = run.page
    await p.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await p.waitForTimeout(5000)
    log.line(`Mostek: ${await p.getByTestId('docking-ictj-state').innerText().catch(() => '(brak napisu)')}`)
    log.obj('panel – folder niedostępny', await dockPanel(p))
    log.obj('odprawa – folder niedostępny', (await briefing(p)).filter((x) => /ICTTJ|dock|ictj/i.test(x)))
    await shot(p, 'DO.21-zniknal')
    log.line(`Ustawienia: ${await status(p)}`)
    log.line(`dokowań w folderze FI: ${findRecords(st.dataDir, 'dockings', () => true).length} (przed: ${dockings})`)
    log.obj('błędy okna (folder niedostępny)', run.errors)
    renameSync(`${ICTJ}-ukryty`, ICTJ)
    const t0 = Date.now()
    let back = ''
    for (let i = 0; i < 75; i++) {
      await go(p, '1', 'page-bridge')
      back = await p.getByTestId('docking-ictj-state').innerText().catch(() => '')
      if (!back) break
      await p.waitForTimeout(1000)
    }
    log.line(`po przywróceniu nazwy: ${back ? `po ${Math.round((Date.now() - t0) / 1000)} s nadal „${back}”` : `czyta sam po ${Math.round((Date.now() - t0) / 1000)} s`}`)
    log.obj('panel po powrocie', await dockPanel(p))
    log.line(`Ustawienia po powrocie: ${await status(p)}`)
    await shot(p, 'DO.21-wrocil')
  } finally {
    await run.app.close().catch(() => undefined)
    log.obj('main.log', mainLog(run.userData).split(/\r?\n/).filter((l) => /ICTTJ|ERROR/.test(l)).join('\n'))
  }
  log.line(`folder ICTTJ na miejscu: ${existsSync(ICTJ)}`)
  // Faza 3 (DO.25): bez programu ICTTJ – komunikat i akcja „Ustawienia”.
  const local = join(dir, 'localappdata')
  const bin = join(dir, 'bin')
  mkdirSync(local, { recursive: true })
  mkdirSync(bin, { recursive: true })
  run = await start(`${RUN}-bez-ictj`, { dataDir: st.dataDir, fresh: true, env: { LOCALAPPDATA: local, PATH: bin } })
  try {
    const p = run.page
    await p.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await p.getByTestId('nav-open-ictj').click()
    await p.waitForTimeout(1200)
    log.line(`toast: ${await toasts(p)}`)
    await p.getByTestId('toast-action').filter({ hasText: 'Ustawienia' }).first().click()
    await p.waitForTimeout(1200)
    log.line(`po „Ustawienia”: zakładka ICTTJ widoczna=${await p.getByTestId('ictj-program').isVisible().catch(() => false)}; ${await p.getByTestId('ictj-program').innerText().catch(() => '(brak)')}`)
    await shot(p, 'DO.25-ustawienia')
  } finally {
    await run.app.close().catch(() => undefined)
  }
  log.obj('granica', b.end('DO.21 folder znika, DO.25'))
})
