// DW, przebieg 3 (persona „rok”): DW.3 – ocena „Dziś na razie” po szybkim wpisie ponad energię i po jego usunięciu
// („Cofnij”); DW.6 – korekta zamrożonych dni (usunięcie wydatku z dnia z przekroczeniem, duży wydatek na zamrożonym dniu
// zgodnym) i „Cofnij”. Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { test, type Page } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { cat, command, deleteOpen, energy, gameFiles, go, goOps, openOp, out, quickWindow, textOf, toasts, undo } from './dw-pomoc'

const RUN = 'dw-3'

async function cmd(page: Page): Promise<Record<string, unknown>> {
  await go(page, '8', 'page-command')
  await page.waitForTimeout(800)
  return command(page)
}
const short = (c: Record<string, unknown>) => ({ today: c.today, streak: c.streak, rank: String(c.rank).replace(/\s+/g, ' '), log: (c.log as string[]).slice(0, 14), strip: (c.strip as string[]).join(' | ') })

test('DW.3 / DW.6 – ocena dzisiejsza i korekta zamrożonych dni', async () => {
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const e0 = await energy(page)
    const c0 = await cmd(page)
    dump('0-przed', { e0, ...short(c0) })
    const gameBefore = JSON.stringify(gameFiles(st.dataDir))

    // DW.3 – a daily expense above today's energy, through the quick entry.
    const now = new Date()
    const hh = Number(now.toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' }).slice(11, 13))
    const time = `${String(Math.max(6, hh - 1)).padStart(2, '0')}:05`
    let q = await quickWindow(app, page)
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('100')
    await q.getByTestId('quick-counterparty').fill('Sklep DW3')
    await q.getByTestId('quick-category').selectOption(cat(101))
    await q.getByTestId('quick-time').fill(time)
    await q.getByTestId('quick-time').press('Tab')
    dump('1-szybki-wpis-podglad', await textOf(q.getByTestId('quick-entry')))
    await q.getByTestId('quick-amount').press('Enter')
    await page.waitForTimeout(2500)
    const e1 = await energy(page)
    const c1 = await cmd(page)
    dump('1-po-wpisie', { e1, ...short(c1) })
    await shot(page, 'DW.3-po-wpisie')
    reading('dw', 'DW.3', 'rok + 100 zł Jedzenie dziś', { energia_przed: e0.energia, energia_po: e1.energia, podpis_po: e1.podpis, dzis: String(c1.today).replace(/\s+/g, ' ') })

    // Removal with „Cofnij” in Operacje.
    await goOps(page)
    await openOp(page, 'Sklep DW3')
    const t1 = await deleteOpen(page)
    const c2 = await cmd(page)
    const e2 = await energy(page)
    dump('2-po-usunieciu', { toast: t1, e2, today: c2.today })
    await goOps(page)
    const tv = await toasts(page)
    let undone = false
    if (tv.some((x) => /Cofnij/.test(x))) {
      await undo(page)
      undone = true
    }
    const c3 = await cmd(page)
    const e3 = await energy(page)
    dump('3-po-cofnij-usuniecia', { toastyPrzed: tv, undone, e3, today: c3.today })
    await shot(page, 'DW.3-po-cofnij')
    // Clean again: removed for good.
    await goOps(page)
    await openOp(page, 'Sklep DW3')
    const t4 = await deleteOpen(page)
    const c4 = await cmd(page)
    dump('4-usuniety-znowu', { toast: t4, today: c4.today, e: await energy(page) })
    reading('dw', 'DW.3', 'rok po usunięciu wpisu', { dzis: String(c4.today).replace(/\s+/g, ' ') })

    // DW.6 – corrections of frozen days: 08.09 (daily allowance over by 54,11 zł) loses Fryzjer Styl; 01.11 (compliant)
    // gets 300 zł in Jedzenie.
    const ebase = await energy(page)
    const bridgeBase = await text(page, '[data-testid="page-bridge"]')
    q = await quickWindow(app, page)
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('300')
    await q.getByTestId('quick-counterparty').fill('Hurtownia DW6')
    await q.getByTestId('quick-category').selectOption(cat(101))
    await q.getByTestId('quick-date').click()
    await q.getByTestId('quick-date').fill('01.11.2026')
    await q.getByTestId('quick-date').press('Tab')
    await q.getByTestId('quick-time').fill('')
    await q.getByTestId('quick-time').press('Tab')
    dump('6-szybki-wpis-0111', await textOf(q.getByTestId('quick-entry')))
    await q.getByTestId('quick-amount').press('Enter')
    await page.waitForTimeout(2000)
    await goOps(page)
    await openOp(page, 'Fryzjer', /08\.09/)
    dump('6-edytor-fryzjer', await textOf(page.getByTestId('operation-editor')))
    const t6 = await deleteOpen(page)
    const tvis = Date.now()
    const c6 = await cmd(page)
    const e6 = await energy(page)
    const bridge6 = await text(page, '[data-testid="page-bridge"]')
    dump('6-po-korektach', { toast: t6, e6, ebase, ...short(c6) })
    dump('6-mostek-przed', bridgeBase)
    dump('6-mostek-po', bridge6)
    await shot(page, 'DW.6-mostek-po')
    await go(page, '8', 'page-command')
    await shot(page, 'DW.6-dowodztwo-po')
    reading('dw', 'DW.6', 'rok, korekty 08.09 i 01.11', { energia_przed: ebase.energia, energia_po: e6.energia, seria: String(c6.streak), stopien: String(c6.rank).replace(/\s+/g, ' ') })
    await goOps(page)
    const tv6 = await toasts(page)
    let undone6 = false
    if (tv6.some((x) => /Cofnij/.test(x))) {
      await undo(page)
      undone6 = true
    }
    dump('6-cofnij', { poIluMs: Date.now() - tvis, toasty: tv6, undone6 })
    await openOp(page, 'Hurtownia DW6')
    dump('6-usuniecie-wpisu-0111', await deleteOpen(page))
    const c7 = await cmd(page)
    const e7 = await energy(page)
    dump('7-po-cofnieciu', { e7, ...short(c7) })
    dump('gra-zmiana', { taSama: JSON.stringify(gameFiles(st.dataDir)) === gameBefore })
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
