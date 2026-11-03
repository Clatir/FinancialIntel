// W4 (AU-11, weryfikacja sceptyczna), część B: WY.20 (wariant rozstrzygający – raty Tomka przesunięte na 2027), WY.19
// (kurs przy pustych osłonach i kadłubie), IN.4 (Ctrl+S w folderze tylko do odczytu), IN.26 („Co nowego” po aktualizacji),
// DA.3 (brakujący zapamiętany folder – ponawianie), DA.41 (zmiana tuż przed zniknięciem folderu). Narzędzie obserwacji.
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { LAB, shot, start, text, useState } from './lab'
import { seedFolder, zl } from '../e2e/seed'
import { editJson, go, out, textOf } from './dw-pomoc'
import { OP, answerQuestions, banners, byId, mainLog, openOp, openRok, sleep, trap, trapped } from './da-pomoc'

const toasts = (page: Page): Promise<string[]> => page.getByRole('status').allInnerTexts().catch(() => [])
const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

test('W4 – WY.20 wariant: raty pożyczki dla Tomka po 2027', async () => {
  const RUN = 'w4-wy20b'
  const st = useState('rok', RUN)
  editJson(join(st.dataDir, 'loans', '01KAZ500000000000000000001.json'), (l) => {
    l.schedule = l.schedule.map((i: { date: string }) => (i.date === '2026-09-04' ? { ...i, date: '2027-03-04' } : i.date === '2026-10-05' ? { ...i, date: '2027-04-05' } : i))
  })
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(5000)
    const ship = await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]'))
    await go(page, '9', 'page-intel')
    await page.waitForTimeout(2500)
    dump('WY.20b', { mostek: ship, prognoza: await textOf(page.getByTestId('intel-range-text')), symulator: await textOf(page.getByTestId('maneuver-range')) })
    await page.getByTestId('intel-maneuver').scrollIntoViewIfNeeded()
    await shot(page, 'W4-WY.20-wariant')
  } finally {
    await r.app.close()
  }
})

test('W4 – WY.19 kurs przy pustych osłonach i kadłubie', async () => {
  const RUN = 'w4-brzegi'
  const dataDir = join(LAB, 'przebiegi', RUN, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      shipName: 'Brzegi',
      budget: { ...s.budget, start: '2026-08-01', initial: { shields: zl(6000), hull: 0, goals: {} } },
      household: { ...s.household, since: '2026-08-01' },
      orders: { ...s.orders, minShieldSalaries: 1 }
    }),
    records: {
      balances: [{ date: '2026-08-01', accountId: ACC, kind: 'opening', amount: zl(6000) }],
      months: ['2026-08', '2026-09', '2026-10', '2026-11'].map((month) => ({ month, salary: zl(4000), envelopes: { [FOOD]: zl(3000) } })),
      transactions: [
        ...['2026-08', '2026-09', '2026-10'].flatMap((m) => [
          { date: `${m}-10`, accountId: ACC, kind: 'income', amount: zl(3000), counterparty: 'PRACODAWCA SP Z O O' },
          { date: `${m}-05`, accountId: ACC, amount: -zl(1600), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Biedronka' },
          { date: `${m}-15`, accountId: ACC, amount: -zl(1600), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Lidl' },
          { date: `${m}-25`, accountId: ACC, amount: -zl(1600), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Auchan' }
        ]),
        { date: '2026-11-02', accountId: ACC, amount: -zl(300), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Lidl' }
      ]
    }
  })
  const dump = out(RUN)
  const r = await start(RUN, { dataDir })
  const { page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(5000)
    const bridge = await text(page, '[data-testid="page-bridge"]')
    await go(page, '9', 'page-intel')
    await page.waitForTimeout(2500)
    const c = page.getByTestId('intel-course')
    dump('WY.19', {
      mostek: bridge.split('\n').filter((l) => /Pensja|OSŁONY|KADŁUB|ZASIĘG|osłony|kadłub/i.test(l)).slice(0, 12),
      kurs: (await textOf(c)).split('\n'),
      kursy: await c.getByRole('radio').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText}|${e.getAttribute('aria-checked')}`)).catch(() => [])
    })
    await c.scrollIntoViewIfNeeded()
    await shot(page, 'W4-WY.19-kurs')
    // the other courses (mediana, średnia)
    const radios = c.getByRole('radio')
    const n = await radios.count()
    const other: string[] = []
    for (let i = 0; i < n; i++) {
      await radios.nth(i).click()
      await page.waitForTimeout(600)
      other.push((await textOf(c)).replace(/\n/g, ' | ').slice(0, 900))
    }
    dump('WY.19-kursy', other)
  } finally {
    await r.app.close()
  }
})

test('W4 – IN.4 Ctrl+S w trybie tylko do odczytu', async () => {
  const RUN = 'w4-ro'
  const st = useState('rok', RUN)
  const f = join(st.dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(f, 'utf8'))
  fi.schemaVersion = 2
  writeFileSync(f, `${JSON.stringify(fi, null, 2)}\n`)
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(2500)
    const s: Record<string, unknown> = { wskaznik: await textOf(page.getByTestId('save-state')), baner: (await text(page, 'body')).split('\n').filter((l) => /format|tylko do odczytu/i.test(l)).slice(0, 3) }
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(800)
    s.ctrlS = await toasts(page)
    await shot(page, 'W4-IN.4-ctrl-s')
    await page.waitForTimeout(6000)
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('zapisz')
    await page.waitForTimeout(500)
    s.paletaWyniki = (await text(page, 'body')).split('\n').filter((l) => /Zapisz/i.test(l)).slice(0, 4)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)
    s.paleta = await toasts(page)
    dump('IN.4', s)
  } finally {
    await r.app.close()
  }
})

test('W4 – IN.26 „Co nowego” po aktualizacji', async () => {
  const RUN = 'w4-baner'
  const st = useState('start', RUN)
  const r0 = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  await r0.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r0.page.waitForTimeout(1500)
  await r0.app.close()
  const cf = join(LAB, 'przebiegi', RUN, 'userdata', 'config.json')
  const c = JSON.parse(readFileSync(cf, 'utf8'))
  const before = c.updates
  c.updates = { ...c.updates, lastRunVersion: '1.15.3' }
  writeFileSync(cf, JSON.stringify(c, null, 2))
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false })
  const { page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(2500)
    const s: Record<string, unknown> = { updatesPrzed: before, baner: await textOf(page.getByTestId('banner-updated')) }
    await shot(page, 'W4-IN.26-baner')
    await page.getByRole('button', { name: 'Co nowego' }).first().click()
    await page.waitForTimeout(3000)
    s.aktualizacje = (await text(page, 'main')).split('\n').slice(0, 40)
    await shot(page, 'W4-IN.26-aktualizacje')
    s.log = readFileSync(join(LAB, 'przebiegi', RUN, 'userdata', 'logs', 'main.log'), 'utf8').split('\n').filter((l) => /update|notes|release|changelog/i.test(l)).slice(-8)
    dump('IN.26', s)
  } finally {
    await r.app.close()
  }
})

test('W4 – DA.3 brakujący zapamiętany folder', async () => {
  test.setTimeout(12 * 60_000)
  const RUN = 'w4-da3'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  let r = await start(RUN, { dataDir: st.dataDir })
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.app.close()
  const moved = `${st.dataDir}-odlaczony`
  rmSync(moved, { recursive: true, force: true })
  renameSync(st.dataDir, moved)
  r = await start(RUN, { usePreset: false, fresh: false })
  await trap(r)
  const s: Record<string, unknown> = {}
  try {
    await r.page.getByTestId('setup-message').waitFor({ timeout: 60_000 })
    s.komunikat = (await r.page.getByTestId('setup-message').innerText()).replace(/\s+/g, ' ')
    s.ekran = (await text(r.page, 'body')).split('\n').slice(0, 25)
    await shot(r.page, 'W4-DA.3-brak')
    await sleep(15_000)
    renameSync(moved, st.dataDir)
    const t0 = Date.now()
    let opened = false
    for (let i = 0; i < 75 && !opened; i++) {
      await sleep(1000)
      opened = (await r.page.getByTestId('page-bridge').count()) > 0
    }
    s.mostekBezKlikania = `${opened} po ${Math.round((Date.now() - t0) / 1000)} s`
    s.mainLogOpen = mainLog(r, /open/i, 12)
    await shot(r.page, 'W4-DA.3-po-powrocie')
    if (!opened) {
      await r.page.getByRole('button', { name: 'Spróbuj ponownie' }).click()
      await r.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 }).then(() => (s.poKliknieciu = 'Mostek'), () => (s.poKliknieciu = 'nie'))
    }
    dump('DA.3', s)
  } finally {
    if (!existsSync(st.dataDir) && existsSync(moved)) renameSync(moved, st.dataDir)
    await r.app.close().catch(() => undefined)
  }
})

test('W4 – DA.41 zmiana tuż przed zniknięciem folderu', async () => {
  test.setTimeout(12 * 60_000)
  const RUN = 'w4-da41'
  const dump = out(RUN)
  const { run, dataDir } = await openRok(RUN)
  const { page } = run
  const off = `${dataDir}-odlaczony`
  rmSync(off, { recursive: true, force: true })
  const s: Record<string, unknown> = { przed: byId(dataDir, OP.grycan).rec.amount }
  try {
    await openOp(page, 'Lody Grycan', OP.grycan)
    await page.getByTestId('operation-amount').click()
    await page.getByTestId('operation-amount').fill('44,44')
    renameSync(dataDir, off)
    await page.getByTestId('operation-amount').press('Enter')
    await page.waitForTimeout(3000)
    s.poWyjsciuZPola = { toasty: await toasts(page), banery: await banners(page) }
    renameSync(off, dataDir)
    let saved = false
    const t0 = Date.now()
    for (let i = 0; i < 25 && !saved; i++) {
      await sleep(3000)
      saved = byId(dataDir, OP.grycan).rec.amount === -4444
    }
    s.poPowrocie = { zapisano: saved, czekano: Math.round((Date.now() - t0) / 1000), plik: byId(dataDir, OP.grycan).rec.amount, toasty: await toasts(page), banery: await banners(page), edytor: (await textOf(page.getByTestId('operation-editor'))).replace(/\n/g, ' | ').slice(0, 500) }
    await shot(page, 'W4-DA.41-po-powrocie')
    await answerQuestions(run, 0)
    await run.app.evaluate(({ app }) => void setTimeout(() => app.quit(), 10))
    await sleep(6000)
    s.pytanie = (await trapped(run)).dialogs
    s.mainLog = mainLog(run, /zamykanie|niezapisane|ENOENT|EPERM|write/i, 12)
    dump('DA.41', s)
    await answerQuestions(run, 1)
  } finally {
    if (!existsSync(dataDir) && existsSync(off)) renameSync(off, dataDir)
    await run.app.close().catch(() => undefined)
  }
})
