/**
 * Audit DA – second runs of the findings (fresh copies): DA.3 (b), DA.28 (pair 2), DA.39 (Ctrl+S, quick entry), and
 * DA.23 on an operation with versions in its history. Observation only: przebiegi\da-*\da.log.
 */
import { existsSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { start, useState } from './lab'
import { OP, byId, Log, PROD_FREEZE, answerQuestions, banners, checksums, diff, goSync, logDiff, mainLog, openOp, openRok, readJson, sleep, toasts, trap, typeAmount, writeJson } from './da-pomoc'

const OP73 = '01KAZ600000000000000000073' // Cinema City 04.09.2025 (Portfel XTB) – versions in .history

test('DA.3 (b) – potwierdzenie: brak samoczynnego ponawiania przy brakującym folderze', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-3p'
  const log = new Log(NAME)
  const { dataDir } = useState('rok', NAME)
  let run = await start(NAME, { dataDir, env: PROD_FREEZE })
  await run.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await run.app.close()
  const moved = `${dataDir}-odlaczony`
  rmSync(moved, { recursive: true, force: true })
  renameSync(dataDir, moved)
  run = await start(NAME, { usePreset: false, fresh: false, env: PROD_FREEZE })
  await trap(run, log)
  try {
    await expect(run.page.getByTestId('setup-message')).toBeVisible({ timeout: 60_000 })
    log.line(`komunikat: ${(await run.page.getByTestId('setup-message').innerText()).replace(/\s+/g, ' ')}`)
    await sleep(15_000)
    renameSync(moved, dataDir)
    const t0 = Date.now()
    log.line('nazwa przywrócona po 15 s')
    let opened = false
    for (let i = 0; i < 80 && !opened; i++) {
      await sleep(1000)
      opened = (await run.page.getByTestId('page-bridge').count()) > 0
    }
    log.line(`Mostek bez klikania: ${opened} (czekano ${Math.round((Date.now() - t0) / 1000)} s)`)
    log.line(`main.log „open start”: ${mainLog(run, /open start/, 10).split('\n').length} wpis(y)\n${mainLog(run, /open/, 10)}`)
    await log.shot(run.page, 'DA.3b-potwierdzenie')
  } finally {
    if (!existsSync(dataDir) && existsSync(moved)) renameSync(moved, dataDir)
    await run.app.close().catch(() => undefined)
  }
})

test('DA.28 (para 2) – potwierdzenie: kopia zmieniona w trakcie „Scal…”', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-28p'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  try {
    const b = byId(dataDir, OP.rossmann)
    await openOp(page, 'Rossmann', OP.rossmann)
    await typeAmount(page, 'operation-amount', '61')
    await page.waitForTimeout(1500)
    const cp = b.path.replace(/\.json$/, '-LAPTOP.json')
    writeJson(cp, { ...b.rec, amount: -6200, updatedAt: new Date(Date.now() + 30_000).toISOString(), updatedBy: 'LAPTOP' })
    await page.keyboard.press('Escape')
    await page.evaluate(() => (globalThis as unknown as { fi: { rescan(): Promise<void> } }).fi.rescan())
    await goSync(page)
    const card = page.locator('[data-testid^="conflict:"]', { hasText: OP.rossmann })
    await card.getByTestId('conflict-merge-open').click()
    await page.waitForTimeout(800)
    const merge = card.getByTestId('conflict-merge')
    log.line(`okno „Scal” przed zmianą: ${(await merge.innerText()).replace(/\n+/g, ' ⏎ ')}`)
    writeJson(cp, { ...readJson(cp)!, amount: -6300, note: 'zmiana w trakcie', updatedAt: new Date(Date.now() + 60_000).toISOString() })
    await sleep(4000)
    log.line(`okno „Scal” 4 s po zmianie kopii: ${(await merge.innerText().catch(() => '(zamknięte)')).replace(/\n+/g, ' ⏎ ')}`)
    log.line(`karta: ${(await card.innerText().catch(() => '(brak)')).replace(/\n+/g, ' ⏎ ').slice(0, 700)}`)
    await log.shot(page, 'DA.28p-po-zmianie')
    await merge.getByTestId('conflict-merge-save').click().catch((e) => log.line(`klik: ${(e as Error).message.split('\n')[0]}`))
    await page.waitForTimeout(2500)
    log.line(`zapis: ${await toasts(page)}`)
    const r = readJson(b.path)!
    log.line(`wynik: amount ${r.amount}, note „${r.note}”; kopia: ${existsSync(cp)}`)
    log.line(`historia: ${JSON.stringify(readdirSync(join(dataDir, '.history', 'transactions', OP.rossmann)).map((f: string) => `${f}:${readJson(join(dataDir, '.history', 'transactions', OP.rossmann, f))!.record?.amount}`))}`)
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch(() => undefined)
  }
})

test('DA.39 / DA.23 – potwierdzenie: folder nowszej wersji (Ctrl+S, Ctrl+N, szybki wpis, historia)', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-39p'
  const log = new Log(NAME)
  let before = new Map<string, string>()
  const { run, dataDir } = await openRok(NAME, {
    log,
    prepare: (dir) => {
      const fi = readJson(join(dir, 'fi.json'))!
      writeJson(join(dir, 'fi.json'), { ...fi, schemaVersion: 2 })
      before = checksums(dir)
    }
  })
  const { page, app } = run
  try {
    log.line(`banery: ${await banners(page)}`)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(800)
    await page.keyboard.press('Control+n')
    await page.waitForTimeout(1200)
    log.line(`Ctrl+N: edytor ${await page.getByTestId('operation-editor').count()}; toasty „${await toasts(page)}”`)
    await page.getByRole('button', { name: 'Nowa operacja' }).first().click().catch((e) => log.line(`„Nowa operacja”: ${(e as Error).message.split('\n')[0]}`))
    await page.waitForTimeout(800)
    log.line(`przycisk „Nowa operacja”: edytor ${await page.getByTestId('operation-editor').count()}; toasty „${await toasts(page)}”`)
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(800)
    log.line(`Ctrl+S: toasty „${await toasts(page)}”`)
    await log.shot(page, 'DA.39p-ctrl-s')
    await page.evaluate('window.fi.quickOpen()')
    await sleep(2500)
    const quick = app.windows().find((w) => w.url().includes('quick'))
    if (quick) {
      log.line(`szybki wpis – komunikat: ${await quick.getByTestId('quick-message').innerText().catch(() => '(brak)')}; zapisz aktywny ${await quick.getByTestId('quick-save').isEnabled().catch(() => '-')}`)
      const a = quick.getByTestId('quick-amount')
      await a.click()
      await a.fill('5')
      await quick.getByTestId('quick-save').click().catch((e) => log.line(`zapisz: ${(e as Error).message.split('\n')[0]}`))
      await sleep(1500)
      log.line(`szybki wpis po „Zapisz”: komunikat ${await quick.getByTestId('quick-message').innerText().catch(() => '(brak)')}; okno otwarte ${!quick.isClosed()}; toasty w oknie ${(await quick.getByRole('status').allInnerTexts().catch(() => [])).join(' | ')}`)
      await quick.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\DA.39p-szybki.png' }).catch(() => undefined)
      await quick.close().catch(() => undefined)
    } else log.line('szybki wpis: brak okna')
    log.line(`toasty okna głównego: ${await toasts(page)}`)
    await openOp(page, 'Cinema City', OP73)
    const btn = page.getByTestId('operation-editor').getByTestId('history-open')
    await btn.click()
    await page.waitForTimeout(800)
    log.line(`DA.23 (folder v2) – historia: ${(await page.getByTestId('history-dialog').innerText()).replace(/\n+/g, ' ⏎ ').slice(0, 600)}`)
    const restore = page.getByTestId('history-restore')
    log.line(`DA.23 – „Przywróć”: ${await restore.count()}, aktywny ${await restore.first().isEnabled().catch(() => '-')}, title „${await restore.first().getAttribute('title').catch(() => '')}”`)
    await restore.first().click({ timeout: 2000 }).catch(() => log.line('DA.23 – kliknięcie niemożliwe (wyłączony)'))
    await page.waitForTimeout(800)
    log.line(`DA.23 – toasty: ${await toasts(page)}`)
    await log.shot(page, 'DA.23-folder-v2-historia')
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch(() => undefined)
  }
  logDiff(log, 'folder po (bez .presence i backups)', diff(before, checksums(dataDir)))
})

test('DA.23 – historia wpisu nowszej wersji (operacja z wersjami w historii)', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-23'
  const log = new Log(NAME)
  let before = new Map<string, string>()
  const { run, dataDir } = await openRok(NAME, {
    log,
    prepare: (dir) => {
      const p = byId(dir, OP73).path
      writeJson(p, { ...readJson(p)!, schemaVersion: 2, 'x-nowe': 1 })
      before = checksums(dir)
    }
  })
  const { page } = run
  try {
    await openOp(page, 'Cinema City', OP73)
    log.line(`dopisek: ${await page.getByTestId('entry-newer').innerText().catch(() => '(brak)')}; pola aktywne ${await page.getByTestId('operation-amount').isEnabled()}`)
    const btn = page.getByTestId('operation-editor').getByTestId('history-open')
    log.line(`Historia: ${await btn.count()}, aktywna ${await btn.isEnabled().catch(() => '-')}`)
    await btn.click()
    await page.waitForTimeout(800)
    log.line(`okno: ${(await page.getByTestId('history-dialog').innerText()).replace(/\n+/g, ' ⏎ ').slice(0, 600)}`)
    const restore = page.getByTestId('history-restore')
    log.line(`„Przywróć”: ${await restore.count()}, aktywny ${await restore.first().isEnabled().catch(() => '-')}, title „${await restore.first().getAttribute('title').catch(() => '')}”`)
    await restore.first().click({ timeout: 2000 }).catch(() => log.line('kliknięcie niemożliwe (wyłączony)'))
    await page.waitForTimeout(1000)
    log.line(`toasty: ${await toasts(page)}`)
    await log.shot(page, 'DA.23-wpis-v2-historia')
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch(() => undefined)
  }
  logDiff(log, 'folder po (bez .presence i backups)', diff(before, checksums(dataDir)))
})
