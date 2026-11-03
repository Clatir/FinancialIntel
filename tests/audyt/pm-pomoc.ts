// Helpers of the audit's Plan miesiąca area (PM, AU-10): a snapshot of the data folder (and of ICTTJ's) at each reading of
// numbers – for the oracle (AU-9), the month screen read panel by panel, special states on copies of „rok” and seeded
// folders. Observation only – no assertions about the app.
import * as fs from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Locator, Page } from '@playwright/test'
import { LAB, reading } from './lab'
import { colorOf, go, out, shotEl, stepper, textOf } from './wy-pomoc'

export { colorOf, go, out, shotEl, stepper, textOf }

export const SNAPS = join(LAB, 'migawki', 'pm')
export const ACC = { mbank: '01KDEFACC00000000000000001', xtb: '01KDEFACC00000000000000002', cash: '01KDEFACC00000000000000003' }
export const CAT = {
  food: '01KDEFCAT00000000000000100',
  groceries: '01KDEFCAT00000000000000101',
  eatOut: '01KDEFCAT00000000000000102',
  home: '01KDEFCAT00000000000000200',
  homeGoods: '01KDEFCAT00000000000000203',
  auto: '01KDEFCAT00000000000000300',
  fuel: '01KDEFCAT00000000000000301',
  service: '01KDEFCAT00000000000000302',
  pets: '01KDEFCAT00000000000000400',
  health: '01KDEFCAT00000000000000500',
  meds: '01KDEFCAT00000000000000501',
  fun: '01KDEFCAT00000000000000600',
  travel: '01KDEFCAT00000000000000603',
  subs: '01KDEFCAT00000000000000700',
  apps: '01KDEFCAT00000000000000704',
  personal: '01KDEFCAT00000000000000800',
  clothes: '01KDEFCAT00000000000000801',
  gifts: '01KDEFCAT00000000000000900',
  giftsSub: '01KDEFCAT00000000000000901',
  other: '01KDEFCAT00000000000000902',
  cash: '01KDEFCAT00000000000000010'
}
export const ANNA = '01KDEFMEM00000000000000001'
export const GOAL = { laptop: '01KAZ300000000000000000001', wakacje: '01KAZ300000000000000000002', rower: '01KAZ300000000000000000003' }
export const NETFLIX = '01KAZ400000000000000000004'
const AT = '2026-11-03T08:00:00.000Z'

/** A record id of the PM audit (a valid ULID: Crockford base32). */
export const pmId = (n: number): string => `01KMXAPM${String(n).padStart(18, '0')}`

// ---- Snapshots for the oracle --------------------------------------------------------------------------------------

/** The data folder (and ICTTJ's) copied as it is now: C:\FI-audyt\migawki\pm\<point>-<n>\dane (\ictj), without backups and
 * .history. A file the app renames meanwhile (atomic writes) is retried. */
export function snapshot(point: string, dataDir: string, ictjDir?: string): string {
  fs.mkdirSync(SNAPS, { recursive: true })
  let n = 0
  let dir = ''
  do {
    n++
    dir = join(SNAPS, `${point}-${n}`)
  } while (fs.existsSync(dir))
  const copy = (from: string, to: string) => {
    const skip = (src: string) => {
      const rel = relative(from, src)
      const top = rel.split(sep)[0]
      return top === 'backups' || top === '.history' || /\.tmp$|~$/.test(src)
    }
    for (let i = 0; i < 4; i++) {
      try {
        fs.rmSync(to, { recursive: true, force: true })
        fs.cpSync(from, to, { recursive: true, filter: (src) => !skip(src) })
        return
      } catch (e) {
        if (i === 3) throw e
      }
    }
  }
  copy(dataDir, join(dir, 'dane'))
  if (ictjDir && fs.existsSync(ictjDir)) copy(ictjDir, join(dir, 'ictj'))
  return dir
}

export interface Ctx {
  dataDir: string
  ictjDir?: string
  state: string
}

/** A reading of numbers: the snapshot first, then the line in C:\FI-audyt\odczyty\pm.jsonl with `_migawka`. */
export async function read(page: Page, ctx: Ctx, point: string, values: Record<string, string | number | null>): Promise<string> {
  // The app saves after a short delay (autosave): the folder settles first.
  await page.waitForTimeout(1500)
  const dir = snapshot(point, ctx.dataDir, ctx.ictjDir)
  reading('pm', point, ctx.state, { ...values, _migawka: dir })
  return dir
}

// ---- The month screen ----------------------------------------------------------------------------------------------

const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']
export const plMonth = (m: string): string => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`
const monthsBetween = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7))

/** Plan miesiąca on the month `m` (YYYY-MM): from the current month's label, arrows. Returns the label shown. */
export async function goMonth(page: Page, m: string, current = '2026-11'): Promise<string> {
  if (!(await page.getByTestId('page-month').isVisible().catch(() => false))) await go(page, '4', 'page-month')
  const back = page.getByRole('button', { name: 'bieżący', exact: true })
  if (await back.count()) {
    await back.click()
    await page.waitForTimeout(300)
  }
  const d = monthsBetween(current, m)
  for (let i = 0; i < Math.abs(d); i++) {
    await page.getByTestId(d < 0 ? 'month-prev' : 'month-next').click()
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(600)
  return textOf(page.getByTestId('month-label'))
}

const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' | ').trim()

/** „Pensja”: the field, the proposal, „Wypłacono”, the alarms (with their colour), the target of the shields. */
export async function readSalary(page: Page): Promise<Record<string, string>> {
  const p = page.getByTestId('month-salary-panel')
  const alarms = await p.locator('div.text-down, div.text-accent').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText} [${getComputedStyle(e).color}]`))
  return {
    panel: oneLine(await textOf(p)),
    pole: await page.getByTestId('month-salary').inputValue().catch(() => '(brak)'),
    propozycja: await textOf(page.getByTestId('month-salary-propose')),
    wyplacono: await textOf(page.getByTestId('month-salary-paid')),
    ponadPrzychod: await textOf(page.getByTestId('month-salary-above-income')),
    alarmy: alarms.join(' || ')
  }
}

/** „Przychody”: 3 rows × 4 columns, the line of full months, the salary against the 6 months. */
export async function readIncome(page: Page, testId = 'income-panel'): Promise<Record<string, string>> {
  const root = page.getByTestId(testId)
  const res: Record<string, string> = { panel: oneLine(await textOf(root)) }
  for (const row of ['work', 'trading', 'total'])
    for (const col of ['3', '6', '12', 'median']) res[`${row}-${col}`] = await textOf(root.getByTestId(`income-${row}-${col}`))
  res.tytulyKolumn = (await root.locator('span[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText}=${e.getAttribute('title')}`))).join(' ; ')
  res.wobecPensji = await textOf(root.getByTestId('income-vs-salary'))
  return res
}

/** „Podział pensji”: every row, the tanks unfolded. */
export async function readSplit(page: Page): Promise<Record<string, string>> {
  const p = page.getByTestId('month-split')
  const tanksBtn = p.getByRole('button', { name: /Odkładki – opłaty okresowe ▸/ })
  if (await tanksBtn.count()) {
    await tanksBtn.click()
    await page.waitForTimeout(300)
  }
  const envelopes = await p.locator('[data-testid="month-envelope"]').evaluateAll((els) =>
    els.map((e) => `${e.getAttribute('data-name')}: ${(e.querySelector('input') as HTMLInputElement | null)?.value ?? ''}${e.querySelector('[data-testid="month-envelope-extra"]') ? ` (${(e.querySelector('[data-testid="month-envelope-extra"]') as HTMLElement).innerText})` : ''}${e.querySelector('[data-testid="month-envelope-archived"]') ? ' [zarchiwizowana]' : ''}`)
  )
  const un = p.getByTestId('month-unallocated')
  return {
    panel: oneLine(await textOf(p)),
    ladownia: await textOf(p.getByTestId('split-cargo')),
    odkladki: await textOf(p.getByTestId('split-tanks')),
    raty: await textOf(p.getByTestId('split-rates')),
    lupy: await textOf(p.getByTestId('split-loot-extra')),
    koperty: envelopes.join(' ; '),
    niezaplanowane: await textOf(un),
    niezaplanowaneKolor: await colorOf(un.locator('span.num span').first()).catch(() => '(brak)')
  }
}

/** „Dzienny przydział”. */
export async function readDaily(page: Page): Promise<Record<string, string>> {
  const p = page.getByTestId('month-daily')
  return { panel: oneLine(await textOf(p)), energia: await textOf(page.getByTestId('month-energy-today')), energiaKolor: await colorOf(page.getByTestId('month-energy-today')) }
}

/** „Koperty”: each envelope (spent / limit, colour), „Bez koperty”, the cover links. */
export async function readEnvelopes(page: Page): Promise<Record<string, string>> {
  const p = page.getByTestId('month-envelopes')
  if (!(await p.count())) return { panel: '(brak panelu Koperty)' }
  const rows = await p.locator('[data-testid="envelope-state"]').evaluateAll((els) =>
    els.map((e) => {
      const num = e.querySelector('span.num') as HTMLElement | null
      return `${e.getAttribute('data-name')}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} [${num ? getComputedStyle(num).color : ''}]`
    })
  )
  return { panel: oneLine(await textOf(p)), koperty: rows.join(' ; '), bezKoperty: await textOf(p.getByTestId('month-outside')) }
}

/** The debriefing panel (month-debrief) whole and by part. */
export async function readDebrief(page: Page): Promise<Record<string, string>> {
  const p = page.getByTestId('month-debrief')
  const rows = await p.locator('[data-testid="debrief-envelope"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
  return {
    panel: oneLine(await textOf(p)),
    plus: await textOf(p.getByTestId('month-plus')),
    minus: await textOf(p.getByTestId('month-minus')),
    energia: oneLine(await textOf(p.getByTestId('debrief-energy'))),
    pula: await textOf(p.getByTestId('debrief-daily')),
    koperty: rows.join(' ; '),
    domownicy: await textOf(p.getByTestId('debrief-financed')),
    paliwo: await textOf(p.getByTestId('debrief-fuel')),
    lupy: oneLine(await textOf(p.getByTestId('loot'))),
    decyzja: await textOf(p.getByTestId('loot-decided')),
    zmiana: await textOf(p.getByTestId('loot-changed'))
  }
}

/** The window's toasts now (role=status). */
export async function toasts(page: Page): Promise<string[]> {
  return page.locator('[role="status"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
}

/** An amount typed as a user does: a click, select all, the text, then Tab. */
export async function typeAmount(page: Page, l: Locator, v: string, leave: 'Tab' | 'Enter' = 'Tab'): Promise<void> {
  await l.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type(v)
  await page.keyboard.press(leave)
  await page.waitForTimeout(500)
}

// ---- Special states (copies of „rok” changed before the start, seeded folders) ---------------------------------------

export function editJson(file: string, fn: (j: Record<string, any>) => Record<string, any> | void): void {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'))
  const r = fn(j) ?? j
  fs.writeFileSync(file, `${JSON.stringify(r, null, 2)}\n`)
}

/** A transaction written into a data folder (the full shape of the persona's records). */
export function writeTx(dataDir: string, o: Record<string, any> & { id: string; date: string; amount: number }): string {
  const rec = {
    schemaVersion: 1,
    createdAt: AT,
    updatedAt: AT,
    updatedBy: 'AUDYT',
    time: null,
    accountId: ACC.mbank,
    kind: 'expense',
    categoryId: null,
    refundable: false,
    memberId: null,
    advance: false,
    covers: [],
    splits: [],
    counterparty: '',
    title: '',
    note: '',
    impulse: null,
    logNote: '',
    repaid: 0,
    counterAccountId: null,
    containerId: null,
    goalId: null,
    loanId: null,
    ...o
  }
  const dir = join(dataDir, 'transactions', o.date.slice(0, 4))
  fs.mkdirSync(dir, { recursive: true })
  const file = join(dir, `${o.date}_${o.id}.json`)
  fs.writeFileSync(file, `${JSON.stringify(rec, null, 2)}\n`)
  return file
}

/** A record of another collection (`rel` – its path in the folder). */
export function writeRecord(dataDir: string, rel: string, rec: Record<string, any>): void {
  const file = join(dataDir, rel)
  fs.mkdirSync(join(file, '..'), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, createdAt: AT, updatedAt: AT, updatedBy: 'AUDYT', ...rec }, null, 2)}\n`)
}

/** The Mostek's panels as text (energy with its breakdown, the briefing with kinds and colours, the ship's state). */
export async function readBridgeAll(page: Page): Promise<Record<string, string>> {
  await go(page, '1', 'page-bridge')
  const res: Record<string, string> = {}
  res.energia = await textOf(page.getByTestId('bridge-energy'))
  res.energiaKolor = await colorOf(page.getByTestId('bridge-energy'))
  res.podpis = await textOf(page.getByTestId('bridge-energy-why'))
  const why = page.getByTestId('bridge-energy-why')
  if (await why.count()) {
    await why.click()
    await page.waitForTimeout(300)
    res.rozbicie = (await page.getByTestId('bridge-energy-lines').locator('[data-testid="why-line"]').allInnerTexts().catch(() => [])).map((l) => l.replace(/\s+/g, ' ')).join(' ; ')
    await why.click()
    await page.waitForTimeout(200)
  }
  const odprawa = page.locator('section[data-panel="bridge:Odprawa"]').first()
  res.odprawa = (
    await odprawa.locator('[data-testid="briefing-item"]').evaluateAll((els) =>
      els.map((e) => {
        const spans = e.querySelectorAll('span')
        const dot = spans[0] ? getComputedStyle(spans[0]).backgroundColor : ''
        return `[${e.getAttribute('data-kind')} ${dot}] ${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`
      })
    )
  ).join(' || ')
  const state = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
  res.stan = (await state.count()) ? oneLine(await state.innerText()) : '(brak panelu)'
  const env = page.locator('section[data-panel="bridge:Koperty"]').first()
  res.koperty = (await env.count()) ? oneLine(await env.innerText()) : '(brak panelu)'
  res.przychody = oneLine(await textOf(page.getByTestId('bridge-income')))
  return res
}
