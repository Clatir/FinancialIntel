/**
 * Audit DA – two computers, one after the other (DA.32–DA.36, DA.44): DOM-PC and LAPTOP with their own user data, the
 * other computer's changes and presence written from outside. Observation only: C:\FI-audyt\przebiegi\da-*\da.log.
 */
import { existsSync, readdirSync, rmSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { reading, recorded, useWindow, useState, start } from './lab'
import {
  OP,
  byId,
  Log,
  PROD_FREEZE,
  answerQuestions,
  banners,
  findOp,
  goFolderTab,
  goSync,
  openOp,
  openRok,
  pick,
  readJson,
  recordFiles,
  reopen,
  rescan,
  sleep,
  toasts,
  trap,
  trapped,
  typeAmount,
  writeJson
} from './da-pomoc'

const later = (ms = 30_000) => new Date(Date.now() + ms).toISOString()
const bridgeNums = async (page: Page): Promise<Record<string, string>> => {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(1200)
  const t = await page.getByTestId('page-bridge').innerText()
  const g = (re: RegExp) => t.match(re)?.[1]?.trim() ?? '?'
  return {
    energia: g(/ENERGIA DZIŚ\n([^\n]+)/),
    przydzial: g(/\n(przydział [^\n]+)/),
    oslony: g(/Osłony\n[^\n]+\n([^\n]+)/),
    energiaWarstwa: g(/Energia\n· pensja[^\n]+\n([^\n]+)/),
    kadlub: g(/Kadłub\n[^\n]+\n([^\n]+)/),
    cele: g(/Układy gwiezdne\n[^\n]+\n([^\n]+)/),
    zbiorniki: g(/Zbiorniki\n[^\n]+\n([^\n]+)/),
    depozyt: g(/Depozyt domowników\n[^\n]+\n([^\n]+)/),
    lupy: g(/Łupy\n[^\n]+\n([^\n]+)/),
    zasieg: g(/ZASIĘG\n([^\n]+)/),
    suma: g(/Suma kont budżetu: ([^\n]+)/)
  }
}

/** The other computer's presence written from outside, refreshed every few seconds with times relative to now. */
function presenceWriter(dataDir: string, make: () => Record<string, unknown>): { stop: () => void; set: (m: () => Record<string, unknown>) => void } {
  let maker = make
  const write = () => writeJson(join(dataDir, '.presence', 'LAPTOP.json'), maker())
  write()
  const t = setInterval(write, 3000)
  return {
    stop: () => clearInterval(t),
    set: (m) => {
      maker = m
      write()
    }
  }
}

test('DA.32 – zmiany z drugiego komputera w trakcie pracy', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-32'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log, machine: 'DOM-PC' })
  const { page } = run
  try {
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-general').click()
    log.line(`panel: ${(await page.locator('main').innerText()).split('\n').filter((l) => /komputer|Scalaj|pytaj/i.test(l)).slice(0, 4).join(' | ')}`)
    await log.step('(a) „Scalaj”: zmiana z zewnątrz', async () => {
      const op = byId(dataDir, OP.cinema)
      await openOp(page, 'CINEMA CITY', OP.cinema)
      log.line(`edytor przed: ${await page.getByTestId('operation-amount').inputValue()}`)
      writeJson(op.path, { ...op.rec, amount: -7010, note: 'z laptopa (a)', updatedAt: later(), updatedBy: 'LAPTOP' })
      const t0 = Date.now()
      let v = ''
      for (let i = 0; i < 45; i++) {
        await sleep(1000)
        v = await page.getByTestId('operation-amount').inputValue().catch(() => '?')
        if (/70,10/.test(v)) break
      }
      log.line(`po ${Math.round((Date.now() - t0) / 1000)} s edytor: ${v}; notatka „${await page.getByTestId('operation-note').inputValue().catch(() => '?')}”; okno zmian: ${await page.getByTestId('remote-dialog').count()}; toasty ${await toasts(page)}`)
      log.line(`plik: ${JSON.stringify({ a: readJson(op.path)!.amount, n: readJson(op.path)!.note, by: readJson(op.path)!.updatedBy })}`)
    })
    await log.step('(b) „Zawsze pytaj”', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-general').click()
      await page.getByRole('radio', { name: 'Zawsze pytaj przed przyjęciem zmian' }).click()
      await page.waitForTimeout(1500)
      log.line(`fi.json sync: ${JSON.stringify(readJson(join(dataDir, 'fi.json'))!.settings.sync)}`)
      const op = byId(dataDir, OP.zoo)
      writeJson(op.path, { ...op.rec, amount: -18888, note: 'z laptopa (b)', updatedAt: later(), updatedBy: 'LAPTOP' })
      const dialog = page.getByTestId('remote-dialog')
      await dialog.waitFor({ timeout: 45_000 }).catch(() => undefined)
      log.line(`okno: ${(await dialog.innerText().catch(() => '(brak okna)')).replace(/\n+/g, ' ⏎ ').slice(0, 1500)}`)
      await dialog.locator('details summary').first().click().catch(() => undefined)
      await page.waitForTimeout(400)
      log.line(`różnice: ${(await dialog.locator('details').first().innerText().catch(() => '')).replace(/\n+/g, ' ⏎ ')}`)
      log.line(`przyciski: ${(await dialog.locator('button').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ')).join(' | ')}`)
      await log.shot(page, 'DA.32b-okno')
      // DA.22: the history of an entry from this dialog; Esc closes only the history.
      const hist = dialog.getByTestId('history-open').first()
      if (await hist.count()) {
        await hist.click()
        await page.waitForTimeout(800)
        log.line(`DA.22 – historia z okna zmian: ${(await page.getByTestId('history-dialog').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 500)}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
        log.line(`DA.22 – po Esc: historia ${await page.getByTestId('history-dialog').count()}, okno zmian ${await dialog.count()}`)
      } else log.line('DA.22 – w oknie zmian brak przycisku Historii')
      await dialog.getByRole('button', { name: 'Później' }).click()
      await page.waitForTimeout(800)
      log.line(`po „Później”: chip „${await page.getByTestId('remote-chip').innerText().catch(() => '(brak)')}”; plik ${readJson(op.path)!.amount}`)
      await log.shot(page, 'DA.32b-chip')
      await page.getByTestId('remote-chip').click()
      await page.waitForTimeout(600)
      await dialog.getByRole('radio', { name: 'Przyjmij zmiany' }).click()
      await dialog.getByTestId('remote-apply').click()
      await page.waitForTimeout(2000)
      const r = readJson(op.path)!
      log.line(`po „Zastosuj” (Przyjmij zmiany): plik amount ${r.amount}, note „${r.note}”, updatedBy ${r.updatedBy}; chip ${await page.getByTestId('remote-chip').count()}; toasty ${await toasts(page)}`)
    })
    await log.step('(c) usunięty z zewnątrz → „Zachowaj (przywróć plik)”', async () => {
      const op = byId(dataDir, OP.bolt)
      unlinkSync(op.path)
      const dialog = page.getByTestId('remote-dialog')
      await dialog.waitFor({ timeout: 45_000 }).catch(() => undefined)
      log.line(`okno: ${(await dialog.innerText().catch(() => '(brak okna)')).replace(/\n+/g, ' ⏎ ').slice(0, 800)}`)
      await log.shot(page, 'DA.32c-okno')
      await dialog.getByRole('radio', { name: 'Zachowaj (przywróć plik)' }).click()
      await dialog.getByTestId('remote-apply').click()
      await page.waitForTimeout(2500)
      log.line(`po „Zastosuj”: plik istnieje ${existsSync(op.path)}; ${existsSync(op.path) ? JSON.stringify({ a: readJson(op.path)!.amount, by: readJson(op.path)!.updatedBy }) : ''}; toasty ${await toasts(page)}`)
    })
    await log.step('(c2) „Scalaj”: usunięty z zewnątrz', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-general').click()
      await page.getByRole('radio', { name: 'Scalaj zmiany, pytaj tylko przy konflikcie' }).click()
      await page.waitForTimeout(1500)
      const op = byId(dataDir, OP.netia)
      unlinkSync(op.path)
      await sleep(15_000)
      log.line(`okno: ${(await page.getByTestId('remote-dialog').innerText().catch(() => '(brak okna)')).replace(/\n+/g, ' ⏎ ').slice(0, 600)}; plik istnieje ${existsSync(op.path)}`)
      await openOp(page, 'NETIA SA', OP.netia).catch((e) => log.line(`NETIA w Operacjach: ${(e as Error).message.split('\n')[0]}`))
      log.line(`NETIA na liście: ${await page.locator('[data-testid="operation-row"]', { hasText: 'NETIA' }).count()}`)
      await sleep(20_000)
      log.line(`po 35 s plik NETIA istnieje: ${existsSync(op.path)}`)
    })
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.33 – dwa komputery po kolei', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-33'
  const log = new Log(NAME)
  const { run: pc, dataDir } = await openRok(`${NAME}-dom`, { log, machine: 'DOM-PC' })
  const filesBefore = new Set(recordFiles(dataDir, 'transactions', true).map((f) => f.rel))
  try {
    const b0 = await bridgeNums(pc.page)
    log.line(`DOM-PC Mostek na starcie: ${JSON.stringify(b0)}`)
    await pc.page.keyboard.press('Control+2')
    await pc.page.keyboard.press('Control+n')
    await typeAmount(pc.page, 'operation-amount', '23,45')
    await pc.page.getByTestId('operation-counterparty').fill('Zakup z DOM-PC')
    await pc.page.getByTestId('operation-counterparty').press('Enter')
    await pc.page.waitForTimeout(1000)
    await pc.page.keyboard.press('Control+4')
    const env = pc.page.locator('[data-testid="month-envelope"][data-name="Osobiste"] input')
    await env.click()
    await env.fill('380')
    await env.press('Enter')
    await pc.page.waitForTimeout(1000)
    await pc.page.keyboard.press('Control+,')
    await pc.page.getByTestId('settings-tab-accounts').click()
    const row = pc.page.locator('[data-testid="account-row"][data-name="Portfel XTB"]')
    const bal = (await row.getByTestId('account-balance').innerText()).replace(/\s|zł/g, '').replace('−', '-')
    log.line(`Portfel XTB saldo: ${bal}`)
    await row.getByTestId('account-confirm-amount').click()
    await row.getByTestId('account-confirm-amount').fill(bal)
    await row.getByTestId('account-confirm-amount').press('Enter')
    await row.getByTestId('account-confirm').click()
    await pc.page.waitForTimeout(1500)
    log.line(`potwierdzenie: ${await toasts(pc.page)}; ${(await row.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`)
    const b1 = await bridgeNums(pc.page)
    log.line(`DOM-PC Mostek po zmianach: ${JSON.stringify(b1)}`)
    reading('da', 'DA.33', 'rok+DOM-PC', { komputer: 'DOM-PC', ...b1 })
  } finally {
    await pc.app.close().catch((e) => log.line(`zamknięcie DOM-PC: ${(e as Error).message}`))
  }
  const lap = await reopen(`${NAME}-laptop`, dataDir, { log, machine: 'LAPTOP', fresh: true })
  try {
    const b2 = await bridgeNums(lap.page)
    log.line(`LAPTOP Mostek po starcie: ${JSON.stringify(b2)}`)
    reading('da', 'DA.33', 'rok+DOM-PC (LAPTOP)', { komputer: 'LAPTOP', ...b2 })
    await openOp(lap.page, 'Zakup z DOM-PC')
    log.line(`LAPTOP widzi operację DOM-PC: ${await lap.page.getByTestId('operation-amount').inputValue()}`)
    await lap.page.keyboard.press('Control+4')
    log.line(`LAPTOP koperta Osobiste: ${await lap.page.locator('[data-testid="month-envelope"][data-name="Osobiste"] input').inputValue()}`)
    await lap.page.keyboard.press('Control+,')
    await lap.page.getByTestId('settings-tab-layers').click()
    const sh = lap.page.getByTestId('layers-shields')
    log.line(`LAPTOP cel osłon przed: ${await sh.inputValue().catch(() => '?')}`)
    await sh.click()
    await sh.fill('4')
    await sh.press('Enter')
    await lap.page.waitForTimeout(1500)
    log.line(`fi.json layers: ${JSON.stringify(readJson(join(dataDir, 'fi.json'))!.settings.layers)}, updatedBy ${readJson(join(dataDir, 'fi.json'))!.updatedBy}`)
    const b3 = await bridgeNums(lap.page)
    log.line(`LAPTOP Mostek po zmianie celu osłon: ${JSON.stringify(b3)}`)
    reading('da', 'DA.33', 'rok+DOM-PC+LAPTOP (LAPTOP)', { komputer: 'LAPTOP', ...b3 })
  } finally {
    await lap.app.close().catch((e) => log.line(`zamknięcie LAPTOP: ${(e as Error).message}`))
  }
  const pc2 = await reopen(`${NAME}-dom`, dataDir, { log, machine: 'DOM-PC' })
  try {
    const b4 = await bridgeNums(pc2.page)
    log.line(`DOM-PC Mostek po powrocie: ${JSON.stringify(b4)}`)
    reading('da', 'DA.33', 'rok+DOM-PC+LAPTOP (DOM-PC)', { komputer: 'DOM-PC', ...b4 })
    await goSync(pc2.page)
    log.line(`Synchronizacja: ${(await pc2.page.locator('main').innerText()).split('\n').filter((l) => /Ostatnia zmiana|Konflikty|komputer/i.test(l)).join(' | ')}`)
    log.line(`banery: ${await banners(pc2.page)}`)
    await pc2.page.keyboard.press('Control+,')
    await pc2.page.getByTestId('settings-tab-layers').click()
    log.line(`DOM-PC cel osłon: ${await pc2.page.getByTestId('layers-shields').inputValue().catch(() => '?')}`)
    await log.shot(pc2.page, 'DA.33-dom-powrot')
  } finally {
    await pc2.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  // The files: who wrote what, copies, duplicates.
  const all = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? (n.startsWith('.') || n === 'backups' ? [] : all(join(dir, n)).map((x) => `${n}/${x}`)) : [n]))
  const files = all(dataDir)
  log.line(`kopie konfliktu: ${files.filter((f) => /-(DOM-PC|LAPTOP|AUDYT)[^/]*\.json$/.test(f)).join(', ') || 'brak'}`)
  log.line(`months 2026-11*: ${readdirSync(join(dataDir, 'months')).filter((n) => n.startsWith('2026-11')).join(', ')}; game: ${readdirSync(join(dataDir, 'game')).join(', ')}`)
  const added = recordFiles(dataDir, 'transactions', true).filter((f) => !filesBefore.has(f.rel))
  log.line(`nowe operacje: ${added.map((f) => `${f.rel} ${f.rec.counterparty} ${f.rec.updatedBy}`).join(' | ')}`)
  log.line(`months/2026-11.json updatedBy ${readJson(join(dataDir, 'months', '2026-11.json'))!.updatedBy}; fi.json updatedBy ${readJson(join(dataDir, 'fi.json'))!.updatedBy}`)
  log.line(`balances (dziś): ${recordFiles(dataDir, 'balances').filter((f) => f.rec.date === '2026-11-03').map((f) => `${f.rel} ${f.rec.kind} ${f.rec.amount} ${f.rec.updatedBy}`).join(' | ')}`)
  log.line(`presence: ${existsSync(join(dataDir, '.presence')) ? readdirSync(join(dataDir, '.presence')).join(', ') : 'brak'}`)
})

test('DA.34 – obecność i „w użyciu”', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-34'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log, machine: 'DOM-PC' })
  const { page } = run
  const iso = (agoMs: number) => new Date(Date.now() - agoMs).toISOString()
  const variants: Array<[string, () => Record<string, unknown>]> = [
    ['(1) sygnał i ruch teraz', () => ({ machine: 'LAPTOP', lastSeen: iso(0), appVersion: '1.15.4', activeAt: iso(0) })],
    ['(2) sygnał teraz, ruch sprzed 15 min', () => ({ machine: 'LAPTOP', lastSeen: iso(0), appVersion: '1.15.4', activeAt: iso(15 * 60_000) })],
    ['(3) wersja sprzed 1.5.3 bez ruchu, sygnał sprzed 2 min', () => ({ machine: 'LAPTOP', lastSeen: iso(2 * 60_000), appVersion: '1.5.2' })],
    ['(4) sygnał sprzed 12 min', () => ({ machine: 'LAPTOP', lastSeen: iso(12 * 60_000), appVersion: '1.15.4', activeAt: iso(12 * 60_000) })]
  ]
  const w = presenceWriter(dataDir, variants[0]![1])
  try {
    for (const [label, make] of variants) {
      await log.step(label, async () => {
        w.set(make)
        await sleep(68_000)
        await goSync(page)
        const machines = (await page.getByTestId('sync-machine').allInnerTexts().catch(() => [] as string[])).map((t) => t.replace(/\s+/g, ' '))
        log.line(`Synchronizacja → Inne komputery: ${machines.join(' || ') || '(brak)'}`)
        log.line(`  panel: ${(await page.locator('main').innerText()).split('\n').filter((l) => /w użyciu|w zasobniku|sygnał|ruch|Inne komputery|Ostatnia zmiana/i.test(l)).join(' | ')}`)
        log.line(`banery: ${await banners(page)}`)
        await page.keyboard.press('Control+,')
        await page.getByTestId('settings-tab-general').click()
        log.line(`Ustawienia → Okręt: ${await page.getByTestId('settings-other-machines').innerText().catch(() => '(brak)')}`)
        await log.shot(page, `DA.34-${label.slice(1, 2)}`)
        await useWindow(page)
      })
    }
  } finally {
    w.stop()
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.35 – zapisy w tle tylko na komputerze w użyciu', async () => {
  test.setTimeout(35 * 60_000)
  const NAME = 'da-35'
  const log = new Log(NAME)
  const { dataDir, ictjDir } = useState('rok', NAME)
  // Game days to freeze: the last freezing 3 days ago (31.10, 01.11 and 02.11 open).
  const g10 = readJson(join(dataDir, 'game', '2026-10.json'))!
  delete g10.days['2026-10-31']
  writeJson(join(dataDir, 'game', '2026-10.json'), g10)
  const g11 = readJson(join(dataDir, 'game', '2026-11.json'))!
  delete g11.days['2026-11-01']
  writeJson(join(dataDir, 'game', '2026-11.json'), g11)
  // An ICTTJ goal changed in ICTTJ (40 000 → 45 000): FI's goal to rewrite.
  const fc = join(ictjDir!, 'forecasts', '01KAZ710000000000000000001.json')
  const f = readJson(fc)!
  f.goals[0].amount = 45000
  f.updatedAt = new Date().toISOString()
  writeJson(fc, f)
  const stamp = () => {
    const files = [...['2026-10.json', '2026-11.json'].map((n) => join('game', n)), ...readdirSync(join(dataDir, 'goals')).map((n) => join('goals', n))]
    return files.map((r) => `${r.replace(/\\/g, '/')}@${existsSync(join(dataDir, r)) ? new Date(statSync(join(dataDir, r)).mtimeMs).toISOString().slice(11, 19) : '-'}`).join(' ')
  }
  const frozen = () => {
    const d10 = readJson(join(dataDir, 'game', '2026-10.json'))!.days
    const d11 = readJson(join(dataDir, 'game', '2026-11.json'))!.days
    const goal = readJson(join(dataDir, 'goals', '01KAZ720000000000000000001.json'))!
    return `31.10 ${d10['2026-10-31'] ? 'zamrożony' : '-'}, 01.11 ${d11['2026-11-01'] ? 'zamrożony' : '-'}, 02.11 ${d11['2026-11-02'] ? 'zamrożony' : '-'}; cel ICTTJ target ${goal.target} (${goal.updatedBy})`
  }
  log.line(`start: ${frozen()}\n  ${stamp()}`)
  const iso = (agoMs: number) => new Date(Date.now() - agoMs).toISOString()
  const w = presenceWriter(dataDir, () => ({ machine: 'LAPTOP', lastSeen: iso(0), appVersion: '1.15.4', activeAt: iso(0) }))
  const run = await start(NAME, { dataDir, ictjDir, machine: 'DOM-PC', idle: true, env: PROD_FREEZE })
  await trap(run, log)
  const t0 = Date.now()
  try {
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    // Left alone in the tray: the window hidden as „Zamykaj do zasobnika” hides it.
    await run.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((x) => x.close()))
    await sleep(1500)
    log.line(`okno widoczne: ${await run.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((x) => x.isVisible()))}`)
    log.line(`obecność DOM-PC: ${JSON.stringify(readJson(join(dataDir, '.presence', 'DOM-PC.json')))}`)
    for (let m = 1; m <= 15; m++) {
      await sleep(60_000)
      log.line(`${m} min (LAPTOP w użyciu, DOM-PC w zasobniku): ${frozen()}`)
    }
    log.line(`  ${stamp()}`)
    log.line(`obecność DOM-PC: ${JSON.stringify(readJson(join(dataDir, '.presence', 'DOM-PC.json')))}`)
    // The window shown, the mouse moved; LAPTOP stops beating.
    w.stop()
    await run.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((x) => x.show()))
    await run.page.waitForFunction(() => document.visibilityState === 'visible', null, { timeout: 30_000 })
    await useWindow(run.page)
    const t1 = Date.now()
    log.line(`okno pokazane po ${Math.round((t1 - t0) / 1000)} s od otwarcia`)
    for (let s = 0; s < 30; s++) {
      await sleep(10_000)
      if (s % 3 === 2) await useWindow(run.page)
      const fz = frozen()
      if (s % 6 === 5 || /zamrożony/.test(fz)) log.line(`${(s + 1) * 10} s po pokazaniu: ${fz}`)
      if (/31\.10 zamrożony.*02\.11 zamrożony/.test(fz) && /4500000/.test(fz)) break
    }
    log.line(`  ${stamp()}`)
    log.line(`toasty (laboratorium): ${JSON.stringify((await recorded(run.app)).toasts.map((t) => t.title))}`)
  } finally {
    w.stop()
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.36 – powiadomienia bez podwójnych', async () => {
  test.setTimeout(25 * 60_000)
  const NAME = 'da-36'
  const log = new Log(NAME)
  const { dataDir, ictjDir } = useState('rok', NAME)
  const iso = (agoMs: number) => new Date(Date.now() - agoMs).toISOString()
  const w = presenceWriter(dataDir, () => ({ machine: 'LAPTOP', lastSeen: iso(0), appVersion: '1.15.4', activeAt: iso(0) }))
  let run = await start(NAME, { dataDir, ictjDir, machine: 'DOM-PC', idle: true, env: PROD_FREEZE })
  await trap(run, log)
  const titles = async () => (await recorded(run.app)).toasts.map((t) => `${t.at.slice(11, 19)} ${t.title}: ${t.body}`)
  try {
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await sleep(5000)
    log.line(`na starcie (okno pokazane = w użyciu wg aplikacji):\n  ${(await titles()).join('\n  ')}`)
    const n0 = (await titles()).length
    await run.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach((x) => x.close()))
    await sleep(70_000)
    // A reason today, while LAPTOP is in use: 300 zł on food today (over the day's allowance), written as LAPTOP's.
    const base = byId(dataDir, OP.mokka).rec
    writeJson(join(dataDir, 'transactions', '2026', '2026-11-03_01KQDA36000000000000000001.json'), { ...base, id: '01KQDA36000000000000000001', counterparty: 'Restauracja z laptopa', amount: -30000, time: '12:30', updatedAt: iso(0), updatedBy: 'LAPTOP', createdAt: iso(0) })
    await sleep(150_000)
    const t1 = await titles()
    log.line(`po 2,5 min (LAPTOP w użyciu, DOM-PC w zasobniku): nowych ${t1.length - n0}\n  ${t1.slice(n0).join('\n  ')}`)
    // LAPTOP into the tray; a new reason: an envelope over its limit (Zwierzęta 200 zł → 250 zł).
    w.set(() => ({ machine: 'LAPTOP', lastSeen: iso(0), appVersion: '1.15.4', activeAt: iso(15 * 60_000) }))
    await sleep(70_000)
    writeJson(join(dataDir, 'transactions', '2026', '2026-11-03_01KQDA36000000000000000002.json'), { ...base, id: '01KQDA36000000000000000002', accountId: '01KDEFACC00000000000000003', counterparty: 'Weterynarz z laptopa', categoryId: '01KDEFCAT00000000000000401', amount: -25000, time: '12:40', updatedAt: iso(0), updatedBy: 'LAPTOP', createdAt: iso(0) })
    await sleep(150_000)
    const t2 = await titles()
    log.line(`po 2,5 min (żaden w użyciu): nowych ${t2.length - t1.length}\n  ${t2.slice(t1.length).join('\n  ')}`)
  } finally {
    w.stop()
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  run = await start(NAME, { dataDir, ictjDir, machine: 'DOM-PC', idle: true, fresh: false, env: PROD_FREEZE })
  await trap(run, log)
  try {
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await sleep(8000)
    log.line(`po ponownym uruchomieniu:\n  ${(await titles()).join('\n  ') || '(brak powiadomień)'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.44 – zamknięcie przy czekającej decyzji', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-44'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, {
    log,
    machine: 'DOM-PC',
    prepare: (dir) => {
      const fi = readJson(join(dir, 'fi.json'))!
      fi.settings.sync.remoteChanges = 'ask'
      writeJson(join(dir, 'fi.json'), fi)
    }
  })
  const { page } = run
  const op = byId(dataDir, OP.cinema)
  const start2 = useState('start', `${NAME}-start`).dataDir
  try {
    await openOp(page, 'CINEMA CITY', OP.cinema)
    writeJson(op.path, { ...op.rec, amount: -7020, note: 'z laptopa', updatedAt: later(), updatedBy: 'LAPTOP' })
    const dialog = page.getByTestId('remote-dialog')
    await dialog.waitFor({ timeout: 45_000 })
    await dialog.getByRole('button', { name: 'Później' }).click()
    await page.waitForTimeout(800)
    log.line(`chip: ${await page.getByTestId('remote-chip').innerText().catch(() => '(brak)')}`)
    // The same entry changed here.
    await page.getByTestId('operation-note').click()
    await page.getByTestId('operation-note').fill('zmiana tutaj')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(1500)
    log.line(`po zmianie tutaj: plik ${JSON.stringify({ a: readJson(op.path)!.amount, n: readJson(op.path)!.note })}; toasty ${await toasts(page)}; okno ${await dialog.count()}`)
    if (await dialog.count()) await dialog.getByRole('button', { name: 'Później' }).click()
    await goFolderTab(page)
    await page.getByTestId('backup-now').click()
    await page.waitForTimeout(2000)
    log.line(`„Kopia teraz”: ${await toasts(page)}; okno ${await dialog.count()}`)
    if (await dialog.count()) await dialog.getByRole('button', { name: 'Później' }).click()
    await page.waitForTimeout(6500)
    await pick(run, { paths: [start2] })
    await page.getByRole('button', { name: 'Otwórz inny folder…' }).click()
    await page.waitForTimeout(2500)
    log.line(`„Otwórz inny folder…”: ${await toasts(page)}; folder ${await page.getByTestId('settings-data-dir').innerText()}; okno ${await dialog.count()}`)
    await log.shot(page, 'DA.44-folder')
    if (await dialog.count()) await dialog.getByRole('button', { name: 'Później' }).click()
    // Closing: „Anuluj”, then „Zamknij mimo to”.
    await answerQuestions(run, 0)
    await run.app.evaluate(({ app }) => void setTimeout(() => app.quit(), 10))
    await sleep(6000)
    const alive = await run.app.evaluate(() => true).catch(() => false)
    log.line(`po „Anuluj”: aplikacja działa ${alive}; pytanie: ${JSON.stringify((await trapped(run)).dialogs)}`)
    log.line(`okno decyzji: ${await dialog.count()}; chip ${await page.getByTestId('remote-chip').count()}`)
    await log.shot(page, 'DA.44-anuluj')
    await answerQuestions(run, 1)
    log.line(`plik przed „Zamknij mimo to”: ${JSON.stringify({ a: readJson(op.path)!.amount, n: readJson(op.path)!.note, by: readJson(op.path)!.updatedBy })}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  log.line(`plik po zamknięciu: ${JSON.stringify({ a: readJson(op.path)!.amount, n: readJson(op.path)!.note, by: readJson(op.path)!.updatedBy })}`)
  const r2 = await reopen(NAME, dataDir, { log, machine: 'DOM-PC' })
  try {
    await openOp(r2.page, 'CINEMA CITY', OP.cinema)
    log.line(`po ponownym starcie: edytor ${await r2.page.getByTestId('operation-amount').inputValue()} „${await r2.page.getByTestId('operation-note').inputValue()}”; okno decyzji ${await r2.page.getByTestId('remote-dialog').count()}`)
    log.line(`plik: ${JSON.stringify({ a: readJson(op.path)!.amount, n: readJson(op.path)!.note, by: readJson(op.path)!.updatedBy })}`)
  } finally {
    await r2.app.close().catch(() => undefined)
  }
  void rmSync
  void expect
  void rescan
})
