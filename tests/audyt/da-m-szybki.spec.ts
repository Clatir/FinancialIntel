/**
 * Audit DA – DA.7: a quick entry saved while another folder opens (where does it go, what does the window say).
 * Observation only: C:\FI-audyt\przebiegi\da-7q\da.log.
 */
import { test } from '@playwright/test'
import { useState } from './lab'
import { Log, answerQuestions, openRok, pick, recordFiles, sleep, toasts } from './da-pomoc'

test('DA.7 – szybki wpis w trakcie zmiany folderu', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'da-7q'
  const log = new Log(NAME)
  const startDir = useState('start', `${NAME}-start`).dataDir
  const { run, dataDir } = await openRok(NAME, { log, env: { FI_OPEN_DELAY_MS: '400', FI_OPEN_SLOW_MS: '5000' } })
  const { page, app } = run
  const n0 = { rok: recordFiles(dataDir, 'transactions').length, start: recordFiles(startDir, 'transactions').length }
  try {
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await pick(run, { paths: [startDir] })
    await page.getByRole('button', { name: 'Otwórz inny folder…' }).click()
    await sleep(600)
    log.line(`panel: ${(await page.getByTestId('open-progress').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ').slice(0, 120)}`)
    await page.evaluate('window.fi.quickOpen()')
    await sleep(1500)
    const quick = app.windows().find((w) => w.url().includes('quick'))
    if (!quick) log.line('okno szybkiego wpisu: brak')
    else {
      log.line(`szybki wpis – nagłówek: ${(await quick.locator('body').innerText()).split('\n').slice(0, 3).join(' | ')}; komunikat „${await quick.getByTestId('quick-message').innerText().catch(() => '')}”`)
      await quick.getByTestId('quick-amount').click()
      await quick.getByTestId('quick-amount').fill('6,66')
      await quick.getByTestId('quick-counterparty').fill('Szybki w trakcie').catch(() => undefined)
      await quick.getByTestId('quick-save').click().catch((e) => log.line(`zapisz: ${(e as Error).message.split('\n')[0]}`))
      await sleep(1200)
      log.line(`po „Zapisz” (folder jeszcze się otwiera: ${(await page.getByTestId('open-progress').count()) > 0}): komunikat „${await quick.getByTestId('quick-message').innerText().catch(() => '(okno zamknięte)')}”; okno ${quick.isClosed() ? 'zamknięte' : 'otwarte'}`)
      await quick.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\DA.7-szybki.png' }).catch(() => undefined)
      if (!quick.isClosed()) await quick.close().catch(() => undefined)
    }
    log.line(`toasty: ${await toasts(page)}`)
    for (let i = 0; i < 60 && (await page.getByTestId('open-progress').count()); i++) await sleep(1000)
    await sleep(2000)
    log.line(`po otwarciu start: ${await page.getByTestId('settings-data-dir').innerText()}; toasty ${await toasts(page)}`)
    const r = recordFiles(dataDir, 'transactions')
    const s = recordFiles(startDir, 'transactions')
    log.line(`operacji: rok ${n0.rok} → ${r.length} (${r.filter((f) => f.rec.amount === -666).map((f) => f.rel).join(', ') || 'bez wpisu 6,66'}); start ${n0.start} → ${s.length} (${s.filter((f) => f.rec.amount === -666).map((f) => f.rel).join(', ') || 'bez wpisu 6,66'})`)
  } finally {
    await answerQuestions(run, 1).catch(() => undefined)
    await run.app.close().catch(() => undefined)
  }
})
