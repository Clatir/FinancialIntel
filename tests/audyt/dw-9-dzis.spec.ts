// DW, przebieg 9 – oceny dnia dzisiejszego i świeżo zamrażanego na kopiach „rok” (każdy test – własna kopia):
// K1 DW.10 + DW.33 (progi kopert 18 / 20 / 22 %, koperta 0 zł, koperta codzienna, zmiana progu; Premium / Discount, DOL),
// K2 DW.16 (pokrycie z wcześniejszego dnia i z dziś), K3 DW.11 + DW.32 (minimum osłon 2,5 pensji – pensja 01.11, zakup za
// domownika, własny duży wydatek; 01.11 – energia 0,01 zł), K4 DW.12 (dopłata do XTB, firewall wyłączony; pełne warstwy),
// K5 DW.15 + DW.32 (wspólny zakup 30 %, zakup za domownika nocą; 01.11 – energia 0,00 zł i zakup za domownika „impuls”).
// Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import {
  ANNA,
  MAREK,
  addRecords,
  briefing,
  cat,
  command,
  dropGameDays,
  dwId,
  editJson,
  editSettings,
  energy,
  gameFiles,
  go,
  MBANK,
  out,
  quickExpense,
  setAmount,
  textOf,
  todayLine,
  toasts
} from './dw-pomoc'

const pad = (n: number) => String(n).padStart(2, '0')
const warsawHour = () => Number(new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' }).slice(11, 13))

test('K1 – DW.10 progi kopert, DW.33 Premium / Discount i DOL', async () => {
  const RUN = 'dw-9k1'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  editJson(join(st.dataDir, 'months', '2026-11.json'), (m) => {
    m.envelopes[cat(400)] = 0
  })
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { app, page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const env = page.locator('section[data-panel^="bridge:Koperty"]').first()
    dump('0-koperty', { tekst: await env.innerText().catch(() => '?'), dymki: await env.locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} => ${e.getAttribute('title')}`)) })
    dump('0-linie', await env.locator('*').evaluateAll((els) => els.filter((e) => /left|equilibrium/i.test(e.getAttribute('style') ?? '') || /equilibrium/i.test(e.getAttribute('title') ?? '')).map((e) => `${e.tagName} style=${e.getAttribute('style')} title=${e.getAttribute('title')}`)))
    await shot(page, 'DW.33-koperty-start')
    const steps: Record<string, unknown> = {}
    steps.wpis = await quickExpense(app, page, { amount: '767', name: 'Auto DW', category: cat(301), time: '10:00', impulse: 'plan' })
    for (const [label, value] of [
      ['118', null],
      ['120', '780'],
      ['122', '793']
    ] as const) {
      if (value) steps[`kwota-${label}`] = await setAmount(page, 'Auto DW', value)
      steps[`dzis-${label}`] = await todayLine(page)
      await go(page, '1', 'page-bridge')
      steps[`odprawa-${label}`] = (await briefing(page)).filter((x) => /Auto|kopert|Koperta/i.test(x))
    }
    await shot(page, 'DW.10-odprawa-122')
    // The game's threshold 10 %: 118 % serious in both?
    await go(page, '8', 'page-command')
    const pct = page.getByTestId('game-serious-pct')
    await pct.click()
    await pct.fill('10')
    await pct.press('Tab')
    await page.waitForTimeout(800)
    steps['kwota-118-prog10'] = await setAmount(page, 'Auto DW', '767')
    steps['dzis-118-prog10'] = await todayLine(page)
    await go(page, '1', 'page-bridge')
    steps['odprawa-118-prog10'] = (await briefing(page)).filter((x) => /Auto|kopert|Koperta/i.test(x))
    await shot(page, 'DW.10-odprawa-118-prog10')
    // An envelope of 0 zł (Zwierzęta this month), a planned one without a limit (Subskrypcje), a daily one over its share.
    steps.zero = await quickExpense(app, page, { amount: '10', name: 'Karma DW', category: cat(401), time: '10:05' })
    steps['dzis-zero'] = await todayLine(page)
    steps.bezLimitu = await quickExpense(app, page, { amount: '15', name: 'Telefon DW', category: cat(701), time: '10:06' })
    steps['dzis-bez-limitu'] = await todayLine(page)
    steps.codzienna = await quickExpense(app, page, { amount: '60', name: 'Obiad DW', category: cat(102), time: '10:07' })
    steps['dzis-codzienna'] = await todayLine(page)
    steps.energia = await energy(page)
    steps['odprawa-koniec'] = await briefing(page)
    dump('kroki', steps)
    reading('dw', 'DW.10', 'rok + Auto 767/780/793 zł dziś', Object.fromEntries(Object.entries(steps).filter(([k]) => k.startsWith('dzis')).map(([k, v]) => [k, String(v)])))
    await go(page, '1', 'page-bridge')
    dump('1-koperty', { tekst: await env.innerText().catch(() => '?'), dymki: await env.locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')} => ${e.getAttribute('title')}`)) })
    await shot(page, 'DW.33-koperty-po')
    await go(page, '4', 'page-month')
    dump('2-plan-miesiaca', await text(page, '[data-testid="page-month"]'))
    await shot(page, 'DW.33-plan-miesiaca')
    await go(page, '6', 'page-starmap')
    dump('3-mapa', await text(page, '[data-testid="page-starmap"]'))
    dump('3-mapa-dymki', await page.getByTestId('page-starmap').locator('[title]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 60)} => ${e.getAttribute('title')}`)))
    await shot(page, 'DW.33-mapa')
    dump('bledy', r.errors)
  } finally {
    await app.close()
  }
})

test('K2 – DW.16 pokrycie przekroczenia', async () => {
  const RUN = 'dw-9k2'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  editJson(join(st.dataDir, 'months', '2026-11.json'), (m) => {
    m.covers = [...(m.covers ?? []), { id: dwId(), from: cat(200), to: cat(900), amount: 10000, at: '2026-11-02T10:00:00.000Z' }]
  })
  addRecords(st.dataDir, 'transactions', [{ date: '2026-11-03', time: '09:30', accountId: MBANK, kind: 'expense', amount: -25000, categoryId: cat(901), counterparty: 'Prezent DW', impulse: 'plan', logNote: 'urodziny', createdAt: new Date().toISOString() }])
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { app, page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s['dzis-start'] = await todayLine(page)
    s['dziennik-start'] = ((await command(page)).log as string[]).slice(0, 6)
    s.wpis = await quickExpense(app, page, { amount: '700', name: 'Serwis DW', category: cat(302), time: '10:00', impulse: 'plan' })
    s['dzis-po-przekroczeniu'] = await todayLine(page)
    await go(page, '4', 'page-month')
    const covers = page.getByTestId('envelope-cover')
    s.przyciskiPokryj = await covers.count()
    s.kopertyPlan = await page.getByTestId('envelope-state').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
    dump('kroki-czesc', s)
    await page.locator('[data-testid="envelope-state"][data-name="Auto"]').first().getByTestId('envelope-cover').click()
    await page.waitForTimeout(600)
    const dlg = page.locator('[role="dialog"]').last()
    s.okno = await dlg.innerText()
    await page.getByTestId('cover-from').selectOption({ index: 0 })
    s.zKoperty = await page.getByTestId('cover-from').locator('option:checked').innerText()
    await page.getByTestId('cover-amount').click()
    await page.getByTestId('cover-amount').fill('50')
    await page.getByTestId('cover-amount').press('Tab')
    await shot(page, 'DW.16-okno')
    await page.getByTestId('cover-confirm').click()
    await page.waitForTimeout(1200)
    s.toasty = await toasts(page)
    s['dzis-po-pokryciu'] = await todayLine(page)
    const c = await command(page)
    s['dziennik-po'] = (c.log as string[]).slice(0, 6)
    await shot(page, 'DW.16-dowodztwo')
    dump('kroki', s)
    reading('dw', 'DW.16', 'rok + pokrycie 02.11 Dom→Prezenty 100 zł; Auto 700 zł dziś, pokrycie 50 zł', { start: String(s['dzis-start']), po: String(s['dzis-po-pokryciu']) })
    dump('bledy', r.errors)
  } finally {
    await app.close()
  }
})

test('K3 – DW.11 minimum osłon, DW.32 energia 0,01 zł', async () => {
  const RUN = 'dw-9k3'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  editSettings(st.dataDir, (s) => {
    s.orders.minShieldSalaries = 2.5
  })
  dump('wariant', { dropped: dropGameDays(st.dataDir, '2026-11-01') })
  addRecords(st.dataDir, 'transactions', [{ date: '2026-11-01', time: '12:00', accountId: MBANK, kind: 'expense', amount: -8332, categoryId: cat(101), counterparty: 'Sklep 0,01 DW', createdAt: '2026-11-01T11:05:00.000Z' }])
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { app, page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(6000)
    const s: Record<string, unknown> = {}
    s.mostek = await text(page, '[data-testid="page-bridge"]')
    s.energia0 = await energy(page)
    const c0 = await (async () => {
      await go(page, '8', 'page-command')
      return command(page)
    })()
    s.dzien0111 = (c0.log as string[]).filter((l) => l.includes('01.11'))
    s.dzis0 = c0.today
    s.gra0111 = (gameFiles(st.dataDir)['2026-11.json'] as { days: string[] })?.days
    s.zaDomownika = await quickExpense(app, page, { amount: '300', name: 'Za Annę DW', category: cat(801), time: '10:00', member: ANNA })
    s.energia1 = await energy(page)
    s.dzis1 = await todayLine(page)
    s.wlasny = await quickExpense(app, page, { amount: '7000', name: 'Wielki zakup DW', category: cat(203), time: '10:05', impulse: 'plan', log: 'meble' })
    s.energia2 = await energy(page)
    s.dzis2 = await todayLine(page)
    await go(page, '1', 'page-bridge')
    s.mostek2 = await text(page, '[data-testid="page-bridge"]')
    s.odprawa2 = await briefing(page)
    await shot(page, 'DW.11-mostek')
    await go(page, '8', 'page-command')
    await shot(page, 'DW.11-dowodztwo')
    dump('kroki', s)
    reading('dw', 'DW.11', 'rok, minimum osłon 2,5 pensji; 01.11 przeliczony; dziś za domownika 300 zł, własny 7 000 zł', { dzien0111: JSON.stringify(s.dzien0111), dzis1: String(s.dzis1), dzis2: String(s.dzis2) })
    dump('bledy', r.errors)
  } finally {
    await app.close()
  }
})

test('K4 – DW.12 dopłata do XTB a firewall', async () => {
  const RUN = 'dw-9k4'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  addRecords(st.dataDir, 'transactions', [{ date: '2026-11-03', time: '09:00', accountId: MBANK, kind: 'trading', amount: -50000, counterparty: 'XTB S.A.', note: 'dopłata DW', createdAt: new Date().toISOString() }])
  let r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    const page = r.page
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    s.odprawa = await briefing(page)
    await shot(page, 'DW.12-odprawa')
    s.dzis = await todayLine(page)
    // The firewall order off (Dowództwo → Rozkazy).
    const toggle = page.getByTestId('command-orders-fields').getByText(/Firewall: dopłata do XTB/)
    await toggle.click()
    await page.waitForTimeout(1000)
    s.rozkazPo = await textOf(page.getByTestId('command-orders-fields'))
    s.dzisBezFirewalla = await todayLine(page)
    await go(page, '1', 'page-bridge')
    s.odprawaBezFirewalla = await briefing(page)
    await shot(page, 'DW.12-bez-firewalla')
    dump('kroki', s)
    reading('dw', 'DW.12', 'rok + dopłata 500 zł do XTB dziś', { dzis: String(s.dzis), bez: String(s.dzisBezFirewalla) })
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
  // Full shields and hull (targets 1 pensja, 4 mies.): the same top-up from „wolne do decyzji”.
  const RUN2 = 'dw-9k4b'
  const st2 = useState('rok', RUN2)
  editSettings(st2.dataDir, (s) => {
    s.layers.shieldSalaries = 1
    s.layers.hullMonths = 4
  })
  addRecords(st2.dataDir, 'transactions', [{ date: '2026-11-03', time: '09:00', accountId: MBANK, kind: 'trading', amount: -50000, counterparty: 'XTB S.A.', note: 'dopłata DW', createdAt: new Date().toISOString() }])
  r = await start(RUN2, { dataDir: st2.dataDir, ictjDir: st2.ictjDir })
  try {
    const page = r.page
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const s: Record<string, unknown> = {}
    const t = await text(page, '[data-testid="page-bridge"]')
    s.stan = t.slice(t.indexOf('STAN OKRĘTU'), t.indexOf('STAN OKRĘTU') + 700)
    s.odprawa = await briefing(page)
    s.dzis = await todayLine(page)
    await shot(page, 'DW.12-pelne-warstwy')
    out(RUN2)('kroki', s)
  } finally {
    await r.app.close()
  }
})

test('K5 – DW.15 zakup za domownika i wspólny, DW.32 energia 0,00 zł', async () => {
  const RUN = 'dw-9k5'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const hh = warsawHour()
  const from = `${pad((hh + 23) % 24)}:00`
  const to = `${pad((hh + 3) % 24)}:00`
  editSettings(st.dataDir, (s) => {
    s.orders.quietHours = { from, to }
  })
  dump('wariant', { cisza: `${from}–${to}`, dropped: dropGameDays(st.dataDir, '2026-11-01') })
  addRecords(st.dataDir, 'transactions', [
    { date: '2026-11-01', time: '12:00', accountId: MBANK, kind: 'expense', amount: -8333, categoryId: cat(101), counterparty: 'Sklep 0,00 DW', createdAt: '2026-11-01T11:05:00.000Z' },
    { date: '2026-11-01', time: '13:00', accountId: MBANK, kind: 'expense', amount: -25000, categoryId: cat(801), counterparty: 'Za Marka DW', refundable: true, memberId: MAREK, impulse: 'impulse', logNote: 'prezent dla niego', createdAt: '2026-11-01T12:05:00.000Z' },
    {
      date: '2026-11-03',
      time: `${pad((hh + 21) % 24)}:00`,
      accountId: MBANK,
      kind: 'expense',
      amount: -30000,
      categoryId: cat(102),
      counterparty: 'Wspólny DW',
      impulse: 'impulse',
      logNote: 'kolacja z Anną',
      share: { mode: 'percent', lines: [{ memberId: null, value: 30, gift: false }, { memberId: ANNA, value: 70, gift: false }] },
      splits: [
        { id: dwId(), amount: -9000, categoryId: cat(102), refundable: false, memberId: null, note: '' },
        { id: dwId(), amount: -21000, categoryId: cat(102), refundable: true, memberId: ANNA, note: '' }
      ],
      createdAt: new Date().toISOString()
    }
  ])
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { app, page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(6000)
    const s: Record<string, unknown> = {}
    s.energia0 = await energy(page)
    await go(page, '8', 'page-command')
    const c0 = await command(page)
    s.dzis0 = c0.today
    s.dzien0111 = (c0.log as string[]).filter((l) => l.includes('01.11'))
    s.gra0111 = (gameFiles(st.dataDir)['2026-11.json'] as { days: string[] })?.days
    s.zaDomownika = await quickExpense(app, page, { amount: '250', name: 'Nocny za Marka DW', category: cat(601), member: MAREK, impulse: 'impuls', log: 'bilety dla Marka', nightOk: true })
    s.energia1 = await energy(page)
    s.dzis1 = await todayLine(page)
    await shot(page, 'DW.15-dowodztwo')
    dump('kroki', s)
    reading('dw', 'DW.15', 'rok + wspólny 300 zł (moje 30 %), za Marka 250 zł nocą', { energia0: JSON.stringify(s.energia0), dzis0: String(s.dzis0), energia1: JSON.stringify(s.energia1), dzis1: String(s.dzis1) })
    reading('dw', 'DW.32', 'rok, 01.11: wydatek 83,33 zł', { dzien0111: JSON.stringify(s.dzien0111) })
    dump('bledy', r.errors)
  } finally {
    await app.close()
  }
})
