/**
 * Audit DA – history of entries, deleted entries, the folder's change log (DA.21, DA.22, DA.24, DA.25).
 * Observation only: C:\FI-audyt\przebiegi\da-*\da.log.
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  OP,
  byId,
  Log, findOp, goFolderTab, goSync, openOp, openRok, readJson, recordFiles, reopen, sleep, toasts, trapped, typeAmount, writeJson } from './da-pomoc'

const histText = async (page: Page) => (await page.getByTestId('history-dialog').innerText().catch(() => '(brak okna historii)')).replace(/\n{2,}/g, '\n')

test('DA.21 – historia operacji', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-21'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  const op = byId(dataDir, OP.bolt)
  const hd = join(dataDir, '.history', 'transactions', op.rec.id)
  try {
    log.line(`przed: amount ${op.rec.amount}, cat ${op.rec.categoryId}, note „${op.rec.note}”; historia ${existsSync(hd) ? readdirSync(hd).join(', ') : 'brak'}`)
    await openOp(page, 'BOLT.EU', OP.bolt)
    await typeAmount(page, 'operation-amount', '25,50')
    await page.waitForTimeout(800)
    await page.getByTestId('operation-category').selectOption({ label: 'Jedzenie · na mieście' })
    await page.waitForTimeout(800)
    await page.getByTestId('operation-note').click()
    await page.getByTestId('operation-note').fill('przejazd na lotnisko')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(1500)
    const now = readJson(op.path)!
    log.line(`po zmianach: amount ${now.amount}, cat ${now.categoryId}, note „${now.note}”; historia ${existsSync(hd) ? readdirSync(hd).join(', ') : 'brak'}`)
    await page.getByTestId('operation-editor').getByTestId('history-open').click()
    await page.waitForTimeout(800)
    const versions = page.getByTestId('history-version')
    log.line(`wersji: ${await versions.count()}`)
    if (await versions.count()) await versions.first().click()
    await page.waitForTimeout(500)
    log.line(`--- Historia ---\n${await histText(page)}`)
    await log.shot(page, 'DA.21-historia')
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(800)
    log.line(`--- Historia przy ukrytych kwotach ---\n${await histText(page)}`)
    await log.shot(page, 'DA.21-ukryte')
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(800)
    await page.getByTestId('history-restore').first().click()
    await page.waitForTimeout(1500)
    log.line(`po „Przywróć”: ${await toasts(page)}; okno historii: ${await page.getByTestId('history-dialog').count()}`)
    const back = readJson(op.path)!
    log.line(`plik po przywróceniu: amount ${back.amount}, cat ${back.categoryId}, note „${back.note}”; historia ${readdirSync(hd).join(', ')}`)
    for (const f of readdirSync(hd)) {
      const h = readJson(join(hd, f))!
      log.line(`  ${f}: ${h.reason}, ${h.savedBy}, amount ${h.record?.amount}, note „${h.record?.note}”`)
    }
    if (await page.getByTestId('history-dialog').count()) await page.keyboard.press('Escape')
    await page.getByTestId('operation-editor').getByTestId('history-open').click()
    await page.waitForTimeout(800)
    log.line(`--- Historia po przywróceniu ---\n${await histText(page)}`)
    await log.shot(page, 'DA.21-po')
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.22 – historia przy innych wpisach', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-22'
  const log = new Log(NAME)
  const { run } = await openRok(NAME, { log })
  const { page } = run
  /** History opened from a place; its text; Esc – what stays open. */
  const look = async (label: string, open: () => Promise<void>, under: string | null) => {
    await log.step(label, async () => {
      await open()
      await page.waitForTimeout(800)
      log.line(`--- ${label} ---\n${(await histText(page)).slice(0, 900)}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      log.line(`po Esc: historia ${await page.getByTestId('history-dialog').count()}${under ? `, pod spodem (${under}) ${await page.locator(under).count()}` : ''}`)
    })
  }
  try {
    // The month's plan: an envelope changed.
    await page.keyboard.press('Control+4')
    const env = page.locator('[data-testid="month-envelope"][data-name="Osobiste"] input')
    await env.click()
    await env.fill('360')
    await env.press('Enter')
    await page.waitForTimeout(1000)
    await look('plan miesiąca', () => page.getByTestId('page-month').getByTestId('history-open').first().click(), null)
    // A container: its amount.
    await page.keyboard.press('Control+5')
    await page.locator('[data-testid="cargo-row"][data-name="Netflix"]').click()
    const editor = page.getByTestId('cargo-editor')
    await editor.getByTestId('container-amount').click()
    await editor.getByTestId('container-amount').fill('49')
    await editor.getByTestId('container-amount').press('Enter')
    await page.waitForTimeout(1000)
    await look('kontener Netflix', () => editor.getByTestId('history-open').first().click(), '[data-testid="cargo-editor"]')
    // A goal (Mapa gwiezdna): the history button of the first goal.
    await page.keyboard.press('Control+6')
    await page.waitForTimeout(800)
    log.line(`Mapa gwiezdna – przycisków historii: ${await page.getByTestId('history-open').count()}`)
    await look('cel', () => page.getByTestId('history-open').first().click(), null)
    // A loan (Radar).
    await page.keyboard.press('Control+7')
    await page.waitForTimeout(800)
    log.line(`Radar – przycisków historii: ${await page.getByTestId('history-open').count()}`)
    if (await page.getByTestId('history-open').count()) await look('pożyczka', () => page.getByTestId('history-open').first().click(), null)
    // The opening balance (Ustawienia → Konta).
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(800)
    log.line(`Konta – przycisków historii: ${await page.getByTestId('history-open').count()}`)
    if (await page.getByTestId('history-open').count()) await look('saldo otwarcia', () => page.getByTestId('history-open').first().click(), null)
    // Settings: the ship's name, then Synchronizacja → „Ustawienia (fi.json) też mają historię”.
    await page.getByTestId('settings-tab-general').click()
    await page.getByTestId('ship-name-input').fill('Flagowiec II')
    await page.getByTestId('ship-name-input').press('Enter')
    await page.waitForTimeout(1000)
    await goSync(page)
    log.line(`Synchronizacja – linie o historii ustawień: ${(await page.locator('main').innerText()).split('\n').filter((l) => /historię|fi\.json/i.test(l)).join(' | ')}`)
    await look('ustawienia (fi.json)', () => page.getByTestId('history-open').first().click(), null)
    // A docked delivery (Mostek → Dokowanie): the dialog of the last docking.
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    const link = page.getByText('dokąd poszła?')
    if (await link.count()) {
      await link.first().click()
      await page.waitForTimeout(1000)
      log.line(`po „dokąd poszła?”: przycisków historii ${await page.getByTestId('history-open').count()}; okna: ${(await page.locator('[role="dialog"]').allInnerTexts()).map((t) => t.slice(0, 120).replace(/\s+/g, ' ')).join(' || ')}`)
      if (await page.getByTestId('history-open').count()) await look('dokowanie', () => page.getByTestId('history-open').first().click(), '[role="dialog"]')
      await page.keyboard.press('Escape')
    } else log.line('dokowanie: brak linku „dokąd poszła?”')
    await log.shot(page, 'DA.22-koniec')
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.24 – usunięte wpisy i ich przywrócenie', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-24'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  try {
    const bridge = async () => {
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(800)
      const t = await page.getByTestId('page-bridge').innerText()
      return `${t.match(/Suma kont budżetu: [^\n]+/)?.[0]} | ${t.match(/Zbiorniki\n[^\n]+\n[^\n]+/)?.[0]?.replace(/\n/g, ' ')} | ${t.match(/MASA ŁADUNKU\n[^\n]+\n[^\n]+/)?.[0]?.replace(/\n/g, ' ')}`
    }
    log.line(`Mostek przed: ${await bridge()}`)
    await goSync(page)
    await page.getByTestId('deleted-load').click()
    await page.waitForTimeout(1500)
    log.line(`lista usuniętych przed: ${(await page.getByTestId('deleted-list').innerText().catch(async () => (await page.locator('main').innerText()).split('\n').filter((l) => /usunię/i.test(l)).join(' | '))).replace(/\s+/g, ' ').slice(0, 400)}`)
    const op = byId(dataDir, OP.zoo)
    await openOp(page, 'ZOOPLUS', OP.zoo)
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await page.waitForTimeout(1500)
    log.line(`operacja ZOOPLUS: plik istnieje ${existsSync(op.path)}; historia ${readdirSync(join(dataDir, '.history', 'transactions', op.rec.id)).join(', ')}; toasty ${await toasts(page)}`)
    // A container: Netflix.
    await page.keyboard.press('Control+5')
    await page.locator('[data-testid="cargo-row"][data-name="Netflix"]').click()
    const cont = recordFiles(dataDir, 'containers').find((f) => f.rec.name === 'Netflix')!
    const editor = page.getByTestId('cargo-editor')
    log.line(`przyciski usuwania w edytorze kontenera: ${(await editor.locator('[data-testid*="delete"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).join(', ')}`)
    await editor.getByTestId('container-delete').click()
    await editor.getByTestId('container-delete-confirm').click().catch(async () => page.getByTestId('container-delete-confirm').click())
    await page.waitForTimeout(1500)
    log.line(`kontener Netflix: plik istnieje ${existsSync(cont.path)}; historia ${existsSync(join(dataDir, '.history', 'containers', cont.rec.id)) ? readdirSync(join(dataDir, '.history', 'containers', cont.rec.id)).join(', ') : 'brak'}; toasty ${await toasts(page)}`)
    log.line(`Kosz (laboratorium): ${JSON.stringify((await trapped(run)).trashed)}`)
    log.line(`Mostek po usunięciu: ${await bridge()}`)
    await goSync(page)
    await page.getByTestId('deleted-load').click()
    await page.waitForTimeout(1500)
    log.line(`--- usunięte wpisy ---\n${(await page.getByTestId('deleted-list').innerText().catch(() => '(brak listy)')).replace(/\n{2,}/g, '\n').slice(0, 1500)}`)
    await page.getByTestId('deleted-search').fill('ZOOPLUS')
    await page.waitForTimeout(600)
    log.line(`wyszukane „ZOOPLUS”: ${(await page.getByTestId('deleted-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' || ')}`)
    await log.shot(page, 'DA.24-usuniete')
    await page.getByTestId('deleted-row').first().getByTestId('deleted-restore').click()
    await page.waitForTimeout(1500)
    log.line(`po „Przywróć” ZOOPLUS: ${await toasts(page)}`)
    await page.getByTestId('deleted-search').fill('Netflix')
    await page.waitForTimeout(600)
    log.line(`wyszukane „Netflix”: ${(await page.getByTestId('deleted-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join(' || ')}`)
    await page.getByTestId('deleted-row').first().getByTestId('deleted-restore').click()
    await page.waitForTimeout(1500)
    log.line(`po „Przywróć” Netflix: ${await toasts(page)}`)
    const op2 = recordFiles(dataDir, 'transactions').filter((f) => f.rec.counterparty === 'ZOOPLUS')
    const c2 = recordFiles(dataDir, 'containers').filter((f) => f.rec.name === 'Netflix')
    log.line(`ZOOPLUS: ${op2.length} plik(ów), id ten sam ${op2[0]?.rec.id === op.rec.id}, ścieżka ta sama ${op2[0]?.path === op.path}, kwota ${op2[0]?.rec.amount} (było ${op.rec.amount})`)
    log.line(`Netflix: ${c2.length} plik(ów), id ten sam ${c2[0]?.rec.id === cont.rec.id}, kwota ${c2[0]?.rec.amount} (było ${cont.rec.amount})`)
    log.line(`Mostek po przywróceniu: ${await bridge()}`)
    await goSync(page)
    await page.getByTestId('deleted-load').click()
    await page.waitForTimeout(1200)
    await page.getByTestId('deleted-search').fill('ZOOPLUS')
    await page.waitForTimeout(600)
    log.line(`lista po przywróceniu (ZOOPLUS): ${(await page.getByTestId('deleted-list').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 300)}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  // An empty list: a folder with no deletions (a fresh copy of „rok”).
  const r2 = await openRok(`${NAME}-pusty`, { log })
  try {
    await goSync(r2.run.page)
    await r2.run.page.getByTestId('deleted-load').click()
    await r2.run.page.waitForTimeout(1500)
    log.line(`pusta lista (rok): ${(await r2.run.page.locator('main').innerText()).split('\n').filter((l) => /usunię/i.test(l)).join(' | ')}`)
  } finally {
    await r2.run.app.close().catch(() => undefined)
  }
})

test('DA.25 – dziennik zmian folderu (dwa komputery)', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-25'
  const log = new Log(NAME)
  const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
  // Older changes in the data: 3 and 20 days ago (LAPTOP-KAPITANA, the persona's computer).
  const { run: pc, dataDir } = await openRok(`${NAME}-dom`, {
    log,
    machine: 'DOM-PC',
    prepare: (dir) => {
      const a = byId(dir, OP.kebab)
      writeJson(a.path, { ...a.rec, note: 'zmiana sprzed 3 dni', updatedAt: days(3), updatedBy: 'LAPTOP-KAPITANA' })
      const b = byId(dir, OP.bar)
      writeJson(b.path, { ...b.rec, note: 'zmiana sprzed 20 dni', updatedAt: days(20), updatedBy: 'LAPTOP-KAPITANA' })
    }
  })
  try {
    // DOM-PC today: an operation and the month's plan.
    await openOp(pc.page, 'CINEMA CITY', OP.cinema)
    await typeAmount(pc.page, 'operation-amount', '70')
    await pc.page.waitForTimeout(800)
    await pc.page.keyboard.press('Control+4')
    const env = pc.page.locator('[data-testid="month-envelope"][data-name="Osobiste"] input')
    await env.click()
    await env.fill('370')
    await env.press('Enter')
    await pc.page.waitForTimeout(1500)
  } finally {
    await pc.app.close().catch((e) => log.line(`zamknięcie DOM-PC: ${(e as Error).message}`))
  }
  // LAPTOP today: an operation, a container.
  const lap = await reopen(`${NAME}-laptop`, dataDir, { log, machine: 'LAPTOP', fresh: true })
  try {
    await openOp(lap.page, 'ZOOPLUS', OP.zoo)
    await typeAmount(lap.page, 'operation-amount', '190')
    await lap.page.waitForTimeout(800)
    await lap.page.keyboard.press('Control+5')
    await lap.page.locator('[data-testid="cargo-row"][data-name="Netflix"]').click()
    await lap.page.getByTestId('cargo-editor').getByTestId('container-amount').click()
    await lap.page.getByTestId('cargo-editor').getByTestId('container-amount').fill('49')
    await lap.page.getByTestId('cargo-editor').getByTestId('container-amount').press('Enter')
    await lap.page.waitForTimeout(1500)
  } finally {
    await lap.app.close().catch((e) => log.line(`zamknięcie LAPTOP: ${(e as Error).message}`))
  }
  const z = byId(dataDir, OP.zoo)
  log.line(`ZOOPLUS w pliku: ${z.rec.amount}, ${z.rec.updatedBy}`)
  const r = await reopen(`${NAME}-dom`, dataDir, { log, machine: 'DOM-PC' })
  const { page } = r
  try {
    await goSync(page)
    const rows = async () => (await page.getByTestId('changelog-row').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))
    for (const p of ['today', 'week', 'month'] as const) {
      await page.getByTestId(`changelog-period-${p}`).click()
      await page.waitForTimeout(600)
      const list = await rows()
      log.line(`--- okres ${p}: ${list.length} wpisów ---\n  ${list.slice(0, 25).join('\n  ')}`)
      if (p === 'today') await log.shot(page, 'DA.25-dzis')
    }
    log.line(`opcje komputer: ${(await page.getByTestId('changelog-machine').locator('option').allInnerTexts()).join(' | ')}`)
    log.line(`opcje rodzaj: ${(await page.getByTestId('changelog-kind').locator('option').allInnerTexts()).join(' | ')}`)
    await page.getByTestId('changelog-period-today').click()
    await page.getByTestId('changelog-machine').selectOption({ label: 'LAPTOP' }).catch(async () => page.getByTestId('changelog-machine').selectOption('LAPTOP'))
    await page.waitForTimeout(600)
    log.line(`dziś, LAPTOP: ${(await rows()).join(' || ')}`)
    const lapRow = page.locator('[data-testid="changelog-row"]', { hasText: 'ZOOPLUS' }).first()
    await lapRow.getByTestId('changelog-changes').click()
    await page.waitForTimeout(800)
    log.line(`„Zmiany” ZOOPLUS: ${(await lapRow.innerText()).replace(/\n+/g, ' ⏎ ')}`)
    await log.shot(page, 'DA.25-zmiany')
    const take = lapRow.getByTestId('changelog-take-back')
    if (await take.count()) {
      await take.click()
      await page.waitForTimeout(1500)
      log.line(`„Weź poprzednią wersję”: ${await toasts(page)}`)
      const z2 = byId(dataDir, OP.zoo)
      const hd = join(dataDir, '.history', 'transactions', z2.rec.id)
      log.line(`ZOOPLUS po: ${z2.rec.amount} (${z2.rec.updatedBy}); historia ${readdirSync(hd).map((f) => `${f}:${readJson(join(hd, f))!.record?.amount}`).join(', ')}`)
    }
    await page.getByTestId('changelog-machine').selectOption('')
    await page.getByTestId('changelog-kind').selectOption({ index: 2 }).catch(() => undefined)
    await page.waitForTimeout(600)
    log.line(`rodzaj #2 (${await page.getByTestId('changelog-kind').inputValue()}): ${(await rows()).join(' || ')}`)
    await page.getByTestId('changelog-kind').selectOption('')
    const open = page.locator('[data-testid="changelog-row"]', { hasText: 'CINEMA' }).first().getByTestId('changelog-open')
    if (await open.count()) {
      await open.click()
      await page.waitForTimeout(1200)
      log.line(`„pokaż” CINEMA: edytor ${await page.getByTestId('operation-editor').count()}, tytuł ${await page.getByTestId('operation-editor-title').innerText().catch(() => '?')}`)
      await goSync(page)
    }
    // A filter with no results: a kind with no change today.
    await page.getByTestId('changelog-period-today').click()
    const kinds = await page.getByTestId('changelog-kind').locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
    for (const k of kinds.filter(Boolean)) {
      await page.getByTestId('changelog-kind').selectOption(k)
      await page.waitForTimeout(300)
      if (await page.getByTestId('changelog-empty').count()) {
        log.line(`pusto (${k}): ${await page.getByTestId('changelog-empty').innerText()}`)
        break
      }
    }
    await expect(page.getByTestId('changelog-list').or(page.getByTestId('changelog-empty'))).toBeVisible()
    await sleep(200)
  } finally {
    await r.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})
