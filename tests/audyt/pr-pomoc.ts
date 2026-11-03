/**
 * Helpers of the audit's area PR (Przekrój liczb, AU-9): a snapshot of the run's data folder before every reading of
 * numbers (C:\FI-audyt\migawki\pr\<punkt>-<n>\dane and \ictj – for the oracle), the screens read whole (Mostek „Stan
 * okrętu” and its breakdowns, Plan miesiąca, Ładownia, Mapa gwiezdna, Radar, Operacje, Ustawienia → Konta, the quick
 * entry's head), amounts parsed to grosze. Observation only – the verdicts are written by hand in docs/audyt/raport/PR.md.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, appendFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { ElectronApplication, Locator, Page } from '@playwright/test'
import { LAB, reading, shot } from './lab'

export const MIG = join(LAB, 'migawki', 'pr')
export const EXP = join(LAB, 'eksport')

// ------------------------------------------------------------------ dumps

export function out(run: string): (name: string, content: unknown) => void {
  const dir = join(LAB, 'przebiegi', run, 'out')
  mkdirSync(dir, { recursive: true })
  return (name, content) => {
    const s = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    writeFileSync(join(dir, `${name.replace(/[^\w.-]+/g, '_')}.txt`), `${s}\n`)
    appendFileSync(join(dir, '_log.txt'), `== ${name}\n${s}\n`)
    console.log(`\n### ${name}\n${s.length > 4000 ? `${s.slice(0, 4000)}…` : s}`)
  }
}

export function stepper(dump: (n: string, c: unknown) => void): (name: string, fn: () => Promise<void>) => Promise<void> {
  return async (name, fn) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e).split('\n').slice(0, 8).join('\n'))
    }
  }
}

// ------------------------------------------------------------------ snapshots

/** Copy of a folder without `backups` and `.history` (files that vanish while copied are skipped). */
function copyTree(src: string, dst: string, root = true): number {
  let n = 0
  mkdirSync(dst, { recursive: true })
  for (const e of readdirSync(src, { withFileTypes: true })) {
    if (root && (e.name === 'backups' || e.name === '.history')) continue
    const s = join(src, e.name)
    const d = join(dst, e.name)
    try {
      if (e.isDirectory()) n += copyTree(s, d, false)
      else if (e.isFile()) {
        copyFileSync(s, d)
        n++
      }
    } catch {
      /* a temporary file gone meanwhile */
    }
  }
  return n
}

/** The next free C:\FI-audyt\migawki\pr\<point>-<n> with the data folder (and ICTTJ's) copied into it. */
export function snapshot(point: string, dataDir: string, ictjDir?: string): string {
  mkdirSync(MIG, { recursive: true })
  const base = point.replace(/[^\w.-]+/g, '_')
  let n = 1
  while (existsSync(join(MIG, `${base}-${n}`))) n++
  const dir = join(MIG, `${base}-${n}`)
  copyTree(dataDir, join(dir, 'dane'))
  if (ictjDir && existsSync(ictjDir)) copyTree(ictjDir, join(dir, 'ictj'))
  return dir
}

export interface Ctx {
  run: string
  dataDir: string
  ictjDir?: string
}

/** A reading whose snapshot was already taken at this moment (several points read from one screen state). */
export function recAt(ctx: Ctx, mig: string, point: string, state: string, values: Record<string, unknown>): void {
  const flat: Record<string, string | number | null> = {}
  for (const [k, v] of Object.entries(values)) flat[k] = v == null ? null : typeof v === 'number' || typeof v === 'string' ? v : JSON.stringify(v)
  flat._migawka = mig
  flat._przebieg = ctx.run
  reading('pr', point, state, flat)
}

/** A reading of numbers: the snapshot first (the folder as the screen shows it), then the screen, then the line. */
export async function rec(ctx: Ctx, point: string, state: string, read: () => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const mig = snapshot(point, ctx.dataDir, ctx.ictjDir)
  const values = await read()
  const flat: Record<string, string | number | null> = {}
  for (const [k, v] of Object.entries(values)) flat[k] = v == null ? null : typeof v === 'number' || typeof v === 'string' ? v : JSON.stringify(v)
  flat._migawka = mig
  flat._przebieg = ctx.run
  reading('pr', point, state, flat)
  return { ...values, _migawka: mig }
}

// ------------------------------------------------------------------ amounts

const AMT = /(−|-)?\s?(\d{1,3}(?:[ \u00a0\u202f]\d{3})*|\d+),(\d{2})/g

/** All amounts of a text in grosze („−1 234,56 zł” → -123456). */
export function amounts(s: string): number[] {
  const res: number[] = []
  for (const m of s.matchAll(AMT)) {
    const whole = Number(m[2]!.replace(/[ \u00a0\u202f]/g, ''))
    const g = whole * 100 + Number(m[3])
    res.push(m[1] ? -g : g)
  }
  return res
}
export const amt = (s: string | null | undefined): number | null => (s ? (amounts(s)[0] ?? null) : null)
export const pln = (g: number | null | undefined): string => (g == null ? '—' : `${g < 0 ? '−' : ''}${Math.floor(Math.abs(g) / 100).toLocaleString('pl-PL').replace(/\u00a0/g, ' ')},${String(Math.abs(g) % 100).padStart(2, '0')}`)

// ------------------------------------------------------------------ navigation

export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForTimeout(700)
}

export async function textOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak elementu)'
  return (await l.first().innerText()).trim()
}

export const flat = (s: string): string => s.replace(/\s*\n\s*/g, ' | ').replace(/\s+/g, ' ').trim()

// ------------------------------------------------------------------ screens

const METAPHORS = ['Osłony', 'Energia', 'Kadłub', 'Układy gwiezdne', 'Zbiorniki', 'Podatek', 'Depozyt domowników', 'Łupy', 'Dług'] as const
const KEY: Record<(typeof METAPHORS)[number], string> = {
  Osłony: 'oslony',
  Energia: 'energia',
  Kadłub: 'kadlub',
  'Układy gwiezdne': 'cele',
  Zbiorniki: 'zbiorniki',
  Podatek: 'podatek',
  'Depozyt domowników': 'depozyt',
  Łupy: 'lupy',
  Dług: 'dlug'
}

export interface ShipState {
  text: string
  lines: Record<string, { value: number | null; target: number | null; raw: string }>
  suma: number | null
  zasieg: string | null
  klasa: string | null
  koszty: number | null
  masa: string | null
  stale: number | null
  extras: string[]
}

/** Mostek → „Stan okrętu” parsed: each layer's value (and target), the accounts' sum, range, class, cargo. */
export async function shipState(page: Page): Promise<ShipState> {
  const panel = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
  const text = (await panel.count()) ? await panel.innerText() : '(brak panelu)'
  const ls = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const lines: ShipState['lines'] = {}
  const extras: string[] = []
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i] as (typeof METAPHORS)[number]
    if ((METAPHORS as readonly string[]).includes(m) && ls[i + 1]?.startsWith('·')) {
      const raw = ls[i + 2] ?? ''
      const a = amounts(raw)
      lines[KEY[m]] = { value: a[0] ?? null, target: a[1] ?? null, raw }
    }
    if (/wolne do decyzji|ponad cel osłon|poniżej minimum/.test(ls[i]!)) extras.push(ls[i]!)
  }
  const after = (label: string) => {
    const i = ls.findIndex((l) => l.toUpperCase() === label)
    return i >= 0 ? (ls[i + 1] ?? null) : null
  }
  const sumLine = ls.find((l) => l.startsWith('Suma kont budżetu')) ?? ''
  const kosztyLine = ls.find((l) => l.startsWith('średnie koszty')) ?? ''
  const staleLine = ls.find((l) => l.startsWith('stałe koszty')) ?? ''
  return {
    text,
    lines,
    suma: amt(sumLine),
    zasieg: after('ZASIĘG'),
    klasa: after('KLASA'),
    koszty: amt(kosztyLine),
    masa: after('MASA ŁADUNKU'),
    stale: amt(staleLine),
    extras
  }
}

/** The layers' sum (as PR.1 lists them) – with and without the loot. */
export function layerSum(s: ShipState): { bezLupow: number; zLupami: number; skladniki: string } {
  const v = (k: string) => s.lines[k]?.value ?? 0
  const bez = v('oslony') + v('energia') + v('kadlub') + v('cele') + v('zbiorniki') + v('podatek') + v('depozyt')
  const parts = ['oslony', 'energia', 'kadlub', 'cele', 'zbiorniki', 'podatek', 'depozyt', 'lupy'].filter((k) => s.lines[k]).map((k) => `${k} ${pln(v(k))}`)
  return { bezLupow: bez, zLupami: bez + v('lupy'), skladniki: parts.join(' + ') }
}

/** „Skąd ta liczba?” of the bridge: energy, range, targets, last delivery – each opened alone, its lines read. */
export async function breakdowns(page: Page): Promise<Record<string, string[]>> {
  const res: Record<string, string[]> = {}
  const open = async (btn: string, lines: string, key: string) => {
    const b = page.getByTestId(btn)
    if (!(await b.count())) {
      res[key] = ['(brak przycisku)']
      return
    }
    res[`${key}_etykieta`] = [(await b.first().innerText()).replace(/\s+/g, ' ')]
    await b.first().click()
    await page.waitForTimeout(300)
    res[key] = (await page.getByTestId(lines).locator('[data-testid="why-line"]').allInnerTexts()).map((l) => l.replace(/\s+/g, ' ').trim())
    await b.first().click()
    await page.waitForTimeout(200)
  }
  await open('bridge-energy-why', 'bridge-energy-lines', 'energia')
  await open('state-range-why', 'state-range-lines', 'zasieg')
  await open('state-targets-why', 'state-targets-lines', 'cele')
  await open('state-delivery-why', 'state-delivery-lines', 'dostawa')
  return res
}

/** One line of a breakdown parsed: label and amount (null when a text). */
export function whyAmounts(lines: string[]): Array<{ label: string; g: number | null }> {
  return lines.map((l) => {
    const a = amounts(l)
    return { label: l, g: a.length ? a[a.length - 1]! : null }
  })
}

export interface Screens {
  mostek: { energia: string; podpis: string; stan: ShipState; rozliczenia: string; przychody: string; odprawa: string[]; koperty: string; calosc: string }
  plan?: string
  ladownia?: string
  mapa?: { calosc: string; cele: Array<{ name: string; amount: string }>; archiwum: string[] }
  radar?: string
  operacje?: { pasek: string; salda: Record<string, number | null> }
  konta?: Record<string, number | null>
  szybki?: string
}

export async function readBridge(page: Page): Promise<Screens['mostek']> {
  await go(page, '1', 'page-bridge')
  await page.waitForTimeout(500)
  const odprawa = (await page.locator('[data-testid="briefing-item"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
  return {
    energia: await textOf(page.getByTestId('bridge-energy')),
    podpis: await textOf(page.getByTestId('bridge-energy-why')),
    stan: await shipState(page),
    rozliczenia: flat(await textOf(page.locator('[data-testid="bridge-receivables"]'))),
    przychody: flat(await textOf(page.getByTestId('bridge-income'))),
    odprawa,
    koperty: flat(await textOf(page.locator('section[data-panel="bridge:Koperty"]'))),
    calosc: await textOf(page.getByTestId('page-bridge'))
  }
}

export async function readOps(page: Page): Promise<NonNullable<Screens['operacje']>> {
  await go(page, '2', 'page-operations')
  await page.waitForTimeout(800)
  const pasek = await textOf(page.getByTestId('operations-sums'))
  const salda: Record<string, number | null> = {}
  for (const n of ['mBank', 'Portfel XTB', 'Gotówka']) {
    const l = page.getByTestId(`balance-${n}`)
    salda[n] = (await l.count()) ? amt(await l.first().innerText()) : null
  }
  return { pasek: flat(pasek), salda }
}

export async function readAccounts(page: Page): Promise<Record<string, number | null>> {
  await page.keyboard.press('Control+,')
  await page.getByTestId('settings-tab-accounts').click()
  await page.waitForTimeout(700)
  const rows = page.locator('[data-testid="account-row"]')
  const res: Record<string, number | null> = {}
  for (let i = 0; i < (await rows.count()); i++) {
    const r = rows.nth(i)
    res[(await r.getAttribute('data-name')) ?? `#${i}`] = amt(await r.getByTestId('account-balance').innerText())
  }
  return res
}

export async function readMap(page: Page): Promise<NonNullable<Screens['mapa']>> {
  await go(page, '6', 'page-starmap')
  const goals = page.locator('[data-testid="starmap-goal"]')
  const cele: Array<{ name: string; amount: string }> = []
  for (let i = 0; i < (await goals.count()); i++) {
    const g = goals.nth(i)
    cele.push({ name: (await g.getAttribute('data-name')) ?? `#${i}`, amount: await textOf(g.getByTestId('starmap-amount')) })
  }
  const archiwum = (await page.locator('[data-testid="starmap-archived-row"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
  return { calosc: await textOf(page.getByTestId('page-starmap')), cele, archiwum }
}

/** The quick entry's head („· energia dziś X”) and its preview – the window closed with Esc. */
export async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  for (let i = 0; i < 150 && !found; i++) {
    found = app.windows().find((w) => w.url().includes('quick=1'))
    if (!found) await page.waitForTimeout(100)
  }
  if (!found) throw new Error('brak okna szybkiego wpisu')
  await found.getByTestId('quick-amount').waitFor({ state: 'visible', timeout: 15_000 })
  await found.waitForTimeout(400)
  return found
}
export async function quickHead(q: Page): Promise<string> {
  return flat(await textOf(q.locator('[data-testid="quick-entry"] > div').first()))
}

/** Every screen of the cross-section at once (the order: bridge first, settings last). */
export async function readAll(page: Page, app: ElectronApplication | null, which = ['plan', 'ladownia', 'mapa', 'radar', 'operacje', 'konta']): Promise<Screens> {
  const s: Screens = { mostek: await readBridge(page) }
  if (which.includes('plan')) {
    await go(page, '4', 'page-month')
    s.plan = await textOf(page.getByTestId('page-month'))
  }
  if (which.includes('ladownia')) {
    await go(page, '5', 'page-cargo')
    s.ladownia = await textOf(page.getByTestId('page-cargo'))
  }
  if (which.includes('mapa')) s.mapa = await readMap(page)
  if (which.includes('radar')) {
    await go(page, '7', 'page-radar')
    s.radar = await textOf(page.getByTestId('page-radar'))
  }
  if (which.includes('operacje')) s.operacje = await readOps(page)
  if (which.includes('konta')) s.konta = await readAccounts(page)
  if (which.includes('szybki') && app) {
    const q = await quickWindow(app, page)
    s.szybki = await quickHead(q)
    await q.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }
  await go(page, '1', 'page-bridge')
  return s
}

/** PR.1's check on screens read: layers vs „Suma kont budżetu” vs the accounts (Operacje, Ustawienia). */
export function pr1(s: Screens): Record<string, string | number | null> {
  const st = s.mostek.stan
  const ls = layerSum(st)
  const ops = s.operacje ? Object.values(s.operacje.salda).reduce<number>((a, b) => a + (b ?? 0), 0) : null
  const acc = s.konta ? Object.values(s.konta).reduce<number>((a, b) => a + (b ?? 0), 0) : null
  return {
    warstwy: ls.skladniki,
    suma_warstw_bez_lupow: pln(ls.bezLupow),
    suma_warstw_z_lupami: pln(ls.zLupami),
    suma_kont_budzetu: pln(st.suma),
    salda_operacje: s.operacje ? JSON.stringify(Object.fromEntries(Object.entries(s.operacje.salda).map(([k, v]) => [k, pln(v)]))) : null,
    suma_sald_operacje: pln(ops),
    salda_ustawienia: s.konta ? JSON.stringify(Object.fromEntries(Object.entries(s.konta).map(([k, v]) => [k, pln(v)]))) : null,
    suma_sald_ustawienia: pln(acc),
    roznica_warstwy_z_lupami_minus_suma: st.suma == null ? null : ls.zLupami - st.suma,
    roznica_warstwy_bez_lupow_minus_suma: st.suma == null ? null : ls.bezLupow - st.suma,
    roznica_suma_minus_operacje: st.suma == null || ops == null ? null : st.suma - ops,
    roznica_suma_minus_ustawienia: st.suma == null || acc == null ? null : st.suma - acc,
    dlug: pln(st.lines.dlug?.value ?? 0)
  }
}

/** Values of a reading from the screens (texts whitespace-flattened). */
export function screenValues(s: Screens): Record<string, string | number | null> {
  return {
    mostek_energia: s.mostek.energia,
    mostek_podpis: s.mostek.podpis,
    mostek_stan: flat(s.mostek.stan.text),
    mostek_rozliczenia: s.mostek.rozliczenia,
    mostek_przychody: s.mostek.przychody,
    mostek_koperty: s.mostek.koperty,
    mostek_odprawa: s.mostek.odprawa.join(' || '),
    plan: s.plan ? flat(s.plan) : null,
    ladownia: s.ladownia ? flat(s.ladownia) : null,
    mapa: s.mapa ? flat(s.mapa.calosc) : null,
    mapa_cele: s.mapa ? s.mapa.cele.map((c) => `${c.name}: ${c.amount}`).join(' | ') : null,
    mapa_archiwum: s.mapa ? s.mapa.archiwum.join(' | ') : null,
    radar: s.radar ? flat(s.radar) : null,
    operacje_pasek: s.operacje?.pasek ?? null,
    szybki_wpis: s.szybki ?? null,
    ...pr1(s)
  }
}

export async function snap(page: Page, id: string): Promise<void> {
  console.log(`[zrzut] ${await shot(page, id)}`)
}

// ------------------------------------------------------------------ files of the exports

export function waitFile(file: string, ms = 60_000): Promise<boolean> {
  const t0 = Date.now()
  return new Promise((resolve) => {
    const tick = () => {
      if (existsSync(file) && statSync(file).size > 0) return resolve(true)
      if (Date.now() - t0 > ms) return resolve(false)
      setTimeout(tick, 250)
    }
    tick()
  })
}

/** A CSV as the app writes it: `;`, quoted fields with doubled quotes. */
export function parseCsv(raw: string): string[][] {
  const s = raw.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cur += '"'
          i++
        } else q = false
      } else cur += c
    } else if (c === '"') q = true
    else if (c === ';') {
      row.push(cur)
      cur = ''
    } else if (c === '\r' && s[i + 1] === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
      i++
    } else if (c === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else cur += c
  }
  if (cur || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

/** XLSX unpacked (Expand-Archive) and its sheets read: sheet name → rows of cell texts. */
export function readXlsx(file: string, dir: string): Record<string, string[][]> {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const copy = `${dir}.zip`
  copyFileSync(file, copy)
  execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${copy}' -DestinationPath '${dir}' -Force`], { stdio: 'ignore' })
  rmSync(copy, { force: true })
  const rd = (p: string) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), 'utf8') : '')
  const un = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  const ss = [...rd('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => un(m[1]!.replace(/<[^>]+>/g, '')))
  const wb = rd('xl/workbook.xml')
  const rels = rd('xl/_rels/workbook.xml.rels')
  const res: Record<string, string[][]> = {}
  for (const m of wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = new RegExp(`Id="${m[2]}"[^>]*Target="([^"]+)"`).exec(rels)?.[1] ?? new RegExp(`Target="([^"]+)"[^>]*Id="${m[2]}"`).exec(rels)?.[1]
    if (!target) continue
    const x = rd(`xl/${target.replace(/^\/?xl\//, '')}`)
    const rows: string[][] = []
    for (const r of x.matchAll(/<row [^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: string[] = []
      for (const c of r[1]!.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const col = c[1]!.split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1
        const t = /t="(\w+)"/.exec(c[2]!)?.[1]
        const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? '')?.[1]
        const is = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] ?? '')?.[1]
        cells[col] = t === 's' ? (ss[Number(v)] ?? '') : t === 'inlineStr' ? un(is ?? '') : un(v ?? '')
      }
      rows.push(Array.from(cells, (x) => x ?? ''))
    }
    res[un(m[1]!)] = rows
  }
  return res
}

/** The text of a PDF by pages (pdf.js of the lab's tool folder, read only). */
export function pdfText(file: string): string {
  return execFileSync(process.execPath, [join(LAB, 'narzedzia-re', 'pdf.mjs'), file], { encoding: 'utf8', cwd: join(LAB, 'narzedzia-re') })
}

export { rmSync, statSync }
