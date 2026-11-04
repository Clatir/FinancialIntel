/**
 * Audit DA – the folder gone while working, an entry's file deleted from outside, closing right after a change
 * (DA.40–DA.43). Observation only: C:\FI-audyt\przebiegi\da-*\da.log.
 */
import { existsSync, readdirSync, renameSync, rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { importDone } from '../e2e/app'
import { cardL, listaText } from './im-pomoc'
import { LAB, type Run } from './lab'
import { cp1250 } from './persona'
import { OP, byId, Log, answerQuestions, banners, closeEditor, mainLog, openOp, openRok, pick, readJson, recordFiles, reopen, sleep, tempFiles, toasts, trapped } from './da-pomoc'

const runDir = (n: string) => join(LAB, 'przebiegi', n)

/** The tray's „Zakończ” (app.quit) without waiting for the process; the question of the main process is recorded. */
async function quitNow(run: Run): Promise<void> {
  await run.app.evaluate(({ app }) => void setTimeout(() => app.quit(), 10))
}

const alive = async (run: Run) => run.app.evaluate(() => true).catch(() => false)

test('DA.40 – folder znika w trakcie pracy i wraca', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-40'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page, app } = run
  const off = `${dataDir}-odlaczony`
  rmSync(off, { recursive: true, force: true })
  const logLines0 = mainLog(run, undefined, 100000).split('\n').length
  try {
    const t0 = Date.now()
    renameSync(dataDir, off)
    log.line(`folder przemianowany (${new Date().toISOString()})`)
    let shown = ''
    for (let i = 0; i < 60 && !shown; i++) {
      await sleep(1000)
      const b = await banners(page)
      if (/niedostępny|tylko do odczytu|odłączony/i.test(b)) shown = `${Math.round((Date.now() - t0) / 1000)} s: ${b}`
    }
    log.line(`baner: ${shown || '(brak w 60 s)'}`)
    log.line(`wskaźnik: ${await page.getByTestId('save-state').innerText().catch(() => '(brak)')}`)
    await log.shot(page, 'DA.40-baner')
    await sleep(Math.max(0, 60_000 - (Date.now() - t0)))
    await log.step('edycja po minucie', async () => {
      await openOp(page, 'Lody Grycan', OP.grycan)
      log.line(`pole kwoty aktywne: ${await page.getByTestId('operation-amount').isEnabled()}`)
      if (await page.getByTestId('operation-amount').isEnabled()) {
        await page.getByTestId('operation-amount').click()
        await page.getByTestId('operation-amount').fill('31,31')
        await page.getByTestId('operation-amount').press('Enter')
        await page.waitForTimeout(2000)
      }
      log.line(`toasty: ${await toasts(page)}; wskaźnik ${await page.getByTestId('save-state').innerText().catch(() => '(brak)')}`)
      await page.keyboard.press('Control+n')
      await page.waitForTimeout(1000)
      log.line(`Ctrl+N: edytor nowej ${await page.getByTestId('operation-editor-title').innerText().catch(() => '(brak)')}; kwota aktywna ${await page.getByTestId('operation-amount').isEnabled().catch(() => '-')}; toasty ${await toasts(page)}`)
      await closeEditor(page)
      await page.evaluate('window.fi.quickOpen()')
      await sleep(2500)
      const quick = app.windows().find((w) => w.url().includes('quick'))
      log.line(`szybki wpis: ${quick ? (await quick.locator('body').innerText()).replace(/\n+/g, ' | ').slice(0, 400) : '(brak okna)'}`)
      if (quick) {
        const a = quick.getByTestId('quick-amount')
        if ((await a.count()) && (await a.isEnabled())) {
          await a.click()
          await a.fill('7')
          await quick.getByTestId('quick-save').click().catch(() => undefined)
          await sleep(1500)
          log.line(`szybki wpis po zapisie: ${(await quick.locator('body').innerText().catch(() => '(zamknięte)')).replace(/\n+/g, ' | ').slice(0, 300)}`)
        }
        await quick.close().catch(() => undefined)
      }
      await log.shot(page, 'DA.40-proby')
    })
    log.line(`stara ścieżka istnieje: ${existsSync(dataDir)}${existsSync(dataDir) ? ` – zawartość: ${readdirSync(dataDir).join(', ')}` : ''}`)
    renameSync(off, dataDir)
    const tBack = Date.now()
    log.line(`nazwa przywrócona po ${Math.round((tBack - t0) / 1000)} s`)
    let gone = ''
    for (let i = 0; i < 32 && !gone; i++) {
      await sleep(10_000)
      const b = await banners(page)
      if (!/niedostępny|odłączony/i.test(b)) gone = `${Math.round((Date.now() - tBack) / 1000)} s (banery: ${b || 'brak'})`
    }
    log.line(`baner znika: ${gone || '(nie w 5 min)'}`)
    await log.step('zapis po powrocie', async () => {
      await openOp(page, 'Lody Grycan', OP.grycan)
      await page.getByTestId('operation-amount').click()
      await page.getByTestId('operation-amount').fill('32,32')
      await page.getByTestId('operation-amount').press('Enter')
      await page.waitForTimeout(2500)
      log.line(`plik Grycan: ${byId(dataDir, OP.grycan).rec.amount}; toasty ${await toasts(page)}; wskaźnik ${await page.getByTestId('save-state').innerText().catch(() => '(brak)')}`)
      log.line(`operacji w folderze: ${recordFiles(dataDir, 'transactions').length}; nowe z szybkiego wpisu / Ctrl+N: ${recordFiles(dataDir, 'transactions').filter((f) => f.rec.createdAt > new Date(t0).toISOString()).map((f) => `${f.rel} ${f.rec.amount}`).join(', ') || 'brak'}`)
    })
    const lines = mainLog(run, undefined, 100000).split('\n').slice(logLines0)
    log.line(`main.log w czasie przerwy: ${lines.length} linii; ze stosem: ${lines.filter((l) => /^\s+at /.test(l)).length}`)
    log.line(lines.slice(0, 40).join('\n'))
  } finally {
    if (!existsSync(dataDir) && existsSync(off)) renameSync(off, dataDir)
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.41 – zmiana tuż przed zniknięciem folderu', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-41'
  const log = new Log(NAME)
  // Run 1: closed while the folder is gone.
  {
    const { run, dataDir } = await openRok(NAME, { log })
    const { page } = run
    const off = `${dataDir}-odlaczony`
    rmSync(off, { recursive: true, force: true })
    const path = byId(dataDir, OP.grycan).rel
    try {
      await openOp(page, 'Lody Grycan', OP.grycan)
      await page.getByTestId('operation-amount').click()
      await page.getByTestId('operation-amount').fill('33,33')
      renameSync(dataDir, off)
      await page.getByTestId('operation-amount').press('Enter')
      await page.waitForTimeout(3000)
      log.line(`przebieg 1 – po wyjściu z pola: toasty ${await toasts(page)}; banery ${await banners(page)}`)
      await answerQuestions(run, 0)
      await quitNow(run)
      await sleep(8000)
      log.line(`po „Zakończ” → „Anuluj”: aplikacja działa ${await alive(run)}; pytania ${JSON.stringify((await trapped(run)).dialogs)}`)
      await log.shot(page, 'DA.41-anuluj')
      renameSync(off, dataDir)
      let saved = false
      const t0 = Date.now()
      for (let i = 0; i < 40 && !saved; i++) {
        await sleep(3000)
        saved = byId(dataDir, OP.grycan).rec.amount === -3333
      }
      log.line(`po przywróceniu folderu: zapis ${saved} po ${Math.round((Date.now() - t0) / 1000)} s; plik ${readJson(join(dataDir, path))?.amount}; toasty ${await toasts(page)}`)
      await answerQuestions(run, 1)
      const n = (await trapped(run)).dialogs.length
      await quitNow(run)
      await sleep(6000)
      log.line(`drugie „Zakończ”: aplikacja działa ${await alive(run)}`)
      if (await alive(run)) log.line(`pytania: ${JSON.stringify((await trapped(run)).dialogs.slice(n))}`)
    } finally {
      if (!existsSync(dataDir) && existsSync(off)) renameSync(off, dataDir)
      await run.app.close().catch(() => undefined)
    }
    log.line(`main.log (zamykanie):\n${mainLog(run, /zamykanie|niezapisane|zapis|write|EPERM|ENOENT/i, 20)}`)
    log.line(`plik po przebiegu 1: ${readJson(join(dataDir, path))?.amount}; pliki tymczasowe ${tempFiles(dataDir).join(', ') || 'brak'}`)
  }
  // Run 2: the folder back before closing.
  {
    const NAME2 = 'da-41b'
    const { run, dataDir } = await openRok(NAME2, { log })
    const { page } = run
    const off = `${dataDir}-odlaczony`
    rmSync(off, { recursive: true, force: true })
    try {
      await openOp(page, 'Lody Grycan', OP.grycan)
      await page.getByTestId('operation-amount').click()
      await page.getByTestId('operation-amount').fill('44,44')
      renameSync(dataDir, off)
      await page.getByTestId('operation-amount').press('Enter')
      await page.waitForTimeout(3000)
      log.line(`przebieg 2 – po wyjściu z pola: toasty ${await toasts(page)}; banery ${await banners(page)}`)
      renameSync(off, dataDir)
      let saved = false
      const t0 = Date.now()
      for (let i = 0; i < 40 && !saved; i++) {
        await sleep(3000)
        saved = byId(dataDir, OP.grycan).rec.amount === -4444
      }
      log.line(`przebieg 2 – zapis po powrocie: ${saved} po ${Math.round((Date.now() - t0) / 1000)} s; toasty ${await toasts(page)}; banery ${await banners(page)}`)
      await answerQuestions(run, 1)
      await quitNow(run)
      await sleep(6000)
      log.line(`przebieg 2 – po „Zakończ”: aplikacja działa ${await alive(run)}`)
      if (await alive(run)) log.line(`pytania: ${JSON.stringify((await trapped(run)).dialogs)}`)
    } finally {
      if (!existsSync(dataDir) && existsSync(off)) renameSync(off, dataDir)
      await run.app.close().catch(() => undefined)
    }
    log.line(`przebieg 2 – main.log:\n${mainLog(run, /zamykanie|niezapisane/i, 10)}`)
    log.line(`przebieg 2 – plik: ${byId(dataDir, OP.grycan).rec.amount}`)
  }
})

test('DA.42 – plik wpisu usunięty z zewnątrz w trakcie edycji', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-42'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  try {
    for (const [label, id, query, choice] of [
      ['zachowaj', OP.grycan, 'Lody Grycan', 'Zachowaj (przywróć plik)'],
      ['usuń', OP.mokka, 'Mokka', 'Usuń też tutaj']
    ] as const) {
      await log.step(label, async () => {
        const op = byId(dataDir, id)
        await openOp(page, query, id)
        unlinkSync(op.path)
        await page.getByTestId('operation-note').click()
        await page.getByTestId('operation-note').fill(`notatka po usunięciu (${label})`)
        await page.getByTestId('operation-counterparty').click()
        await page.waitForTimeout(1500)
        const dialog = page.getByTestId('remote-dialog')
        await dialog.waitFor({ timeout: 30_000 }).catch(() => undefined)
        log.line(`okno: ${(await dialog.innerText().catch(() => '(brak okna)')).replace(/\n+/g, ' ⏎ ').slice(0, 900)}`)
        log.line(`toasty: ${await toasts(page)}; plik istnieje ${existsSync(op.path)}`)
        await log.shot(page, `DA.42-${label}`)
        if (await dialog.count()) {
          await dialog.getByRole('radio', { name: choice }).click()
          await dialog.getByTestId('remote-apply').click()
          await page.waitForTimeout(2500)
        }
        log.line(`po „${choice}”: plik ${existsSync(op.path)}${existsSync(op.path) ? ` – notatka „${readJson(op.path)!.note}”` : ''}; wiersz na liście ${await page.locator(`[data-testid="operation-row"][data-key="${id}"]`).count()}; edytor ${await page.getByTestId('operation-editor').count()}; toasty ${await toasts(page)}`)
      })
    }
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.43 – zamknięcie zaraz po zmianie', async () => {
  test.setTimeout(30 * 60_000)
  const NAME = 'da-43'
  const log = new Log(NAME)
  const ids = [OP.grycan, OP.mokka, OP.apteka, OP.cinema, OP.zoo, OP.fryzjer, OP.drogeria, OP.rossmann, OP.bolt, OP.netia]
  const q: Record<string, string> = { [OP.grycan]: 'Lody Grycan', [OP.mokka]: 'Mokka', [OP.apteka]: 'Apteka', [OP.cinema]: 'CINEMA CITY', [OP.zoo]: 'ZOOPLUS', [OP.fryzjer]: 'FRYZJER STYL', [OP.drogeria]: 'DROGERIA NATURA', [OP.rossmann]: 'Rossmann', [OP.bolt]: 'BOLT.EU', [OP.netia]: 'NETIA SA' }
  let dataDir = ''
  for (let i = 1; i <= 10; i++) {
    const id = ids[i - 1]!
    const value = `${100 + i},${String(i).padStart(2, '0')}`
    const run = i === 1 ? await openRok(NAME, { log }).then((r) => ((dataDir = r.dataDir), r.run)) : await reopen(NAME, dataDir, { log })
    try {
      await openOp(run.page, q[id]!, id)
      await run.page.getByTestId('operation-amount').click()
      await run.page.getByTestId('operation-amount').fill(value)
      await answerQuestions(run, 1)
    } finally {
      const t0 = Date.now()
      await run.app.close().catch((e) => log.line(`#${i} zamknięcie: ${(e as Error).message.split('\n')[0]}`))
      log.line(`#${i} ${q[id]}: wpisano ${value}, zamknięcie ${Date.now() - t0} ms; plik ${byId(dataDir, id).rec.amount}; pytanie w main.log: ${mainLog(run, /zamykanie: niezapisane/i, 3) || 'brak'}`)
    }
  }
  // During a change of 200 operations' category.
  {
    const run = await reopen(NAME, dataDir, { log })
    const { page } = run
    try {
      await page.keyboard.press('Control+2')
      await closeEditor(page)
      if ((await page.getByTestId('operations-period').innerText()) !== 'cała historia') {
        await page.getByTestId('operations-period-menu').click()
        await page.getByTestId('operations-period-all').click()
      }
      for (const s of ['BIEDRONKA', 'ZABKA', 'KEBAB']) {
        await page.getByTestId('operations-search').fill(s)
        await page.waitForTimeout(700)
        await page.getByTestId('operations-tick-all').check()
        await page.waitForTimeout(300)
      }
      const bar = (await page.getByTestId('operations-bulk').innerText()).replace(/\s+/g, ' ')
      log.line(`zbiorcza: ${bar}`)
      const picked = recordFiles(dataDir, 'transactions').filter((f) => /^(BIEDRONKA|ZABKA|KEBAB)/i.test(f.rec.counterparty)).map((f) => f.rec.id)
      await page.getByTestId('operations-bulk-category').selectOption({ label: 'Prezenty i inne · inne' })
      await answerQuestions(run, 1)
      await page.getByTestId('operations-bulk-apply').click()
      const t0 = Date.now()
      await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message.split('\n')[0]}`))
      const after = recordFiles(dataDir, 'transactions').filter((f) => picked.includes(f.rec.id))
      log.line(`zbiorcza + zamknięcie (${Date.now() - t0} ms): ${after.filter((f) => f.rec.categoryId === '01KDEFCAT00000000000000902').length} z ${after.length} z nową kategorią; pytanie: ${mainLog(run, /zamykanie: niezapisane/i, 3) || 'brak'}`)
    } finally {
      await run.app.close().catch(() => undefined)
    }
  }
  // Right after an import.
  {
    const file = join(runDir(NAME), 'da-43.csv')
    const { writeFileSync } = await import('node:fs')
    writeFileSync(file, cp1250(listaText([cardL('2026-11-02', 'SKLEP ZAMKNIECIE /TESTOWO', -4321), cardL('2026-11-03', 'SKLEP ZAMKNIECIE 2 /TESTOWO', -1234)], '2026-11-01', '2026-11-03')))
    const run = await reopen(NAME, dataDir, { log })
    const { page } = run
    try {
      await page.keyboard.press('Control+3')
      await expect(page.getByTestId('page-import')).toBeVisible()
      await pick(run, { paths: [file] })
      await page.getByTestId('import-pick').click()
      await page.getByTestId('import-file').waitFor({ timeout: 60_000 })
      await page.getByTestId('import-run').click()
      await importDone(page, run.userData)
      await answerQuestions(run, 1)
      const t0 = Date.now()
      await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message.split('\n')[0]}`))
      log.line(`import + zamknięcie (${Date.now() - t0} ms): operacje SKLEP ZAMKNIECIE w plikach ${recordFiles(dataDir, 'transactions').filter((f) => /SKLEP ZAMKNIECIE/.test(f.rec.counterparty)).length}; paczka importu ${readdirSync(join(dataDir, 'imports')).length}; pytanie: ${mainLog(run, /zamykanie: niezapisane/i, 3) || 'brak'}`)
    } finally {
      await run.app.close().catch(() => undefined)
    }
  }
  // Started again: the files and the log.
  const run = await reopen(NAME, dataDir, { log })
  try {
    for (const id of ids) log.line(`po ponownym starcie ${q[id]}: ${byId(dataDir, id).rec.amount}`)
    log.line(`pliki tymczasowe: ${tempFiles(dataDir).join(', ') || 'brak'}`)
    log.line(`main.log (ostrzeżenia):\n${mainLog(run, /WARN|ERROR|zamykanie/i, 30)}`)
  } finally {
    await run.app.close().catch(() => undefined)
  }
})
