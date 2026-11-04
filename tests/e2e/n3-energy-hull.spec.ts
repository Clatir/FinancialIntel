/**
 * N3 (1.15.7): AP-13 – today's energy never more than the month's energy left, with its reason beside („pensja
 * częściowa”), and „Pokryj z koperty…” saying what it does to today's energy; AP-17 – the hull from 99 % of its target
 * full for „wolne do decyzji”, „Dopełnij kadłub z osłon” with „Cofnij”, the preview of the layers' targets and the
 * firewall switched off said on the bridge.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { addMonths, dayOfMonth, daysInMonth, warsawNow } from '../../src/shared/calc/dates'
import { formatPln } from '../../src/shared/format'
import { launch } from './app'
import { json, records } from './files'
import { seedFolder, zl } from './seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'
const GROCERIES = '01KDEFCAT00000000000000101'
const HOME = '01KDEFCAT00000000000000200'
const FUN = '01KDEFCAT00000000000000600'
const GIFTS = '01KDEFCAT00000000000000900'

const pln = (grosze: number) => `${formatPln(grosze)} zł`

test('AP-13: pensja częściowa – energia dziś 0,00 zł z dopiskiem na Mostku i w Planie miesiąca', async () => {
  const { month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-energy-')), 'FinancialIntel')
  // PM.3 w2: 4 000 zł at the start, all of it spent last month – this month's salary of 4 000 zł finds the shields and
  // the hull empty; the daily envelopes (2 000 zł) would still give a share for today.
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(4000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500), [FUN]: zl(500), [HOME]: zl(500), [GIFTS]: zl(1000) } }],
      transactions: [
        { date: `${prev}-05`, accountId: ACC, amount: -zl(1500), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: `${prev}-10`, accountId: ACC, amount: -zl(500), categoryId: FUN, counterparty: 'Kino' },
        { date: `${prev}-15`, accountId: ACC, amount: -zl(1000), categoryId: GIFTS, counterparty: 'Jubiler' },
        { date: `${prev}-20`, accountId: ACC, amount: -zl(1000), categoryId: HOME, counterparty: 'IKEA' }
      ]
    }
  })
  const { app, page, errors } = await launch({ dataDir })
  try {
    await expect(page.locator('[data-testid="briefing-item"][data-kind="alarm"]').filter({ hasText: 'Pensja częściowa: brakuje 4 000,00 zł' })).toHaveCount(1)
    // Before: „Energia dziś 71,42 zł” (the daily pool's share) beside „Energia miesiąca 0,00 zł”.
    await expect(page.getByTestId('bridge-energy')).toHaveText('0,00 zł')
    const cap = page.getByTestId('bridge-energy-cap')
    await expect(cap).toHaveText('pensja częściowa – energia miesiąca 0,00 zł')
    await expect(cap).toHaveAttribute('data-why', 'partial')
    await expect(page.getByTestId('state-energy')).toContainText('0,00 zł')
    await page.getByTestId('bridge-energy-why').click()
    const lines = page.getByTestId('bridge-energy-lines')
    await expect(lines).toContainText('Energia miesiąca (pensja do wydania) – pensja częściowa')
    await expect(lines.locator('[data-testid="why-line"]').last()).toHaveText(/Energia dziś\s*0,00 zł/)
    await expect(page.getByTestId('bridge-bias')).toContainText('Bearish')

    await page.getByTestId('nav-month').click()
    await expect(page.getByTestId('month-energy-today')).toHaveText('0,00 zł')
    await expect(page.getByTestId('month-energy-cap')).toHaveText('pensja częściowa – energia miesiąca 0,00 zł')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})

test('AP-17: „Dopełnij kadłub z osłon” z „Cofnij”, podgląd celów warstw, firewall wyłączony; AP-13: „Pokryj z koperty…” mówi o energii dziś', async () => {
  const { date: today, month } = warsawNow()
  const prev = addMonths(month, -1)
  const start = `${prev}-01`
  const dataDir = join(mkdtempSync(join(tmpdir(), 'fi-n3-hull-')), 'FinancialIntel')
  // The hull 17 900 / 18 000 zł (6 × 3 000 zł of costs assumed – 99,4 %), the shields 14 100 / 12 000 zł after this
  // month's salary of 4 000 zł; last month's energy spent whole (no loot). Today Dom 600 zł – 100 zł over its 500 zł.
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, budget: { ...s.budget, start, initial: { shields: 0, hull: zl(17900), goals: {} } }, layers: { ...s.layers, assumedCosts: zl(3000) } }),
    records: {
      balances: [{ date: start, accountId: ACC, kind: 'opening', amount: zl(40000) }],
      months: [{ month: prev, salary: zl(4000), envelopes: { [FOOD]: zl(1500), [HOME]: zl(500) } }],
      transactions: [
        { date: `${prev}-05`, accountId: ACC, amount: -zl(1500), categoryId: GROCERIES, counterparty: 'Biedronka' },
        { date: `${prev}-12`, accountId: ACC, amount: -zl(2500), categoryId: HOME, counterparty: 'IKEA' },
        { date: today, accountId: ACC, amount: -zl(600), categoryId: HOME, counterparty: 'Castorama' }
      ]
    }
  })
  const { app, page, dataDir: dir, errors } = await launch({ dataDir })
  const topUps = async () => {
    const plan = (await records(dir, 'months')).find((p) => p.month === month)
    return ((plan?.hullTopUps as Array<{ amount: number }> | undefined) ?? []).map((u) => u.amount)
  }
  try {
    // 99,4 % of the hull's target: full for „wolne do decyzji” (before: „ponad cel osłon … kadłub niepełny, nie do dopłaty XTB”).
    await expect(page.getByTestId('state-hull')).toContainText('17 900,00 zł / 18 000,00 zł')
    await expect(page.getByTestId('state-hull-tolerance')).toHaveText('brakuje 100,00 zł – do 1% celu liczy się jako pełny (firewall, wolne do decyzji)')
    await expect(page.getByTestId('state-shields-free')).toHaveText('wolne do decyzji: 2 100,00 zł')
    await expect(page.getByTestId('state-shields-over')).toHaveCount(0)

    // „Dopełnij kadłub z osłon”: the 100 zł the hull lacks, from the shields' surplus – an entry of this month's plan.
    await page.getByTestId('state-hull-topup').click()
    await expect(page.getByTestId('state-hull')).toContainText('18 000,00 zł / 18 000,00 zł')
    await expect(page.getByTestId('state-shields')).toContainText('14 000,00 zł / 12 000,00 zł')
    await expect(page.getByTestId('state-hull-topup')).toHaveCount(0)
    await expect.poll(topUps).toEqual([zl(100)])
    // „Cofnij”: the entry gone, the layers as before.
    await page.getByRole('status').filter({ hasText: 'Kadłub dopełniony z osłon: 100,00 zł.' }).getByTestId('toast-action').click()
    await expect(page.getByTestId('state-hull')).toContainText('17 900,00 zł / 18 000,00 zł')
    await expect.poll(topUps).toEqual([])
    await expect(page.getByTestId('state-hull-topup')).toHaveText('Dopełnij kadłub z osłon: 100,00 zł')

    // The layers' targets: what a change does before it is saved (MO sp. 4), then „Cofnij” after it.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-layers').click()
    await page.getByTestId('layers-hull').fill('12')
    const preview = page.getByTestId('layers-preview')
    // The amounts group their digits with a no-break space (`formatPln`): a pattern takes any space.
    await expect(preview.getByTestId('layers-preview-line').filter({ hasText: 'Cel kadłuba' })).toHaveText(/18\s000,00\szł\s*→\s*36\s000,00\szł/)
    await expect(preview.getByTestId('layers-preview-line').filter({ hasText: 'Wolne do decyzji' })).toHaveText(/2\s100,00\szł\s*→\s*0,00\szł/)
    expect((await json(join(dir, 'fi.json'))).settings.layers.hullMonths).toBe(6)
    // Another value typed (przegląd 2–3 N3): the box never leaves the page on a key (before: gone for 300 ms on every key,
    // the layout jumping) and, until the new value is counted, says so – the numbers of the last one dimmed under
    // „Po zmianie – liczę…”, never shown as the change's.
    await page.evaluate(`(() => {
      window.__previewGone = false
      window.__previewCounting = false
      new MutationObserver(() => {
        const box = document.querySelector('[data-testid="layers-preview"]')
        if (!box) window.__previewGone = true
        else if (box.getAttribute('data-pending') === 'yes' && box.textContent.includes('Po zmianie – liczę…')) window.__previewCounting = true
      }).observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true })
    })()`)
    await page.getByTestId('layers-hull').fill('10')
    await expect(preview.getByTestId('layers-preview-line').filter({ hasText: 'Cel kadłuba' })).toHaveText(/18\s000,00\szł\s*→\s*30\s000,00\szł/)
    await expect(preview).not.toHaveAttribute('data-pending', 'yes')
    await expect(preview.getByTestId('layers-preview-head')).toHaveText(/^Po zmianie \(zapisze się po wyjściu z pola/)
    expect(await page.evaluate('window.__previewGone')).toBe(false)
    expect(await page.evaluate('window.__previewCounting')).toBe(true)
    await page.getByTestId('layers-hull').fill('12')
    await expect(preview.getByTestId('layers-preview-line').filter({ hasText: 'Cel kadłuba' })).toHaveText(/18\s000,00\szł\s*→\s*36\s000,00\szł/)
    await page.getByTestId('layers-hull').press('Enter')
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.layers.hullMonths).toBe(12)
    await expect(preview).toHaveCount(0)
    await page.getByRole('status').filter({ hasText: 'Cele warstw zmienione: Wolne do decyzji 2 100,00 → 0,00 zł.' }).getByTestId('toast-action').click()
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.layers.hullMonths).toBe(6)
    await expect(preview).toHaveCount(0)
    // The first key after a save (przegląd 3 N3): the box at once, „liczę…” – before: nothing until the value settled.
    await page.evaluate('window.__previewCounting = false')
    await page.getByTestId('layers-hull').fill('8')
    await expect(preview.getByTestId('layers-preview-line').filter({ hasText: 'Cel kadłuba' })).toHaveText(/18\s000,00\szł\s*→\s*24\s000,00\szł/)
    expect(await page.evaluate('window.__previewCounting')).toBe(true)
    await page.getByTestId('layers-hull').fill('6')
    await expect(preview).toHaveCount(0)
    await page.getByTestId('layers-hull').press('Enter')

    // The firewall switched off (DW.12): said at the order and on the bridge.
    await expect(page.getByTestId('orders-firewall-off')).toHaveCount(0)
    await page.getByTestId('orders-firewall').click()
    await expect.poll(async () => (await json(join(dir, 'fi.json'))).settings.orders.firewall).toBe(false)
    await expect(page.getByTestId('orders-firewall-off')).toContainText('Firewall wyłączony – dopłaty do XTB nie są sprawdzane')
    await page.getByTestId('nav-bridge').click()
    await expect(page.getByTestId('state-firewall-off')).toContainText('Firewall wyłączony – dopłaty do XTB bez sprawdzania osłon i kadłuba')

    // „Pokryj z koperty…” (PM sp. 6): from Jedzenie (daily) – today's energy lower, as the plan counts it after the cover.
    await page.getByTestId('nav-month').click()
    const daysLeft = daysInMonth(month) - dayOfMonth(today) + 1
    const before = Math.floor(zl(1500) / daysLeft)
    const after = Math.floor(zl(1400) / daysLeft)
    await expect(page.getByTestId('month-energy-today')).toHaveText(pln(before))
    await page.getByTestId('month-envelopes').getByTestId('envelope-cover').click()
    await expect(page.getByTestId('cover-from')).toHaveValue(FOOD)
    await expect(page.getByTestId('cover-energy')).toHaveText(`Energia dziś: ${pln(before)} → ${pln(after)} – koperta codzienna oddaje limit puli dziennej, kolejne dni też dostaną mniej.`)
    await page.getByTestId('cover-confirm').click()
    await expect(page.getByTestId('month-energy-today')).toHaveText(pln(after))
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
