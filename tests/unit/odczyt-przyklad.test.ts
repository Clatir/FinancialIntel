/**
 * R1 (1.16.0), AP-47 (T475): the example script reading the data folder (`docs/przyklady/odczyt.mjs`) – a month's
 * expenses by main category from `transactions/**`, the conflict copies and temporary files left out, nothing written.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { seedFolder, zl } from '../e2e/seed'
import { partsOf } from '../../src/shared/calc/operations'
import { createDefaultSettings } from '../../src/shared/defaults'
import { SCHEMA_VERSION, transactionSchema } from '../../src/shared/schema'

const NOW = '2026-11-05T09:00:00.000Z'

const SCRIPT = join(__dirname, '../../docs/przyklady/odczyt.mjs')
const MBANK = '01KDEFACC00000000000000001'
const GROCERIES = '01KDEFCAT00000000000000101'
const FOOD = '01KDEFCAT00000000000000100'
const HOME = '01KDEFCAT00000000000000200'
const FUN = '01KDEFCAT00000000000000600'

interface Script {
  sumMonth: (folder: string, month: string) => Promise<Map<string, number>>
  zl: (grosze: number) => string
}
const load = async (): Promise<Script> => (await import(pathToFileURL(SCRIPT).href)) as Script

/** A folder of the app's own format (its schemas and serializer), with a conflict copy, a temporary file and a history. */
function folder(): string {
  const dir = join(mkdtempSync(join(tmpdir(), 'fi-odczyt-')), 'FinancialIntel')
  seedFolder(dir, {
    records: {
      transactions: [
        { date: '2026-11-03', accountId: MBANK, amount: -zl(50), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: '2026-11-04', accountId: MBANK, amount: zl(10), categoryId: GROCERIES, counterparty: 'Biedronka', title: 'zwrot towaru' },
        { date: '2026-11-05', accountId: MBANK, amount: -zl(20), categoryId: FUN, counterparty: 'Kino' },
        {
          date: '2026-11-06',
          accountId: MBANK,
          amount: -zl(100),
          counterparty: 'Leroy',
          splits: [
            { id: '01KSPXT0000000000000000001', amount: -zl(60), categoryId: FOOD },
            { id: '01KSPXT0000000000000000002', amount: -zl(40), categoryId: HOME }
          ]
        },
        { date: '2026-11-07', accountId: MBANK, amount: -zl(30), categoryId: FOOD, refundable: true, counterparty: 'Apteka dla domu' },
        { date: '2026-11-08', accountId: MBANK, amount: -zl(15), counterparty: 'Kiosk' },
        { date: '2026-11-10', accountId: MBANK, amount: zl(4000), kind: 'income', counterparty: 'Pracodawca' },
        { date: '2026-11-11', accountId: MBANK, amount: -zl(500), kind: 'transfer', counterparty: 'Ja' },
        { date: '2026-10-30', accountId: MBANK, amount: -zl(99), categoryId: FOOD, counterparty: 'Październik' }
      ]
    }
  })
  const year = join(dir, 'transactions', '2026')
  const one = readdirSync(year).find((n) => n.startsWith('2026-11-03_'))!
  // A conflict copy of OneDrive and a file being written: not records.
  copyFileSync(join(year, one), join(year, one.replace('.json', '-LAPTOP.json')))
  copyFileSync(join(year, one), join(year, `${one}.tmp-123`))
  mkdirSync(join(dir, '.history', 'transactions', 'X'), { recursive: true })
  writeFileSync(join(dir, '.history', 'transactions', 'X', 'v.json'), '{}\n')
  return dir
}

function snapshot(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else out.push(`${relative(dir, p)} ${statSync(p).size} ${statSync(p).mtimeMs}`)
    }
  }
  walk(dir)
  return out.sort()
}

describe('AP-47: przykładowy skrypt odczytu (docs/przyklady/odczyt.mjs)', () => {
  it('suma wydatków miesiąca po kategoriach głównych: zwrot zmniejsza, linie paragonu osobno, bez domowników, kopii i innych rodzajów', async () => {
    const dir = folder()
    const { sumMonth } = await load()
    const sums = await sumMonth(dir, '2026-11')
    expect(Object.fromEntries(sums)).toEqual({ Jedzenie: zl(100), Dom: zl(40), 'Rozrywka i hobby': zl(20), 'bez kategorii': zl(15) })
    // Another month – its own; a year without operations – nothing.
    expect(Object.fromEntries(await sumMonth(dir, '2026-10'))).toEqual({ Jedzenie: zl(99) })
    expect((await sumMonth(dir, '2025-01')).size).toBe(0)
  })

  it('przegląd R1 8: część kwoty, której linie paragonu nie pokrywają, liczy się pod kategorią operacji – jak w silniku (`partsOf`)', async () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'fi-odczyt-parts-')), 'FinancialIntel')
    const ops = [
      { date: '2026-11-06', accountId: MBANK, amount: -zl(100), categoryId: FUN, counterparty: 'Leroy', splits: [{ id: '01KSPXT0000000000000000003', amount: -zl(60), categoryId: HOME }] },
      // The rest a member finances: their money, not my cost.
      { date: '2026-11-07', accountId: MBANK, amount: -zl(50), categoryId: FUN, refundable: true, counterparty: 'Kino', splits: [{ id: '01KSPXT0000000000000000004', amount: -zl(20), categoryId: GROCERIES }] }
    ]
    seedFolder(dir, { records: { transactions: ops } })
    const { sumMonth } = await load()
    const sums = Object.fromEntries(await sumMonth(dir, '2026-11'))
    // Dawniej: Rozrywka 0 zł (linie tylko) – skrypt 40 zł mniej niż aplikacja.
    expect(sums).toEqual({ Dom: zl(60), 'Rozrywka i hobby': zl(40), Jedzenie: zl(20) })
    // The engine's own parts of the same records, by main category (mine only).
    const fi = createDefaultSettings('2026-01-01T00:00:00.000Z')
    const main = (id: string | null) => {
      const c = fi.settings.categories.find((x) => x.id === id)
      const top = c?.parentId ? fi.settings.categories.find((x) => x.id === c.parentId) : c
      return top?.name ?? 'bez kategorii'
    }
    const engine: Record<string, number> = {}
    for (const o of ops) for (const p of partsOf(transactionSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01KSPXT00000000000000000TX', createdAt: NOW, updatedAt: NOW, ...o }))) {
      if (!p.refundable) engine[main(p.categoryId)] = (engine[main(p.categoryId)] ?? 0) - p.amount
    }
    expect(sums).toEqual(engine)
  })

  it('z wiersza poleceń: raport z kwotami jak w aplikacji, folder bez zmian (tylko odczyt)', () => {
    const dir = folder()
    const before = snapshot(dir)
    const run = spawnSync(process.execPath, [SCRIPT, dir, '2026-11'], { encoding: 'utf8' })
    expect(run.status).toBe(0)
    expect(run.stdout).toContain('Wydatki 2026-11')
    expect(run.stdout).toMatch(/Jedzenie\s+100,00 zł/)
    expect(run.stdout).toMatch(/razem\s+175,00 zł/)
    expect(snapshot(dir)).toEqual(before)
  })

  it('zły miesiąc albo brak folderu – komunikat, kod 2', () => {
    expect(spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' }).status).toBe(2)
    const bad = spawnSync(process.execPath, [SCRIPT, folder(), '2026-13'], { encoding: 'utf8' })
    expect(bad.status).toBe(2)
    expect(bad.stderr).toContain('RRRR-MM')
  })

  it('kwoty: spacja tysięcy, przecinek, minus „−”', async () => {
    const { zl: text } = await load()
    expect(text(123456)).toBe('1 234,56 zł')
    expect(text(-5)).toBe('−0,05 zł')
  })
})
