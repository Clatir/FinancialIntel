// DO, przebieg do-7: persona „rok”, folder ICTTJ NIE podany przez FI_ICTJ_DIR (wybór w Ustawieniach, jak u użytkownika).
// DO.21 – „Użyj tego folderu”, folder bez journal.json, folder znika i wraca, „Nie czytaj ICTTJ”, drugi komputer;
// DO.25 – „Otwórz ICTTJ”: zainstalowany (próba „dry”), bez programu (LOCALAPPDATA i PATH przebiegu – rejestr tylko czytany
// przez aplikację), „Wskaż plik .exe…”, „Zapomnij wybór”; DO.23 – kopia ICTTJ z atrybutem tylko do odczytu, folder kopii
// i folder danych w folderze ICTTJ, appdata ICTTJ bez zmian, main.log.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { LAB, answerDialogs, recorded, shot, start, useState, type Run } from './lab'
import { Boundary, Log, RUNS, appdataState, briefing, dockPanel, go, mainLog, settingsTab, toasts } from './do-pomoc'

const RUN = 'do-7'

async function ictjTab(page: Page): Promise<string> {
  await settingsTab(page, 'ictj')
  await page.waitForTimeout(800)
  return (await page.locator('main').innerText()).split('\n').map((l) => l.trim()).filter(Boolean).slice(12, 40).join(' | ')
}

test('DO.21, DO.25, DO.23 – Ustawienia → ICTTJ, „Otwórz ICTTJ”, folder tylko do odczytu', async () => {
  test.setTimeout(40 * 60_000)
  const log = new Log(RUN)
  const st = useState('rok', RUN)
  const DATA = st.dataDir
  const ICTJ = st.ictjDir!
  const DIR = join(RUNS, RUN)
  const b = new Boundary(RUN, ICTJ)
  let run: Run | null = null
  const close = async (label: string) => {
    if (!run) return
    log.obj(`błędy okna (${label})`, run.errors)
    log.obj(`zapisane próby (${label})`, await recorded(run.app).catch(() => '(brak)'))
    log.line(`appdata ICTTJ przed zamknięciem (${label}): ${appdataState(run.dir)}`)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    log.obj(`main.log (${label})`, mainLog(run.userData).split(/\r?\n/).filter((l) => /ictj|ICTTJ|EPERM|EACCES|journal|kopi/i.test(l)).join('\n'))
    run = null
    b.check(`po zamknięciu – ${label}`)
  }
  try {
    // ---- Faza 1 (DO.21): bez FI_ICTJ_DIR; config.json ICTTJ (appdata przebiegu) wskazuje kopię.
    b.check('przed start() – faza 1')
    run = await start(RUN, { dataDir: DATA, fresh: true })
    const r = run
    const p = r.page
    await p.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    mkdirSync(join(r.dir, 'ictj-appdata', 'ICT Trade Journal'), { recursive: true })
    writeFileSync(join(r.dir, 'ictj-appdata', 'ICT Trade Journal', 'config.json'), JSON.stringify({ dataDir: ICTJ }, null, 2))
    const appdataExpected = appdataState(r.dir)
    log.line(`appdata ICTTJ (wzorzec przebiegu): ${appdataExpected}`)
    await log.step('DO.21 bez folderu', async () => {
      await go(p, '1', 'page-bridge')
      log.obj('panel bez folderu', await dockPanel(p))
      await shot(p, 'DO.21-bez-folderu')
      log.obj('ustawienia przed', await ictjTab(p))
      await shot(p, 'DO.21-ustawienia-przed')
    })
    await log.step('DO.21 Użyj tego folderu', async () => {
      await p.getByTestId('ictj-use-suggested').click()
      await p.waitForTimeout(2500)
      log.line(`status: ${await p.getByTestId('ictj-status').innerText()}; ${await p.getByTestId('ictj-counts').innerText().catch(() => '(brak liczników)')}`)
      log.line(`config.json ictj: ${JSON.stringify(JSON.parse(readFileSync(join(r.userData, 'config.json'), 'utf8')).ictj)}`)
      log.line(`fi.json zawiera ścieżkę ICTTJ: ${readFileSync(join(DATA, 'fi.json'), 'utf8').includes('do-7')}`)
      await shot(p, 'DO.21-czytany')
    })
    await log.step('DO.21 folder bez journal.json', async () => {
      const bad = join(DIR, 'nie-ictj')
      rmSync(bad, { recursive: true, force: true })
      mkdirSync(join(bad, 'payouts'), { recursive: true })
      await answerDialogs(r.app, { paths: [bad] })
      await p.getByTestId('ictj-pick').click()
      await p.waitForTimeout(2000)
      log.line(`toast: ${await toasts(p)}`)
      log.line(`status: ${await p.getByTestId('ictj-status').innerText()}; folder: ${await p.getByTestId('ictj-dir').innerText()}`)
      log.obj('ustawienia', await ictjTab(p))
      await shot(p, 'DO.21-nie-ictj')
    })
    await log.step('DO.21 folder znika', async () => {
      b.check('przed zmianą nazwy folderu ICTTJ')
      renameSync(ICTJ, `${ICTJ}-ukryty`)
      let state = ''
      for (let i = 0; i < 45; i++) {
        await go(p, '1', 'page-bridge')
        state = await p.getByTestId('docking-ictj-state').innerText().catch(() => '')
        if (state) break
        await p.waitForTimeout(1000)
      }
      log.line(`Mostek – stan ICTTJ: ${state || '(brak napisu w 45 s)'}`)
      log.obj('panel – folder zniknął', await dockPanel(p))
      log.obj('odprawa – folder zniknął', (await briefing(p)).filter((x) => /ICTTJ|ictj|dock/i.test(x)))
      await shot(p, 'DO.21-zniknal')
      log.obj('ustawienia – folder zniknął', await ictjTab(p))
      log.line(`dokowania w folderze FI: ${existsSync(join(DATA, 'dockings')) ? 'są' : 'BRAK'}`)
      renameSync(`${ICTJ}-ukryty`, ICTJ)
      b.check('po przywróceniu nazwy folderu ICTTJ')
      let back = ''
      for (let i = 0; i < 45; i++) {
        await go(p, '1', 'page-bridge')
        back = await p.getByTestId('docking-ictj-state').innerText().catch(() => '')
        if (!back) break
        await p.waitForTimeout(1000)
      }
      log.line(`po powrocie: ${back ? `nadal „${back}”` : 'czyta sam (napis zniknął)'}`)
      log.obj('panel po powrocie', await dockPanel(p))
    })
    await log.step('DO.25 zainstalowany (próba)', async () => {
      log.obj('ustawienia – program', await ictjTab(p))
      await p.getByTestId('nav-open-ictj').click()
      await p.waitForTimeout(2000)
      log.line(`toast: ${await toasts(p)}`)
      log.line(`main.log ICTTJ start: ${mainLog(r.userData).split(/\r?\n/).filter((l) => /ICTTJ: start|ICTTJ uruchomiony/.test(l)).join(' / ')}`)
    })
    await log.step('DO.21 Nie czytaj ICTTJ', async () => {
      await settingsTab(p, 'ictj')
      await p.getByTestId('ictj-off').click()
      await p.waitForTimeout(2000)
      log.line(`status: ${await p.getByTestId('ictj-status').innerText()}`)
      await go(p, '1', 'page-bridge')
      log.line(`Mostek: ${await p.getByTestId('docking-ictj-state').innerText().catch(() => '(brak)')}`)
      await shot(p, 'DO.21-wylaczony')
      // Again on for the second computer's check (the path must stay on this one).
      await settingsTab(p, 'ictj')
      await p.getByTestId('ictj-use-suggested').click()
      await p.waitForTimeout(2000)
      log.line(`ponownie: ${await p.getByTestId('ictj-status').innerText()}`)
    })
    await log.step('DO.23 folder kopii i folder danych w ICTTJ', async () => {
      await settingsTab(p, 'folder')
      await answerDialogs(r.app, { paths: [ICTJ] })
      await p.getByRole('button', { name: 'Zmień folder kopii…' }).click()
      await p.waitForTimeout(2500)
      log.line(`folder kopii = ICTTJ: ${await toasts(p)}`)
      await answerDialogs(r.app, { paths: [join(ICTJ, 'payouts')] })
      await p.getByRole('button', { name: 'Zmień folder kopii…' }).click()
      await p.waitForTimeout(2500)
      log.line(`folder kopii = ICTTJ\\payouts: ${await toasts(p)}`)
      await answerDialogs(r.app, { paths: [ICTJ] })
      await p.getByRole('button', { name: 'Otwórz inny folder…' }).click()
      await p.waitForTimeout(3000)
      log.line(`folder danych = ICTTJ: ${await toasts(p)} | okna: ${(await p.locator('[role="dialog"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' || ')}`)
      await shot(p, 'DO.23-folder-ictj')
      await p.keyboard.press('Escape').catch(() => undefined)
      log.line(`config.json backupDirOverride: ${JSON.stringify(JSON.parse(readFileSync(join(r.userData, 'config.json'), 'utf8')).backupDirOverride ?? null)}`)
    })
    log.line(`appdata ICTTJ po fazie 1: ${appdataState(r.dir)} (wzorzec: ${appdataExpected})`)
    await close('faza 1')

    // ---- Drugi komputer (drugi userData) na tym samym folderze FI.
    b.check('przed start() – drugi komputer')
    run = await start(`${RUN}-drugi`, { dataDir: DATA, fresh: true, machine: 'DRUGI-PC' })
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await log.step('DO.21 drugi komputer', async () => {
      log.obj('drugi – ustawienia', await ictjTab(run!.page))
      await go(run!.page, '1', 'page-bridge')
      log.line(`drugi – Mostek: ${await run!.page.getByTestId('docking-ictj-state').innerText().catch(() => '(brak)')}`)
      await shot(run!.page, 'DO.21-drugi-komputer')
    })
    await close('drugi komputer')

    // ---- Faza 2 (DO.25): bez zainstalowanego ICTTJ – LOCALAPPDATA przebiegu i PATH bez narzędzi systemu (rejestr niedostępny).
    const local = join(DIR, 'localappdata')
    const bin = join(DIR, 'bin')
    mkdirSync(local, { recursive: true })
    mkdirSync(bin, { recursive: true })
    const exe = join(DIR, 'ICT-Trade-Journal-portable.exe')
    writeFileSync(exe, 'atrapa – nigdy nie uruchamiana (FI_ICTJ_LAUNCH=dry)')
    b.check('przed start() – faza 2')
    run = await start(`${RUN}-bez-ictj`, { dataDir: DATA, fresh: true, env: { LOCALAPPDATA: local, PATH: bin } })
    const q = run.page
    await q.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await log.step('DO.25 bez programu', async () => {
      log.obj('ustawienia – program', await ictjTab(q))
      await q.getByTestId('nav-open-ictj').click()
      await q.waitForTimeout(1500)
      log.line(`toast: ${await toasts(q)} | akcja: ${await q.getByTestId('toast-action').allInnerTexts()}`)
      await shot(q, 'DO.25-nie-znaleziono')
      const act = q.getByTestId('toast-action').filter({ hasText: 'Ustawienia' })
      if (await act.count()) {
        await act.first().click()
        await q.waitForTimeout(1000)
        log.line(`po „Ustawienia”: ${(await q.locator('main').innerText()).includes('Program ICT Trade Journal') ? 'Ustawienia → ICTTJ' : 'inny ekran'}`)
      }
      await answerDialogs(run!.app, { paths: [exe] })
      await settingsTab(q, 'ictj')
      await q.getByTestId('ictj-pick-exe').click()
      await q.waitForTimeout(1500)
      log.line(`program: ${await q.getByTestId('ictj-program').innerText()}`)
      await q.getByTestId('ictj-open').click()
      await q.waitForTimeout(1500)
      await q.getByTestId('nav-open-ictj').click()
      await q.waitForTimeout(1500)
      log.line(`toast po „Otwórz ICTTJ”: ${await toasts(q)}`)
      log.line(`main.log: ${mainLog(run!.userData).split(/\r?\n/).filter((l) => /ICTTJ: start|ICTTJ uruchomiony/.test(l)).join(' / ')}`)
      await shot(q, 'DO.25-wybrany')
      await q.getByRole('button', { name: 'Zapomnij wybór' }).click()
      await q.waitForTimeout(1500)
      log.line(`po „Zapomnij wybór”: ${await q.getByTestId('ictj-program').innerText()}`)
      log.obj('zapisane próby otwarcia', (await recorded(run!.app)).opened)
    })
    await close('faza 2 (bez programu)')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.21, DO.23, DO.25'))
  }

  // ---- Faza 3 (DO.23): kopia ICTTJ z atrybutem tylko do odczytu (wszystkie pliki) – odczyt i dokowanie bez błędów.
  const ro = join(DIR, 'ictj-ro')
  rmSync(ro, { recursive: true, force: true })
  cpSync(join(LAB, 'stany', 'ictj-rok'), ro, { recursive: true })
  execFileSync('attrib', ['+R', join(ro, '*'), '/S'])
  const b2 = new Boundary(`${RUN}-ro`, ro)
  const st2 = useState('rok', `${RUN}-ro`)
  let r3: Run | null = null
  try {
    r3 = await start(`${RUN}-ro`, { dataDir: st2.dataDir, ictjDir: ro, fresh: true })
    const page = r3.page
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    log.obj('ro – panel', await dockPanel(page))
    log.obj('ro – ustawienia', await ictjTab(page))
    await go(page, '1', 'page-bridge')
    const row = page.locator('[data-testid="docking-row"][data-state="pending"]').filter({ hasText: 'bez wpisu' })
    if (await row.count()) {
      await row.first().click()
      await page.getByTestId('docking-dialog').waitFor()
      await page.getByTestId('docking-confirm').click()
      await page.waitForTimeout(2500)
      log.line(`ro – dokowanie: ${await toasts(page)}`)
    }
    log.obj('ro – błędy okna', r3.errors)
  } finally {
    if (r3) await r3.app.close().catch(() => undefined)
    log.obj('ro – main.log', mainLog(join(RUNS, `${RUN}-ro`, 'userdata')).split(/\r?\n/).filter((l) => /ictj|ICTTJ|EPERM|EACCES|ERROR/i.test(l)).join('\n'))
    log.obj('granica ro', b2.end('folder ICTTJ tylko do odczytu'))
    execFileSync('attrib', ['-R', join(ro, '*'), '/S'])
  }
})
