/**
 * W1 – MG.8 / MG.10 (K): goal money moved („przenieś środki”) shows at once on the screens, but an expense from the goal
 * made the same day is paid as if the move had not happened. State: plain „rok”. Through the window only:
 *  A (control): expense 300 zł from „Wakacje 2027” (money docked on earlier days);
 *  B: „Rower” (archived, 0 zł) → „przywróć” → „przenieś środki” 700 zł from „Nowy laptop” → expense 900 zł from „Rower”.
 */
import { test, type Page } from '@playwright/test'
import { shot, start, useState } from './lab'
import { body, logger, recs } from './w1-pomoc'

const RUN = 'w1-mg'

async function go(page: Page, key: string, id: string) {
  await page.keyboard.press(`Control+${key}`)
  await page.getByTestId(id).waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1000)
}

test('W1 MG.10 – wydatek z celu po przeniesieniu środków tego dnia', async () => {
  test.setTimeout(15 * 60_000)
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const { app, page } = await start(RUN, { dataDir, ictjDir })
  const goal = (name: string) => page.locator(`[data-testid="starmap-goal"][data-name="${name}"]`)
  const read = async (label: string) => {
    await go(page, '6', 'page-starmap')
    const goals = (await page.locator('[data-testid="starmap-goal"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 90))
    await go(page, '1', 'page-bridge')
    const stan = (await page.locator('section[data-panel="bridge:Stan okrętu"]').innerText()).replace(/\s+/g, ' ')
    log(label, { goals, stan: stan.slice(0, 700) })
    return { goals, stan }
  }
  const expense = async (amount: string, who: string, goalName: string) => {
    await go(page, '2', 'page-operations')
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-editor').waitFor({ state: 'visible', timeout: 15_000 })
    const a = page.getByTestId('operation-amount')
    await a.click()
    await a.fill(amount)
    await a.press('Enter')
    await page.getByTestId('operation-counterparty').fill(who)
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.getByTestId('operation-category').selectOption({ label: 'Rozrywka i hobby' })
    await page.waitForTimeout(400)
    const opts = await page.getByTestId('operation-goal').locator('option').allInnerTexts()
    const opt = opts.find((o) => o.startsWith(goalName))
    await page.getByTestId('operation-goal').selectOption({ label: opt! })
    await page.waitForTimeout(1500)
    const note = (await page.getByTestId('operation-goal-note').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    await shot(page, `W1-MG.10-edytor-${goalName.replace(/\s+/g, '')}`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1500)
    log(`wydatek ${amount} z celu ${goalName}`, { opcje: opts, wybrana: opt, notka: note, plik: recs(dataDir, 'transactions').filter((t) => t.counterparty === who).map((t) => `${t.date} ${t.amount} goal=${t.goalId} createdAt=${t.createdAt}`) })
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    await read('0 – start')
    // A – control
    await expense('300', 'W1 kontrola Wakacje', 'Wakacje 2027')
    await read('A – po wydatku 300 z Wakacji (kontrola)')
    // B – restore Rower, move 700 from Nowy laptop
    await go(page, '6', 'page-starmap')
    await page.locator('[data-testid="starmap-archived-row"]').filter({ hasText: 'Rower' }).getByRole('button', { name: 'przywróć' }).click()
    await page.waitForTimeout(1500)
    await goal('Nowy laptop').getByTestId('goal-move-funds').click()
    await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
    const f = page.getByTestId('starmap-money-amount')
    await f.click()
    await f.press('Control+a')
    await f.type('700')
    await f.press('Tab')
    await page.getByTestId('starmap-money-goal').check()
    await page.getByTestId('starmap-money').getByRole('combobox').selectOption({ label: 'Rower' })
    log('okno przeniesienia', (await page.getByTestId('starmap-money').innerText()).replace(/\s+/g, ' '))
    await page.getByTestId('starmap-money-ok').click()
    await page.waitForTimeout(1500)
    log('toasty', await page.getByRole('status').allInnerTexts())
    await read('B1 – po przeniesieniu 700 z Nowego laptopa do Rowera')
    log('cele w pliku', recs(dataDir, 'goals').map((g) => `${g.name} arch=${g.archived} transfers=${JSON.stringify(g.transfers)}`))
    await shot(page, 'W1-MG.10-po-przeniesieniu')
    await expense('900', 'W1 Sklep rowerowy', 'Rower')
    await read('B2 – po wydatku 900 z Rowera')
    await go(page, '6', 'page-starmap')
    await shot(page, 'W1-MG.10-mapa-po')
    await go(page, '2', 'page-operations')
    log('lista – wiersz', (await body(page)).match(/[^\n]*W1 Sklep rowerowy[^\n]*/g))
  } finally {
    await app.close()
  }
})
