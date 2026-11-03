// Helpers of the audit's Wywiad (WY) and rituals (RY) areas: dumps of screen texts to the run's folder, panel shots,
// the data a chart draws, the speech of „Odsłuchaj” caught as text, special states on copies of „rok”.
// Observation only – no assertions about the app.
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import { join, relative } from 'node:path'
import type { Locator, Page } from '@playwright/test'
import { LAB, SHOTS } from './lab'

export function out(run: string): (name: string, content: unknown) => void {
  const dir = join(LAB, 'przebiegi', run, 'out')
  fs.mkdirSync(dir, { recursive: true })
  return (name, content) => {
    const s = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    fs.writeFileSync(join(dir, `${name.replace(/[^\w.-]+/g, '_')}.txt`), `${s}\n`)
    fs.appendFileSync(join(dir, '_log.txt'), `== ${name}\n${s}\n`)
  }
}

/** Runs a step; a failure is written down and the run goes on. */
export function stepper(dump: (n: string, c: unknown) => void) {
  return async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
    }
  }
}

export async function textOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak elementu)'
  return (await l.first().innerText()).trim()
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

export async function colorOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak)'
  const c = await l.first().evaluate((e) => getComputedStyle(e).color)
  return `${c} ${tokenName(c)}`
}

/** Go to a screen with Ctrl+<key> and wait for it. */
export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(800)
}

/** A shot of one element (scrolled into view): C:\FI-audyt\zrzuty\<id>.png. */
export async function shotEl(l: Locator, id: string): Promise<string> {
  fs.mkdirSync(SHOTS, { recursive: true })
  const file = join(SHOTS, `${id.replace(/[^\w.-]+/g, '_')}.png`)
  await l.first().scrollIntoViewIfNeeded().catch(() => undefined)
  await l.first().screenshot({ path: file })
  return file
}

/** The texts of all panels (sections) under a root, with the titles (tooltips) inside them. */
export async function panels(root: Locator): Promise<Array<{ id: string | null; text: string; tips: string[] }>> {
  return root.locator('section').evaluateAll((els) =>
    els
      .filter((e) => !(e as HTMLElement).hidden)
      .map((e) => ({
        id: e.getAttribute('data-testid') ?? e.getAttribute('data-panel'),
        text: (e as HTMLElement).innerText,
        tips: Array.from(e.querySelectorAll('[title]')).map((t) => `${((t as HTMLElement).innerText || t.textContent || '').trim().slice(0, 60)} => ${t.getAttribute('title')}`)
      }))
  )
}

/** The data a React component got (the nearest fiber with a prop of this name) – what a chart draws. */
export async function propsOf(page: Page, selector: string, prop: string): Promise<Record<string, unknown> | null> {
  return page.evaluate(
    ({ selector, prop }) => {
      const el = document.querySelector(selector)
      if (!el) return null
      // The fiber kept on a DOM node may be the stale twin: the current one is found from the root's current tree.
      const root = document.getElementById('root') as unknown as Record<string, any>
      const ck = Object.keys(root).find((k) => k.startsWith('__reactContainer$'))
      if (!ck) return null
      const stack: any[] = [root[ck].stateNode.current]
      let f: any = null
      while (stack.length) {
        const x = stack.pop()
        if (x.stateNode === el) {
          f = x
          break
        }
        if (x.sibling) stack.push(x.sibling)
        if (x.child) stack.push(x.child)
      }
      while (f && !(f.memoizedProps && prop in f.memoizedProps)) f = f.return
      if (!f) return null
      const p = f.memoizedProps
      return JSON.parse(JSON.stringify(p, (k, v) => (k === 'children' || typeof v === 'function' ? undefined : v instanceof Map ? Object.fromEntries(v) : v)))
    },
    { selector, prop }
  )
}

/** „Odsłuchaj” without a sound: the synthesizer replaced in the window, what it would say kept as text. */
export async function catchSpeech(page: Page): Promise<void> {
  await page.evaluate(() => {
    const g = window as unknown as { __spoken: string[] }
    g.__spoken = []
    speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      g.__spoken.push(`[${u.lang} ${u.voice?.name ?? 'bez głosu'} rate=${u.rate}] ${u.text}`)
    }
  })
}
export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken?: string[] }).__spoken ?? [])
}

// ---- Stany szczególne (kopie persony „rok” zmienione przed startem) ----

export const ACC = { mbank: '01KDEFACC00000000000000001', xtb: '01KDEFACC00000000000000002', cash: '01KDEFACC00000000000000003' }
export const CAT = {
  food: '01KDEFCAT00000000000000100',
  coffee: '01KDEFCAT00000000000000103',
  home: '01KDEFCAT00000000000000200',
  auto: '01KDEFCAT00000000000000300',
  fuel: '01KDEFCAT00000000000000301',
  fun: '01KDEFCAT00000000000000600',
  personal: '01KDEFCAT00000000000000800',
  gifts: '01KDEFCAT00000000000000900'
}
const AT = '2026-11-03T08:00:00.000Z'

/** A record id of the audit (a valid ULID: Crockford base32). */
export const auditId = (n: number): string => `01KMXAWYR${String(n).padStart(17, '0')}`

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

/** The persona's only transaction of today (Mokka 12 zł, 08:10). */
export const TODAY_MOKKA = join('transactions', '2026', '2026-11-03_01KAZ600000000000000000072.json')

/** A checksum of every file of a folder (relative path → sha256), for „nothing was written”. */
export function folderSums(dir: string): Record<string, string> {
  const res: Record<string, string> = {}
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else res[relative(dir, p).replace(/\\/g, '/')] = createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16)
    }
  }
  walk(dir)
  return res
}

export function diffSums(a: Record<string, string>, b: Record<string, string>): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].filter((k) => a[k] !== b[k]).map((k) => `${k}: ${a[k] ?? '(brak)'} → ${b[k] ?? '(brak)'}`)
}
