/**
 * W1 – IM.42 (K): a bank operation imported from the account history (format „historia”), deleted by the user, comes
 * back silently when a list file („Lista operacji”) of the same period is imported. Control: the history file opened
 * again after the deletion (same format). State: plain „rok”; the list file is cut from the IM team's L1 byte-exactly,
 * only the 17 rows of 19.10–26.10 (all of them the persona's history rows).
 */
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, answerDialogs, shot, start, useState } from './lab'
import { body, brief, logger, sliceList, txs } from './w1-pomoc'

const RUN = 'w1-im42'

test('W1 IM.42 – usunięta operacja z historii wraca z listą', async () => {
  test.setTimeout(15 * 60_000)
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const list = join(LAB, 'przebiegi', RUN, 'W1-lista-1910-2610.csv')
  log('wiersze listy', sliceList(join(LAB, 'pliki', 'im', 'L1.csv'), list, '19.10.2026', '26.10.2026', (d) => d.slice(3) === '10.2026' && Number(d.slice(0, 2)) >= 19 && Number(d.slice(0, 2)) <= 26))
  const zabka = (d: string) => txs(d).filter((t) => t.date === '2026-10-25' && t.amount === -3195 && /ZABKA/.test(t.counterparty ?? ''))
  log('ZABKA 25.10 −31,95 w folderze przed', zabka(dataDir).map(brief))
  const { app, page } = await start(RUN, { dataDir, ictjDir })
  const open = async (path: string) => {
    await page.keyboard.press('Control+3')
    await page.getByTestId('page-import').waitFor({ timeout: 60_000 })
    await answerDialogs(app, { paths: [path] })
    await page.getByTestId('import-pick').click()
    await Promise.race([page.getByTestId('import-file').waitFor({ timeout: 60_000 }), page.getByTestId('import-error').waitFor({ timeout: 60_000 })])
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
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    // 1. Delete ZABKA 25.10 −31,95 in Operacje (the user's way).
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(1000)
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operations-search').fill('31,95')
    await page.waitForTimeout(800)
    const rows = await page.getByTestId('operation-row').allInnerTexts()
    log('wiersze „31,95”', rows.map((r) => r.replace(/\s+/g, ' ')))
    await page.getByTestId('operation-row').first().click()
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await page.waitForTimeout(2500)
    await page.getByTestId('operations-search').fill('')
    log('ZABKA 25.10 po usunięciu (folder)', zabka(dataDir).map(brief))
    log('operacji po usunięciu', txs(dataDir).length)
    // 2. Control – the history file again (same format as the deleted operation's source).
    await open(join(LAB, 'pliki', 'rok-historia.csv'))
    log('KONTROLA historia – liczniki', await counters())
    log('KONTROLA historia – tekst (fragment)', (await body(page)).match(/(Usunięte przez Ciebie[^\n]*\n?[^\n]*)|(usunięte przez Ciebie[^\n]*)/g) ?? '(brak „usunięte przez Ciebie”)')
    await shot(page, 'W1-IM.42-kontrola-historia')
    await page.getByTestId('import-close').click()
    await page.waitForTimeout(1500)
    // 3. The list of 19.10–26.10.
    await open(list)
    log('LISTA – liczniki', await counters())
    const t = await body(page)
    log('LISTA – „usunięte przez Ciebie”', t.match(/[^\n]*[Uu]sunięte przez Ciebie[^\n]*/g) ?? '(brak)')
    log('LISTA – wiersze z 31,95', t.match(/[^\n]*31,95[^\n]*/g) ?? '(brak)')
    await shot(page, 'W1-IM.42-lista-podglad')
    const before = txs(dataDir).length
    await page.getByTestId('import-run').click()
    await page.getByTestId('import-done').waitFor({ timeout: 60_000 }).catch(() => undefined)
    await page.waitForTimeout(2000)
    log('LISTA – wynik', (await page.getByTestId('import-done').innerText().catch(() => '(brak import-done)')).replace(/\s+/g, ' '))
    await shot(page, 'W1-IM.42-lista-wynik')
    log('operacji przed / po imporcie listy', { before, after: txs(dataDir).length })
    log('ZABKA 25.10 −31,95 po imporcie listy (folder)', zabka(dataDir).map((x) => `${brief(x)} source=${x.bank?.source} key=${JSON.stringify(x.bank)}`))
    // 4. Operacje shows it again?
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(1000)
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operations-search').fill('31,95')
    await page.waitForTimeout(800)
    log('Operacje „31,95” po imporcie', (await page.getByTestId('operation-row').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ')))
    await shot(page, 'W1-IM.42-operacje-po')
  } finally {
    await app.close()
  }
})
