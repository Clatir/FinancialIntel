/**
 * Audit DA – the data folder chosen, opened, refused (DA.1–DA.5).
 * Observation only: the screens, the files and main.log go to C:\FI-audyt\przebiegi\da-*\da.log.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { LAB, start, useState } from './lab'
import { Log, PROD_FREEZE, banners, checksums, diff, formatCheck, goFolderTab, logDiff, mainLog, pick, picks, sleep, tempFiles, toasts, trap, trapped } from './da-pomoc'

const runDir = (n: string) => join(LAB, 'przebiegi', n)

test('DA.1 – propozycja folderu jednym kliknięciem', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-1'
  const log = new Log(NAME)
  rmSync(join(runDir(NAME), 'OneDrive'), { recursive: true, force: true })
  let run = await start(NAME, { usePreset: false, env: PROD_FREEZE })
  await trap(run, log)
  const dataDir = join(run.dir, 'OneDrive', 'FinancialIntel')
  try {
    const { page } = run
    await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('setup-default')).toBeVisible({ timeout: 15_000 })
    await log.screen(page, 'ekran wyboru folderu', '[data-testid="folder-setup"]')
    log.line(`przycisk propozycji: ${(await page.getByTestId('setup-default').innerText()).replace(/\s+/g, ' ')}`)
    log.line(`ścieżka propozycji: ${await page.getByTestId('setup-default-dir').innerText()}`)
    await log.shot(page, 'DA.1-propozycja')
    await page.getByTestId('setup-default').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(2500)
    log.line(`banery: ${await banners(page)}`)
    log.line(`przycisk „Kreator startu”: ${await page.getByTestId('banner-wizard-start').count()}`)
    await log.shot(page, 'DA.1-po-kliknieciu')
    const fiText = readFileSync(join(dataDir, 'fi.json'), 'utf8')
    const fi = JSON.parse(fiText)
    log.line(`fi.json: schemaVersion=${fi.schemaVersion}, id=${fi.id}, updatedBy=${fi.updatedBy}, koniec \\n: ${fiText.endsWith('}\n')}, wcięcie 2: ${fiText === `${JSON.stringify(fi, null, 2)}\n`}`)
    log.line(`pliki folderu: ${[...checksums(dataDir, true).keys()].join(', ')}`)
    log.line(`pliki tymczasowe: ${tempFiles(dataDir).join(', ') || 'brak'}`)
    log.line(`format: ${JSON.stringify(formatCheck(dataDir))}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  log.line(`config.json po pierwszym: ${readFileSync(join(run.userData, 'config.json'), 'utf8').replace(/\s+/g, ' ').slice(0, 600)}`)
  log.line(`pliki tymczasowe po zamknięciu: ${tempFiles(dataDir).join(', ') || 'brak'}`)
  run = await start(NAME, { usePreset: false, fresh: false, env: PROD_FREEZE })
  await trap(run, log)
  try {
    const { page } = run
    await expect(page.getByTestId('folder-setup').or(page.getByTestId('page-bridge'))).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(2500)
    log.line(`ponowny start: ekran wyboru ${await page.getByTestId('folder-setup').count()}, Mostek ${await page.getByTestId('page-bridge').count()}`)
    await goFolderTab(page)
    log.line(`folder w Ustawieniach: ${await page.getByTestId('settings-data-dir').innerText()}`)
    await log.shot(page, 'DA.1-ponowny-start')
    log.line(`błędy okna: ${run.errors.join(' | ') || 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.2 – „Nowe dane gdzie indziej” i „Otwórz istniejące”', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-2'
  const log = new Log(NAME)
  const empty = join(runDir(NAME), 'pusty')
  rmSync(empty, { recursive: true, force: true })
  mkdirSync(empty, { recursive: true })
  let run = await start(`${NAME}a`, { usePreset: false, env: PROD_FREEZE })
  await trap(run, log)
  try {
    const { page } = run
    await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
    await pick(run, { paths: [empty] })
    await page.getByTestId('setup-create').click()
    await expect(page.getByTestId('page-bridge').or(page.getByTestId('setup-message'))).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(2500)
    log.line(`okna wyboru: ${(await picks(run)).join(' | ')}`)
    log.line(`po wyborze pustego: Mostek ${await page.getByTestId('page-bridge').count()}, komunikat ${await page.getByTestId('setup-message').count()}`)
    log.line(`banery: ${await banners(page)}`)
    log.line(`pliki w pustym folderze: ${[...checksums(empty, true).keys()].join(', ')}`)
    await log.shot(page, 'DA.2-nowe')
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  // A new user data: „Otwórz istniejące” on a copy of „rok”.
  const { dataDir } = useState('rok', NAME)
  const before = checksums(dataDir)
  const beforeAll = checksums(dataDir, true)
  log.line(`rok: plików danych ${before.size}, operacji ${[...before.keys()].filter((k) => k.startsWith('transactions/')).length}`)
  run = await start(`${NAME}b`, { usePreset: false, env: PROD_FREEZE })
  await trap(run, log)
  try {
    const { page } = run
    await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
    await pick(run, { paths: [dataDir] })
    await page.getByTestId('setup-open').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 120_000 })
    await page.waitForTimeout(3000)
    log.line(`okna wyboru: ${(await picks(run)).join(' | ')}`)
    log.line(`banery: ${await banners(page)}`)
    log.line(`kreator: strona ${await page.getByTestId('page-wizard').count()}, baner ${await page.getByTestId('banner-wizard-start').count()}`)
    await log.screen(page, 'Mostek', '[data-testid="page-bridge"]')
    await log.shot(page, 'DA.2-istniejace')
    await goFolderTab(page)
    await log.screen(page, 'Ustawienia → Folder', 'main')
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'rok po otwarciu (bez .presence i backups)', diff(before, checksums(dataDir)))
  logDiff(log, 'rok po otwarciu (wszystkie pliki)', diff(beforeAll, checksums(dataDir, true)))
})

/** A folder of two foreign files. */
function foreign(dir: string): string {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'notatki.txt'), 'Lista zakupów: chleb, mleko\r\n')
  writeFileSync(join(dir, 'zdjecie.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]))
  return dir
}

test('DA.3 – obce pliki, zapamiętany folder brakujący i pusty', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-3'
  const log = new Log(NAME)
  // (a) „Otwórz istniejące” on a folder of foreign files.
  await log.step('(a) obce pliki', async () => {
    const f = foreign(join(runDir(NAME), 'obce'))
    const before = checksums(f, true)
    const run = await start(`${NAME}a`, { usePreset: false, env: PROD_FREEZE })
    await trap(run, log)
    try {
      const { page } = run
      await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
      await pick(run, { paths: [f] })
      await page.getByTestId('setup-open').click()
      await expect(page.getByTestId('setup-message')).toBeVisible({ timeout: 30_000 })
      await log.screen(page, 'komunikat', '[data-testid="setup-message"]')
      log.line(`przyciski: ${(await page.locator('[data-testid="setup-message"] button').allInnerTexts()).join(' | ')}`)
      log.line(`propozycja widoczna: ${await page.getByTestId('setup-default').count()}`)
      await log.shot(page, 'DA.3a-obce')
      logDiff(log, 'obce przed utworzeniem', diff(before, checksums(f, true)))
      await page.getByTestId('create-subfolder').click()
      await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1500)
      const after = checksums(f, true)
      logDiff(log, 'obce po „Utwórz podfolder”', diff(before, after))
      log.line(`obce pliki bez zmian: ${[...before.entries()].every(([k, v]) => after.get(k) === v)}`)
    } finally {
      await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    }
  })
  // (b) the remembered folder renamed while the app is closed, its name back after a minute.
  const { dataDir } = useState('rok', NAME)
  const moved = `${dataDir}-odlaczony`
  rmSync(moved, { recursive: true, force: true })
  await log.step('(b) zapamiętany folder brakujący', async () => {
    let run = await start(`${NAME}b`, { dataDir, env: PROD_FREEZE })
    await trap(run, log)
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await run.app.close()
    renameSync(dataDir, moved)
    run = await start(`${NAME}b`, { usePreset: false, fresh: false, env: PROD_FREEZE })
    await trap(run, log)
    try {
      const { page } = run
      await expect(page.getByTestId('setup-message')).toBeVisible({ timeout: 60_000 })
      const t0 = Date.now()
      await log.screen(page, 'komunikat (brakujący)', '[data-testid="folder-setup"]')
      log.line(`przyciski: ${(await page.locator('[data-testid="folder-setup"] button').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ')).join(' | ')}`)
      log.line(`propozycja: ${await page.getByTestId('setup-default').count()} ${(await page.getByTestId('setup-default-dir').innerText().catch(() => '')) || ''}`)
      await log.shot(page, 'DA.3b-brak')
      await sleep(35_000)
      log.line(`po 35 s: ścieżka istnieje? ${existsSync(dataDir)}; komunikat: ${(await page.getByTestId('setup-message').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')}`)
      log.line(`main.log (open): \n${mainLog(run, /open|folder|niedost|missing|unavailable/i, 15)}`)
      await sleep(Math.max(0, 60_000 - (Date.now() - t0)))
      renameSync(moved, dataDir)
      log.line(`nazwa przywrócona po ${Math.round((Date.now() - t0) / 1000)} s`)
      const tBack = Date.now()
      let opened = false
      for (let i = 0; i < 50 && !opened; i++) {
        await sleep(1000)
        opened = (await page.getByTestId('page-bridge').count()) > 0
      }
      log.line(`po przywróceniu: Mostek ${opened} po ${Math.round((Date.now() - tBack) / 1000)} s (bez klikania)`)
      if (!opened) {
        await page.getByTestId('retry-folder').click().catch(() => undefined)
        await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 }).catch(() => undefined)
        log.line(`po „Spróbuj ponownie”: Mostek ${await page.getByTestId('page-bridge').count()}`)
      }
      await page.waitForTimeout(1500)
      await log.screen(page, 'po powrocie', '[data-testid="page-bridge"]')
    } finally {
      await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    }
  })
  // (c) the remembered folder replaced by an empty one.
  await log.step('(c) zapamiętany folder pusty', async () => {
    if (existsSync(moved)) rmSync(moved, { recursive: true, force: true })
    renameSync(dataDir, moved)
    mkdirSync(dataDir, { recursive: true })
    const run = await start(`${NAME}b`, { usePreset: false, fresh: false, env: PROD_FREEZE })
    await trap(run, log)
    try {
      const { page } = run
      await expect(page.getByTestId('setup-message')).toBeVisible({ timeout: 60_000 })
      await log.screen(page, 'komunikat (pusty)', '[data-testid="folder-setup"]')
      log.line(`przyciski: ${(await page.locator('[data-testid="folder-setup"] button').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ')).join(' | ')}`)
      log.line(`propozycja: ${await page.getByTestId('setup-default').count()}`)
      await log.shot(page, 'DA.3c-pusty')
      log.line(`pliki w pustym przed: ${readdirSync(dataDir).join(', ') || 'brak'}`)
      await page.getByTestId('start-over').click()
      await page.waitForTimeout(500)
      log.line(`po „Utwórz tu nowe dane…”: pliki ${readdirSync(dataDir).join(', ') || 'brak'}; przyciski: ${(await page.locator('[data-testid="setup-message"] button').allInnerTexts()).join(' | ')}`)
      await log.shot(page, 'DA.3c-potwierdzenie')
      await page.getByTestId('start-over-confirm').click()
      await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1500)
      log.line(`po potwierdzeniu: pliki ${readdirSync(dataDir).join(', ')}; banery: ${await banners(page)}`)
    } finally {
      await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    }
  })
})

test('DA.4 – folder ICTTJ odrzucony', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-4'
  const log = new Log(NAME)
  const ictj = join(runDir(NAME), 'ictj')
  rmSync(ictj, { recursive: true, force: true })
  cpSync(join(LAB, 'stany', 'ictj-rok'), ictj, { recursive: true })
  const payouts = join(ictj, 'payouts')
  const before = checksums(ictj, true)
  log.line(`ICTTJ: ${before.size} plików, payouts istnieje: ${existsSync(payouts) && statSync(payouts).isDirectory()}`)
  const run = await start(NAME, { usePreset: false, env: PROD_FREEZE })
  await trap(run, log)
  const { page } = run
  try {
    await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
    for (const way of ['setup-open', 'setup-create'] as const)
      for (const dir of [ictj, payouts]) {
        await log.step(`ekran wyboru: ${way} → ${dir}`, async () => {
          await pick(run, { paths: [dir] })
          await page.getByTestId(way).click()
          await page.waitForTimeout(2500)
          log.line(`komunikat: ${(await page.getByTestId('setup-message').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')}`)
          log.line(`przyciski: ${(await page.locator('[data-testid="setup-message"] button').allInnerTexts().catch(() => [])).join(' | ')}`)
          log.line(`toasty: ${await toasts(page)}; Mostek: ${await page.getByTestId('page-bridge').count()}`)
          await log.shot(page, `DA.4-${way}-${dir === ictj ? 'ictj' : 'payouts'}`)
        })
      }
    // A data folder of FI open, then the same from Settings.
    await page.getByTestId('setup-default').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    await goFolderTab(page)
    const current = await page.getByTestId('settings-data-dir').innerText()
    log.line(`bieżący folder FI: ${current}`)
    for (const label of ['Otwórz inny folder…', 'Nowe dane w innym folderze…'])
      for (const dir of [ictj, payouts]) {
        await log.step(`Ustawienia: ${label} → ${dir}`, async () => {
          await pick(run, { paths: [dir] })
          await page.getByRole('button', { name: label }).click()
          await page.waitForTimeout(2500)
          log.line(`toasty: ${await toasts(page)}`)
          log.line(`bieżący folder: ${await page.getByTestId('settings-data-dir').innerText()}`)
          await log.shot(page, `DA.4-ust-${label.startsWith('Otwórz') ? 'otworz' : 'nowe'}-${dir === ictj ? 'ictj' : 'payouts'}`)
        })
      }
    log.line(`okna wyboru: ${(await picks(run)).join(' | ')}`)
    log.line(`błędy okna: ${run.errors.join(' | ') || 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'ICTTJ po (wszystkie pliki)', diff(before, checksums(ictj, true)))
  log.line(`fi.json / .presence / backups w ICTTJ: ${['fi.json', '.presence', 'backups', 'FinancialIntel'].filter((n) => existsSync(join(ictj, n)) || existsSync(join(payouts, n))).join(', ') || 'brak'}`)
})

test('DA.5 – postęp otwarcia i „Przerwij”', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-5'
  const log = new Log(NAME)
  const { dataDir } = useState('rok', NAME)
  // No backup of today: whether „Przerwij” leaves one.
  rmSync(join(dataDir, 'backups', 'daily', '2026-11-03.zip'), { force: true })
  const beforeAll = checksums(dataDir, true)
  log.line(`plików: ${beforeAll.size}`)
  const env = { ...PROD_FREEZE, FI_OPEN_DELAY_MS: '400', FI_OPEN_SLOW_MS: '300' }
  // The first start remembers the folder (no delay – a normal opening), then a start with the delay.
  let run = await start(NAME, { dataDir, env: PROD_FREEZE })
  await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await run.app.close()
  rmSync(join(dataDir, 'backups', 'daily', '2026-11-03.zip'), { force: true })
  const before = checksums(dataDir, true)
  run = await start(NAME, { usePreset: false, fresh: false, env })
  await trap(run, log)
  const { page } = run
  try {
    const seen: string[] = []
    const t0 = Date.now()
    for (let i = 0; i < 9; i++) {
      const p = page.getByTestId('open-progress')
      seen.push(`${Math.round((Date.now() - t0) / 1000)} s: ${(await p.count()) ? (await p.innerText().catch(() => '')).replace(/\s+/g, ' ') : '(brak panelu)'} | cancel aktywny: ${await page.getByTestId('open-cancel').isEnabled().catch(() => '-')}`)
      if (i === 4) await log.shot(page, 'DA.5-postep')
      await sleep(1000)
    }
    for (const s of seen) log.line(`panel ${s}`)
    await page.getByTestId('open-cancel').click()
    await expect(page.getByTestId('folder-setup')).toBeVisible()
    await page.waitForTimeout(3000)
    await log.screen(page, 'po „Przerwij”', '[data-testid="folder-setup"]')
    await log.shot(page, 'DA.5-przerwij')
    logDiff(log, 'folder po „Przerwij” (wszystkie pliki)', diff(before, checksums(dataDir, true)))
    log.line(`kopia dzienna po przerwaniu: ${existsSync(join(dataDir, 'backups', 'daily', '2026-11-03.zip'))}`)
    await page.getByTestId('retry-folder').click()
    const seen2: string[] = []
    for (let i = 0; i < 40 && !(await page.getByTestId('page-bridge').count()); i++) {
      const p = page.getByTestId('open-progress')
      if (await p.count()) seen2.push((await p.innerText().catch(() => '')).replace(/\s+/g, ' '))
      await sleep(1000)
    }
    log.line(`„Spróbuj ponownie”: panele ${seen2.length}, ostatni: ${seen2.at(-1) ?? '-'}`)
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    log.line(`otwarty po ${Math.round((Date.now() - t0) / 1000)} s`)
    log.line(`main.log (open):\n${mainLog(run, /open/i, 40)}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  // The same through „Otwórz istniejące” on the first-run screen (a new user data).
  run = await start(`${NAME}b`, { usePreset: false, env })
  await trap(run, log)
  try {
    const p2 = run.page
    await expect(p2.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
    await pick(run, { paths: [dataDir] })
    await p2.getByTestId('setup-open').click()
    const seen: string[] = []
    for (let i = 0; i < 40 && !(await p2.getByTestId('page-bridge').count()); i++) {
      const p = p2.getByTestId('open-progress')
      if (await p.count()) seen.push(`${i} s: ${(await p.innerText().catch(() => '')).replace(/\s+/g, ' ')}`)
      await sleep(1000)
    }
    for (const s of seen.slice(0, 6)) log.line(`otwórz istniejące: ${s}`)
    log.line(`… paneli ${seen.length}, ostatni: ${seen.at(-1) ?? '-'}`)
    await p2.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    log.line(`main.log (open):\n${mainLog(run, /open/i, 30)}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})
