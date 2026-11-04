// PR, przebieg 7 (uzupełnienie przebiegu 4): spec-dok PRZED dostawą – osłony 8 640 / 12 000 (pensja 4 000), kadłub
// 15 000 / 21 900 (koszty przyjęte 3 650), bez wpływu z XTB; zasięg i klasa na ekranach (PR.3), suma warstw (PR.1).
// Funkcje skopiowane z pr-4-stany.spec.ts (plik testów nie może importować innego pliku testów).
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

test('PR przebieg 7 – spec-dok przed dostawą', async () => {
  const dump = out('pr-7')
  await variant('pr-7', 'spec-dok przed dostawą: osłony 8 640 / 12 000 (pensja 4 000), kadłub 15 000 / 21 900 (koszty przyjęte 3 650)', { salary: 4000, shields: 12640, hull: 15000, assumed: 3650 }, dump)
})