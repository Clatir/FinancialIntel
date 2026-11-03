/**
 * Audit DA – cloud conflict copies and files with problems (DA.26–DA.31). Observation only: C:\FI-audyt\przebiegi\da-*\da.log.
 * The app's moves to the Windows Recycle Bin are caught by the lab (`trap` – into przebiegi\da-*\kosz).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  OP,
  byId,
  Log, banners, findOp, goSync, holdFile, openOp, openRok, readJson, recordFiles, rescan, sleep, toasts, trapped, typeAmount, writeJson } from './da-pomoc'

const copyPath = (p: string, machine = 'LAPTOP') => p.replace(/\.json$/, `-${machine}.json`)
const later = (ms = 60_000) => new Date(Date.now() + ms).toISOString()

async function bridgeLine(page: Page): Promise<string> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(800)
  const t = await page.getByTestId('page-bridge').innerText()
  const env = t.match(/Jedzenie\ncodzienna\n[^\n]+\n([^\n]+)/)?.[1] ?? '?'
  return `${t.match(/Suma kont budżetu: [^\n]+/)?.[0] ?? '?'} | energia ${t.match(/ENERGIA DZIŚ\n([^\n]+)/)?.[1] ?? '?'} | Jedzenie ${env}`
}

async function navCounts(page: Page): Promise<string> {
  const sync = (await page.getByTestId('nav-sync').innerText().catch(() => '?')).replace(/\s+/g, ' ')
  const inbox = (await page.locator('[data-testid="nav-inbox"]').innerText().catch(() => '?')).replace(/\s+/g, ' ')
  return `menu Synchronizacja: „${sync}”, Meldunki: „${inbox}”`
}

async function conflictCards(page: Page): Promise<string> {
  return (await page.locator('[data-testid^="conflict:"]').allInnerTexts()).map((t) => t.replace(/\n+/g, ' ⏎ ')).join('\n  ')
}

test('DA.26 / DA.27 – konflikt: wykrycie i „Zachowaj tę wersję”', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-26'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  try {
    log.line(`Mostek przed: ${await bridgeLine(page)}`)
    // DA.26: a copy of today's „Mokka” (Portfel XTB, −12,00) from LAPTOP: −15,00 and a note.
    const mokka = byId(dataDir, OP.mokka)
    writeJson(copyPath(mokka.path), { ...mokka.rec, amount: -1500, note: 'kawa z laptopa', updatedAt: later(), updatedBy: 'LAPTOP' })
    const t0 = Date.now()
    let seen = false
    for (let i = 0; i < 40 && !seen; i++) {
      await sleep(1000)
      seen = (await page.getByTestId('banner-sync').count()) > 0
    }
    log.line(`DA.26 baner bez „Przeskanuj”: ${seen} po ${Math.round((Date.now() - t0) / 1000)} s`)
    if (!seen) await rescan(page)
    log.line(`banery: ${await banners(page)}`)
    log.line(await navCounts(page))
    log.line(`Mostek z konfliktem: ${await bridgeLine(page)}`)
    await log.shot(page, 'DA.26-mostek')
    await page.keyboard.press('Control+Shift+M')
    await page.waitForTimeout(800)
    const inbox = await page.getByTestId('page-inbox').innerText().catch(() => '(brak)')
    log.line(`Meldunki – wiersze o konflikcie: ${inbox.split('\n').filter((l) => /konflikt|synchron/i.test(l)).join(' | ') || '(brak)'}`)
    await goSync(page)
    log.line(`--- Synchronizacja ---\n${(await page.locator('main').innerText()).replace(/\n{2,}/g, '\n').slice(0, 2500)}`)
    await log.shot(page, 'DA.26-synchronizacja')
    await openOp(page, 'Mokka', OP.mokka)
    log.line(`Operacje – wierszy „Mokka” 03.11: ${await page.locator('[data-testid="operation-row"]', { hasText: 'Mokka' }).count()}`)
    await page.keyboard.press('Escape')

    // DA.27: two more conflicts – CINEMA CITY (the copy kept) and ZOOPLUS (the original kept).
    const cinema = byId(dataDir, OP.cinema)
    const zoo = byId(dataDir, OP.zoo)
    writeJson(copyPath(cinema.path), { ...cinema.rec, amount: -9999, note: 'kino z laptopa', updatedAt: later(), updatedBy: 'LAPTOP' })
    writeJson(copyPath(zoo.path), { ...zoo.rec, amount: -20000, note: 'karma z laptopa', updatedAt: later(), updatedBy: 'LAPTOP' })
    await rescan(page)
    await goSync(page)
    log.line(`DA.27 karty:\n  ${await conflictCards(page)}`)
    const card = (text: string) => page.locator('[data-testid^="conflict:"]', { hasText: text })
    const hist = (id: string) => (existsSync(join(dataDir, '.history', 'transactions', id)) ? readdirSync(join(dataDir, '.history', 'transactions', id)) : [])
    const h0 = { cinema: hist(cinema.rec.id), zoo: hist(zoo.rec.id) }
    await card(OP.cinema).getByTestId('keep-copy').click()
    await page.waitForTimeout(2000)
    log.line(`„Zachowaj tę wersję” (kopia CINEMA): ${await toasts(page)}`)
    await card(OP.zoo).getByTestId('keep-canonical').click()
    await page.waitForTimeout(2000)
    log.line(`„Zachowaj tę wersję” (oryginał ZOOPLUS): ${await toasts(page)}`)
    const c = readJson(cinema.path)!
    const z = readJson(zoo.path)!
    log.line(`CINEMA po: amount ${c.amount}, note „${c.note}”, updatedBy ${c.updatedBy}, updatedAt ${c.updatedAt}; kopia istnieje: ${existsSync(copyPath(cinema.path))}`)
    log.line(`ZOOPLUS po: amount ${z.amount}, note „${z.note}”, updatedBy ${z.updatedBy}, updatedAt ${z.updatedAt}; kopia istnieje: ${existsSync(copyPath(zoo.path))}`)
    log.line(`historia CINEMA: ${h0.cinema.join(', ')} → ${hist(cinema.rec.id).join(', ')}`)
    log.line(`historia ZOOPLUS: ${h0.zoo.join(', ')} → ${hist(zoo.rec.id).join(', ')}`)
    for (const [label, rec] of [['CINEMA', cinema.rec], ['ZOOPLUS', zoo.rec]] as const) {
      for (const f of hist(rec.id)) {
        const h = readJson(join(dataDir, '.history', 'transactions', rec.id, f))!
        log.line(`  ${label} ${f}: reason ${h.reason}, savedBy ${h.savedBy}, amount ${h.record?.amount}, note „${h.record?.note}”, updatedBy ${h.record?.updatedBy}`)
      }
    }
    log.line(`Kosz (laboratorium): ${JSON.stringify((await trapped(run)).trashed)}`)
    await rescan(page)
    await goSync(page)
    log.line(`po odświeżeniu – konflikty: ${await page.locator('[data-testid^="conflict:"]').count()}; ${await navCounts(page)}; banery: ${await banners(page)}`)
    log.line(`Mostek po: ${await bridgeLine(page)}`)
    await openOp(page, 'CINEMA CITY', OP.cinema)
    await page.getByTestId('operation-editor').getByTestId('history-open').click()
    await page.waitForTimeout(800)
    log.line(`--- Historia CINEMA ---\n${(await page.getByTestId('history-dialog').innerText()).replace(/\n{2,}/g, '\n').slice(0, 1500)}`)
    await log.shot(page, 'DA.27-historia')
    await page.keyboard.press('Escape')
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.28 – konflikt: „Scal…”', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-28'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  try {
    // Pair 1: here the amount (a version in the history), there a new note and tags.
    const a = byId(dataDir, OP.drogeria)
    const base = a.rec
    await openOp(page, 'DROGERIA NATURA', OP.drogeria)
    await typeAmount(page, 'operation-amount', '33,33')
    await page.waitForTimeout(1500)
    log.line(`DROGERIA po edycji tutaj: ${readJson(a.path)!.amount}; historia: ${readdirSync(join(dataDir, '.history', 'transactions', base.id)).join(', ')}`)
    writeJson(copyPath(a.path), { ...base, note: 'notatka z laptopa', tags: ['laptop'], updatedAt: later(), updatedBy: 'LAPTOP' })
    // Pair 2: the same amount changed on both sides (the copy later).
    const b = byId(dataDir, OP.rossmann)
    await openOp(page, 'Rossmann', OP.rossmann)
    await typeAmount(page, 'operation-amount', '61')
    await page.waitForTimeout(1500)
    writeJson(copyPath(b.path), { ...b.rec, amount: -6200, updatedAt: later(), updatedBy: 'LAPTOP' })
    await page.keyboard.press('Escape')
    await rescan(page)
    await goSync(page)
    const card = (text: string) => page.locator('[data-testid^="conflict:"]', { hasText: text })
    await log.step('para 1', async () => {
      await card(OP.drogeria).getByTestId('conflict-merge-open').click()
      await page.waitForTimeout(800)
      const merge = card(OP.drogeria).getByTestId('conflict-merge')
      log.line(`--- Scal (para 1) ---\n${(await merge.innerText()).replace(/\n{2,}/g, '\n')}`)
      for (const f of await merge.getByTestId('conflict-merge-field').all())
        log.line(`  pole ${await f.getAttribute('data-path')}: oryginał ${await f.getByTestId('conflict-merge-canonical').isChecked()}, kopia ${await f.getByTestId('conflict-merge-copy').isChecked()}`)
      await log.shot(page, 'DA.28-scal-1')
      await merge.getByTestId('conflict-merge-save').click()
      await page.waitForTimeout(2000)
      log.line(`zapis: ${await toasts(page)}`)
      const r = readJson(a.path)!
      log.line(`wynik: amount ${r.amount}, note „${r.note}”, tags ${JSON.stringify(r.tags)}, id ${r.id === base.id}, updatedBy ${r.updatedBy}; kopia: ${existsSync(copyPath(a.path))}`)
      const hd = join(dataDir, '.history', 'transactions', base.id)
      for (const f of readdirSync(hd)) {
        const h = readJson(join(hd, f))!
        log.line(`  historia ${f}: ${h.reason}, amount ${h.record?.amount}, note „${h.record?.note}”, tags ${JSON.stringify(h.record?.tags)}, updatedBy ${h.record?.updatedBy}`)
      }
    })
    await log.step('para 2 (zmiana kopii w trakcie)', async () => {
      await card(OP.rossmann).getByTestId('conflict-merge-open').click()
      await page.waitForTimeout(800)
      const merge = card(OP.rossmann).getByTestId('conflict-merge')
      log.line(`--- Scal (para 2) ---\n${(await merge.innerText()).replace(/\n{2,}/g, '\n')}`)
      for (const f of await merge.getByTestId('conflict-merge-field').all())
        log.line(`  pole ${await f.getAttribute('data-path')}: oryginał ${await f.getByTestId('conflict-merge-canonical').isChecked()}, kopia ${await f.getByTestId('conflict-merge-copy').isChecked()}`)
      await log.shot(page, 'DA.28-scal-2')
      // Meanwhile OneDrive brings another version of the copy.
      const cp = copyPath(b.path)
      writeJson(cp, { ...readJson(cp)!, amount: -6300, note: 'zmiana w trakcie', updatedAt: later(120_000) })
      await sleep(1500)
      await merge.getByTestId('conflict-merge-save').click().catch((e) => log.line(`klik: ${(e as Error).message.split('\n')[0]}`))
      await page.waitForTimeout(2500)
      log.line(`zapis: ${await toasts(page)}`)
      const r = readJson(b.path)!
      log.line(`oryginał: amount ${r.amount}, note „${r.note}”; kopia: ${existsSync(cp) ? JSON.stringify({ amount: readJson(cp)!.amount, note: readJson(cp)!.note }) : 'brak'}`)
      log.line(`karta Rossmann: ${(await card(OP.rossmann).innerText().catch(() => '(brak)')).replace(/\n+/g, ' ⏎ ').slice(0, 600)}`)
      await log.shot(page, 'DA.28-scal-2-po')
    })
    log.line(`Kosz (laboratorium): ${JSON.stringify((await trapped(run)).trashed)}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.29 – „Zaakceptuj nowsze” zbiorczo', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-29'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  try {
    const names = ['KEBAB ROMA', 'BAR POD LIPA', 'BOLT.EU', 'NETIA SA', 'Allegro']
    const ops = [OP.kebab, OP.bar, OP.bolt, OP.netia, OP.allegro].map((id) => byId(dataDir, id))
    ops.forEach((o, i) => {
      const copyNewer = i < 3
      const at = copyNewer ? later() : new Date(Date.parse(o.rec.updatedAt) - 86_400_000).toISOString()
      writeJson(copyPath(o.path), { ...o.rec, amount: o.rec.amount - 111, note: `kopia ${copyNewer ? 'nowsza' : 'starsza'}`, updatedAt: at, updatedBy: 'LAPTOP' })
      log.line(`${o.rec.counterparty}: oryginał ${o.rec.amount} (${o.rec.updatedAt}), kopia ${o.rec.amount - 111} (${at}) → nowsza ${copyNewer ? 'kopia' : 'oryginał'}`)
    })
    await rescan(page)
    await goSync(page)
    log.line(`konflikty: ${await page.locator('[data-testid^="conflict:"]').count()}`)
    log.line(`pasek: ${(await page.getByTestId('conflicts-bulk').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')}`)
    await page.getByTestId('conflicts-select-all').check().catch(async () => page.getByTestId('conflicts-select-all').click())
    await page.waitForTimeout(400)
    log.line(`po „zaznacz wszystkie”: ${(await page.getByTestId('conflicts-bulk').innerText()).replace(/\s+/g, ' ')}`)
    await log.shot(page, 'DA.29-przed')
    const t0 = Date.now()
    await page.getByTestId('conflicts-newer-all').click()
    await page.waitForTimeout(3000)
    log.line(`po „Zaakceptuj nowsze: wszystkie” (${Math.round((Date.now() - t0) / 1000)} s): ${await toasts(page)}; konfliktów ${await page.locator('[data-testid^="conflict:"]').count()}`)
    for (const o of ops) {
      const r = readJson(o.path)!
      const hd = join(dataDir, '.history', 'transactions', o.rec.id)
      log.line(`${o.rec.counterparty}: teraz ${r.amount} „${r.note}” (${r.updatedBy}); kopia ${existsSync(copyPath(o.path))}; historia ${existsSync(hd) ? readdirSync(hd).map((f) => `${f}:${readJson(join(hd, f))!.record?.amount}`).join(', ') : 'brak'}`)
    }
    log.line(`Kosz (laboratorium): ${(await trapped(run)).trashed.length} plików`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.30 – konflikt ustawień i planu miesiąca', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-30'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  try {
    await log.step('(a) fi-LAPTOP.json', async () => {
      const fi = readJson(join(dataDir, 'fi.json'))!
      writeJson(join(dataDir, 'fi-LAPTOP.json'), { ...fi, updatedAt: later(), updatedBy: 'LAPTOP', settings: { ...fi.settings, shipName: 'Jastrząb', layers: { ...fi.settings.layers, shieldSalaries: 4 } } })
      await rescan(page)
      await goSync(page)
      log.line(`karty:\n  ${await conflictCards(page)}`)
      await page.locator('[data-testid^="conflict:"]', { hasText: 'Ustawienia' }).getByTestId('keep-copy').click()
      await page.waitForTimeout(2000)
      log.line(`po „Zachowaj” (kopia): ${await toasts(page)}; menu: ${await page.getByTestId('menu-ship-name').innerText()}`)
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-general').click()
      log.line(`Ustawienia → Okręt: nazwa „${await page.getByTestId('ship-name-input').inputValue()}”`)
      await page.getByTestId('settings-tab-layers').click()
      await page.waitForTimeout(500)
      log.line(`Warstwy: ${(await page.locator('main').innerText()).split('\n').filter((l) => /osłon|pensj/i.test(l)).slice(0, 6).join(' | ')}`)
      await page.keyboard.press('Control+1')
      log.line(`Mostek: ${(await page.getByTestId('page-bridge').innerText()).match(/Osłony\n[^\n]+\n[^\n]+/)?.[0]?.replace(/\n/g, ' ')}`)
      await sleep(65_000)
      const f2 = readJson(join(dataDir, 'fi.json'))!
      log.line(`po minucie fi.json: shipName ${f2.settings.shipName}, shieldSalaries ${f2.settings.layers.shieldSalaries}, updatedBy ${f2.updatedBy}; fi-LAPTOP.json: ${existsSync(join(dataDir, 'fi-LAPTOP.json'))}; menu ${await page.getByTestId('menu-ship-name').innerText()}`)
      await log.shot(page, 'DA.30a')
    })
    await log.step('(b) drugi plan bieżącego miesiąca', async () => {
      const m = readJson(join(dataDir, 'months', '2026-11.json'))!
      const fun = '01KDEFCAT00000000000000600'
      writeJson(join(dataDir, 'months', '2026-11-LAPTOP.json'), { ...m, id: '01KQDA30000000000000000001', updatedAt: later(), updatedBy: 'LAPTOP', envelopes: { ...m.envelopes, [fun]: 99900 } })
      await rescan(page)
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(1000)
      log.line(`Plan miesiąca – Rozrywka: ${await page.locator('[data-testid="month-envelope"][data-name="Rozrywka i hobby"] input').inputValue().catch(() => '?')}; planów na ekranie (pensja): ${await page.getByTestId('month-salary').count()}`)
      log.line(`Plan – teksty: ${(await page.getByTestId('page-month').innerText()).split('\n').filter((l) => /usunięty|konflikt|innym komputerze/i.test(l)).join(' | ') || '(brak ostrzeżeń)'}`)
      log.line(`banery: ${await banners(page)}`)
      await log.shot(page, 'DA.30b-plan-przed')
      await goSync(page)
      log.line(`karty:\n  ${await conflictCards(page)}`)
      const card = page.locator('[data-testid^="conflict:"]', { hasText: /Plan/ })
      await card.getByTestId('keep-copy').click()
      await page.waitForTimeout(2000)
      log.line(`po „Zachowaj” (kopia): ${await toasts(page)}`)
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(1000)
      log.line(`Plan miesiąca – Rozrywka po: ${await page.locator('[data-testid="month-envelope"][data-name="Rozrywka i hobby"] input').inputValue().catch(() => '?')}`)
      log.line(`months/: ${readdirSync(join(dataDir, 'months')).filter((n) => n.startsWith('2026-11')).join(', ')}; 2026-11.json id ${readJson(join(dataDir, 'months', '2026-11.json'))?.id}, Rozrywka ${readJson(join(dataDir, 'months', '2026-11.json'))?.envelopes[fun]}`)
      log.line(`Mostek: ${(await (async () => {
        await page.keyboard.press('Control+1')
        await page.waitForTimeout(800)
        return (await page.getByTestId('page-bridge').innerText()).match(/Rozrywka i hobby\n[^\n]+\n[^\n]+\n[^\n]+/)?.[0]?.replace(/\n/g, ' ')
      })())}`)
      await log.shot(page, 'DA.30b-po')
    })
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.31 – pliki z problemami', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-31'
  const log = new Log(NAME)
  let held = ''
  let release: (() => void) | null = null
  const ids = { a: '01KQDA31000000000000000001', b: '01KQDA31000000000000000002', c: '01KQDA31000000000000000003' }
  const files = { a: '', b: '', c: '' }
  const prep = (dir: string) => {
    const t = join(dir, 'transactions', '2026')
    files.a = join(t, `2026-11-02_${ids.a}.json`)
    files.b = join(t, `2026-11-02_${ids.b}.json`)
    files.c = join(t, `2026-11-02_${ids.c}.json`)
    writeFileSync(files.a, '{ "schemaVersion": 1, "id": "01KQDA3100')
    const base = byId(dir, OP.mokka).rec
    const { amount: _drop, ...noAmount } = base
    void _drop
    writeJson(files.b, { ...noAmount, id: ids.b, date: '2026-11-02', counterparty: 'Bez kwoty' })
    writeJson(files.c, { ...base, id: ids.c, date: '2026-11-02', counterparty: 'Z nowszej wersji', schemaVersion: 2, nowePole: 'v2' })
    held = byId(dir, OP.apteka).path
  }
  const { dataDir: d0 } = await (async () => {
    const { useState } = await import('./lab')
    return useState('rok', NAME)
  })()
  prep(d0)
  release = await holdFile(held)
  log.line(`zablokowany: ${held}`)
  // The run on the prepared copy (openRok would copy „rok” again – the lab's start on this folder instead).
  const { start } = await import('./lab')
  const { trap, PROD_FREEZE } = await import('./da-pomoc')
  const run = await start(NAME, { dataDir: d0, env: PROD_FREEZE })
  await trap(run, log)
  const { page } = run
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(2000)
    log.line(`banery: ${await banners(page)}`)
    await goSync(page)
    const panel = async (label: string) => log.line(`--- ${label} ---\n${(await page.locator('main').innerText()).split('\n').filter((l) => l.trim()).join('\n').slice(0, 2500)}`)
    await panel('Synchronizacja')
    log.line(`wiersze problemów: ${await page.getByTestId('problem-row').count()}`)
    for (const r of await page.getByTestId('problem-row').all()) log.line(`  ${(await r.innerText()).replace(/\s+/g, ' ')} | Do Kosza: ${await r.getByTestId('problem-trash').count()}`)
    await log.shot(page, 'DA.31-problemy')
    // Operations: the rest works.
    await openOp(page, 'ZOOPLUS', OP.zoo)
    log.line(`Operacje działają: edytor ZOOPLUS ${await page.getByTestId('operation-editor').count()}; Apteka na liście: ${await (async () => {
      await page.getByTestId('operations-search').fill('Apteka')
      await page.waitForTimeout(500)
      return page.locator('[data-testid="operation-row"]', { hasText: 'Apteka' }).count()
    })()}`)
    // (a) „Do Kosza” → „Do Kosza na pewno”.
    await goSync(page)
    const rowA = page.locator('[data-testid="problem-row"]', { hasText: ids.a })
    const trashA = rowA.getByTestId('problem-trash')
    log.line(`(a) wiersz: ${(await rowA.innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')}`)
    await trashA.click()
    await page.waitForTimeout(500)
    log.line(`(a) po pierwszym kliknięciu: „${await trashA.innerText().catch(() => '?')}”, plik istnieje ${existsSync(files.a)}`)
    await trashA.click()
    await page.waitForTimeout(1500)
    log.line(`(a) po drugim: plik istnieje ${existsSync(files.a)}; toasty ${await toasts(page)}; Kosz (laboratorium) ${JSON.stringify((await trapped(run)).trashed)}`)
    // DA.15 (b) on a file read from the disk: „Kopia teraz” while Apteka's file is held (it is not in memory now).
    {
      const { goFolderTab } = await import('./da-pomoc')
      await goFolderTab(page)
      const manual = join(d0, 'backups', 'manual')
      const before = existsSync(manual) ? readdirSync(manual) : []
      await page.getByTestId('backup-now').click()
      let said = ''
      for (let i = 0; i < 30 && !said; i++) {
        await sleep(1000)
        said = await toasts(page)
      }
      log.line(`DA.15b – „Kopia teraz” przy zablokowanym pliku z problemem: ${said || '(cisza)'}`)
      log.line(`DA.15b – manual/ przed: ${before.join(', ') || 'brak'}; po: ${existsSync(manual) ? readdirSync(manual).join(', ') : 'brak'}`)
      log.line(`DA.15b – lista: ${(await page.getByTestId('backup-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' || ')}`)
      await log.shot(page, 'DA.15b-plik-z-dysku')
      await goSync(page)
    }
    // (d) the hold released, „Wczytaj ponownie”.
    release()
    release = null
    await sleep(1500)
    await page.getByTestId('problem-reread').first().click()
    await page.waitForTimeout(2500)
    log.line(`(d) po zwolnieniu i „Wczytaj ponownie”: ${await toasts(page)}; problemów ${await page.getByTestId('problem-row').count()}; plik Apteka na miejscu ${existsSync(held)}`)
    await panel('Synchronizacja po')
    await openOp(page, 'Apteka', OP.apteka).catch((e) => log.line(`Apteka: ${(e as Error).message.split('\n')[0]}`))
    log.line(`(d) Apteka w edytorze: ${await page.getByTestId('operation-editor').count()}`)
    await log.shot(page, 'DA.31-po')
    log.line(`pliki b, c: ${existsSync(files.b)}, ${existsSync(files.c)}`)
  } finally {
    release?.()
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  void recordFiles
  void readFileSync
})
