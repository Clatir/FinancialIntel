// Helpers of the audit's Ładownia area (LA, AU-10): the states built on a copy of the persona „rok” (docs/audyt/raport/LA.md
// says what each adds), the snapshot of the data folder at every reading of numbers (the oracle counts on it), screen
// reading. Observation only – no assertions about the app.
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Locator, Page } from '@playwright/test'
import { LAB, reading } from './lab'

export const MIG = join(LAB, 'migawki', 'la')
export const MBANK = '01KDEFACC00000000000000001'
export const CAT = {
  czynsz: '01KDEFCAT00000000000000201',
  media: '01KDEFCAT00000000000000202',
  wyposazenie: '01KDEFCAT00000000000000203',
  auto: '01KDEFCAT00000000000000300',
  ubezpieczenie: '01KDEFCAT00000000000000303',
  parking: '01KDEFCAT00000000000000304',
  lekarz: '01KDEFCAT00000000000000502',
  sport: '01KDEFCAT00000000000000503',
  hobby: '01KDEFCAT00000000000000602',
  subskrypcje: '01KDEFCAT00000000000000700',
  internet: '01KDEFCAT00000000000000702',
  streaming: '01KDEFCAT00000000000000703',
  aplikacje: '01KDEFCAT00000000000000704',
  inne: '01KDEFCAT00000000000000902'
}
/** The persona's containers changed by some states. */
export const PERSONA = { czynsz: '01KAZ400000000000000000001', netia: '01KAZ400000000000000000002', telefon: '01KAZ400000000000000000003', prad: '01KAZ400000000000000000009' }

/** A record id of the LA area (a valid ULID: Crockford base32). */
export const laId = (n: number): string => `01KMXCRG0${String(n).padStart(17, '0')}`
export const C = { wywoz: laId(1), woda: laId(2), ocMoto: laId(3), leasing: laId(4), silownia: laId(5), audioteka: laId(6), disney: laId(7), hbo: laId(8) }

const IMPORTED = '2026-10-27T14:17:29.698Z'
let txSeq = 1000

// ---- snapshots and readings ----

/** Copy of the run's data folder (and its ICTTJ folder) without backups and .history: C:\FI-audyt\migawki\la\<point>-<n>. */
export function snapshot(point: string, dataDir: string, ictjDir?: string): string {
  mkdirSync(MIG, { recursive: true })
  const base = point.replace(/[^\w.-]+/g, '_')
  let n = 1
  while (existsSync(join(MIG, `${base}-${n}`))) n++
  const dir = join(MIG, `${base}-${n}`)
  const copy = (from: string, to: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        rmSync(to, { recursive: true, force: true })
        cpSync(from, to, {
          recursive: true,
          filter: (src) => {
            const top = relative(from, src).split(/[\\/]/)[0]
            return top !== 'backups' && top !== '.history'
          }
        })
        return
      } catch (e) {
        if (attempt === 2) writeFileSync(join(dir, 'BLAD-kopii.txt'), String(e))
      }
    }
  }
  mkdirSync(dir, { recursive: true })
  copy(dataDir, join(dir, 'dane'))
  if (ictjDir && existsSync(ictjDir)) copy(ictjDir, join(dir, 'ictj'))
  return dir
}

/** A reading of numbers (lab.reading, group „la”) with the snapshot of the folder taken first. */
export function rd(point: string, state: string, values: Record<string, unknown>, dirs: { dataDir: string; ictjDir?: string }): string {
  const mig = snapshot(point, dirs.dataDir, dirs.ictjDir)
  const flat: Record<string, string | number | null> = {}
  for (const [k, v] of Object.entries(values)) flat[k] = v == null ? null : typeof v === 'number' || typeof v === 'string' ? v : JSON.stringify(v)
  reading('la', point, state, { ...flat, _migawka: mig })
  return mig
}

// ---- dumps of the run ----

export function out(run: string): (name: string, content: unknown) => void {
  const dir = join(LAB, 'przebiegi', run, 'out')
  mkdirSync(dir, { recursive: true })
  return (name, content) => {
    const s = typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    writeFileSync(join(dir, `${name.replace(/[^\w.-]+/g, '_')}.txt`), `${s}\n`)
    appendFileSync(join(dir, '_log.txt'), `== ${name}\n${s}\n`)
  }
}

// ---- records ----

function writeJson(file: string, rec: unknown): void {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, `${JSON.stringify(rec, null, 2)}\n`)
}

export function editJson(file: string, fn: (j: Record<string, any>) => Record<string, any> | void): void {
  const j = JSON.parse(readFileSync(file, 'utf8'))
  writeJson(file, fn(j) ?? j)
}

/** A container with the persona's full shape. */
export function writeContainer(dataDir: string, o: Record<string, any> & { id: string; name: string; amount: number }): void {
  const at = o.createdAt ?? '2025-09-01T08:00:00.000Z'
  writeJson(join(dataDir, 'containers', `${o.id}.json`), {
    schemaVersion: 1,
    createdAt: at,
    updatedAt: at,
    type: 'fixed',
    cycleMonths: 1,
    dueMonth: '2025-09',
    dueDay: 1,
    accountId: MBANK,
    categoryId: null,
    counterparty: '',
    from: '2025-09',
    until: null,
    loanId: null,
    archived: false,
    archivedAt: null,
    past: [],
    schedule: [],
    variable: false,
    priceIgnored: null,
    aliveAt: null,
    note: '',
    ...o
  })
}

/**
 * An expense of mBank: `bank` – as the import of 27.10 wrote it (rows up to 26.10, the file's range), otherwise typed by
 * hand. `containerId` – linked to a container (the import links a container's counterparty).
 */
export function writeTx(dataDir: string, o: { date: string; amount: number; counterparty: string; categoryId: string | null; title?: string; containerId?: string | null; bank?: boolean; card?: boolean }): string {
  const id = laId(++txSeq)
  const op = o.card ? 'ZAKUP PRZY UŻYCIU KARTY' : 'PRZELEW ZEWNĘTRZNY WYCHODZĄCY'
  const rec: Record<string, unknown> = {
    schemaVersion: 1,
    id,
    createdAt: o.bank ? IMPORTED : '2026-11-03T08:00:00.000Z',
    updatedAt: o.bank ? IMPORTED : '2026-11-03T08:00:00.000Z',
    updatedBy: 'AUDYT',
    date: o.date,
    time: null,
    accountId: MBANK,
    kind: 'expense',
    amount: -Math.abs(o.amount),
    categoryId: o.categoryId,
    refundable: false,
    memberId: null,
    advance: false,
    covers: [],
    splits: [],
    counterparty: o.counterparty,
    title: o.title ?? '',
    note: '',
    impulse: null,
    logNote: '',
    repaid: 0,
    counterAccountId: null,
    containerId: o.containerId ?? null,
    goalId: null,
    loanId: null
  }
  if (o.bank)
    rec.bank = {
      format: 'mbank',
      key: `mbank:audytla${id.slice(-8)}:0`,
      description: `${op} ${o.counterparty} ${o.title ?? ''}`.trim(),
      counterparty: o.counterparty,
      bankName: o.counterparty,
      operation: op,
      category: '',
      pending: false,
      importedAt: IMPORTED,
      source: 'historia'
    }
  writeJson(join(dataDir, 'transactions', o.date.slice(0, 4), `${o.date}_${id}.json`), rec)
  return id
}

const monthsSeq = (from: string, n: number, step = 1): string[] => {
  const res: string[] = []
  let [y, m] = from.split('-').map(Number) as [number, number]
  for (let i = 0; i < n; i++) {
    res.push(`${y}-${String(m).padStart(2, '0')}`)
    m += step
    while (m > 12) {
      m -= 12
      y++
    }
  }
  return res
}

// ---- the states (each a part added to a copy of „rok”) ----

export type Part = 'testnet' | 'testnet-wstecz' | 'testnet-dzienne' | 'koperta700' | 'okresowe' | 'okresowe-archiwum' | 'statusy' | 'straznik' | 'propozycje'

export function build(dataDir: string, parts: Part[]): string[] {
  const log: string[] = []
  const has = (p: Part) => parts.includes(p)
  if (has('testnet')) {
    // 14 imported monthly payments of 79 zł to TESTNET (internet), no container.
    for (const m of monthsSeq('2025-09', 14)) writeTx(dataDir, { date: `${m}-15`, amount: 7900, counterparty: 'TESTNET SP Z O O', title: `FAKTURA ${m}`, categoryId: CAT.internet, bank: true })
    log.push('TESTNET SP Z O O: 79,00 zł 15. dnia 2025-09…2026-10 (14, import, internet, bez kontenera)')
  }
  if (has('testnet-wstecz')) {
    writeTx(dataDir, { date: '2025-08-28', amount: 7900, counterparty: 'TESTNET SP Z O O', title: 'FAKTURA 2025-08', categoryId: CAT.internet })
    log.push('TESTNET: 79,00 zł 2025-08-28 wpisane ręcznie (przed startem budżetu)')
  }
  if (has('testnet-dzienne')) {
    writeTx(dataDir, { date: '2026-10-20', amount: 3000, counterparty: 'TESTNET SP Z O O', title: 'DOLADOWANIE', categoryId: CAT.hobby })
    writeTx(dataDir, { date: '2026-11-02', amount: 3000, counterparty: 'TESTNET SP Z O O', title: 'DOLADOWANIE', categoryId: CAT.hobby })
    writeTx(dataDir, { date: '2026-11-02', amount: 7900, counterparty: 'TESTNET SP Z O O', title: 'FAKTURA 2026-11', categoryId: CAT.internet })
    log.push('TESTNET wpisane ręcznie: 30,00 zł 2026-10-20 i 2026-11-02 (hobby – koperta codzienna Rozrywka i hobby), 79,00 zł 2026-11-02 (internet)')
  }
  if (has('koperta700')) {
    for (const m of ['2026-10', '2026-11']) editJson(join(dataDir, 'months', `${m}.json`), (j) => ({ ...j, envelopes: { ...j.envelopes, [CAT.subskrypcje]: 15000 } }))
    log.push('Plan 2026-10 i 2026-11: koperta „Subskrypcje i łączność” 150,00 zł')
  }
  if (has('okresowe')) {
    writeContainer(dataDir, { id: C.wywoz, name: 'Wywóz śmieci', amount: 24000, cycleMonths: 3, dueMonth: '2025-11', dueDay: 20, categoryId: CAT.czynsz, counterparty: 'MPO TESTOWO SP Z O O' })
    for (const d of ['2025-11-20', '2026-02-20', '2026-05-20', '2026-08-20', '2026-10-22']) writeTx(dataDir, { date: d, amount: 24000, counterparty: 'MPO TESTOWO SP Z O O', title: 'WYWOZ ODPADOW', categoryId: CAT.czynsz, containerId: C.wywoz, bank: true })
    writeContainer(dataDir, { id: C.woda, name: 'Woda', amount: 18000, cycleMonths: 3, dueMonth: '2025-11', dueDay: 15, categoryId: CAT.media, counterparty: 'AQUANET SA' })
    for (const d of ['2025-11-14', '2026-02-16', '2026-05-15', '2026-10-14']) writeTx(dataDir, { date: d, amount: 18000, counterparty: 'AQUANET SA', title: 'WODA I SCIEKI', categoryId: CAT.media, containerId: C.woda, bank: true })
    writeContainer(dataDir, { id: C.ocMoto, name: 'OC motocykla', amount: 60000, cycleMonths: 12, dueMonth: '2025-10', dueDay: 12, categoryId: CAT.ubezpieczenie, counterparty: 'WARTA SA' })
    const archived = has('okresowe-archiwum')
    for (const d of archived ? ['2025-10-13'] : ['2025-10-13', '2026-10-12']) writeTx(dataDir, { date: d, amount: 60000, counterparty: 'WARTA SA', title: 'OC MOTOCYKLA', categoryId: CAT.ubezpieczenie, containerId: C.ocMoto, bank: true })
    if (archived) editJson(join(dataDir, 'containers', `${C.ocMoto}.json`), (j) => ({ ...j, archived: true, archivedAt: '2026-09-15T10:00:00.000Z', updatedAt: '2026-09-15T10:00:00.000Z' }))
    log.push(
      'Wywóz śmieci 240 zł co kwartał (termin 2025-11-20 → lis/lut/maj/sie), płatności 2025-11-20, 2026-02-20, 2026-05-20, 2026-08-20, 2026-10-22 (przed terminem 20.11.2026)',
      'Woda 180 zł co kwartał (termin 2025-11-15), płatności 2025-11-14, 2026-02-16, 2026-05-15, 2026-10-14 (zaległa za sierpień – brak płatności w sierpniu)',
      archived
        ? 'OC motocykla 600 zł co rok (termin 2025-10-12), płatność 2025-10-13; ZARCHIWIZOWANY 2026-09-15 (archivedAt), bez płatności 2026-10'
        : 'OC motocykla 600 zł co rok (termin 2025-10-12), płatności 2025-10-13 i 2026-10-12'
    )
  }
  if (has('statusy')) {
    writeContainer(dataDir, { id: C.leasing, name: 'Rata leasingu', amount: 30000, cycleMonths: 1, dueMonth: '2026-12', dueDay: 31, categoryId: CAT.auto, counterparty: 'LEASING TESTOWY SA', from: '2026-11', createdAt: '2026-11-01T09:00:00.000Z' })
    writeTx(dataDir, { date: '2026-11-02', amount: 145000, counterparty: 'WSPÓLNOTA MIESZKANIOWA TESTOWA 1', title: 'CZYNSZ 2026-11', categoryId: CAT.czynsz, containerId: PERSONA.czynsz })
    editJson(join(dataDir, 'containers', `${PERSONA.telefon}.json`), (j) => ({ ...j, dueDay: 25 }))
    log.push('Rata leasingu 300 zł co miesiąc, dzień 31, od 2026-11, bez płatności', 'Czynsz: płatność 1 450,00 zł 2026-11-02 wpisana (połączona z kontenerem Czynsz)', 'Telefon Play: dzień płatności kontenera 25 (historia: 20–22)')
  }
  if (has('straznik')) {
    writeContainer(dataDir, { id: C.silownia, name: 'Siłownia', type: 'subscription', amount: 12000, dueDay: 3, categoryId: CAT.sport, counterparty: 'CALYPSO FITNESS' })
    for (const m of monthsSeq('2025-09', 12)) writeTx(dataDir, { date: `${m}-03`, amount: 12000, counterparty: 'CALYPSO FITNESS', categoryId: CAT.sport, containerId: C.silownia, bank: true, card: true })
    writeContainer(dataDir, { id: C.audioteka, name: 'Audioteka', type: 'subscription', amount: 1990, dueDay: 10, categoryId: CAT.streaming, counterparty: 'AUDIOTEKA' })
    for (const m of monthsSeq('2025-09', 13)) writeTx(dataDir, { date: `${m}-10`, amount: 1990, counterparty: 'AUDIOTEKA', categoryId: CAT.streaming, containerId: C.audioteka, bank: true, card: true })
    writeContainer(dataDir, { id: C.disney, name: 'Disney+', type: 'subscription', amount: 2300, dueDay: 12, categoryId: CAT.streaming, counterparty: 'DISNEY PLUS' })
    for (const m of monthsSeq('2025-09', 14)) writeTx(dataDir, { date: `${m}-12`, amount: m >= '2026-09' ? 2400 : 2300, counterparty: 'DISNEY PLUS', categoryId: CAT.streaming, containerId: C.disney, bank: true, card: true })
    writeContainer(dataDir, { id: C.hbo, name: 'HBO Max', type: 'subscription', amount: 2999, dueDay: 18, categoryId: CAT.streaming, counterparty: 'HBO MAX' })
    for (const m of monthsSeq('2025-09', 14)) writeTx(dataDir, { date: `${m}-18`, amount: m === '2026-10' ? 3999 : 2999, counterparty: 'HBO MAX', categoryId: CAT.streaming, containerId: C.hbo, bank: true, card: true })
    editJson(join(dataDir, 'containers', `${PERSONA.prad}.json`), (j) => ({ ...j, cycleMonths: 1, amount: 20000 }))
    const prad: Array<[string, number]> = [
      ['2025-10-20', 16840],
      ['2025-12-22', 24150],
      ['2026-02-20', 25530],
      ['2026-04-20', 16020],
      ['2026-06-22', 15890],
      ['2026-08-20', 23140],
      ['2026-10-20', 23140]
    ]
    for (const [d, a] of prad) writeTx(dataDir, { date: d, amount: a, counterparty: 'TAURON SPRZEDAŻ SP. Z O.O.', title: `ENERGIA ${d.slice(0, 7)}`, categoryId: CAT.media, containerId: PERSONA.prad, bank: true })
    log.push(
      'Siłownia 120 zł co miesiąc (dzień 3, CALYPSO FITNESS), płatności 2025-09-03…2026-08-03 (12), brak 03.09 i 03.10.2026',
      'Audioteka 19,90 zł co miesiąc (dzień 10), płatności 2025-09-10…2026-09-10 (13), brak 10.10.2026',
      'Disney+ 23,00 zł co miesiąc (dzień 12), płatności 23,00 zł 2025-09…2026-08, 24,00 zł 2026-09-12 i 2026-10-12',
      'HBO Max 29,99 zł co miesiąc (dzień 18), płatności 29,99 zł 2025-09…2026-09, 39,99 zł 2026-10-18 (jedna w nowej cenie)',
      'Prąd (persony): cykl co miesiąc, kwota 200,00 zł, „Kwota zmienna” – płatności TAURON dopisane: 2025-10-20 168,40; 2025-12-22 241,50; 2026-02-20 255,30; 2026-04-20 160,20; 2026-06-22 158,90; 2026-08-20 231,40; 2026-10-20 231,40 (razem z persony: 12 płatności 11.2025–10.2026, 75. percentyl 231,40 → 232 zł)'
    )
  }
  if (has('propozycje')) {
    const series: Array<[string, number, string, string[]]> = [
      ['AQUA-SERWIS FILTRY', 8900, CAT.media, ['2026-02-09', '2026-04-09', '2026-06-09', '2026-08-10', '2026-10-09']],
      ['STREFA PARKOWANIA TESTOWO', 15000, CAT.parking, ['2025-10-14', '2026-01-14', '2026-04-14', '2026-07-14', '2026-10-14']],
      ['GABINET STOMATOLOGICZNY', 20000, CAT.lekarz, ['2025-10-21', '2026-04-21', '2026-10-21']],
      ['KASPERSKY LAB', 14900, CAT.aplikacje, ['2025-10-03', '2026-10-03']],
      ['SZKOLA JEZYKOWA LINGUA', 60000, CAT.inne, ['2025-10-06', '2026-01-07', '2026-04-06', '2026-10-06']],
      ['SALON MEBLOWY AGATA', 240000, CAT.wyposazenie, ['2026-04-11']]
    ]
    for (const [cp, a, cat, dates] of series) for (const d of dates) writeTx(dataDir, { date: d, amount: a, counterparty: cp, categoryId: cat, bank: true })
    const gas: Array<[string, number]> = [
      ['2025-11-12', 8950],
      ['2025-12-12', 12140],
      ['2026-01-12', 14830],
      ['2026-02-12', 14920],
      ['2026-03-12', 12140],
      ['2026-04-13', 9870],
      ['2026-05-12', 7230],
      ['2026-06-12', 6510],
      ['2026-07-13', 6190],
      ['2026-08-12', 6450],
      ['2026-09-14', 7780],
      ['2026-10-12', 11260]
    ]
    for (const [d, a] of gas) writeTx(dataDir, { date: d, amount: a, counterparty: 'PGNIG OBROT DETALICZNY', title: `GAZ ${d.slice(0, 7)}`, categoryId: CAT.media, bank: true })
    log.push(
      'AQUA-SERWIS FILTRY 89,00 zł co 2 mies.: 2026-02-09, 04-09, 06-09, 08-10, 10-09',
      'STREFA PARKOWANIA TESTOWO 150,00 zł co kwartał: 2025-10-14, 2026-01-14, 04-14, 07-14, 10-14',
      'GABINET STOMATOLOGICZNY 200,00 zł co pół roku: 2025-10-21, 2026-04-21, 2026-10-21',
      'KASPERSKY LAB 149,00 zł co rok: 2025-10-03, 2026-10-03',
      'SZKOLA JEZYKOWA LINGUA 600,00 zł harmonogram sty/kwi/paź: 2025-10-06, 2026-01-07, 2026-04-06, 2026-10-06',
      'SALON MEBLOWY AGATA 2 400,00 zł jednorazowo 2026-04-11',
      'PGNIG OBROT DETALICZNY co miesiąc 61,90–149,20 zł (12 płatności 11.2025–10.2026, 75. percentyl 121,40 → 122 zł)'
    )
  }
  return log
}

export const files = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir) : [])
export const removeFile = unlinkSync

// ---- the screens ----

export async function textOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak elementu)'
  return (await l.first().innerText()).trim()
}

/** Go to a screen with Ctrl+<key> and wait for it. */
export async function go(page: Page, key: string, testId: string): Promise<void> {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(700)
}

/** The toasts shown now. */
export async function toasts(page: Page): Promise<string[]> {
  return (await page.locator('[role="status"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim())
}

/** The briefing's items: kind and text. */
export async function briefing(page: Page): Promise<Array<{ kind: string | null; text: string }>> {
  const items = page.locator('section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"]')
  const n = await items.count()
  const res = []
  for (let i = 0; i < n; i++) res.push({ kind: await items.nth(i).getAttribute('data-kind'), text: (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim() })
  return res
}

/** The ship's state on the bridge (text) and the energy of today. */
export async function bridgeState(page: Page): Promise<Record<string, string>> {
  const st = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
  return {
    energia: await textOf(page.getByTestId('bridge-energy')),
    stan: (await st.count()) ? (await st.innerText()).replace(/\n/g, ' | ') : '(brak panelu)'
  }
}

/** The colour of an element (rgb). */
export async function colorOf(l: Locator): Promise<string> {
  if (!(await l.count())) return '(brak)'
  return l.first().evaluate((e) => getComputedStyle(e).color)
}

/** Ładownia: list rows, load line, tanks, proposals (texts). */
export async function cargoScreen(page: Page): Promise<Record<string, unknown>> {
  const rows = await page.getByTestId('cargo-row').evaluateAll((els) =>
    els.map((e) => ({ name: e.getAttribute('data-name'), text: (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim(), titles: Array.from(e.querySelectorAll('[title]')).map((x) => x.getAttribute('title')) }))
  )
  return {
    masa: await textOf(page.getByTestId('cargo-mass')),
    linia: (await textOf(page.getByTestId('cargo-load-line'))).replace(/\n/g, ' | '),
    rows,
    odkladki: (await textOf(page.getByTestId('cargo-tanks'))).replace(/\n/g, ' | '),
    propozycje: (await textOf(page.getByTestId('cargo-proposals'))).replace(/\n/g, ' | ')
  }
}

/** Open a container's editor in the Ładownia (by its name) and return the editor's text. */
export async function openContainer(page: Page, name: string): Promise<string> {
  const ed = page.getByTestId('cargo-editor')
  if (await ed.count()) {
    // The panel's title is shown in capitals (innerText follows the CSS): compared without the case.
    const title = await textOf(ed)
    if (title.split('\n')[0]!.toLocaleLowerCase('pl') === `kontener: ${name}`.toLocaleLowerCase('pl')) return title.replace(/\n/g, ' | ')
  }
  await page.locator(`[data-testid="cargo-row"][data-name="${name}"]`).first().click()
  await page.waitForTimeout(500)
  return (await textOf(page.getByTestId('cargo-editor'))).replace(/\n/g, ' | ')
}

/** Plan miesiąca: the shown month's label, split (with the tanks opened), envelopes, daily panel. */
export async function monthScreen(page: Page, openTanks = true): Promise<Record<string, string>> {
  const split = page.getByTestId('month-split')
  if (openTanks && (await split.count())) {
    const btn = page.getByTestId('split-tanks').locator('button').first()
    if ((await btn.count()) && (await btn.innerText()).includes('▸')) {
      await btn.click()
      await page.waitForTimeout(250)
    }
  }
  return {
    miesiac: await textOf(page.getByTestId('month-label')),
    ladownia: await textOf(page.getByTestId('split-cargo')),
    odkladki: await textOf(page.getByTestId('split-tanks')),
    podzial: (await textOf(split)).replace(/\n/g, ' | '),
    koperty: (await textOf(page.getByTestId('month-envelopes'))).replace(/\n/g, ' | '),
    przydzial: (await textOf(page.getByTestId('month-daily'))).replace(/\n/g, ' | '),
    debriefing: (await textOf(page.getByTestId('month-debrief'))).replace(/\n/g, ' | ')
  }
}

/** Plan miesiąca shifted to `delta` months from the current one (Ctrl+4 resets to the current first). */
export async function monthAt(page: Page, delta: number): Promise<Record<string, string>> {
  await go(page, '4', 'page-month')
  const cur = page.locator('button', { hasText: 'bieżący' })
  if (await cur.count()) {
    await cur.first().click()
    await page.waitForTimeout(300)
  }
  for (let i = 0; i < Math.abs(delta); i++) {
    await page.getByTestId(delta < 0 ? 'month-prev' : 'month-next').click()
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(400)
  return monthScreen(page)
}

/** Wait for the bridge after the start; celebrations closed. */
export async function ready(page: Page): Promise<void> {
  await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(400)
    if (await page.getByTestId('celebration').count()) await page.keyboard.press('Escape')
  }
}

/** The JSON records of a collection in the data folder (no history). */
export function recordsOf(dataDir: string, collection: string): Array<Record<string, any>> {
  const res: Array<Record<string, any>> = []
  const walk = (d: string) => {
    for (const f of files(d)) {
      const p = join(d, f)
      if (f.endsWith('.json')) {
        try {
          res.push(JSON.parse(readFileSync(p, 'utf8')))
        } catch {
          /* a file being written */
        }
      } else if (!f.includes('.')) walk(p)
    }
  }
  walk(join(dataDir, collection))
  return res
}
