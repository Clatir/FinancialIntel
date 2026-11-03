/**
 * Audit DA – backups (DA.9–DA.15). Observation only: C:\FI-audyt\przebiegi\da-*\da.log.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { importDone } from '../e2e/app'
import { cardL, listaText } from './im-pomoc'
import { LAB, start, useState, type Run } from './lab'
import { cp1250 } from './persona'
import {
  OP,
  byId,
  Log,
  PROD_FREEZE,
  banners,
  checksums,
  diff,
  findOp,
  goFolderTab,
  holdFile,
  logDiff,
  mainLog,
  openRok,
  pick,
  picks,
  readJson,
  reopen,
  sleep,
  toasts,
  trap,
  writeJson,
  zipEntries
} from './da-pomoc'

const runDir = (n: string) => join(LAB, 'przebiegi', n)
const TODAY = '2026-11-03'

/** Data files of a folder (no .history / .presence / backups) with their sums. */
const dataSums = (dir: string) => new Map([...checksums(dir)].filter(([k]) => !k.startsWith('.history/')))

/** A ZIP's entries compared with the folder's data files. */
async function compareZip(log: Log, label: string, zip: string, folder: Map<string, string>): Promise<void> {
  const z = await zipEntries(zip)
  const d = diff(folder, z)
  log.line(`${label}: w ZIP ${z.size} plików, w folderze ${folder.size}; brakuje ${d.removed.length}, nadmiarowe ${d.added.length}, inne bajty ${d.changed.length}`)
  for (const k of d.removed.slice(0, 15)) log.line(`  brak w ZIP: ${k}`)
  for (const k of d.added.slice(0, 15)) log.line(`  nadmiar w ZIP: ${k}`)
  for (const k of d.changed.slice(0, 15)) log.line(`  inne bajty: ${k}`)
  log.line(`  w ZIP .history/.presence/backups: ${[...z.keys()].filter((k) => /^(\.history|\.presence|backups)\//.test(k)).length}; fi.json: ${z.has('fi.json')}`)
}

async function backupRows(run: Run): Promise<string> {
  return (await run.page.getByTestId('backup-row').allInnerTexts().catch(() => [] as string[])).map((t) => t.replace(/\s+/g, ' ')).join('\n  ')
}

test('DA.9 – kopia dzienna przy otwarciu', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-9'
  const log = new Log(NAME)
  let dataDir = ''
  const { run, dataDir: d } = await openRok(NAME, {
    log,
    prepare: (dir) => {
      rmSync(join(dir, 'backups', 'daily', `${TODAY}.zip`), { force: true })
      rmSync(join(dir, 'backups', 'weekly', '2026-W45.zip'), { force: true })
      log.line(`przed: daily ${readdirSync(join(dir, 'backups', 'daily')).join(', ') || 'brak'}; weekly ${readdirSync(join(dir, 'backups', 'weekly')).join(', ') || 'brak'}`)
    }
  })
  dataDir = d
  const daily = join(dataDir, 'backups', 'daily', `${TODAY}.zip`)
  try {
    await sleep(3000)
    log.line(`po otwarciu: daily ${readdirSync(join(dataDir, 'backups', 'daily')).join(', ')}; weekly ${readdirSync(join(dataDir, 'backups', 'weekly')).join(', ')}`)
    await compareZip(log, 'kopia dzienna vs folder', daily, dataSums(dataDir))
    await goFolderTab(run.page)
    log.line(`wiek: ${await run.page.getByTestId('backup-age').innerText().catch(() => '(brak)')}`)
    log.line(`lista:\n  ${await backupRows(run)}`)
    await log.screen(run.page, 'panel kopii', 'main')
    await log.shot(run.page, 'DA.9-kopie')
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  const m1 = statSync(daily).mtimeMs
  const s1 = (await zipEntries(daily)).size
  const run2 = await reopen(NAME, dataDir, { log })
  try {
    await sleep(3000)
    log.line(`drugie otwarcie: daily ${readdirSync(join(dataDir, 'backups', 'daily')).join(', ')}; ten sam plik (mtime): ${statSync(daily).mtimeMs === m1}; wpisów ${(await zipEntries(daily)).size} (było ${s1})`)
  } finally {
    await run2.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.10 – rotacja kopii dziennych i tygodniowych', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-10'
  const log = new Log(NAME)
  const sample = readFileSync(join(LAB, 'stany', 'rok', 'backups', 'daily', `${TODAY}.zip`))
  const { run, dataDir } = await openRok(NAME, {
    log,
    prepare: (dir) => {
      const daily = join(dir, 'backups', 'daily')
      const weekly = join(dir, 'backups', 'weekly')
      rmSync(daily, { recursive: true, force: true })
      rmSync(weekly, { recursive: true, force: true })
      mkdirSync(daily, { recursive: true })
      mkdirSync(weekly, { recursive: true })
      for (let i = 1; i <= 20; i++) {
        const day = new Date(Date.UTC(2026, 10, 3 - i, 11))
        const name = `${day.toISOString().slice(0, 10)}.zip`
        writeFileSync(join(daily, name), sample)
        utimesSync(join(daily, name), day, day)
      }
      writeFileSync(join(daily, 'notatka.zip'), 'notatka – nie kopia')
      for (let w = 35; w <= 44; w++) {
        const name = `2026-W${w}.zip`
        writeFileSync(join(weekly, name), sample)
        const day = new Date(Date.UTC(2026, 7, 24 + (w - 35) * 7, 11))
        utimesSync(join(weekly, name), day, day)
      }
      log.line(`przed: daily (${readdirSync(daily).length}) ${readdirSync(daily).join(', ')}`)
      log.line(`przed: weekly (${readdirSync(weekly).length}) ${readdirSync(weekly).join(', ')}`)
    }
  })
  try {
    await sleep(4000)
    const daily = readdirSync(join(dataDir, 'backups', 'daily')).sort()
    const weekly = readdirSync(join(dataDir, 'backups', 'weekly')).sort()
    log.line(`po: daily (${daily.length}) ${daily.join(', ')}`)
    log.line(`po: weekly (${weekly.length}) ${weekly.join(', ')}`)
    const w45 = join(dataDir, 'backups', 'weekly', '2026-W45.zip')
    if (existsSync(w45)) log.line(`W45 = dzisiejsza dzienna: ${readFileSync(w45).equals(readFileSync(join(dataDir, 'backups', 'daily', `${TODAY}.zip`)))}`)
    log.line(`notatka.zip: ${existsSync(join(dataDir, 'backups', 'daily', 'notatka.zip')) ? readFileSync(join(dataDir, 'backups', 'daily', 'notatka.zip'), 'utf8') : 'BRAK'}`)
    await goFolderTab(run.page)
    log.line(`lista:\n  ${await backupRows(run)}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.11 – kopia ręczna', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-11'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  const manual = join(dataDir, 'backups', 'manual')
  try {
    await goFolderTab(page)
    await log.screen(page, 'panel kopii przed', 'main')
    for (let i = 1; i <= 6; i++) {
      if (i === 3) {
        await page.keyboard.press('Control+k')
        await page.getByTestId('palette-input').fill('Kopia zapasowa')
        await page.waitForTimeout(400)
        await log.shot(page, 'DA.11-paleta')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(3000)
        log.line(`#${i} paleta – toasty: ${await toasts(page)}`)
        await goFolderTab(page)
      } else {
        await page.getByTestId('backup-now').click()
        await page.waitForTimeout(3000)
        log.line(`#${i} „Kopia teraz” – toasty: ${await toasts(page)}`)
      }
      log.line(`   manual/: ${existsSync(manual) ? readdirSync(manual).sort().join(', ') : 'brak'}`)
      await sleep(1200)
    }
    await page.getByTestId('settings-tab-accounts').click()
    await goFolderTab(page)
    log.line(`wiek: ${await page.getByTestId('backup-age').innerText().catch(() => '(brak)')}`)
    log.line(`lista:\n  ${await backupRows(run)}`)
    await log.screen(page, 'panel kopii po', 'main')
    await log.shot(page, 'DA.11-lista')
    const last = readdirSync(manual).sort().at(-1)!
    await compareZip(log, `ostatnia ręczna ${last} vs folder`, join(manual, last), dataSums(dataDir))
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

/** Small list files of mBank with one new card row each (after the persona's last import). */
function smallFiles(dir: string, n: number): string[] {
  mkdirSync(dir, { recursive: true })
  const out: string[] = []
  for (let i = 1; i <= n; i++) {
    const date = `2026-11-0${1 + (i % 3)}`
    const p = join(dir, `da-maly-${String(i).padStart(2, '0')}.csv`)
    writeFileSync(p, cp1250(listaText([cardL(date, `SKLEP AUDYT ${i} /TESTOWO`, -(1000 + i * 37))], '2026-11-01', '2026-11-03')))
    out.push(p)
  }
  return out
}

test('DA.12 – kopia przed importem', async () => {
  test.setTimeout(25 * 60_000)
  const NAME = 'da-12'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page, app } = run
  const pre = join(dataDir, 'backups', 'pre-import')
  const files = smallFiles(join(runDir(NAME), 'pliki'), 11)
  const doImport = async (file: string, label: string) => {
    await page.keyboard.press('Control+3')
    await expect(page.getByTestId('page-import')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
    await pick(run, { paths: [file] })
    await page.getByTestId('import-pick').click()
    await page.getByTestId('import-file').or(page.getByTestId('import-error')).waitFor({ timeout: 60_000 })
    await page.waitForTimeout(800)
    const sure = page.getByTestId('import-accept-sure')
    if ((await sure.count()) && (await sure.isEnabled())) await sure.click()
    const before = dataSums(dataDir)
    const preBefore = existsSync(pre) ? readdirSync(pre).sort() : []
    await page.getByTestId('import-run').click()
    await importDone(page, run.userData)
    await page.waitForTimeout(800)
    const preAfter = readdirSync(pre).sort()
    const added = preAfter.filter((n) => !preBefore.includes(n))
    const done = (await page.getByTestId('import-done').innerText()).replace(/\s+/g, ' ')
    log.line(`${label}: ${done.slice(0, 220)}`)
    log.line(`   nowa kopia przed importem: ${added.join(', ') || 'BRAK'}; w pre-import ${preAfter.length}: ${preAfter.join(', ')}`)
    const afterImport = dataSums(dataDir)
    logDiff(log, '   folder po imporcie', diff(before, afterImport), 5)
    if (added[0]) await compareZip(log, '   kopia vs stan sprzed importu', join(pre, added[0]), before)
  }
  try {
    await log.step('import rok-nowe-historia.csv', () => doImport(join(LAB, 'pliki', 'rok-nowe-historia.csv'), 'import 1 (rok-nowe-historia)'))
    await goFolderTab(page)
    log.line(`lista po pierwszym:\n  ${await backupRows(run)}`)
    await log.shot(page, 'DA.12-lista')
    for (let i = 0; i < files.length; i++) await log.step(`import małego pliku ${i + 1}`, () => doImport(files[i]!, `import małego ${i + 1}`))
    await goFolderTab(page)
    log.line(`lista na końcu:\n  ${await backupRows(run)}`)
    log.line(`pre-import: ${readdirSync(pre).sort().join(', ')}`)
    log.line(`inne rodzaje: ${['daily', 'weekly', 'manual'].map((k) => `${k}: ${existsSync(join(dataDir, 'backups', k)) ? readdirSync(join(dataDir, 'backups', k)).join(',') : '-'}`).join('; ')}`)
    log.line(`okna wyboru: ${(await picks(run)).length}`)
    void app
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.13 – kopia przed migracją formatu', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-13'
  const log = new Log(NAME)
  // Variant 1: fi.json of format v0 (no schemaVersion) with an unknown field; the open slowed – „Przerwij” in the migration.
  let fiBefore = ''
  let originals = new Map<string, string>()
  const { dataDir } = useState('rok', NAME)
  {
    const fi = readJson(join(dataDir, 'fi.json'))!
    delete fi.schemaVersion
    fi['x-audyt'] = { uwaga: 'pole nieznane aplikacji', liczba: 7 }
    writeJson(join(dataDir, 'fi.json'), fi)
    fiBefore = readFileSync(join(dataDir, 'fi.json'), 'utf8')
    originals = dataSums(dataDir)
  }
  const run = await start(NAME, { dataDir, env: { ...PROD_FREEZE, FI_OPEN_DELAY_MS: '60', FI_OPEN_SLOW_MS: '5000' } })
  await trap(run, log)
  const steps = new Set<string>()
  for (let i = 0; i < 400 && !(await run.page.getByTestId('page-bridge').count()); i++) {
    const p = run.page.getByTestId('open-progress')
    if (await p.count()) {
      const step = (await run.page.getByTestId('open-progress-step').innerText().catch(() => '')).replace(/\s+/g, ' ')
      const cancel = await run.page.getByTestId('open-cancel').isEnabled().catch(() => null)
      steps.add(`${step.replace(/\d+/g, 'N')} | Przerwij aktywny: ${cancel}`)
    }
    await sleep(150)
  }
  for (const s of steps) log.line(`postęp: ${s}`)
  await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await run.page.waitForTimeout(1500)
  try {
    log.line(`banery: ${await banners(run.page)}`)
    await log.shot(run.page, 'DA.13-baner')
    const pm = join(dataDir, 'backups', 'pre-migration')
    const list = existsSync(pm) ? readdirSync(pm) : []
    log.line(`pre-migration: ${list.join(', ') || 'BRAK'}`)
    const zip = list.find((n) => n.endsWith('.zip'))
    if (zip) {
      const z = await zipEntries(join(pm, zip))
      log.line(`ZIP: ${z.size} plików; fi.json w ZIP = oryginał: ${z.get('fi.json') === originals.get('fi.json')}`)
      const d = diff(originals, z)
      log.line(`ZIP vs oryginały: brak ${d.removed.length}, nadmiar ${d.added.length}, inne ${d.changed.length} ${d.changed.slice(0, 5).join(', ')}`)
    }
    const fi = readJson(join(dataDir, 'fi.json'))!
    log.line(`fi.json po: schemaVersion=${fi.schemaVersion}, x-audyt=${JSON.stringify(fi['x-audyt'])}, zmieniony: ${readFileSync(join(dataDir, 'fi.json'), 'utf8') !== fiBefore}`)
    await goFolderTab(run.page)
    log.line(`lista:\n  ${await backupRows(run)}`)
    log.line(`main.log:\n${mainLog(run, /migra|open/i, 20)}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  // Variant 2: one operation without schemaVersion.
  const NAME2 = 'da-13b'
  let opRel = ''
  let opBefore = ''
  const r2 = await openRok(NAME2, {
    log,
    prepare: (dir) => {
      const op = byId(dir, OP.mokka)
      opRel = op.rel
      const rec = { ...op.rec, 'x-audyt': 'zostań' }
      delete (rec as Record<string, unknown>).schemaVersion
      writeJson(op.path, rec)
      opBefore = readFileSync(op.path, 'utf8')
    }
  })
  try {
    log.line(`wariant 2 – banery: ${await banners(r2.run.page)}`)
    await log.shot(r2.run.page, 'DA.13-wariant2')
    const pm = join(r2.dataDir, 'backups', 'pre-migration')
    const walk = (d: string, pre = ''): string[] => (existsSync(d) ? readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n), `${pre}${n}/`) : [`${pre}${n}`])) : [])
    const items = walk(pm)
    log.line(`pre-migration: ${items.join(', ') || 'BRAK'}`)
    const orig = items.find((n) => n.endsWith('.json'))
    if (orig) log.line(`oryginał w kopii = plik sprzed: ${readFileSync(join(pm, orig), 'utf8') === opBefore}`)
    const after = readJson(join(r2.dataDir, opRel))!
    log.line(`operacja po: schemaVersion=${after.schemaVersion}, x-audyt=${after['x-audyt']}`)
    await goFolderTab(r2.run.page)
    log.line(`lista:\n  ${await backupRows(r2.run)}`)
  } finally {
    await r2.run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.14 – własny folder kopii', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-14'
  const log = new Log(NAME)
  const kopie = join(runDir(NAME), 'kopie')
  rmSync(kopie, { recursive: true, force: true })
  const startCopy = useState('start', `${NAME}-start`).dataDir
  const ictj = join(runDir(NAME), 'ictj')
  rmSync(ictj, { recursive: true, force: true })
  cpSync(join(LAB, 'stany', 'ictj-rok'), ictj, { recursive: true })
  const ictjBefore = checksums(ictj, true)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  const tree = (d: string): string => {
    const walk = (x: string, pre = ''): string[] => (existsSync(x) ? readdirSync(x).flatMap((n) => (statSync(join(x, n)).isDirectory() ? walk(join(x, n), `${pre}${n}/`) : [`${pre}${n}`])) : [])
    return walk(d).join(', ')
  }
  try {
    await goFolderTab(page)
    await log.step('zmień folder kopii → kopie', async () => {
      await pick(run, { paths: [kopie] })
      await page.getByRole('button', { name: 'Zmień folder kopii…' }).click()
      await page.waitForTimeout(3000)
      log.line(`toasty: ${await toasts(page)}`)
      await log.screen(page, 'panel kopii', 'main')
      await page.getByTestId('backup-now').click()
      await page.waitForTimeout(3000)
      log.line(`„Kopia teraz”: ${await toasts(page)}`)
      log.line(`kopie: ${tree(kopie)}`)
      log.line(`backups w folderze danych: ${tree(join(dataDir, 'backups'))}`)
      await log.shot(page, 'DA.14-wlasny')
    })
    await log.step('Synchronizacja', async () => {
      await page.getByTestId('nav-sync').click()
      await page.waitForTimeout(800)
      const t = await page.locator('main').innerText()
      log.line(`Synchronizacja – wiersze o kopiach: ${t.split('\n').filter((l) => /kopi|backup/i.test(l)).join(' | ')}`)
    })
    await log.step('zmiana folderu danych na start', async () => {
      await goFolderTab(page)
      await pick(run, { paths: [startCopy] })
      await page.getByRole('button', { name: 'Otwórz inny folder…' }).click()
      await expect(page.getByTestId('settings-data-dir')).toContainText('start', { timeout: 120_000 })
      await page.waitForTimeout(3000)
      log.line(`folder: ${await page.getByTestId('settings-data-dir').innerText()}; toasty: ${await toasts(page)}`)
      await page.getByTestId('backup-now').click()
      await page.waitForTimeout(3000)
      log.line(`„Kopia teraz”: ${await toasts(page)}`)
      log.line(`kopie: ${tree(kopie)}`)
      await log.screen(page, 'panel kopii (start)', 'main')
    })
    await log.step('folder kopii w ICTTJ', async () => {
      await pick(run, { paths: [join(ictj, 'payouts')] })
      await page.getByRole('button', { name: 'Zmień folder kopii…' }).click()
      await page.waitForTimeout(2500)
      log.line(`payouts – toasty: ${await toasts(page)}`)
      await pick(run, { paths: [ictj] })
      await page.getByRole('button', { name: 'Zmień folder kopii…' }).click()
      await page.waitForTimeout(2500)
      log.line(`ictj – toasty: ${await toasts(page)}`)
      await log.shot(page, 'DA.14-ictj')
    })
    await log.step('domyślny', async () => {
      await page.getByRole('button', { name: 'Domyślny (backups/ w folderze danych)' }).click()
      await page.waitForTimeout(2500)
      log.line(`toasty: ${await toasts(page)}`)
      await log.screen(page, 'panel kopii (domyślny)', 'main')
      log.line(`kopie po powrocie do domyślnego: ${tree(kopie)}`)
    })
    log.line(`fi.json rok zawiera 'kopie': ${readFileSync(join(dataDir, 'fi.json'), 'utf8').includes('kopie')}; start: ${readFileSync(join(startCopy, 'fi.json'), 'utf8').includes('kopie')}`)
    log.line(`config.json backupDirOverride: ${JSON.stringify(readJson(join(run.userData, 'config.json'))?.backupDirOverride)}`)
    log.line(`okna wyboru: ${(await picks(run)).join(' | ')}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'ICTTJ po', diff(ictjBefore, checksums(ictj, true)))
})

test('DA.15 – nieudana kopia i plik nieczytelny', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-15'
  const log = new Log(NAME)
  const kx = join(runDir(NAME), 'kopie-x')
  rmSync(kx, { recursive: true, force: true })
  const { run, dataDir } = await openRok(NAME, { log })
  try {
    await goFolderTab(run.page)
    await pick(run, { paths: [kx] })
    await run.page.getByRole('button', { name: 'Zmień folder kopii…' }).click()
    await run.page.waitForTimeout(2500)
    log.line(`folder kopii ustawiony: ${await toasts(run.page)}; zawartość: ${existsSync(kx) ? readdirSync(kx).join(', ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  // (a1) the folder of backups deleted from outside, the app started again.
  rmSync(kx, { recursive: true, force: true })
  let r = await reopen(NAME, dataDir, { log })
  try {
    await sleep(3000)
    await goFolderTab(r.page)
    log.line(`(a1) po usunięciu folderu kopii: istnieje znowu ${existsSync(kx)}; ${existsSync(kx) ? readdirSync(kx).join(', ') : ''}`)
    log.line(`(a1) błąd kopii: ${await r.page.getByTestId('backup-failure').innerText().catch(() => '(brak)')}`)
    log.line(`(a1) wiek: ${await r.page.getByTestId('backup-age').innerText().catch(() => '(brak)')}`)
  } finally {
    await r.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  // (a2) a folder of backups on a drive that is gone (Z: – no such drive here).
  const cfgPath = join(runDir(NAME), 'userdata', 'config.json')
  const cfg = readJson(cfgPath)!
  cfg.backupDirOverride = 'Z:\\FI-kopie'
  writeJson(cfgPath, cfg)
  r = await reopen(NAME, dataDir, { log })
  try {
    await sleep(3000)
    await goFolderTab(r.page)
    log.line(`(a2) błąd kopii: ${await r.page.getByTestId('backup-failure').innerText().catch(() => '(brak)')}`)
    log.line(`(a2) wiek: ${await r.page.getByTestId('backup-age').innerText().catch(() => '(brak)')}`)
    await log.screen(r.page, '(a2) panel kopii', 'main')
    await log.shot(r.page, 'DA.15a-blad')
    log.line(`(a2) main.log: ${mainLog(r, /kopi|backup/i, 6)}`)
    // A working folder again and a manual backup: the warning goes?
    await r.page.getByRole('button', { name: 'Domyślny (backups/ w folderze danych)' }).click()
    await r.page.waitForTimeout(2000)
    await r.page.getByTestId('backup-now').click()
    await r.page.waitForTimeout(3000)
    log.line(`(a2) po „Domyślny” i „Kopia teraz”: ${await toasts(r.page)}; błąd kopii: ${await r.page.getByTestId('backup-failure').innerText().catch(() => '(brak)')}`)
    await log.shot(r.page, 'DA.15a-po-kopii')
    // (b) an operation's file held by another process.
    const op = byId(dataDir, OP.mokka)
    const manual = join(dataDir, 'backups', 'manual')
    const before = readdirSync(manual).sort()
    const release = await holdFile(op.path)
    log.line(`(b) plik zablokowany: ${op.rel}`)
    try {
      const t0 = Date.now()
      await r.page.getByTestId('backup-now').click()
      let said = ''
      for (let i = 0; i < 60 && !said; i++) {
        await sleep(1000)
        said = await toasts(r.page)
      }
      log.line(`(b) „Kopia teraz” przy blokadzie: po ${Math.round((Date.now() - t0) / 1000)} s – ${said || '(cisza)'}`)
      await sleep(5000)
      log.line(`(b) toasty po 5 s: ${await toasts(r.page)}`)
      await log.shot(r.page, 'DA.15b-blokada')
      const now = readdirSync(manual).sort()
      log.line(`(b) manual/ przed ${before.join(', ')}; po ${now.join(', ')}; pliki tymczasowe: ${readdirSync(manual).filter((n) => !n.endsWith('.zip') || n.startsWith('.')).join(', ') || 'brak'}`)
      log.line(`(b) lista:\n  ${await backupRows(r)}`)
      log.line(`(b) okno odpowiada: ${await r.page.evaluate(() => 1 + 1).catch(() => 'NIE')}`)
    } finally {
      release()
    }
    await sleep(2000)
    await r.page.getByTestId('backup-now').click()
    await sleep(4000)
    log.line(`(b) po zwolnieniu: ${await toasts(r.page)}; manual/: ${readdirSync(manual).sort().join(', ')}`)
    log.line(`main.log: ${mainLog(r, /kopi|backup|EBUSY|zablok/i, 10)}`)
  } finally {
    await r.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})
