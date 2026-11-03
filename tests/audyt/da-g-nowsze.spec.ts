/**
 * Audit DA – entries and folders of a newer version (DA.38, DA.39, DA.23). Observation only: przebiegi\da-*\da.log.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LAB, recorded } from './lab'
import { OP, byId, Log, mainLog, answerQuestions, banners, checksums, diff, logDiff, openOp, openRok, pick, readJson, recordFiles, sleep, toasts, trapped, typeAmount, writeJson } from './da-pomoc'

const newer = (path: string, extra: Record<string, unknown> = {}) => {
  const r = readJson(path)!
  writeJson(path, { ...r, schemaVersion: 2, 'x-nowe-pole': 'z wersji 2', ...extra })
}

async function historyTry(page: Page, log: Log, label: string): Promise<void> {
  const btn = page.getByTestId('operation-editor').getByTestId('history-open')
  log.line(`${label} – przycisk Historii: ${await btn.count()}, aktywny ${await btn.isEnabled().catch(() => '-')}`)
  if (!(await btn.count())) return
  await btn.click()
  await page.waitForTimeout(800)
  log.line(`${label} – okno: ${(await page.getByTestId('history-dialog').innerText().catch(() => '(brak)')).replace(/\n+/g, ' ⏎ ').slice(0, 700)}`)
  const restore = page.getByTestId('history-restore')
  log.line(`${label} – „Przywróć tę wersję”: ${await restore.count()}, aktywny ${await restore.first().isEnabled().catch(() => '-')}`)
  if ((await restore.count()) && (await restore.first().isEnabled())) {
    await restore.first().click()
    await page.waitForTimeout(1200)
    log.line(`${label} – po kliknięciu: ${await toasts(page)}`)
  }
  await log.shot(page, `DA.23-${label}`)
  if (await page.getByTestId('history-dialog').count()) await page.keyboard.press('Escape')
}

test('DA.38 / DA.23 (wpis) – wpisy z nowszej wersji tylko do odczytu', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-38'
  const log = new Log(NAME)
  let before = new Map<string, string>()
  const paths: Record<string, string> = {}
  const { run, dataDir } = await openRok(NAME, {
    log,
    prepare: (dir) => {
      paths.op = byId(dir, OP.cinema).path
      newer(paths.op)
      paths.container = recordFiles(dir, 'containers').find((f) => f.rec.name === 'Netflix')!.path
      newer(paths.container)
      paths.goal = join(dir, 'goals', '01KAZ300000000000000000001.json')
      newer(paths.goal)
      paths.month = join(dir, 'months', '2026-11.json')
      newer(paths.month)
      before = checksums(dir)
    }
  })
  const { page } = run
  try {
    log.line(`banery: ${await banners(page)}`)
    await log.step('operacja', async () => {
      await openOp(page, 'CINEMA CITY', OP.cinema)
      log.line(`edytor: ${(await page.getByTestId('operation-editor').innerText()).split('\n').slice(0, 6).join(' | ')}`)
      log.line(`dopisek: ${await page.getByTestId('operation-editor').getByTestId('entry-newer').innerText().catch(() => '(brak)')}`)
      log.line(`pole kwoty aktywne: ${await page.getByTestId('operation-amount').isEnabled()}; usuń: ${await page.getByTestId('operation-delete').count()} aktywny ${await page.getByTestId('operation-delete').isEnabled().catch(() => '-')}`)
      await log.shot(page, 'DA.38-operacja')
      if (await page.getByTestId('operation-amount').isEnabled()) {
        log.line(`zmiana kwoty: ${await typeAmount(page, 'operation-amount', '99')}; toasty ${await toasts(page)}`)
      }
      if ((await page.getByTestId('operation-delete').count()) && (await page.getByTestId('operation-delete').isEnabled())) {
        await page.getByTestId('operation-delete').click()
        await page.getByTestId('operation-delete-confirm').click().catch(() => undefined)
        await page.waitForTimeout(1500)
        log.line(`usunięcie: toasty ${await toasts(page)}; wiersz na ekranie ${await page.locator(`[data-testid="operation-row"][data-key="${OP.cinema}"]`).count()}`)
      }
      await historyTry(page, log, 'wpis-v2')
    })
    await log.step('zmiana zbiorcza', async () => {
      await page.getByTestId('operations-search').fill('CINEMA CITY')
      await page.waitForTimeout(600)
      await page.getByTestId('operations-tick-all').check()
      await page.waitForTimeout(300)
      log.line(`pasek: ${(await page.getByTestId('operations-bulk').innerText()).replace(/\s+/g, ' ')}`)
      await page.getByTestId('operations-bulk-category').selectOption({ label: 'Rozrywka i hobby · kino i koncerty' }).catch(async () => {
        const opts = await page.getByTestId('operations-bulk-category').locator('option').allInnerTexts()
        log.line(`kategorie: ${opts.slice(0, 40).join(' | ')}`)
        await page.getByTestId('operations-bulk-category').selectOption({ index: 5 })
      })
      log.line(`przed zastosowaniem: ${(await page.getByTestId('operations-bulk').innerText()).replace(/\s+/g, ' ')}`)
      await page.getByTestId('operations-bulk-apply').click()
      await page.waitForTimeout(1500)
      log.line(`po „Ustaw”: ${await toasts(page)}`)
      await log.shot(page, 'DA.38-zbiorcza')
      log.line(`kategoria CINEMA v2 w pliku: ${readJson(paths.op!)!.categoryId}`)
      await page.getByTestId('operations-bulk-clear').click().catch(() => undefined)
    })
    await log.step('kontener', async () => {
      await page.keyboard.press('Control+5')
      await page.locator('[data-testid="cargo-row"][data-name="Netflix"]').click()
      const ed = page.getByTestId('cargo-editor')
      log.line(`dopisek: ${await ed.getByTestId('entry-newer').innerText().catch(() => '(brak)')}; kwota aktywna ${await ed.getByTestId('container-amount').isEnabled().catch(() => '-')}; usuń ${await ed.getByTestId('container-delete').count()}`)
      await log.shot(page, 'DA.38-kontener')
    })
    await log.step('cel', async () => {
      await page.keyboard.press('Control+6')
      await page.waitForTimeout(800)
      const t = await page.locator('main').innerText()
      log.line(`Mapa gwiezdna – linie przy „Nowy laptop”: ${t.split('\n').filter((l, i, a) => /Nowy laptop/.test(l) || /Nowy laptop/.test(a[i - 1] ?? '') || /nowsz/i.test(l)).join(' | ')}`)
      const goal = page.getByText('Nowy laptop').first()
      await goal.click().catch(() => undefined)
      await page.waitForTimeout(600)
      log.line(`po kliknięciu: dopisek ${await page.getByTestId('entry-newer').allInnerTexts().catch(() => [])}; aktywne pola w edytorze celu: ${await page.locator('main input:enabled').count()}`)
      await log.shot(page, 'DA.38-cel')
    })
    await log.step('plan miesiąca', async () => {
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(800)
      log.line(`dopisek: ${await page.getByTestId('page-month').getByTestId('entry-newer').innerText().catch(() => '(brak)')}; pensja aktywna ${await page.getByTestId('month-salary').isEnabled().catch(() => '-')}; koperty aktywne ${await page.locator('[data-testid="month-envelope"] input:enabled').count()}`)
      await log.shot(page, 'DA.38-plan')
    })
    log.line(`toasty: ${await toasts(page)}`)
    await answerQuestions(run, 1)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  log.line(`pytania przy zamknięciu: ${JSON.stringify((await trapped(run).catch(() => ({ dialogs: '(aplikacja zamknięta)' }))).dialogs)}`)
  logDiff(log, 'folder po zamknięciu (bez .presence i backups)', diff(before, checksums(dataDir)))
  for (const [k, p] of Object.entries(paths)) log.line(`${k}: schemaVersion ${readJson(p)?.schemaVersion}, x-nowe-pole ${readJson(p)?.['x-nowe-pole']}`)
  log.line(`main.log (zamykanie):
${mainLog(run, /zamykanie|niezapisane|nowsz|newer|tylko do odczytu|read-only/i, 15)}`)
})

test('DA.39 / DA.23 (folder) – folder nowszej wersji tylko do odczytu', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-39'
  const log = new Log(NAME)
  let before = new Map<string, string>()
  const { run, dataDir } = await openRok(NAME, {
    log,
    prepare: (dir) => {
      newer(join(dir, 'fi.json'))
      before = checksums(dir)
    }
  })
  const { page, app } = run
  const cfg0 = readJson(join(run.userData, 'config.json'))!
  try {
    log.line(`banery: ${await banners(page)}`)
    log.line(`wskaźnik zapisu: ${await page.getByTestId('save-state').innerText().catch(() => '(brak)')}`)
    await log.shot(page, 'DA.39-mostek')
    await log.step('Ctrl+N i zapis', async () => {
      await page.keyboard.press('Control+2')
      await page.keyboard.press('Control+n')
      await page.waitForTimeout(800)
      log.line(`po Ctrl+N: edytor ${await page.getByTestId('operation-editor').count()}, kwota aktywna ${await page.getByTestId('operation-amount').isEnabled().catch(() => '-')}; toasty ${await toasts(page)}`)
      if (await page.getByTestId('operation-amount').isEnabled().catch(() => false)) await typeAmount(page, 'operation-amount', '12,34')
      await page.keyboard.press('Control+s')
      await page.waitForTimeout(1000)
      log.line(`po Ctrl+S: toasty ${await toasts(page)}`)
    })
    await log.step('ustawienia budżetu', async () => {
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-general').click()
      log.line(`nazwa okrętu aktywna: ${await page.getByTestId('ship-name-input').isEnabled()}; komunikat: ${await page.getByTestId('settings-read-only').innerText().catch(() => '(brak)')}`)
    })
    await log.step('koperta', async () => {
      await page.keyboard.press('Control+4')
      log.line(`koperty aktywne: ${await page.locator('[data-testid="month-envelope"] input:enabled').count()}, pensja aktywna ${await page.getByTestId('month-salary').isEnabled().catch(() => '-')}`)
    })
    await log.step('zmiana zbiorcza', async () => {
      await page.keyboard.press('Control+2')
      await page.getByTestId('operations-search').fill('CINEMA CITY')
      await page.waitForTimeout(600)
      await page.getByTestId('operations-tick-all').check()
      log.line(`pasek: ${(await page.getByTestId('operations-bulk').innerText()).replace(/\s+/g, ' ')}; „Ustaw” aktywne ${await page.getByTestId('operations-bulk-apply').isEnabled()}`)
      await page.getByTestId('operations-bulk-clear').click().catch(() => undefined)
    })
    await log.step('historia operacji (DA.23)', async () => {
      await openOp(page, 'CINEMA CITY', OP.cinema)
      await historyTry(page, log, 'folder-v2')
    })
    await log.step('szybki wpis', async () => {
      await page.evaluate('window.fi.quickOpen()')
      await sleep(2500)
      const quick = app.windows().find((w) => w.url().includes('quick'))
      if (!quick) return log.line('okno szybkiego wpisu: brak')
      log.line(`szybki wpis: ${(await quick.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 500)}`)
      const amount = quick.getByTestId('quick-amount')
      if ((await amount.count()) && (await amount.isEnabled())) {
        await amount.click()
        await amount.fill('5')
        await quick.getByTestId('quick-save').click().catch(() => undefined)
        await sleep(1500)
        log.line(`po zapisie: ${(await quick.locator('body').innerText().catch(() => '(zamknięte)')).replace(/\n+/g, ' | ').slice(0, 400)}`)
      }
      await quick.close().catch(() => undefined)
    })
    await log.step('import CSV', async () => {
      await page.keyboard.press('Control+3')
      await expect(page.getByTestId('page-import')).toBeVisible()
      await pick(run, { paths: [join(LAB, 'pliki', 'rok-nowe-historia.csv')] })
      await page.getByTestId('import-pick').click()
      await page.waitForTimeout(3000)
      log.line(`import: ${(await page.getByTestId('page-import').innerText()).split('\n').filter((l) => /tylko do odczytu|Importuj|nowsz|format/i.test(l)).join(' | ')}; przycisk importu aktywny ${await page.getByTestId('import-run').isEnabled().catch(() => '-')}`)
      if (await page.getByTestId('import-run').isEnabled().catch(() => false)) {
        await page.getByTestId('import-run').click()
        await page.waitForTimeout(3000)
        log.line(`po „Importuj”: ${await toasts(page)}; ${(await page.getByTestId('import-done').innerText().catch(() => '(brak podsumowania)')).replace(/\s+/g, ' ').slice(0, 300)}`)
      }
      await log.shot(page, 'DA.39-import')
    })
    await log.step('ustawienie komputera (rozmiar)', async () => {
      await page.keyboard.press('Control+Equal')
      await page.waitForTimeout(1500)
      const cfg = readJson(join(run.userData, 'config.json'))!
      log.line(`zoom: przed ${cfg0.prefs?.zoom}, po ${cfg.prefs?.zoom}`)
      await page.keyboard.press('Control+Shift+Digit0')
      await page.waitForTimeout(800)
    })
    log.line(`toasty: ${await toasts(page)}`)
    await answerQuestions(run, 1)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'folder po zamknięciu (bez .presence i backups)', diff(before, checksums(dataDir)))
  log.line(`backups: ${readdirSync(join(dataDir, 'backups')).join(', ')}`)
  log.line(`main.log (zamykanie):
${mainLog(run, /zamykanie|niezapisane|nowsz|newer|tylko do odczytu|read-only/i, 15)}`)
  void recorded
})
