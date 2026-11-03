/**
 * W1 (AU-11, skeptical verification of K / W findings): small helpers of my own – reading the data folder, slicing
 * mBank files byte-exactly (Windows-1250 kept), a log of the run.
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { LAB } from './lab'

export const MBANK = '01KDEFACC00000000000000001'
export const WALLET = '01KDEFACC00000000000000002'

/** Every record of a collection (recursively), parsed. */
export function recs(dataDir: string, collection: string): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = []
  const walk = (d: string) => {
    if (!existsSync(d)) return
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (n.endsWith('.json')) out.push({ ...JSON.parse(readFileSync(p, 'utf8')), __file: p })
    }
  }
  walk(join(dataDir, collection))
  return out
}

export const txs = (dataDir: string) => recs(dataDir, 'transactions')

/** One line of a transaction for the log. */
export const brief = (t: Record<string, any>) =>
  `${t.date} ${t.accountId === MBANK ? 'mBank' : t.accountId === WALLET ? 'Portfel' : String(t.accountId).slice(-4)} ${t.kind} ${t.amount} „${t.counterparty ?? ''}” bank=${t.bank ? JSON.stringify({ s: t.bank.source, p: t.bank.pending ?? undefined }) : '-'} id=${String(t.id).slice(-6)}`

/** A log of my run: C:\FI-audyt\przebiegi\<run>\w1.log (also printed). */
export function logger(run: string) {
  const dir = join(LAB, 'przebiegi', run)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'w1.log')
  writeFileSync(file, `# ${run} ${new Date().toISOString()}\n`)
  return (label: string, v: unknown) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v, null, 1)
    appendFileSync(file, `\n## ${label}\n${s}\n`)
    console.log(`## ${label}\n${s.slice(0, 2500)}`)
  }
}

/**
 * A list file („Lista operacji”) cut from another one byte-exactly: the header with a new period and only the data
 * rows whose date (first field, DD.MM.RRRR) passes `keep`.
 */
export function sliceList(src: string, dst: string, from: string, to: string, keep: (ddmmyyyy: string) => boolean): number {
  const raw = readFileSync(src).toString('latin1')
  const lines = raw.split('\r\n')
  const hdrEnd = lines.findIndex((l) => l.startsWith('#Data operacji'))
  const head = lines.slice(0, hdrEnd + 1).map((l, i) => (i > 0 && lines[i - 1].startsWith('#Za okres') ? `${from};${to};;` : l))
  const rows = lines.slice(hdrEnd + 1).filter((l) => /^\d\d\.\d\d\.\d{4};/.test(l) && keep(l.slice(0, 10)))
  const tail = lines.slice(hdrEnd + 1).filter((l) => !/^\d\d\.\d\d\.\d{4};/.test(l))
  writeFileSync(dst, Buffer.from([...head, ...rows, ...tail].join('\r\n'), 'latin1'))
  return rows.length
}

export const iso = (ddmmyyyy: string) => `${ddmmyyyy.slice(6)}-${ddmmyyyy.slice(3, 5)}-${ddmmyyyy.slice(0, 2)}`

export async function body(page: Page): Promise<string> {
  return (await page.evaluate(() => document.body.innerText)).replace(/[ \t]+/g, ' ')
}
