/**
 * AP-32 (N2): the money engine against the blind oracle (`tests/audyt/wyrocznia`, docs/audyt/wyrocznia.md – written from
 * the requirements only) on the audit's snapshots of the lab (`C:\FI-audyt`, D97: synthetic persona only) – every money
 * number the oracle computes must equal the app's for the same folder at the same moment, and the same number must be
 * the same on every screen that shows it. Local only (the snapshots live in the lab, not in the repository) and slow
 * (≈ 400 folders): `npm run test:wyrocznia` after each group of the money engine; skipped without the lab.
 *
 *   FI_AUDIT_LAB=C:\FI-audyt          the lab (default)
 *   FI_WYROCZNIA_LIMIT=20              only the first N cases (a quick run)
 *   FI_WYROCZNIA_ONLY=PR.1-25          only cases whose id contains this
 *
 * The result (every disagreement with both numbers) goes to `<lab>\wyrocznia\u3\regresja.json`. Known disagreements –
 * an app bug a later group fixes, or a gap of the oracle – are listed in `KNOWN` with their reason; a listed one that
 * disappears fails too (the list must shrink with the fixes).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { briefing } from '@shared/calc/briefing'
import { cargoDays, cargoStatuses } from '@shared/calc/cargoStatus'
import { deliveries, pendingPairsOf, preStartTaxOf } from '@shared/calc/dock'
import { budgetStartOf, computeFleet, layersSum, type FleetInput, type FleetState } from '@shared/calc/fleet'
import { monthAhead } from '@shared/calc/plan'
import { radar } from '@shared/calc/radar'
import { operationRows } from '@shared/export/budget'
import { sumOperations } from '@shared/operationsView'
import { parseRecordObject, type RecordTypes } from '@shared/records'
import { TX_KIND_LABEL, type Settings } from '@shared/schema'
import { readIctjFolder } from '../../../src/main/ictj/reader'
import { normalizeInput, readFolderRaw, loadIctj } from './lib/dane.mjs'
import { addMonths, fromWarsaw } from './lib/daty.mjs'
import { buildReport, WERSJA } from './lib/raport.mjs'
import { CHECKED_FIELDS, normalizeBalance, normalizeContainer, normalizeDocking, normalizeGoal, normalizeLoan, normalizeMonth, normalizeScheduled, normalizeTransaction } from './lib/schemat.mjs'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Oracle = any

const LAB = process.env.FI_AUDIT_LAB ?? 'C:\\FI-audyt'
const LIMIT = Number(process.env.FI_WYROCZNIA_LIMIT) || Infinity
const ONLY = process.env.FI_WYROCZNIA_ONLY ?? ''
const OUT = join(LAB, 'wyrocznia', 'u3')

interface Case {
  id: string
  dane: string
  ictj: string | null
  date: string
  time: string
  readings: string[]
}

/** The cases: the two states of the persona and each snapshot of the readings with the day (and minute) of its first reading. */
function casesOf(): Case[] {
  const out = new Map<string, Case>()
  const states: Array<[string, string]> = [
    ['rok', 'ictj-rok'],
    ['start', 'ictj-start']
  ]
  for (const [name, ictj] of states) {
    const dane = join(LAB, 'stany', name)
    if (existsSync(join(dane, 'fi.json'))) out.set(dane, { id: `stan ${name}@2026-11-03 12:00`, dane, ictj: join(LAB, 'stany', ictj), date: '2026-11-03', time: '12:00', readings: [] })
  }
  const dir = join(LAB, 'odczyty')
  for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => x.endsWith('.jsonl')).sort() : []) {
    readFileSync(join(dir, f), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (!line.trim()) return
        let o: { warsaw?: string; values?: { _migawka?: string } }
        try {
          o = JSON.parse(line)
        } catch {
          return
        }
        const mig = o.values?._migawka
        if (!mig || !o.warsaw || !existsSync(join(mig, 'dane', 'fi.json'))) return
        const date = o.warsaw.slice(0, 10)
        const key = `${mig}|${date}`
        if (!out.has(key)) out.set(key, { id: `${basename(mig)}@${date} ${o.warsaw.slice(11, 16)}`, dane: join(mig, 'dane'), ictj: existsSync(join(mig, 'ictj')) ? join(mig, 'ictj') : null, date, time: o.warsaw.slice(11, 16), readings: [] })
        out.get(key)!.readings.push(`${f.replace('.jsonl', '')}:${i + 1}`)
      })
  }
  return [...out.values()].filter((c) => !ONLY || c.id.includes(ONLY)).slice(0, LIMIT)
}

const COLLECTIONS = ['transactions', 'containers', 'goals', 'months', 'dockings', 'loans', 'balances', 'scheduled'] as const
type Coll = (typeof COLLECTIONS)[number]

/** The app's way of reading the folder (schemas, migrations): the same raw files the oracle reads. */
function appRecords(raw: any): { settings: Settings; records: { [K in Coll]: Array<RecordTypes[K]> }; problems: string[] } {
  const problems: string[] = []
  const fi = parseRecordObject('fi', raw.fi)
  if (!fi.ok) throw new Error(`fi.json: ${fi.error}`)
  const records = {} as { [K in Coll]: Array<RecordTypes[K]> }
  for (const c of COLLECTIONS) {
    const list: any[] = []
    for (const r of raw[c] as unknown[]) {
      const p = parseRecordObject(c, r)
      if (p.ok) list.push(p.value)
      else problems.push(`${c}: ${p.error}`)
    }
    ;(records as any)[c] = list
  }
  return { settings: fi.value.settings, records, problems }
}

async function appState(raw: any, ictjDir: string | null, today: string, nowMs: number) {
  const { settings, records, problems } = appRecords(raw)
  const start = budgetStartOf(settings, records.balances, today)
  const snap = ictjDir ? await readIctjFolder(ictjDir, new Date(nowMs)) : null
  const entries = snap?.status === 'ok' ? snap.entries : []
  const pendingPairs =
    snap?.status === 'ok' && entries.length && start && start <= today
      ? pendingPairsOf(
          deliveries({
            entries,
            transactions: records.transactions,
            dockings: records.dockings,
            start,
            today,
            skipped: settings.ictj.skipped,
            ictjOn: true,
            entriesComplete: snap.complete !== false,
            unreadEntries: snap.unread,
            coveredTo: null
          })
        )
      : new Map()
  const input: FleetInput = {
    settings,
    transactions: records.transactions,
    preStartTax: preStartTaxOf({ entries, transactions: records.transactions, dockings: records.dockings, start, skipped: settings.ictj.skipped }),
    pendingPairs,
    containers: records.containers,
    goals: records.goals,
    months: records.months,
    dockings: records.dockings,
    loans: records.loans,
    balances: records.balances,
    now: new Date(nowMs)
  }
  const fleet = computeFleet(input)
  const ahead = fleet.started ? [1, 2, 3].map((k) => monthAhead({ month: addMonths(fleet.month, k), fleet, containers: records.containers, plans: records.months, goals: records.goals })) : []
  return { settings, records, fleet, ahead, problems }
}

const CLASS: Record<string, string> = { Zwiadowca: 'scout', Korweta: 'corvette', Fregata: 'frigate', Niszczyciel: 'destroyer', Krążownik: 'cruiser', Flagowiec: 'flagship' }

interface Diff {
  case: string
  what: string
  oracle: unknown
  app: unknown
}

/** Every money number of the oracle against the app's (the main variant – D99 / T350, T341 pairs by the entry's pool). */
function compare(id: string, rep: Oracle, fleet: FleetState, ahead: ReturnType<typeof monthAhead>[], out: Diff[]): number {
  let n = 0
  const eq = (what: string, oracle: unknown, app: unknown) => {
    n++
    const same = typeof oracle === 'number' && typeof app === 'number' ? Math.abs(oracle - app) < 1e-9 : oracle === app || (oracle == null && app == null)
    if (!same) out.push({ case: id, what, oracle, app })
  }
  const gr = (x: { gr: number | null } | null | undefined) => x?.gr ?? null
  // P1: accounts and layers (T4, R2)
  for (const k of rep.konta) {
    const a = fleet.accounts.find((x) => x.id === k.id)
    if (a) eq(`konto ${k.nazwa}`, gr(k.koniecDnia), a.balance)
  }
  eq('suma kont', gr(rep.sumaKont), fleet.total)
  const w = rep.warstwy
  eq('osłony', gr(w.oslony), fleet.shields.amount)
  eq('energia', gr(w.energia), fleet.energy)
  eq('kadłub', gr(w.kadlub), fleet.hull.amount)
  eq('rezerwa PIT-38', gr(w.rezerwaPodatku), fleet.taxHold)
  eq('depozyt domowników', gr(w.depozytRazem), fleet.deposit)
  eq('łupy czekające', gr(w.lupyRazem), fleet.loot.amount)
  for (const g of w.cele) eq(`cel ${g.nazwa}`, gr(g.stan), fleet.goals.find((x) => x.id === g.id)?.amount ?? 0)
  // a tank the app no longer lists (its fee's life over, the rest back in the shields – T136) holds 0
  for (const t of w.zbiorniki) eq(`zbiornik ${t.nazwa}`, gr(t.stan), fleet.tanks.find((x) => x.containerId === t.id)?.amount ?? 0)
  // targets (D13, T181, T219)
  const c = rep.celeWarstw
  eq('cel osłon', gr(c.celOslon), fleet.shields.target)
  eq('minimum osłon', gr(c.minimumOslon), fleet.shields.min)
  eq('cel kadłuba', gr(c.celKadluba), fleet.hull.target)
  eq('wolne do decyzji', gr(c.wolneDoDecyzji), fleet.shields.free)
  eq('średnie koszty', gr(rep.koszty.uzyte), fleet.costs.average)
  // range and class (T71, T218, T10)
  eq('dług', gr(rep.zasieg.dlug), fleet.debt)
  eq('zasięg', rep.zasieg.dokladnie, fleet.range)
  eq('klasa', rep.zasieg.klasa == null ? null : CLASS[rep.zasieg.klasa], fleet.shipClass)
  eq('masa ładunku', gr(rep.ladownia.masaMiesieczna), fleet.cargo.monthly)
  // „do zadokowania” (T342)
  eq('do zadokowania – ile', rep.doZadokowania.liczba, fleet.toDock.count)
  eq('do zadokowania – wpływ', gr(rep.doZadokowania.wplyw), fleet.toDock.inflow)
  eq('do zadokowania – wypływ', gr(rep.doZadokowania.wyplyw), fleet.toDock.outflow)
  eq('do zadokowania – w celach', gr(rep.doZadokowania.wCelach), fleet.toDock.goals)
  // the household (D80, D99, T350, T354): each member both ways
  for (const m of rep.domownicy.wariantD99) {
    const a = fleet.receivables.members.find((x) => x.memberId === m.id)
    eq(`ma oddać ${m.osoba}`, gr(m.maOddac), a?.owed ?? 0)
    eq(`zaliczka ${m.osoba}`, gr(m.zaliczka), a?.deposit ?? 0)
  }
  // loans (T70, T355)
  for (const l of rep.pozyczki) eq(`pożyczka ${l.nazwa} – zostało`, gr(l.zostalo), fleet.loans.find((x) => x.loan.id === l.id)?.open ?? null)
  // this month's plan (D11, D14, T29, T45, T346 – `want`)
  const p = rep.planMiesiaca
  if (fleet.salary) {
    eq('pensja wypłacona', gr(p.wyplacono), fleet.salary.paid)
    eq('pensja z osłon', gr(p.zOslon), fleet.salary.fromShields)
    eq('pensja z kadłuba', gr(p.zKadluba), fleet.salary.fromHull)
  }
  const taken = new Map<string, number>()
  const rates = new Map<string, number>()
  for (const e of fleet.log) {
    if (e.date.slice(0, 7) !== fleet.month) continue
    if (e.kind === 'sinking') for (const [cid, x] of Object.entries(e.moves.tanks ?? {})) taken.set(cid, (taken.get(cid) ?? 0) + x)
    if (e.kind === 'rate') for (const [gid, x] of Object.entries(e.moves.goals ?? {})) rates.set(gid, (rates.get(gid) ?? 0) + x)
  }
  for (const r of p.ratyOdkladek) {
    const cid = r.id
    eq(`odkładka ${r.kontener} – pobrana`, gr(r.rata), taken.get(cid) ?? 0)
    const t = fleet.tanks.find((x) => x.containerId === cid)
    if (t?.want !== undefined) eq(`odkładka ${r.kontener} – wymagana`, gr(r.planowana), t.want)
  }
  const oracleRates = new Map<string, number>(p.ratyCelow.map((r: Oracle) => [r.id, r.rata.gr]))
  for (const id of new Set([...oracleRates.keys(), ...rates.keys()])) eq(`rata celu ${id}`, oracleRates.get(id) ?? 0, rates.get(id) ?? 0)
  // the daily allowance (T30, T295; S8 – a negative allowance as 0)
  if (fleet.daily) {
    eq('przydział dziś', gr(rep.przydzial.przydzialDzisNieUjemny), fleet.daily.allowance)
    eq('energia dziś', gr(rep.przydzial.energiaDzis), fleet.daily.left)
    eq('podstawowy przydział', gr(rep.przydzial.podstawowyPrzydzial), fleet.daily.base)
  }
  // income (D81, T119, T120, T186, T224, T355)
  const s = rep.przychody.srednie
  // C21 (D99 pkt 9): „Razem” = suma zaokrąglonych części (praca + trading)
  for (const k of [3, 6, 12] as const) if (s[`s${k}`]) eq(`przychody – średnia ${k}`, gr(s[`s${k}`].razemZCzesci), fleet.incomeStats.windows[k].total)
  // the months ahead (T346): the tanks (given and wanted) and the goals' installments
  rep.planNaprzod.forEach((m: Oracle, i: number) => {
    const a = ahead[i]
    if (!a) return
    for (const t of m.odkladki) {
      eq(`${m.miesiac} odkładka ${t.kontener} – pobrana`, gr(t.pobrane), a.tanks.get(t.id)?.amount ?? 0)
      eq(`${m.miesiac} odkładka ${t.kontener} – wymagana`, gr(t.wymagana), a.tanks.get(t.id)?.want ?? 0)
    }
    const aheadRates = new Map<string, number>(m.ratyCelow.map((g: Oracle) => [g.id, g.rata.gr]))
    for (const id of new Set([...aheadRates.keys(), ...a.rates.keys()])) eq(`${m.miesiac} rata celu ${id}`, aheadRates.get(id) ?? 0, a.rates.get(id) ?? 0)
  })
  return n
}

/** „Ten sam stan – ta sama liczba na każdym ekranie” (AP-32): the app against itself. */
function sameEverywhere(id: string, app: Awaited<ReturnType<typeof appState>>, out: Diff[]): number {
  const { fleet, records, settings } = app
  let n = 0
  const eq = (what: string, a: unknown, b: unknown) => {
    n++
    if (a !== b) out.push({ case: id, what, oracle: a, app: b })
  }
  // the invariant (T4): the layers' sum = the accounts
  eq('suma warstw = suma kont', layersSum(fleet), fleet.total)
  // the deposit = the advances shown at the persons; the owed = their debts (T354, AF-16)
  eq('depozyt = suma zaliczek przy osobach', fleet.deposit, fleet.receivables.members.reduce((a, m) => a + m.deposit, 0))
  eq('domownicy mają oddać = suma przy osobach', fleet.receivables.house, fleet.receivables.members.reduce((a, m) => a + m.owed, 0))
  // the asteroid's due: the briefing (Mostek, odprawa) = the Radar = the cargo hold (AF-15) – the fees' state and their
  // payment days as the window gives them (`features/cargo/status.ts`: from the budget's start, `cargoDays` – T375, T376)
  const cargo = cargoStatuses({ containers: records.containers, transactions: records.transactions, today: fleet.today, tanks: fleet.tanks, coveredTo: settings.import.coveredTo, start: fleet.start })
  const payDays = cargoDays({ containers: records.containers, transactions: records.transactions, today: fleet.today })
  const radarItems = radar({ today: fleet.today, plans: records.months, containers: records.containers, tanks: fleet.tanks, loans: fleet.loans, money: (g) => String(g), cargo, payDays })
  const brief = briefing({ fleet, containers: records.containers, imports: [], label: () => '', cargo, payDays })
  for (const b of brief.filter((x) => x.kind === 'asteroid')) {
    const [, cid, date] = b.key.split(':')
    const first = radarItems.filter((r) => r.kind === 'asteroid' && r.ref === cid).sort((x, y) => (x.date < y.date ? -1 : 1))[0]
    eq(`termin asteroidy ${records.containers.find((x) => x.id === cid)?.name ?? cid}: odprawa = Radar`, date, first?.date ?? null)
  }
  // the export of the month = the bar of Operacje (count, money in and out without own transfers and corrections, costs)
  const from = `${fleet.month}-01`
  const to = `${fleet.month}-31`
  const monthOps = records.transactions.filter((t) => t.date >= from && t.date <= to)
  const bar = sumOperations(monthOps)
  const rows = operationRows(records.transactions, settings.categories, settings.accounts, from, to, settings.household.members)
  eq('eksport miesiąca = pasek Operacji – liczba', rows.length, bar.count)
  const moving = rows.filter((r) => r.kind !== TX_KIND_LABEL.transfer && r.kind !== TX_KIND_LABEL.correction)
  eq('eksport miesiąca = pasek Operacji – wpływy', moving.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0), bar.inflow)
  eq('eksport miesiąca = pasek Operacji – wypływy', moving.filter((r) => r.amount < 0).reduce((a, r) => a - r.amount, 0), bar.outflow)
  return n
}

/** The copy of the schemas (`lib/schemat.mjs`) against the app's: every field the oracle reads, after both readings. */
function schemaCopy(id: string, raw: any, app: Awaited<ReturnType<typeof appState>>, out: Diff[]): number {
  let n = 0
  const check = (kind: keyof typeof CHECKED_FIELDS, ours: any, theirs: any, where: string) => {
    for (const f of CHECKED_FIELDS[kind]) {
      n++
      const a = JSON.stringify(ours?.[f] ?? null)
      const b = JSON.stringify(theirs?.[f] ?? null)
      if (a !== b) out.push({ case: id, what: `kopia schematów: ${where}.${f}`, oracle: ours?.[f], app: theirs?.[f] })
    }
  }
  const pairs: Array<[Coll, (x: any) => any, keyof typeof CHECKED_FIELDS]> = [
    ['transactions', normalizeTransaction, 'transaction'],
    ['containers', normalizeContainer, 'container'],
    ['goals', normalizeGoal, 'goal'],
    ['months', normalizeMonth, 'month'],
    ['dockings', normalizeDocking, 'docking'],
    ['loans', normalizeLoan, 'loan'],
    ['balances', normalizeBalance, 'balance'],
    ['scheduled', normalizeScheduled, 'scheduled']
  ]
  for (const [coll, norm, kind] of pairs) {
    const byId = new Map<string, any>(app.records[coll].map((x: any) => [x.id, x]))
    for (const r of raw[coll] as any[]) {
      const theirs = byId.get(r.id)
      if (!theirs) continue
      const ours = norm(r)
      check(kind, ours, theirs, coll)
      if (kind === 'transaction') (ours.splits ?? []).forEach((s: any, i: number) => check('split', s, theirs.splits[i], `${coll}.splits`))
    }
  }
  return n
}

/**
 * Known disagreements: what (a prefix of the field) → why. Each is an app bug a later group fixes or a gap of the oracle
 * (`docs/audyt/wyrocznia.md`, u3) – keep this list short and dated.
 */
const KNOWN: Array<{ what: RegExp; why: string }> = [
  // 04.11.2026 (AP-32 u3) – AF-15 (the briefing's asteroid on the container's day, the Radar's on the day of its payments):
  // fixed in N3 (AP-10, T376 – one fees' state, `nextDueOf`, `cargoDays`), gone from the list after the merge of N2 with N3.
]

const cases = casesOf()

describe.skipIf(!cases.length)(`wyrocznia ${WERSJA} a silnik aplikacji na migawkach audytu (AP-32)`, () => {
  it(
    `każda liczba pieniędzy wyroczni = aplikacji; ta sama liczba na każdym ekranie; kopia schematów (${cases.length} przypadków)`,
    async () => {
      const diffs: Diff[] = []
      const errors: string[] = []
      let compared = 0
      let same = 0
      let schema = 0
      const t0 = Date.now()
      for (const c of cases) {
        try {
          const raw = readFolderRaw(c.dane)
          const nowMs = fromWarsaw(c.date, c.time) + 59_999
          const rep = buildReport(normalizeInput(raw), c.ictj ? loadIctj(c.ictj) : null, { date: c.date, time: c.time, ms: nowMs }, { warianty: false, gra: false })
          if (rep.blad) {
            errors.push(`${c.id}: wyrocznia – ${rep.blad}`)
            continue
          }
          const app = await appState(raw, c.ictj, c.date, nowMs)
          compared += compare(c.id, rep, app.fleet, app.ahead, diffs)
          same += sameEverywhere(c.id, app, diffs)
          schema += schemaCopy(c.id, raw, app, diffs)
        } catch (e) {
          errors.push(`${c.id}: ${(e as Error).stack?.split('\n').slice(0, 3).join(' ')}`)
        }
      }
      const known = (d: Diff) => KNOWN.find((k) => k.what.test(d.what))
      const unexpected = diffs.filter((d) => !known(d))
      const byWhat = new Map<string, Diff[]>()
      for (const d of diffs) {
        const key = d.what.replace(/^\d{4}-\d{2} /, '')
        byWhat.set(key, [...(byWhat.get(key) ?? []), d])
      }
      const summary = {
        wersja: WERSJA,
        przypadki: cases.length,
        porownania: { liczbyPieniedzy: compared, tenSamStan: same, kopiaSchematow: schema },
        sekundy: Math.round((Date.now() - t0) / 1000),
        bledy: errors,
        rozbieznosci: [...byWhat].map(([what, ds]) => ({ what, ile: ds.length, znane: known(ds[0]!)?.why ?? null, przyklady: ds.slice(0, 5) }))
      }
      mkdirSync(OUT, { recursive: true })
      writeFileSync(join(OUT, 'regresja.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8')
      console.log(
        [
          `wyrocznia ${WERSJA}: ${cases.length} przypadków, ${compared} liczb pieniędzy, ${same} porównań ekranów, ${schema} pól schematów – ${summary.sekundy} s`,
          ...summary.rozbieznosci.map((r) => `  ${r.znane ? 'znane' : 'NOWE'} ${r.what}: ${r.ile} × (np. ${r.przyklady[0]!.case}: wyrocznia ${JSON.stringify(r.przyklady[0]!.oracle)}, aplikacja ${JSON.stringify(r.przyklady[0]!.app)})${r.znane ? ' – ' + r.znane : ''}`),
          ...errors.map((e) => `  BŁĄD ${e}`)
        ].join('\n')
      )
      expect(errors).toEqual([])
      expect(unexpected.slice(0, 20)).toEqual([])
      // a known one fixed meanwhile – take it off the list
      expect(KNOWN.filter((k) => !diffs.some((d) => k.what.test(d.what))).map((k) => k.why)).toEqual([])
    },
    60 * 60_000
  )
})
