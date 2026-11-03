/**
 * W1 – IM.39 (W): a list file of mBank imported by mistake onto „Portfel XTB”, then again onto „mBank” (the fix): do the
 * rows already on mBank (imported earlier from the account history) end up twice on mBank? State: plain „rok”; the list
 * is the same 17-row slice of 19.10–26.10 as in w1-im42 (every row already on mBank from „historia rachunku”).
 */
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, answerDialogs, shot, start, useState } from './lab'
import { MBANK, WALLET, body, logger, sliceList, txs } from './w1-pomoc'

const RUN = 'w1-im39'

test('W1 IM.39 – lista na złe konto, potem na mBank', async () => {
  test.setTimeout(15 * 60_000)
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const list = join(LAB, 'przebiegi', RUN, 'W1-lista-1910-2610.csv')
  sliceList(join(LAB, 'pliki', 'im', 'L1.csv'), list, '19.10.2026', '26.10.2026', (d) => d.slice(3) === '10.2026' && Number(d.slice(0, 2)) >= 19 && Number(d.slice(0, 2)) <= 26)
  const period = (acc: string) => txs(dataDir).filter((t) => t.accountId === acc && t.date >= '2026-10-19' && t.date <= '2026-10-26')
  const dups = () => {
    const m = new Map<string, number>()
    for (const t of period(MBANK)) m.set(`${t.date}|${t.amount}|${t.counterparty}`, (m.get(`${t.date}|${t.amount}|${t.counterparty}`) ?? 0) + 1)
    return [...m].filter(([, n]) => n > 1).map(([k, n]) => `${k} ×${n}`)
  }
  const sumMbank = () => txs(dataDir).filter((t) => t.accountId === MBANK).length
  log('przed: operacji mBank 19–26.10 / Portfel 19–26.10 / duplikaty mBank', { mbank: period(MBANK).length, portfel: period(WALLET).length, dups: dups() })
  const { app, page } = await start(RUN, { dataDir, ictjDir })
  const open = async () => {
    await page.keyboard.press('Control+3')
    await page.getByTestId('page-import').waitFor({ timeout: 60_000 })
    await answerDialogs(app, { paths: [list] })
    await page.getByTestId('import-pick').click()
    await page.getByTestId('import-file').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(1500)
  }
  const counters = async () => {
    const out: Record<string, string> = {}
    for (const k of ['new', 'merge', 'settle', 'known', 'deleted', 'excluded', 'moved', 'other-format']) {
      const c = page.getByTestId(`import-count-${k}`)
      if (await c.count()) out[k] = (await c.first().innerText()).replace(/\s+/g, ' ').trim()
    }
    return out
  }
  const run = async (label: string) => {
    await page.getByTestId('import-run').click()
    await page.getByTestId('import-done').waitFor({ timeout: 60_000 }).catch(() => undefined)
    await page.waitForTimeout(2000)
    log(`${label} – wynik`, (await page.getByTestId('import-done').innerText().catch(() => '(brak import-done)')).replace(/\s+/g, ' '))
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    // 1. The wrong account.
    await open()
    await page.getByTestId('import-account').selectOption({ label: 'Portfel XTB' })
    await page.waitForTimeout(1500)
    log('1 Portfel – ostrzeżenie', await page.getByTestId('import-account-warning').innerText().catch(() => '(brak)'))
    log('1 Portfel – liczniki', await counters())
    await shot(page, 'W1-IM.39-portfel-podglad')
    await run('1 Portfel')
    log('1 po imporcie na Portfel', { mbank: period(MBANK).length, portfel: period(WALLET).length, dups: dups() })
    await page.getByTestId('import-close').click().catch(() => undefined)
    await page.waitForTimeout(1000)
    // 2. The fix: the same file onto mBank.
    await open()
    const sel = page.getByTestId('import-account')
    log('2 konto w budżecie (domyślnie)', await sel.evaluate((e: HTMLSelectElement) => e.options[e.selectedIndex]?.text))
    await sel.selectOption({ label: 'mBank' })
    await page.waitForTimeout(1500)
    log('2 mBank – liczniki', await counters())
    log('2 mBank – „na innym koncie”', (await body(page)).match(/[^\n]*(innym koncie|teraz na:)[^\n]*/g)?.slice(0, 6) ?? '(brak)')
    await shot(page, 'W1-IM.39-mbank-podglad')
    await run('2 mBank')
    log('2 po imporcie na mBank', { mbank: period(MBANK).length, portfel: period(WALLET).length, dups: dups(), mbankWszystkie: sumMbank() })
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(1500)
    log('Mostek – suma kont / duplikaty', (await body(page)).match(/[^\n]*(Suma kont budżetu|duplikat)[^\n]*/g) ?? '(brak)')
    await shot(page, 'W1-IM.39-mostek')
  } finally {
    await app.close()
  }
})
