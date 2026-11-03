// DO, przebieg do-6: persona „rok” z kopią ICTTJ. DO.13 – podwójne dokowanie jednego wpisu (drugi komputer), restart,
// zmiana notatki wpisu w ICTTJ, „Usuń nadmiarowe”; DO.14 – wpis usunięty i pula zmieniona w ICTTJ (na żywo), usunięcie
// zadokowanej operacji w Operacjach i „Cofnij”; DO.19 – nowa wypłata na żywo (1, potem 3 naraz); DO.22 – nowszy format,
// nieznana pula, uszkodzony plik, wydatek, ten sam id w dwóch plikach, kopia „(1)”.
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { recorded, shot, start, useState, type Run } from './lab'
import { ACC, Boundary, Log, bankXtb, briefing, bridgeValues, dialogState, dockPanel, editJson, findRecords, go, mainLog, openDelivery, payoutRecord, putFile, readAt, settingsTab, toasts, writePayout, writeRecord, writeTx } from './do-pomoc'

const RUN = 'do-6'
const E08 = '01KAZ700000000000000000008'
const E06 = '01KAZ700000000000000000006'
const E06_FILE = 'payouts/2026/2026-07-20_01KAZ700000000000000000006.json'
const E31 = '01KAZ700000000000000000011'
const WALLET_TX = '01KMXD0T000000000000000041'
const DUP_DOCK = '01KMXD0D000000000000000041'
const L1 = '01KMXD0P000000000000000041'
const L2 = '01KMXD0P000000000000000042'
const L3 = '01KMXD0P000000000000000043'
const L4 = '01KMXD0P000000000000000044'
const N1 = '01KMXD0P000000000000000051'
const N2 = '01KMXD0P000000000000000052'
const N3 = '01KMXD0P000000000000000053'
const N4 = '01KMXD0P000000000000000054'
const N5 = '01KMXD0P000000000000000055'

test('DO.13, DO.14, DO.19, DO.22 – dokowanie raz, zmiany wpisów, na żywo, nowszy format (rok)', async () => {
  test.setTimeout(45 * 60_000)
  const log = new Log(RUN)
  const st = useState('rok', RUN)
  const DATA = st.dataDir
  const ICTJ = st.ictjDir!
  const folders = { dataDir: DATA, ictjDir: ICTJ }
  const b = new Boundary(RUN, ICTJ)
  let run: Run | null = null
  const open = async (label: string, fresh: boolean) => {
    b.check(`przed start() – ${label}`)
    run = await start(RUN, { dataDir: DATA, ictjDir: ICTJ, fresh })
    await run.page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await run.page.waitForTimeout(5000)
    return run
  }
  const close = async (label: string) => {
    if (!run) return
    log.obj(`błędy okna (${label})`, run.errors)
    log.obj(`powiadomienia (${label})`, (await recorded(run.app).catch(() => null))?.toasts ?? '(brak)')
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    log.obj(`main.log ICTTJ (${label})`, mainLog(run.userData).split(/\r?\n/).filter((l) => /ictj|ICTTJ|EPERM|EACCES/i.test(l)).join('\n'))
    run = null
    b.check(`po zamknięciu – ${label}`)
  }
  const waitRows = async (page: Page, fn: (rows: string[]) => boolean, seconds = 40) => {
    const t0 = Date.now()
    for (let i = 0; i < seconds; i++) {
      const rows = (await dockPanel(page)).rows
      if (fn(rows)) return `${Math.round((Date.now() - t0) / 1000)} s`
      await page.waitForTimeout(1000)
    }
    return `nie w ${seconds} s`
  }
  const inbox = async (page: Page) => (await page.getByTestId('nav-inbox').innerText().catch(() => '?')).replace(/\s+/g, ' ')
  try {
    // ---- Faza 1 (DO.13): drugie dokowanie wpisu 19.10 (3 000, Nadwyżki) na Portfelu XTB – jak z drugiego komputera.
    writeTx(DATA, {
      id: WALLET_TX,
      date: '2026-10-19',
      amount: 300000,
      accountId: ACC.xtb,
      kind: 'trading',
      counterparty: 'XTB',
      title: 'Wypłata z ICTTJ (pula Nadwyżki w masie)',
      createdAt: '2026-10-21T10:00:00.000Z',
      updatedAt: '2026-10-21T10:00:00.000Z',
      updatedBy: 'DRUGI-PC'
    })
    writeRecord(DATA, `dockings/2026/2026-10-19_${DUP_DOCK}.json`, {
      id: DUP_DOCK,
      createdAt: '2026-10-21T10:00:01.000Z',
      updatedAt: '2026-10-21T10:00:01.000Z',
      updatedBy: 'DRUGI-PC',
      date: '2026-10-19',
      transactionId: WALLET_TX,
      ictjEntryId: E08,
      entryDate: '2026-10-19',
      pool: 'surplus',
      split: null,
      note: ''
    })
    let r = await open('faza 1a', true)
    await log.step('DO.13 przed restartem', async () => {
      log.obj('DO.13 z podwójnym', await readAt('DO.13', 'rok + drugie dokowanie wpisu 19.10 na Portfelu XTB (drugi komputer)', folders, () => bridgeValues(r.page)))
      await shot(r.page, 'DO.13-panel')
    })
    await close('faza 1a')
    r = await open('faza 1b (restart)', false)
    await log.step('DO.13 po restarcie i zmianie notatki', async () => {
      log.obj('DO.13 po restarcie', await readAt('DO.13', 'rok + podwójne; po restarcie', folders, () => bridgeValues(r.page)))
      b.change('DO.13: notatka i updatedAt wpisów 19.10 i 20.07', () => {
        for (const rel of ['payouts/2026/2026-10-19_01KAZ700000000000000000008.json', E06_FILE])
          editJson(join(ICTJ, rel), (e) => ({ ...e, note: 'zmieniona notatka (audyt)', updatedAt: '2026-11-03T12:00:00.000Z' }))
      })
      await r.page.waitForTimeout(35_000)
      log.obj('DO.13 po zmianie notatki', await readAt('DO.13', 'rok + podwójne; notatka i updatedAt wpisów zmienione w ICTTJ', folders, () => bridgeValues(r.page)))
      await openDelivery(r.page, '19.10.2026', '+3 000,00')
      log.obj('DO.13 okno', await dialogState(r.page))
      await shot(r.page, 'DO.13-okno')
      const rm = r.page.getByTestId('docking-extra-remove')
      log.line(`„Usuń nadmiarowe”: ${await rm.count()}`)
      if (await rm.count()) {
        await rm.click()
        await r.page.waitForTimeout(1200)
        log.line(`toast: ${await toasts(r.page)}`)
        await r.page.waitForTimeout(2000)
      }
      await r.page.keyboard.press('Escape').catch(() => undefined)
      log.obj('dokowania wpisu 19.10', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === E08).map((x) => `${x.rec.id} tx ${x.rec.transactionId}`))
      log.obj('operacja Portfela drugiego komputera', findRecords(DATA, 'transactions', (x) => x.id === WALLET_TX).length)
      log.obj('DO.13 po Usuń nadmiarowe', await readAt('DO.13', 'rok; po „Usuń nadmiarowe”', folders, () => bridgeValues(r.page)))
    })

    // ---- DO.14 (na żywo): wpis 20.07 (4 500, Bieżące, zadokowany z mBankiem) usunięty w ICTTJ, potem przywrócony z pulą Cele.
    const e06 = readFileSync(join(ICTJ, E06_FILE), 'utf8')
    await log.step('DO.14 wpis usunięty', async () => {
      log.obj('DO.14 przed', await readAt('DO.14', 'rok; wpis 20.07 zadokowany – przed usunięciem w ICTTJ', folders, () => bridgeValues(r.page)))
      b.change('DO.14: usunięcie wpisu 20.07', () => rmSync(join(ICTJ, E06_FILE)))
      log.line(`wiersz „wpis usunięty”: ${await waitRows(r.page, (rows) => rows.some((x) => x.includes('wpis usunięty')))}`)
      log.obj('panel', await dockPanel(r.page))
      log.obj('DO.14 wpis usunięty', await readAt('DO.14', 'rok; wpis 20.07 usunięty w ICTTJ', folders, () => bridgeValues(r.page)))
      await openDelivery(r.page, '2[01].07.2026', '+4 500,00')
      log.obj('DO.14 okno – wpis usunięty', await dialogState(r.page))
      await shot(r.page, 'DO.14-wpis-usuniety')
      await r.page.keyboard.press('Escape')
    })
    await log.step('DO.14 pula zmieniona', async () => {
      b.change('DO.14: wpis 20.07 przywrócony z pulą Cele', () => writeFileSync(join(ICTJ, E06_FILE), e06.replace('"pool": "current"', '"pool": "goals"')))
      log.line(`wiersz „pula zmieniona”: ${await waitRows(r.page, (rows) => rows.some((x) => x.includes('pula zmieniona')))}`)
      log.obj('panel', await dockPanel(r.page))
      log.obj('DO.14 pula zmieniona', await readAt('DO.14', 'rok; wpis 20.07 z pulą Cele – przed „Zapisz podział”', folders, () => bridgeValues(r.page)))
      await openDelivery(r.page, '20.07.2026', '+4 500,00')
      log.obj('DO.14 okno – pula zmieniona', await dialogState(r.page))
      await shot(r.page, 'DO.14-pula-zmieniona')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(3000)
      log.obj('dokowanie 20.07', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === E06).map((x) => x.rec))
      log.obj('DO.14 po Zapisz podział', await readAt('DO.14', 'rok; po „Zapisz podział” z pulą Cele', folders, () => bridgeValues(r.page)))
      log.obj('panel', await dockPanel(r.page))
    })
    // ---- DO.14: usunięcie zadokowanej operacji w Operacjach i „Cofnij” (wpis 31.10 z parą 02.11, zadokowany tu).
    await log.step('DO.14 usunięcie operacji', async () => {
      bankXtb(DATA, '01KMXD0T000000000000000042', '2026-11-02', 320000)
      log.line(`para 3 200: ${await waitRows(r.page, (rows) => rows.some((x) => x.includes('3 200,00') && x.includes('do zadokowania')))}`)
      await openDelivery(r.page, '31.10.2026', '+3 200,00')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(3000)
      log.obj('dokowanie 31.10', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === E31).map((x) => x.rec.id))
      log.obj('DO.14 po dokowaniu 3 200', await readAt('DO.14', 'rok; wpis 31.10 zadokowany (para 02.11) – przed usunięciem operacji', folders, () => bridgeValues(r.page)))
      await go(r.page, '2', 'page-operations')
      await r.page.getByTestId('operations-search').fill('WYPLATA SRODKOW')
      await r.page.waitForTimeout(1200)
      const row = r.page.locator('[data-testid="operation-row"]').filter({ hasText: '3 200,00' }).first()
      log.line(`wiersz operacji 3 200: ${await row.count()}`)
      await row.click()
      await r.page.getByTestId('operation-editor').waitFor({ timeout: 10_000 })
      await r.page.getByTestId('operation-delete').click()
      await r.page.getByTestId('operation-delete-confirm').click()
      await r.page.waitForTimeout(1500)
      log.line(`toast: ${await toasts(r.page)}`)
      await shot(r.page, 'DO.14-usunieta-operacja')
      log.obj('po usunięciu: dokowanie 31.10 / operacja', { dok: findRecords(DATA, 'dockings', (x) => x.ictjEntryId === E31).length, op: findRecords(DATA, 'transactions', (x) => x.id === '01KMXD0T000000000000000042').length })
      const undo = r.page.getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      if (await undo.count()) {
        await undo.first().click()
        await r.page.waitForTimeout(2500)
      }
      log.obj('po Cofnij: dokowanie 31.10 / operacja', { dok: findRecords(DATA, 'dockings', (x) => x.ictjEntryId === E31).length, op: findRecords(DATA, 'transactions', (x) => x.id === '01KMXD0T000000000000000042').length })
      log.obj('DO.14 po Cofnij', await readAt('DO.14', 'rok; po usunięciu operacji 3 200 i „Cofnij”', folders, () => bridgeValues(r.page)))
    })

    // ---- DO.19: nowa wypłata na żywo, potem trzy naraz.
    await log.step('DO.19', async () => {
      await go(r.page, '1', 'page-bridge')
      const before = { meldunki: await inbox(r.page), panel: (await dockPanel(r.page)).title, toasts: ((await recorded(r.app)).toasts ?? []).length }
      log.obj('DO.19 przed', before)
      b.change('DO.19: nowa wypłata 650 zł Bieżące 03.11', () => writePayout(ICTJ, { id: L1, kind: 'withdrawal', date: '2026-11-03', amount: 650, pool: 'current' }))
      log.line(`jedna – wiersz: ${await waitRows(r.page, (rows) => rows.some((x) => x.includes('650,00')), 45)}`)
      log.obj('DO.19 po jednej', { meldunki: await inbox(r.page), panel: (await dockPanel(r.page)).title, odprawa: (await briefing(r.page)).filter((x) => x.includes('650,00')), powiadomienia: ((await recorded(r.app)).toasts ?? []).slice(before.toasts) })
      await shot(r.page, 'DO.19-jedna')
      const n = ((await recorded(r.app)).toasts ?? []).length
      b.change('DO.19: trzy wypłaty naraz (710, 720, 730 zł)', () => {
        writePayout(ICTJ, { id: L2, kind: 'withdrawal', date: '2026-11-03', amount: 710, pool: 'current' })
        writePayout(ICTJ, { id: L3, kind: 'withdrawal', date: '2026-11-03', amount: 720, pool: 'surplus' })
        writePayout(ICTJ, { id: L4, kind: 'withdrawal', date: '2026-11-03', amount: 730, pool: 'goals' })
      })
      log.line(`trzy – wiersze: ${await waitRows(r.page, (rows) => ['710,00', '720,00', '730,00'].every((a) => rows.some((x) => x.includes(a))), 45)}`)
      log.obj('DO.19 po trzech', { meldunki: await inbox(r.page), panel: await dockPanel(r.page), odprawa: (await briefing(r.page)).filter((x) => /7[123]0,00/.test(x)), powiadomienia: ((await recorded(r.app)).toasts ?? []).slice(n) })
      await shot(r.page, 'DO.19-trzy')
    })
    await close('faza 1b')

    // ---- Faza 2 (DO.22): pliki nowszego formatu i nieczytelne w kopii ICTTJ.
    b.change('DO.22: nowszy format, nieznana pula, uszkodzony plik, wydatek, ten sam id w dwóch plikach, kopia (1)', () => {
      writePayout(ICTJ, { id: N1, kind: 'withdrawal', date: '2026-11-03', amount: 900, pool: 'current', schemaVersion: 2, extra: { fxRate: 1, broker: { name: 'XTB' } } })
      writePayout(ICTJ, { id: N2, kind: 'withdrawal', date: '2026-11-03', amount: 450, pool: 'bonus' })
      putFile(ICTJ, `payouts/2026/2026-11-03_${N3}.json`, '{\n  "schemaVersion": 1,\n  "id": "' + N3 + '",\n  "kind": "withdr')
      writePayout(ICTJ, { id: N4, kind: 'expense', date: '2026-11-03', amount: 120, pool: 'current' })
      writePayout(ICTJ, { id: N5, kind: 'withdrawal', date: '2026-11-02', amount: 250, pool: 'current', updatedAt: '2026-11-02T19:00:00.000Z' })
      putFile(ICTJ, `payouts/2026/2026-11-03_${N5}.json`, payoutRecord({ id: N5, kind: 'withdrawal', date: '2026-11-03', amount: 260, pool: 'current', updatedAt: '2026-11-03T10:00:00.000Z' }))
      copyFileSync(join(ICTJ, `payouts/2026/2026-11-03_${N1}.json`), join(ICTJ, `payouts/2026/2026-11-03_${N1} (1).json`))
    })
    bankXtb(DATA, '01KMXD0T000000000000000051', '2026-11-03', 90000)
    bankXtb(DATA, '01KMXD0T000000000000000052', '2026-11-03', 45000)
    r = await open('faza 2', false)
    await log.step('DO.22', async () => {
      await settingsTab(r.page, 'ictj')
      log.obj('DO.22 Ustawienia → ICTTJ', (await r.page.locator('main').innerText()).split('\n').filter((l) => l.trim()).slice(0, 40).join(' | '))
      await shot(r.page, 'DO.22-ustawienia')
      await go(r.page, '1', 'page-bridge')
      log.obj('DO.22 panel', await dockPanel(r.page))
      await shot(r.page, 'DO.22-panel')
      for (const a of ['900,00', '450,00', '260,00', '250,00', '120,00']) {
        const row = r.page.locator('[data-testid="docking-row"]').filter({ hasText: a })
        log.line(`wiersze z ${a}: ${await row.count()}`)
        if (await row.count()) {
          await row.first().click()
          await r.page.getByTestId('docking-dialog').waitFor()
          log.obj(`DO.22 okno ${a}`, await dialogState(r.page))
          await r.page.keyboard.press('Escape')
          await r.page.waitForTimeout(400)
        }
      }
      await openDelivery(r.page, '03.11.2026', '+900,00')
      await r.page.getByTestId('docking-confirm').click()
      await r.page.waitForTimeout(3000)
      log.obj('dokowanie N1 (nowszy format)', findRecords(DATA, 'dockings', (x) => x.ictjEntryId === N1).map((x) => x.rec))
      log.obj('DO.22 po dokowaniu 900', await readAt('DO.22', 'rok + pliki ICTTJ: v2, bonus, uszkodzony, expense, dwa pliki jednego id, kopia (1); po „Zadokuj” 900', folders, () => bridgeValues(r.page)))
      log.obj('panel po', await dockPanel(r.page))
    })
    await close('faza 2')
  } finally {
    await close('finally')
    log.obj('granica', b.end('DO.13, DO.14, DO.19, DO.22'))
  }
})
