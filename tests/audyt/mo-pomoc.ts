// Helpers of the audit's Mostek area (MO): dumps of screen texts to the run's folder, the colours of elements, the
// quick entry window. Observation only – no assertions about the app.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ElectronApplication, Locator, Page } from '@playwright/test'
import { LAB } from './lab'

export function out(run: string): (name: string, content: unknown) => void {
  const dir = join(LAB, 'przebiegi', run, 'out')
  mkdirSync(dir, { recursive: true })
  return (name, content) => {
    const s = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    writeFileSync(join(dir, `${name}.txt`), `${s}\n`)
    appendFileSync(join(dir, '_log.txt'), `== ${name}\n${s}\n`)
  }
}

/** Text of a locator or a note that it is not there. */
export async function textOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak elementu)'
  return (await l.first().innerText()).trim()
}

/** The computed colour of an element (rgb) with a name of the ICTTJ token it matches. */
export async function colorOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak)'
  const c = await l.first().evaluate((e) => getComputedStyle(e).color)
  return `${c} ${tokenName(c)}`
}

export async function bgOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak)'
  const c = await l.first().evaluate((e) => getComputedStyle(e).backgroundColor)
  return `${c} ${tokenName(c)}`
}

const TOKENS: Record<string, string> = {
  'rgb(246, 70, 93)': 'down/czerwony',
  'rgb(232, 163, 61)': 'akcent',
  'rgb(46, 189, 133)': 'up/zielony',
  'rgb(232, 237, 242)': 'fg-strong',
  'rgb(195, 203, 212)': 'fg',
  'rgb(122, 131, 142)': 'muted'
}
export const tokenName = (c: string): string => TOKENS[c] ?? ''

/** All briefing items with kind, text and colours of the dot and the text. */
export async function briefingItems(root: Page | Locator): Promise<Array<{ kind: string | null; text: string; dot: string; color: string }>> {
  const items = root.locator('[data-testid="briefing-item"]')
  const n = await items.count()
  const res = []
  for (let i = 0; i < n; i++) {
    const it = items.nth(i)
    const dot = await bgOf(it.locator('span').first())
    const color = await colorOf(it.locator('span').nth(1))
    res.push({ kind: await it.getAttribute('data-kind'), text: (await it.innerText()).trim(), dot, color })
  }
  return res
}

/** The quick entry window (opened with window.fi.quickOpen()). */
export async function quickWindow(app: ElectronApplication, page: Page): Promise<Page> {
  await page.evaluate('window.fi.quickOpen()')
  let found: Page | undefined
  for (let i = 0; i < 100 && !found; i++) {
    found = app.windows().find((w) => w.url().includes('quick=1'))
    if (!found) await page.waitForTimeout(100)
  }
  if (!found) throw new Error('brak okna szybkiego wpisu')
  await found.getByTestId('quick-amount').waitFor({ state: 'visible', timeout: 15_000 })
  return found
}

/** Go to a screen with Ctrl+<key> and wait for it. */
export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(600)
}

/** Which page is shown now (page-* test id) and what the main part of the window says. */
export async function where(page: Page): Promise<string> {
  return page.evaluate(() => {
    const p = Array.from(document.querySelectorAll('[data-testid^="page-"]')).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => e.getAttribute('data-testid'))
    const dlg = Array.from(document.querySelectorAll('[role="dialog"]')).map((e) => (e as HTMLElement).innerText.slice(0, 300).replace(/\s+/g, ' '))
    return JSON.stringify({ pages: p, dialogs: dlg })
  })
}

// ---- Stany szczególne (kopie persony „rok” zmienione przed startem) ----

export const ACC = { mbank: '01KDEFACC00000000000000001', xtb: '01KDEFACC00000000000000002', cash: '01KDEFACC00000000000000003' }
export const CAT = { food: '01KDEFCAT00000000000000101', fuel: '01KDEFCAT00000000000000301', meds: '01KDEFCAT00000000000000501', clothes: '01KDEFCAT00000000000000801', other: '01KDEFCAT00000000000000902', gifts: '01KDEFCAT00000000000000901' }
const AT = '2026-11-03T08:00:00.000Z'

/** A record id of the audit (a valid ULID: Crockford base32). */
export const auditId = (n: number): string => `01KMXAVDT${String(n).padStart(17, '0')}`

export function editJson(file: string, fn: (j: Record<string, any>) => Record<string, any> | void): void {
  const j = JSON.parse(readFileSync(file, 'utf8'))
  const r = fn(j) ?? j
  writeFileSync(file, `${JSON.stringify(r, null, 2)}\n`)
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
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${o.date}_${o.id}.json`)
  writeFileSync(file, `${JSON.stringify(rec, null, 2)}\n`)
  return file
}

/** A record of another collection, written from a template (id, dates of the record). */
export function writeRecord(dataDir: string, rel: string, rec: Record<string, any>): void {
  const file = join(dataDir, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, createdAt: AT, updatedAt: AT, updatedBy: 'AUDYT', ...rec }, null, 2)}\n`)
}

export const exists = existsSync

/** The bridge read whole: energy, its caption and breakdown, bias, briefing items, the ship's state, envelopes. */
export async function readBridge(page: Page): Promise<Record<string, unknown>> {
  const odprawa = page.locator('section[data-panel="bridge:Odprawa"]').first()
  const res: Record<string, unknown> = {}
  res.tytul = await odprawa.evaluate((e) => (e as HTMLElement).innerText.split('\n')[0]).catch(() => '(brak)')
  res.energia = await textOf(page.getByTestId('bridge-energy'))
  res.energiaKolor = await colorOf(page.getByTestId('bridge-energy'))
  res.podpis = await textOf(page.getByTestId('bridge-energy-why'))
  res.bias = await textOf(page.getByTestId('bridge-bias'))
  res.biasKolor = await colorOf(page.getByTestId('bridge-bias'))
  const why = page.getByTestId('bridge-energy-why')
  if (await why.count()) {
    await why.click()
    await page.waitForTimeout(250)
    res.rozbicie = (await page.getByTestId('bridge-energy-lines').locator('[data-testid="why-line"]').allInnerTexts()).map((l) => l.replace(/\s+/g, ' '))
    await why.click()
  }
  res.odprawa = await briefingItems(odprawa)
  const state = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
  res.stan = (await state.count()) ? (await state.innerText()).replace(/\n/g, ' | ') : '(brak panelu)'
  const masa = state.getByText('Masa ładunku').locator('..')
  res.masaKolor = (await masa.count()) ? await colorOf(masa.locator('span').nth(1)) : '(brak)'
  const env = page.locator('section[data-panel="bridge:Koperty"]').first()
  res.koperty = (await env.innerText()).replace(/\n/g, ' | ')
  return res
}
