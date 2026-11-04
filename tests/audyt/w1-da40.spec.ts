/**
 * W1 – DA.40 (K): the data folder renamed from outside while the app is open. Does the app notice (banner, read-only)?
 * Does it make a new folder at the old path and write there („Zapisano.”)? After the folder's return – is the entry there?
 * State: plain „rok”. The folder the app makes at the old path is moved aside before the original comes back.
 */
import { existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { logger, recs } from './w1-pomoc'

const RUN = 'w1-da40'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
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

test('W1 DA.40 – folder danych znika w trakcie pracy', async () => {
  test.setTimeout(15 * 60_000)
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const off = `${dataDir}-odlaczony`
  const made = `${dataDir}-utworzony-przez-aplikacje`
  rmSync(off, { recursive: true, force: true })
  rmSync(made, { recursive: true, force: true })
  const { app, page } = await start(RUN, { dataDir, ictjDir })
  const top = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 260)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(3000)
    log('przed – górna część okna', await top())
    const t0 = Date.now()
    renameSync(dataDir, off)
    log('folder przemianowany', new Date().toISOString())
    for (let i = 1; i <= 9; i++) {
      await sleep(5000)
      log(`${i * 5} s`, { staraSciezka: existsSync(dataDir) ? tree(dataDir) : 'brak', okno: await top(), niedostepny: await page.getByText(/niedostępny/i).count() })
    }
    await shot(page, 'W1-DA.40-po-45s')
    // A quick entry while the folder is gone.
    await page.evaluate('window.fi.quickOpen()')
    await sleep(2500)
    const quick = app.windows().find((w) => w.url().includes('quick'))
    if (quick) {
      await quick.getByTestId('quick-amount').click()
      await quick.getByTestId('quick-amount').fill('7')
      await quick.getByTestId('quick-counterparty').fill('W1 wpis bez folderu').catch(() => undefined)
      await quick.getByTestId('quick-save').click().catch(() => undefined)
      await sleep(2000)
      log('szybki wpis – komunikat', await quick.getByTestId('quick-message').innerText().catch(() => '(brak quick-message)'))
      if (!quick.isClosed()) await quick.close().catch(() => undefined)
    } else log('szybki wpis', '(okno się nie otworzyło)')
    await sleep(3000)
    log('po szybkim wpisie', { staraSciezka: existsSync(dataDir) ? tree(dataDir) : 'brak', okno: await top() })
    // The folder back.
    const madeTree = existsSync(dataDir) ? tree(dataDir) : []
    if (existsSync(dataDir)) renameSync(dataDir, made)
    renameSync(off, dataDir)
    log(`folder wrócił po ${Math.round((Date.now() - t0) / 1000)} s`, { folderAplikacji: madeTree })
    for (let i = 1; i <= 6; i++) {
      await sleep(10_000)
      log(`po powrocie ${i * 10} s`, { okno: await top(), wpisWOryginale: recs(dataDir, 'transactions').filter((t) => /W1 wpis bez folderu/.test(t.counterparty ?? '') || (t.amount === -700 && t.date === '2026-11-03')).map((t) => `${t.date} ${t.amount} ${t.counterparty}`), staraSciezkaPonownie: existsSync(made) ? tree(made).length : 0 })
    }
    log('wpis z szybkiego wpisu w folderze aplikacji', recs(made, 'transactions').map((t) => `${t.date} ${t.amount} „${t.counterparty}” ${t.__file}`))
    await shot(page, 'W1-DA.40-po-powrocie')
  } finally {
    await app.close()
  }
})
