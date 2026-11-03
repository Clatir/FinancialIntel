/**
 * W1 – DA.43 (K): the amount of a bank operation typed in the editor and the app closed at once („Zakończ” = app.quit,
 * what Playwright's close does) – lost without a question? Control: a Portfel XTB operation the same way. Extra: the same
 * typed bank amount and the screen left (Ctrl+1) – asked / saved / lost? Native message boxes are recorded (never shown):
 * a question at closing would be in the record. State: plain „rok”, one copy, restarted between the cases.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState, type Run } from './lab'
import { logger, recs } from './w1-pomoc'

const RUN = 'w1-da43'

async function recordBoxes(run: Run) {
  await run.app.evaluate(({ dialog }) => {
    const g = globalThis as unknown as { __w1: unknown[] }
    g.__w1 = []
    const rec = (...args: unknown[]) => {
      const o = (args.length > 1 ? args[1] : args[0]) as Record<string, unknown>
      g.__w1.push({ title: o?.title, message: o?.message, detail: o?.detail, buttons: o?.buttons })
      return 0
    }
    dialog.showMessageBoxSync = rec as typeof dialog.showMessageBoxSync
    dialog.showMessageBox = (async (...a: unknown[]) => ({ response: rec(...a), checkboxChecked: false })) as unknown as typeof dialog.showMessageBox
  })
}

async function openOp(page: Page, q: string, id: string) {
  await page.keyboard.press('Control+2')
  await page.getByTestId('page-operations').waitFor({ timeout: 30_000 })
  await page.waitForTimeout(800)
  await page.getByTestId('operations-period-menu').click()
  await page.getByTestId('operations-period-all').click()
  await page.getByTestId('operations-search').fill(q)
  await page.waitForTimeout(800)
  await page.locator(`[data-testid="operation-row"][data-key="${id}"]`).click()
  await page.getByTestId('operation-editor').waitFor()
  await page.waitForTimeout(400)
}

test('W1 DA.43 – zamknięcie zaraz po zmianie kwoty', async () => {
  test.setTimeout(20 * 60_000)
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const amount = (id: string) => recs(dataDir, 'transactions').find((t) => t.id === id)?.amount ?? null
  // The persona was renewed at 15:17 (new ids): the operations found by name – the latest one of each.
  const latest = (re: RegExp, bank: boolean) => recs(dataDir, 'transactions').filter((t) => re.test(t.counterparty ?? '') && !!t.bank === bank && t.amount < 0).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  const CINEMA = latest(/CINEMA CITY/, true).id as string
  const FRYZJER = latest(/FRYZJER STYL/, true).id as string
  const GRYCAN = latest(/Lody Grycan/, false).id as string
  log('operacje', [CINEMA, FRYZJER, GRYCAN].map((id) => { const t = recs(dataDir, 'transactions').find((x) => x.id === id)!; return `${t.date} ${t.counterparty} ${t.amount} bank=${!!t.bank} id=${id}` }))
  const mainLog = (run: Run) => {
    const f = join(run.userData, 'logs', 'main.log')
    return existsSync(f) ? readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => /zamykanie|niezapisane|ERROR|WARN/i.test(l)).slice(-5) : []
  }
  const cases = [
    { label: 'A bank CINEMA – kwota bez wyjścia z pola, Zakończ', id: CINEMA, q: 'CINEMA CITY', value: '104,04', mode: 'quit' },
    { label: 'B Portfel Grycan – kwota bez wyjścia z pola, Zakończ (kontrola)', id: GRYCAN, q: 'Lody Grycan', value: '101,01', mode: 'quit' },
    { label: 'C bank FRYZJER – kwota + Enter (pytanie otwarte), Zakończ', id: FRYZJER, q: 'FRYZJER STYL', value: '106,06', mode: 'enter-quit' },
    { label: 'D bank CINEMA – kwota bez wyjścia z pola, Ctrl+1 (opuszczenie ekranu)', id: CINEMA, q: 'CINEMA CITY', value: '103,03', mode: 'leave' }
  ] as const
  for (const [i, c] of cases.entries()) {
    const run = await start(RUN, { dataDir, ictjDir, fresh: i === 0 })
    await recordBoxes(run)
    const { page } = run
    const before = amount(c.id)
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
      await page.waitForTimeout(2500)
      await openOp(page, c.q, c.id)
      const f = page.getByTestId('operation-amount')
      await f.click()
      await f.fill(c.value)
      if (c.mode === 'enter-quit') {
        await f.press('Enter')
        await page.waitForTimeout(800)
        log(`${c.label}: pytanie`, (await page.getByTestId('operation-guard').innerText().catch(() => '(brak)')).replace(/\s+/g, ' '))
        await shot(page, 'W1-DA.43-pytanie')
      }
      if (c.mode === 'leave') {
        await page.keyboard.press('Control+1')
        await page.waitForTimeout(2500)
        log(`${c.label}: po Ctrl+1 – ekran`, (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300))
        log(`${c.label}: po Ctrl+1 – pytanie w oknie?`, (await page.getByTestId('operation-guard').innerText().catch(() => '(brak)')).replace(/\s+/g, ' '))
        await shot(page, 'W1-DA.43-opuszczenie')
        log(`${c.label}: w pliku po 2,5 s`, amount(c.id))
        await page.keyboard.press('Control+2')
        await page.waitForTimeout(1500)
        log(`${c.label}: po powrocie do Operacji – edytor`, (await page.getByTestId('operation-editor').innerText().catch(() => '(brak edytora)')).replace(/\s+/g, ' ').slice(0, 300))
      }
    } finally {
      const boxes = await run.app.evaluate(() => (globalThis as unknown as { __w1: unknown[] }).__w1).catch(() => '?')
      const t0 = Date.now()
      await run.app.close().catch((e) => log('zamknięcie – błąd', String(e).slice(0, 200)))
      log(c.label, { wpisano: c.value, przed: before, poZamknieciu: amount(c.id), ms: Date.now() - t0, oknaSystemu: boxes, mainLog: mainLog(run) })
    }
  }
})
