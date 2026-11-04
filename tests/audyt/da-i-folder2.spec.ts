/**
 * Audit DA – the folder changed from Settings, a broken fi.json, drafts, the files' format (DA.7, DA.8, DA.45, DA.46).
 * Observation only: C:\FI-audyt\przebiegi\da-*\da.log.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { start, useState } from './lab'
import {
  OP,
  byId,
  Log,
  PROD_FREEZE,
  answerQuestions,
  banners,
  closeEditor,
  formatCheck,
  goFolderTab,
  goSync,
  openOp,
  openRok,
  pick,
  readJson,
  recordFiles,
  reopen,
  sleep,
  tempFiles,
  toasts,
  trap,
  writeJson
} from './da-pomoc'

test('DA.7 – zmiana folderu z Ustawień i powrót', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-7'
  const log = new Log(NAME)
  const startDir = useState('start', `${NAME}-start`).dataDir
  const startOps0 = recordFiles(startDir, 'transactions').length
  const { run, dataDir } = await openRok(NAME, { log, env: { FI_OPEN_DELAY_MS: '250', FI_OPEN_SLOW_MS: '5000' } })
  const { page, app } = run
  try {
    await openOp(page, 'Lody Grycan', OP.grycan)
    await page.getByTestId('operation-amount').click()
    await page.getByTestId('operation-amount').fill('55,55')
    // At once: Settings → Folder i kopie → „Otwórz inny folder…” → start.
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await pick(run, { paths: [startDir] })
    log.line(`plik Grycan przed przełączeniem: ${byId(dataDir, OP.grycan).rec.amount}`)
    await page.getByRole('button', { name: 'Otwórz inny folder…' }).click()
    await page.waitForTimeout(700)
    log.line(`plik Grycan zaraz po kliknięciu: ${byId(dataDir, OP.grycan).rec.amount}`)
    const panel = await page.getByTestId('open-progress').innerText().catch(() => '(brak panelu)')
    log.line(`w trakcie – panel: ${panel.replace(/\s+/g, ' ')}`)
    log.line(`w trakcie – przyciski folderu: ${JSON.stringify(await page.locator('main button').evaluateAll((bs) => bs.filter((b) => /folder|Otwórz/.test(b.textContent ?? '')).map((b) => `${b.textContent?.trim()}:${(b as HTMLButtonElement).disabled ? 'wył.' : 'akt.'}`)))}`)
    await log.shot(page, 'DA.7-w-trakcie')
    // A second click and a quick entry meanwhile.
    await page.getByRole('button', { name: 'Otwórz inny folder…' }).click({ timeout: 1500 }).then(() => log.line('drugie kliknięcie: przyjęte'), () => log.line('drugie kliknięcie: przycisk wyłączony'))
    await page.evaluate('window.fi.quickOpen()').catch((e) => log.line(`quickOpen: ${(e as Error).message.split('\n')[0]}`))
    await sleep(1500)
    const quick = app.windows().find((w) => w.url().includes('quick'))
    log.line(`szybki wpis w trakcie: ${quick ? (await quick.locator('body').innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 400) : '(brak okna)'}; toasty ${await toasts(page)}`)
    if (quick) await quick.close().catch(() => undefined)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(500)
    log.line(`Operacje w trakcie: ${(await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}; Ctrl+N edytor: ${await (async () => {
      await page.keyboard.press('Control+n')
      await page.waitForTimeout(500)
      return `${await page.getByTestId('operation-editor').count()} kwota aktywna ${await page.getByTestId('operation-amount').isEnabled().catch(() => '-')}`
    })()}`)
    await goFolderTab(page)
    await expect(page.getByTestId('settings-data-dir')).toContainText('da-7-start', { timeout: 120_000 })
    await page.waitForTimeout(2000)
    log.line(`po przełączeniu: ${await page.getByTestId('settings-data-dir').innerText()}; toasty ${await toasts(page)}`)
    log.line(`plik Grycan w rok: ${byId(dataDir, OP.grycan).rec.amount}; w start operacji ${recordFiles(startDir, 'transactions').length} (było ${startOps0}), z Grycan: ${recordFiles(startDir, 'transactions').filter((f) => f.rec.id === OP.grycan).length}`)
    const recent = page.locator('[data-testid="recent-folder-open"]')
    for (let i = 0; i < (await recent.count()); i++) {
      const row = (await recent.nth(i).locator('..').innerText()).trim()
      if (row.endsWith(`${NAME}\\dane\nOtwórz`) || row.includes(`${NAME}\\dane`)) {
        await recent.nth(i).click()
        break
      }
    }
    await expect(page.getByTestId('settings-data-dir')).toHaveText(dataDir, { timeout: 120_000 })
    await page.waitForTimeout(2000)
    log.line(`powrót: ${await page.getByTestId('settings-data-dir').innerText()}; toasty ${await toasts(page)}`)
    await openOp(page, 'Lody Grycan', OP.grycan)
    log.line(`Grycan na ekranie po powrocie: ${await page.getByTestId('operation-amount').inputValue()}`)
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.8 – uszkodzony fi.json i „Weź ustawienia z historii”', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-8'
  const log = new Log(NAME)
  const { dataDir } = useState('rok', NAME)
  const fiPath = join(dataDir, 'fi.json')
  const original = readJson(fiPath)!
  const hdir = join(dataDir, '.history', 'fi', original.id)
  // More versions in the history: older ones and a newest unreadable one.
  const rec = (shipName: string, updatedAt: string) => ({ ...original, updatedAt, settings: { ...original.settings, shipName } })
  writeJson(join(hdir, '20261001T080000Z_edit_aa01.json'), { savedAt: '2026-10-01T08:00:00.000Z', savedBy: 'LAPTOP-KAPITANA', reason: 'edit', record: rec('Okręt z października', '2026-09-30T08:00:00.000Z') })
  writeJson(join(hdir, '20261102T080000Z_edit_aa02.json'), { savedAt: '2026-11-02T08:00:00.000Z', savedBy: 'LAPTOP-KAPITANA', reason: 'edit', record: rec('Flagowiec (wersja z 02.11)', '2026-11-01T08:00:00.000Z') })
  writeFileSync(join(hdir, '20261103T100000Z_edit_aa03.json'), '{ "savedAt": "2026-11-03T10:00:00.000Z", "record": { "sett')
  log.line(`historia fi: ${readdirSync(hdir).join(', ')}`)
  const text = readFileSync(fiPath, 'utf8')
  writeFileSync(fiPath, text.slice(0, Math.floor(text.length / 2)))
  const run = await start(NAME, { dataDir, env: PROD_FREEZE })
  await trap(run, log)
  const { page } = run
  try {
    await expect(page.getByTestId('setup-message').or(page.getByTestId('page-bridge'))).toBeVisible({ timeout: 120_000 })
    await page.waitForTimeout(1000)
    await log.screen(page, 'ekran', '[data-testid="folder-setup"]')
    await log.shot(page, 'DA.8-ekran')
    await page.getByTestId('repair-settings').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 120_000 })
    await page.waitForTimeout(2000)
    log.line(`menu: ${await page.getByTestId('menu-ship-name').innerText()}; banery ${await banners(page)}; toasty ${await toasts(page)}`)
    const now = readJson(fiPath)!
    log.line(`fi.json po: shipName ${now.settings.shipName}, kont ${now.settings.accounts.length}, kategorii ${now.settings.categories.length}, reguł importu ${JSON.stringify(now.settings.import).length} zn.`)
    const lost = Object.keys(original.settings).filter((k) => JSON.stringify(original.settings[k]) !== JSON.stringify(now.settings[k]))
    log.line(`ustawienia różne od fi.json sprzed uszkodzenia: ${lost.join(', ') || 'brak'}`)
    log.line(`pliki fi*: ${readdirSync(dataDir).filter((n) => n.startsWith('fi')).join(', ')}`)
    log.line(`historia fi po: ${readdirSync(hdir).join(', ')}`)
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    log.line(`Konta: ${(await page.getByTestId('account-row').allInnerTexts()).map((t) => t.split('\n')[0]).join(' | ')}`)
    await goSync(page)
    log.line(`Synchronizacja: ${(await page.locator('main').innerText()).split('\n').filter((l) => /fi-|uszkodz|fi\.json|Ustawienia/i.test(l)).join(' | ')}`)
    await log.shot(page, 'DA.8-synchronizacja')
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

async function draftsState(page: Page, log: Log, label: string): Promise<void> {
  await page.keyboard.press('Control+5')
  await page.waitForTimeout(500)
  const cargo = page.getByTestId('cargo-new')
  const cargoText = (await cargo.locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value)).catch(() => [] as string[])).join('|')
  await page.keyboard.press('Control+6')
  await page.waitForTimeout(500)
  const goal = await page.getByTestId('starmap-new-name').inputValue().catch(() => '?')
  await page.keyboard.press('Control+7')
  await page.waitForTimeout(500)
  const loan = await page.getByTestId('loan-name').inputValue().catch(() => '?')
  const loanDate = (await page.getByTestId('radar-new-loan').locator('input[type="date"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value)).catch(() => [] as string[])).join('|')
  log.line(`${label}: kontener [${cargoText}], cel „${goal}”, pożyczka „${loan}” (daty ${loanDate})`)
}

test('DA.45 – szkic nowego wpisu i opuszczenie ekranu', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-45'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  const startDir = useState('start', `${NAME}-start`).dataDir
  const count = () => recordFiles(dataDir, 'transactions').length
  try {
    const n0 = count()
    await log.step('(a) Ctrl+N bez wpisywania, Ctrl+1', async () => {
      await page.keyboard.press('Control+2')
      await page.keyboard.press('Control+n')
      await page.waitForTimeout(800)
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(1500)
      log.line(`operacji: ${n0} → ${count()}`)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      log.line(`wiersze 0 zł na górze listy: ${(await page.getByTestId('operation-row').allInnerTexts()).slice(0, 3).map((t) => t.replace(/\s+/g, ' ')).join(' || ')}`)
    })
    await log.step('(b) Ctrl+N, kwota bez wyjścia z pola, Ctrl+4', async () => {
      const n1 = count()
      await page.keyboard.press('Control+n')
      await page.getByTestId('operation-amount').click()
      await page.getByTestId('operation-amount').fill('17,17')
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(2000)
      const added = recordFiles(dataDir, 'transactions').filter((f) => f.rec.amount === -1717)
      log.line(`operacji: ${n1} → ${count()}; z kwotą 17,17: ${added.map((f) => `${f.rel} ${f.rec.date}`).join(', ') || 'brak'}`)
    })
    await log.step('(c) formularze: tekst, inny ekran, powrót', async () => {
      await page.keyboard.press('Control+5')
      await page.waitForTimeout(600)
      const add = page.getByTestId('cargo-add')
      if (await add.count()) await add.click().catch(() => undefined)
      await page.waitForTimeout(400)
      const cargoInputs = page.getByTestId('cargo-new').locator('input')
      log.line(`kontener – pól: ${await cargoInputs.count()}`)
      if (await cargoInputs.count()) await cargoInputs.first().fill('Szkic kontenera')
      await page.keyboard.press('Control+6')
      await page.waitForTimeout(600)
      log.line(`cel – pusty formularz: nazwa „${await page.getByTestId('starmap-new-name').inputValue().catch(() => '?')}”`)
      await page.getByTestId('starmap-new-name').fill('Szkic celu')
      await page.keyboard.press('Control+7')
      await page.waitForTimeout(600)
      const loanDate = (await page.getByTestId('radar-new-loan').locator('input[type="date"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value)).catch(() => [] as string[])).join('|')
      log.line(`pożyczka – pusty formularz: daty ${loanDate}`)
      await page.getByTestId('loan-name').fill('Szkic pożyczki')
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(600)
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(800)
      const loot = page.getByTestId('loot-next')
      log.line(`łupy – pole „Na następny miesiąc”: ${await loot.count()}; ${(await page.getByTestId('loot').innerText().catch(() => '(brak panelu łupów)')).replace(/\s+/g, ' ').slice(0, 300)}`)
      const edit = page.getByTestId('debriefing-edit-loot')
      if ((await edit.count()) && !(await loot.count())) await edit.click()
      if (await loot.count()) {
        await loot.click()
        await loot.fill('100')
        await loot.press('Tab')
      }
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(600)
      await draftsState(page, log, 'po zmianie ekranu')
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(600)
      await page.getByTestId('month-prev').click()
      await page.waitForTimeout(800)
      log.line(`łupy po powrocie: ${await page.getByTestId('loot-next').inputValue().catch(() => '(brak pola)')}`)
      await log.shot(page, 'DA.45-lupy')
    })
    await log.step('(d) zmiana folderu i powrót', async () => {
      await goFolderTab(page)
      await pick(run, { paths: [startDir] })
      await page.getByRole('button', { name: 'Otwórz inny folder…' }).click()
      await expect(page.getByTestId('settings-data-dir')).toContainText('da-45-start', { timeout: 120_000 })
      await page.waitForTimeout(1500)
      await draftsState(page, log, 'w folderze start')
      await goFolderTab(page)
      const recent = page.locator('[data-testid="recent-folder-open"]')
      for (let i = 0; i < (await recent.count()); i++) if ((await recent.nth(i).locator('..').innerText()).includes(`${NAME}\\dane`)) await recent.nth(i).click()
      await expect(page.getByTestId('settings-data-dir')).toHaveText(dataDir, { timeout: 120_000 })
      await page.waitForTimeout(1500)
      await draftsState(page, log, 'po powrocie do rok')
      await page.getByTestId('starmap-new-name').fill('Szkic celu 2').catch(() => undefined)
    })
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  const r2 = await reopen(NAME, dataDir, { log })
  try {
    await draftsState(r2.page, log, 'po ponownym uruchomieniu')
  } finally {
    await r2.app.close().catch(() => undefined)
  }
})

test('DA.46 – format plików i nieznane pola', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-46'
  const log = new Log(NAME)
  const paths: Record<string, string> = {}
  const { run, dataDir } = await openRok(NAME, {
    log,
    machine: 'DOM-PC',
    prepare: (dir) => {
      paths.op = byId(dir, OP.grycan).path
      writeJson(paths.op, { ...readJson(paths.op)!, 'x-audyt': { zostaje: true } })
      paths.container = recordFiles(dir, 'containers').find((f) => f.rec.name === 'Netflix')!.path
      writeJson(paths.container, { ...readJson(paths.container)!, 'x-audyt': 'kontener' })
      paths.fi = join(dir, 'fi.json')
      const fi = readJson(paths.fi)!
      writeJson(paths.fi, { ...fi, 'x-audyt': 'fi', settings: { ...fi.settings, 'x-audyt-ustawienia': 1 } })
    }
  })
  const { page } = run
  try {
    await openOp(page, 'Lody Grycan', OP.grycan)
    await page.getByTestId('operation-amount').click()
    await page.getByTestId('operation-amount').fill('12,345')
    await page.getByTestId('operation-amount').press('Enter')
    await page.waitForTimeout(1000)
    log.line(`kwota w polu po „12,345”: ${await page.getByTestId('operation-amount').inputValue()}`)
    await page.getByTestId('operation-note').click()
    await page.getByTestId('operation-note').fill('notatka DA.46')
    await page.getByTestId('operation-counterparty').click()
    await page.waitForTimeout(800)
    await closeEditor(page)
    await page.keyboard.press('Control+5')
    await page.locator('[data-testid="cargo-row"][data-name="Netflix"]').click()
    const ed = page.getByTestId('cargo-editor')
    await ed.getByTestId('container-amount').click()
    await ed.getByTestId('container-amount').fill('49,99')
    await ed.getByTestId('container-amount').press('Enter')
    await page.waitForTimeout(800)
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-general').click()
    await page.getByTestId('ship-name-input').fill('Flagowiec DA.46')
    await page.getByTestId('ship-name-input').press('Enter')
    await page.waitForTimeout(1000)
    // A new operation (its file name: Warsaw date and ULID).
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').click()
    await page.getByTestId('operation-amount').fill('8,8')
    await page.getByTestId('operation-amount').press('Enter')
    await page.getByTestId('operation-counterparty').fill('Nowa DA.46')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.waitForTimeout(1500)
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  for (const [k, p] of Object.entries(paths)) {
    const t = readFileSync(p, 'utf8')
    const r = JSON.parse(t)
    log.line(`${k}: wcięcie 2 + \\n ${t === `${JSON.stringify(r, null, 2)}\n`}; updatedAt ${r.updatedAt}; updatedBy ${r.updatedBy}; x-audyt ${JSON.stringify(r['x-audyt'])}${k === 'fi' ? `; settings.x-audyt-ustawienia ${r.settings['x-audyt-ustawienia']}, shipName ${r.settings.shipName}` : `; amount ${r.amount}`}${k === 'op' ? `; note „${r.note}”` : ''}`)
  }
  const n = recordFiles(dataDir, 'transactions').filter((f) => f.rec.counterparty === 'Nowa DA.46')
  log.line(`nowa operacja: ${n.map((f) => `${f.rel} amount ${f.rec.amount} date ${f.rec.date} createdAt ${f.rec.createdAt} updatedBy ${f.rec.updatedBy}`).join(' | ')}`)
  const f = formatCheck(dataDir)
  log.line(`format: plików ${f.files}, złych ${f.bad.length} ${f.bad.slice(0, 5).join(', ')}`)
  const frac = recordFiles(dataDir, 'transactions').filter((x) => !Number.isInteger(x.rec.amount))
  log.line(`kwoty niecałkowite: ${frac.length}`)
  log.line(`pliki tymczasowe: ${tempFiles(dataDir).join(', ') || 'brak'}`)
  log.line(`historia: ${existsSync(join(dataDir, '.history')) ? readdirSync(join(dataDir, '.history')).join(', ') : '-'}`)
})
