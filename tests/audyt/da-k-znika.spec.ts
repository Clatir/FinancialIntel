/**
 * Audit DA – DA.40 again on a fresh copy: what the old path holds while the folder is gone (without any action, then
 * after a quick entry), the window's state, and the return of the folder (the folder made by the app moved aside first).
 * Observation only: C:\FI-audyt\przebiegi\da-40p\da.log.
 */
import { existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from '@playwright/test'
import { OP, Log, answerQuestions, banners, byId, mainLog, openOp, openRok, recordFiles, sleep, toasts, trapped } from './da-pomoc'

const tree = (d: string): string[] => {
  if (!existsSync(d)) return []
  const out: string[] = []
  const walk = (x: string) => {
    for (const n of readdirSync(x)) {
      const p = join(x, n)
      if (statSync(p).isDirectory()) walk(p)
      else out.push(relative(d, p).replace(/\\/g, '/'))
    }
  }
  walk(d)
  return out
}

test('DA.40 – potwierdzenie: folder znika i wraca', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-40p'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page, app } = run
  const off = `${dataDir}-odlaczony`
  const made = `${dataDir}-utworzony-przez-aplikacje`
  rmSync(off, { recursive: true, force: true })
  rmSync(made, { recursive: true, force: true })
  try {
    const t0 = Date.now()
    renameSync(dataDir, off)
    log.line(`folder przemianowany ${new Date().toISOString()}`)
    for (let i = 1; i <= 9; i++) {
      await sleep(10_000)
      log.line(`${i * 10} s bez działań: stara ścieżka ${existsSync(dataDir) ? `JEST: ${tree(dataDir).join(', ') || '(pusta)'}` : 'brak'}; banery „${await banners(page)}”; wskaźnik „${await page.getByTestId('save-state').innerText().catch(() => '')}”; błąd zapisu „${await page.getByTestId('save-error').innerText().catch(() => '')}”`)
    }
    await log.shot(page, 'DA.40p-po-90s')
    // A quick entry while the folder is gone.
    await page.evaluate('window.fi.quickOpen()')
    await sleep(2500)
    const quick = app.windows().find((w) => w.url().includes('quick'))
    if (quick) {
      await quick.getByTestId('quick-amount').click()
      await quick.getByTestId('quick-amount').fill('7')
      await quick.getByTestId('quick-counterparty').fill('Wpis bez folderu').catch(() => undefined)
      await quick.getByTestId('quick-save').click().catch(() => undefined)
      await sleep(2000)
      log.line(`szybki wpis: komunikat „${await quick.getByTestId('quick-message').innerText().catch(() => '')}”; okno ${quick.isClosed() ? 'zamknięte' : 'otwarte'}`)
      if (!quick.isClosed()) await quick.close().catch(() => undefined)
    }
    await sleep(3000)
    log.line(`po szybkim wpisie: stara ścieżka ${existsSync(dataDir) ? `JEST: ${tree(dataDir).join(', ')}` : 'brak'}; toasty „${await toasts(page)}”; banery „${await banners(page)}”; błąd zapisu „${await page.getByTestId('save-error').innerText().catch(() => '')}”`)
    // An edit of an existing entry.
    await openOp(page, 'Lody Grycan', OP.grycan)
    await page.getByTestId('operation-amount').click()
    await page.getByTestId('operation-amount').fill('31,31')
    await page.getByTestId('operation-amount').press('Enter')
    await sleep(3000)
    log.line(`po edycji Grycan: toasty „${await toasts(page)}”; chip „${await page.getByTestId('remote-chip').innerText().catch(() => '')}”; okno zmian ${(await page.getByTestId('remote-dialog').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 400)}`)
    await log.shot(page, 'DA.40p-edycja')
    if (await page.getByTestId('remote-dialog').count()) await page.getByTestId('remote-dialog').getByRole('button', { name: 'Później' }).click().catch(() => undefined)
    await page.keyboard.press('Control+1')
    await sleep(1000)
    log.line(`Mostek: ${(await page.getByTestId('page-bridge').innerText()).match(/Suma kont budżetu: [^\n]+/)?.[0]}; operacji w menu: ${(await page.locator('main').innerText()).length}`)
    // The folder back: what the app made at the old path moved aside, the original renamed back.
    log.line(`stara ścieżka przed powrotem: ${existsSync(dataDir) ? tree(dataDir).join(', ') : 'brak'}`)
    if (existsSync(dataDir)) renameSync(dataDir, made)
    renameSync(off, dataDir)
    const tBack = Date.now()
    log.line(`folder wrócił po ${Math.round((tBack - t0) / 1000)} s (folder aplikacji odsunięty: ${existsSync(made)})`)
    for (let i = 1; i <= 30; i++) {
      await sleep(10_000)
      const b = await banners(page)
      const chip = await page.getByTestId('remote-chip').innerText().catch(() => '')
      const err = await page.getByTestId('save-error').innerText().catch(() => '')
      if (i % 3 === 0 || i === 1) log.line(`${i * 10} s po powrocie: banery „${b}”; chip „${chip}”; błąd zapisu „${err}”; toasty „${await toasts(page)}”`)
      if (i >= 6 && !chip && !err && !/niedost/i.test(b)) break
    }
    log.line(`Grycan w pliku: ${byId(dataDir, OP.grycan).rec.amount}; „Wpis bez folderu” w folderze: ${recordFiles(dataDir, 'transactions').filter((f) => f.rec.amount === -700 && f.rec.createdAt > new Date(t0).toISOString()).length}; w folderze aplikacji: ${tree(made).join(', ')}`)
    log.line(`okno zmian: ${(await page.getByTestId('remote-dialog').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 500)}`)
    await log.shot(page, 'DA.40p-po-powrocie')
    log.line(`main.log:\n${mainLog(run, /WARN|ERROR|open|folder|niedost/i, 40)}`)
    log.line(`zapis laboratorium: ${JSON.stringify((await trapped(run)).dialogs)}`)
  } finally {
    if (!existsSync(dataDir) && existsSync(off)) renameSync(off, dataDir)
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message.split('\n')[0]}`))
  }
  log.line(`main.log (zamykanie): ${mainLog(run, /zamykanie/i, 5)}`)
})
