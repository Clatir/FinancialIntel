// W5 (AU-11): pomoc przebiegów weryfikacji – kopia migawki do przebiegu, sumy SHA-256 kopii ICTTJ, odprawa.
import { createHash } from 'node:crypto'
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Page } from '@playwright/test'
import { LAB } from './lab'

const RUNS = join(LAB, 'przebiegi')

export function sums(dir: string): Record<string, string> {
  const res: Record<string, string> = {}
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else res[relative(dir, p).replace(/\\/g, '/')] = createHash('sha256').update(readFileSync(p)).digest('hex')
    }
  }
  if (existsSync(dir)) walk(dir)
  return res
}

export function prepare(run: string, mig: string): { dir: string; dataDir: string; ictjDir: string; log: (k: string, v: unknown) => void; before: Record<string, string> } {
  const dir = join(RUNS, run)
  for (const x of ['dane', 'ictj', 'out']) rmSync(join(dir, x), { recursive: true, force: true })
  mkdirSync(join(dir, 'out'), { recursive: true })
  cpSync(join(LAB, 'migawki', mig, 'dane'), join(dir, 'dane'), { recursive: true })
  if (existsSync(join(LAB, 'migawki', mig, 'ictj'))) cpSync(join(LAB, 'migawki', mig, 'ictj'), join(dir, 'ictj'), { recursive: true })
  const log = (k: string, v: unknown) => appendFileSync(join(dir, 'out', '_log.txt'), `== ${k}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}\n`)
  const before = sums(join(dir, 'ictj'))
  writeFileSync(join(dir, 'out', 'ictj-przed.json'), JSON.stringify(before, null, 2))
  return { dir, dataDir: join(dir, 'dane'), ictjDir: join(dir, 'ictj'), log, before }
}

export function boundary(p: { dir: string; ictjDir: string; before: Record<string, string>; log: (k: string, v: unknown) => void }): void {
  const after = sums(p.ictjDir)
  writeFileSync(join(p.dir, 'out', 'ictj-po.json'), JSON.stringify(after, null, 2))
  const same = JSON.stringify(after) === JSON.stringify(p.before)
  p.log('granica ICTTJ', `${Object.keys(p.before).length} plików, bez zmian: ${same}`)
}

export async function allBriefing(page: Page): Promise<string[]> {
  return page.locator('[data-testid="briefing-item"]').evaluateAll((els) => els.map((e) => `[${e.getAttribute('data-kind')}] ${(e.textContent ?? '').replace(/\s+/g, ' ').trim()}`))
}

