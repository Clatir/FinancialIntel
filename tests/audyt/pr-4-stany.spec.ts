// PR, przebieg 4: stany szczególne – `start` (kopia stanu po kreatorze), `spec-dok` (warstwy z przykładu specyfikacji:
// osłony 8 640 / 12 000, kadłub 15 000 / 21 900, koszty 3 650 zł, dostawa 5 000 zł), `brzegi` (osłony poniżej minimum,
// pusty kadłub, cel kadłuba nieznany; ponad cel osłon przy kadłubie nieznanym / niepełnym / pełnym; minimum wyższe od
// celu w pliku), zasięg 11,96 i 6,00 mies. Foldery budowane przed startem przez seedFolder (tests/e2e/seed.ts).
// Odczyt: PR.1 (warstwy = salda), PR.2 (cele warstw, „wolne do decyzji”), PR.3 (zasięg i klasa na ekranach).
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { seedFolder, zl } from '../e2e/seed'
import { LAB, start, useState } from './lab'
import { breakdowns, flat, go, out, pr1, readAll, recAt, screenValues, snap, snapshot, stepper, textOf, type Ctx } from './pr-pomoc'

const MBANK = '01KDEFACC00000000000000001'

/** Range and class wherever the app shows them (Mostek, Dowództwo, Raporty – przegląd roczny, Wywiad, Ładownia – symulacja). */
async function rangeEverywhere(page: Page): Promise<Record<string, string>> {
  const r: Record<string, string> = {}
  await go(page, '1', 'page-bridge')
  r.plakietka = `${await textOf(page.getByTestId('ship-class'))} (${(await page.getByTestId('ship-class').first().getAttribute('title').catch(() => '')) ?? ''})`
  await go(page, '8', 'page-command')
  r.dowodztwo = flat(/KLASA OKRĘTU[\s\S]*?Zwiadowca/.exec(await textOf(page.getByTestId('page-command')))?.[0] ?? '?')
  await go(page, '0', 'page-reports')
  await page.getByRole('radio', { name: 'Przegląd roczny' }).click()
  await page.waitForTimeout(700)
  r.raporty = flat(/Zasięg teraz[^\n]*\n?[^\n]*/.exec(await textOf(page.getByTestId('reports-year')))?.[0] ?? '?')
  await go(page, '9', 'page-intel')
  await page.waitForTimeout(1500)
  const intel = await textOf(page.getByTestId('page-intel'))
  r.wywiad = [...intel.matchAll(/[^\n]*(starczy|Zasięg i klasa)[^\n]*(\n[^\n]*){0,2}/g)].map((m) => flat(m[0])).join(' || ') || '(brak)'
  // Ładownia: the simulation of a new container (typed, never saved).
  await go(page, '5', 'page-cargo')
  try {
    await page.getByTestId('cargo-add').click()
    await page.waitForTimeout(500)
    const amount = page.getByTestId('container-amount')
    await amount.click()
    await amount.fill('100')
    await amount.press('Tab')
    await page.waitForTimeout(600)
    r.ladownia_symulacja = flat(await textOf(page.getByTestId('cargo-sim')))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  } catch (e) {
    r.ladownia_symulacja = `(nie udało się: ${String(e).split('\n')[0]})`
  }
  await go(page, '1', 'page-bridge')
  return r
}

async function readState(ctx: Ctx, page: Page, app: ElectronApplication, label: string, dump: (n: string, c: unknown) => void, tag: string): Promise<void> {
  const mig = snapshot('PR.1', ctx.dataDir, ctx.ictjDir)
  const s = await readAll(page, app, ['plan', 'ladownia', 'mapa', 'radar', 'operacje', 'konta', 'szybki'])
  await go(page, '1', 'page-bridge')
  const b = await breakdowns(page)
  const rng = await rangeEverywhere(page)
  const v = screenValues(s)
  recAt(ctx, mig, 'PR.1', label, v)
  recAt(ctx, mig, 'PR.2', label, { stan: flat(s.mostek.stan.text), rozbicie_cele: b.cele?.join(' | ') ?? null, odprawa: s.mostek.odprawa.join(' || '), plan: s.plan ? flat(/PENSJA[\s\S]*?PRZYCHODY/.exec(s.plan)?.[0] ?? '') : null })
  recAt(ctx, mig, 'PR.3', label, { zasieg: s.mostek.stan.zasieg, klasa: s.mostek.stan.klasa, koszty: s.mostek.stan.koszty, rozbicie_zasieg: b.zasieg?.join(' | ') ?? null, ...rng })
  recAt(ctx, mig, 'PR.4', label, Object.fromEntries(Object.entries(b).map(([k, x]) => [`rozbicie_${k}`, x.join(' | ')])))
  dump(`${tag}-PR.1`, pr1(s))
  dump(`${tag}-stan`, s.mostek.stan.text)
  dump(`${tag}-odprawa`, s.mostek.odprawa)
  dump(`${tag}-rozbicia`, b)
  dump(`${tag}-zasieg`, rng)
  dump(`${tag}-plan-pensja`, s.plan ? /PENSJA[\s\S]*?PRZYCHODY/.exec(s.plan)?.[0] : null)
  dump(`${tag}-radar-poczatek`, s.radar?.slice(0, 600))
  dump(`${tag}-migawka`, mig)
  await snap(page, `PR-${tag}`)
}

interface Seed {
  salary: number
  shields: number
  hull: number
  assumed: number | null
  minSalaries?: number
  tx?: Array<Record<string, unknown>>
}

/** A folder from zero: the budget from 01.11.2026 (salary paid from the shields that day), one account (mBank). */
function build(dataDir: string, o: Seed): void {
  rmSync(dataDir, { recursive: true, force: true })
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start: '2026-11-01', initial: { shields: zl(o.shields), hull: zl(o.hull), goals: {} } },
      layers: { ...s.layers, assumedCosts: o.assumed == null ? null : zl(o.assumed) },
      orders: { ...s.orders, minShieldSalaries: o.minSalaries ?? 1 }
    }),
    records: {
      balances: [{ date: '2026-11-01', accountId: MBANK, kind: 'opening', amount: zl(o.shields + o.hull) }],
      months: [{ month: '2026-11', salary: zl(o.salary), envelopes: {} }],
      transactions: o.tx ?? []
    }
  })
}

async function variant(name: string, label: string, o: Seed, dump: (n: string, c: unknown) => void, after?: (ctx: Ctx, page: Page, app: ElectronApplication) => Promise<void>): Promise<void> {
  const dataDir = join(LAB, 'przebiegi', name, 'dane')
  build(dataDir, o)
  const ctx: Ctx = { run: name, dataDir }
  const { app, page, errors } = await start(name, { dataDir })
  page.setDefaultTimeout(20_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    await readState(ctx, page, app, label, dump, name)
    if (after) await after(ctx, page, app)
    dump(`${name}-bledy`, errors)
  } finally {
    await app.close()
  }
}

test('PR przebieg 4a – stan start (po kreatorze)', async () => {
  const RUN = 'pr-4a'
  const st = useState('start', RUN)
  const dump = out(RUN)
  const ctx: Ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(5000)
    await readState(ctx, page, app, 'start (po kreatorze, 03.11.2026)', dump, RUN)
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})

test('PR przebieg 4b – spec-dok: przykład ze specyfikacji (dostawa 5 000 zł)', async () => {
  const dump = out('pr-4b')
  const step = stepper(dump)
  await variant(
    'pr-4b',
    'spec-dok: osłony 8 640 / 12 000 (pensja 4 000), kadłub 15 000 / 21 900 (koszty przyjęte 3 650), wpływ z XTB 5 000 zł 02.11 przed dokowaniem',
    { salary: 4000, shields: 12640, hull: 15000, assumed: 3650, tx: [{ date: '2026-11-02', accountId: MBANK, kind: 'trading', amount: zl(5000), counterparty: 'XTB S.A.', title: 'WYPLATA SRODKOW' }] },
    dump,
    async (ctx, page, app) => {
      await step('dokowanie', async () => {
        await go(page, '1', 'page-bridge')
        dump('pr-4b-dokowanie-wiersze', (await page.locator('[data-testid="docking-row"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')))
        await page.locator('[data-testid="docking-row"]').filter({ hasText: /5\s000,00/ }).first().click()
        await page.getByTestId('docking-dialog').waitFor()
        await page.waitForTimeout(600)
        const mig = snapshot('PR.1', ctx.dataDir)
        recAt(ctx, mig, 'PR.1', 'spec-dok – okno dokowania 5 000 zł (propozycja)', { okno: flat(await textOf(page.getByTestId('docking-dialog'))) })
        dump('pr-4b-okno', await textOf(page.getByTestId('docking-dialog')))
        await snap(page, 'PR-pr-4b-okno-dokowania')
        await page.getByTestId('docking-confirm').click()
        await page.waitForTimeout(2500)
        await readState(ctx, page, app, 'spec-dok po dokowaniu 5 000 zł (propozycja)', dump, 'pr-4b-po')
      })
    }
  )
})

test('PR przebieg 4c – brzegi warstw', async () => {
  const dump = out('pr-4c')
  // Osłony poniżej minimum (3 000 przy pensji 5 000), pusty kadłub, cel kadłuba nieznany (brak historii i kosztów przyjętych).
  await variant('pr-4c1', 'brzegi: osłony 3 000 (pensja 5 000, minimum 1 pensja), kadłub 0, koszty nieznane', { salary: 5000, shields: 8000, hull: 0, assumed: null }, dump)
  // Minimum 4 pensje przy celu 3 pensji (wpisane w pliku): minimum = min(minimum, cel) × pensja.
  await variant('pr-4c2', 'brzegi: minimum 4 pensje > cel 3 pensje (w pliku), osłony 3 000, pensja 5 000', { salary: 5000, shields: 8000, hull: 0, assumed: null, minSalaries: 4 }, dump)
  // Ponad cel osłon przy celu kadłuba nieznanym.
  await variant('pr-4c3', 'brzegi: osłony 20 000 / 15 000, kadłub 0, cel kadłuba nieznany', { salary: 5000, shields: 25000, hull: 0, assumed: null }, dump)
  // Ponad cel osłon przy kadłubie niepełnym (koszty przyjęte 2 000 → cel 12 000).
  await variant('pr-4c4', 'brzegi: osłony 20 000 / 15 000, kadłub 1 000 / 12 000', { salary: 5000, shields: 25000, hull: 1000, assumed: 2000 }, dump)
  // Ponad cel osłon przy pełnym kadłubie – „wolne do decyzji”.
  await variant('pr-4c5', 'brzegi: osłony 20 000 / 15 000, kadłub 12 000 / 12 000', { salary: 5000, shields: 25000, hull: 12000, assumed: 2000 }, dump)
})

test('PR przebieg 4d – zasięg 11,96 i 6,00 mies.', async () => {
  const dump = out('pr-4d')
  await variant('pr-4d1', 'zasięg 11,96 mies.: osłony 3 000 + kadłub 8 960, koszty przyjęte 1 000', { salary: 1000, shields: 4000, hull: 8960, assumed: 1000 }, dump)
  await variant('pr-4d2', 'zasięg 6,00 mies.: osłony 3 000 + kadłub 3 000, koszty przyjęte 1 000', { salary: 1000, shields: 4000, hull: 3000, assumed: 1000 }, dump)
})
