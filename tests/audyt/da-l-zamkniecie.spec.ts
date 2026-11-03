/**
 * Audit DA – DA.43 again on a fresh copy: a change typed and the app closed at once, on operations from the bank (their
 * amount guarded by „Zmienić operację?”) and not, a note, and a bulk change of over 200 operations.
 * Observation only: C:\FI-audyt\przebiegi\da-43p\da.log.
 */
import { test } from '@playwright/test'
import { OP, Log, answerQuestions, byId, closeEditor, mainLog, openOp, openRok, readJson, recordFiles, reopen, sleep } from './da-pomoc'

test('DA.43 – potwierdzenie: zamknięcie zaraz po zmianie', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-43p'
  const log = new Log(NAME)
  let dataDir = ''
  const cases: Array<{ label: string; id: string; q: string; field: 'operation-amount' | 'operation-note'; value: string; enter?: boolean; check: (r: Record<string, any>) => string }> = [
    { label: 'A: bank, kwota bez wyjścia z pola', id: OP.cinema, q: 'CINEMA CITY', field: 'operation-amount', value: '104,04', check: (r) => String(r.amount) },
    { label: 'B: bank, notatka bez wyjścia z pola', id: OP.zoo, q: 'ZOOPLUS', field: 'operation-note', value: 'notatka przed zamknięciem', check: (r) => `„${r.note}”` },
    { label: 'C: bank, kwota + Enter (pytanie „Zmienić operację?” otwarte)', id: OP.fryzjer, q: 'FRYZJER STYL', field: 'operation-amount', value: '106,06', enter: true, check: (r) => String(r.amount) },
    { label: 'D: Portfel XTB, kwota bez wyjścia z pola', id: OP.grycan, q: 'Lody Grycan', field: 'operation-amount', value: '101,01', check: (r) => String(r.amount) }
  ]
  for (const [i, c] of cases.entries()) {
    const run = i === 0 ? await openRok(NAME, { log }).then((r) => ((dataDir = r.dataDir), r.run)) : await reopen(NAME, dataDir, { log })
    const before = c.check(byId(dataDir, c.id).rec)
    try {
      await openOp(run.page, c.q, c.id)
      const f = run.page.getByTestId(c.field)
      await f.click()
      await f.fill(c.value)
      if (c.enter) {
        await f.press('Enter')
        await run.page.waitForTimeout(800)
        log.line(`${c.label}: okno pytania widoczne ${await run.page.getByTestId('operation-guard').count()} – „${(await run.page.getByTestId('operation-guard').innerText().catch(() => '')).replace(/\s+/g, ' ')}”`)
        await log.shot(run.page, 'DA.43p-pytanie')
      }
      await answerQuestions(run, 1)
    } finally {
      const t0 = Date.now()
      await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message.split('\n')[0]}`))
      log.line(`${c.label}: wpisano ${c.value}; przed ${before}; po zamknięciu w pliku ${c.check(byId(dataDir, c.id).rec)} (${Date.now() - t0} ms); main.log: ${mainLog(run, /zamykanie|niezapisane|WARN|ERROR/i, 4).replace(/\n/g, ' | ')}`)
    }
  }
  // A bulk change of every operation with „a” in it (over 200), the app closed at once.
  const run = await reopen(NAME, dataDir, { log })
  try {
    const { page } = run
    await page.keyboard.press('Control+2')
    await closeEditor(page)
    if ((await page.getByTestId('operations-period').innerText()) !== 'cała historia') {
      await page.getByTestId('operations-period-menu').click()
      await page.getByTestId('operations-period-all').click()
    }
    await page.getByTestId('operations-search').fill('a')
    await page.waitForTimeout(1000)
    await page.getByTestId('operations-tick-all').check()
    await page.waitForTimeout(500)
    log.line(`zaznaczone: ${(await page.getByTestId('operations-bulk').innerText()).split('\n')[0]}`)
    const before = new Map(recordFiles(dataDir, 'transactions').map((f) => [f.rec.id, f.rec.categoryId]))
    log.line(`przed: z kategorią „Prezenty i inne · inne” ${[...before.values()].filter((c) => c === '01KDEFCAT00000000000000902').length}`)
    await page.getByTestId('operations-bulk-category').selectOption({ label: 'Prezenty i inne · inne' })
    await answerQuestions(run, 1)
    await page.getByTestId('operations-bulk-apply').click()
    await sleep(50)
  } finally {
    const t0 = Date.now()
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message.split('\n')[0]}`))
    const all = recordFiles(dataDir, 'transactions')
    log.line(`zbiorcza + zamknięcie (${Date.now() - t0} ms): z kategorią „Prezenty i inne · inne” ${all.filter((f) => f.rec.categoryId === '01KDEFCAT00000000000000902').length} operacji; main.log: ${mainLog(run, /zamykanie|niezapisane|WARN|ERROR/i, 4).replace(/\n/g, ' | ')}`)
  }
  const r2 = await reopen(NAME, dataDir, { log })
  try {
    await r2.page.keyboard.press('Control+2')
    await sleep(1500)
    log.line(`po ponownym starcie: operacji „Prezenty i inne · inne” ${recordFiles(dataDir, 'transactions').filter((f) => f.rec.categoryId === '01KDEFCAT00000000000000902').length}; ZOOPLUS notatka „${readJson(byId(dataDir, OP.zoo).path)!.note}”`)
  } finally {
    await r2.app.close().catch(() => undefined)
  }
})
