/**
 * Audit KR – a budget counted from an opening balance before the wizard (KR.6 variant, KR.8).
 * State: a new folder (first-run proposal); kr-dzis.csv imported on the Import screen (outside the wizard); Ustawienia →
 * Konta: mBank opening 18 000,00 zł on 01.09.2025 (the history's first day).
 * Answers: mBank left empty, Portfel XTB 1 250,00, Gotówka empty; the rest proposed, ICTTJ skipped.
 */
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { answerDialogs, reading } from './lab'
import { SIMPLE, KR_FILES, Log, WIZ, amount, balanceField, decide, disarmAutostart, logRecorded, newBudget, openWizard, readJson, recordsOf, toStep, toasts } from './kr-pomoc'
import { importDone } from '../e2e/app'

const NAME = process.env.KR_RUN ?? 'kr-otwarcie'
const STATE = `pusty + kr-dzis.csv (Import) + saldo otwarcia mBank 18 000,00 z 01.09.2025 (przebieg ${NAME})`
const grab = (t: string, re: RegExp) => t.match(re)?.[1] ?? null

test('KR – saldo otwarcia przed kreatorem (KR.6 wariant, KR.8)', async () => {
  test.setTimeout(20 * 60_000)
  const log = new Log(NAME)
  const { run, dataDir } = await newBudget(NAME, log)
  const { page, app } = run
  try {
    await log.step('import kr-dzis.csv na ekranie Import', async () => {
      await page.keyboard.press('Control+3')
      await expect(page.getByTestId('page-import')).toBeVisible()
      await answerDialogs(app, { paths: [join(KR_FILES, 'kr-dzis.csv')] })
      await page.getByTestId('import-pick').click()
      await expect(page.getByTestId('import-file')).toBeVisible({ timeout: 60_000 })
      const sure = page.getByTestId('import-accept-sure')
      if ((await sure.count()) && (await sure.isEnabled())) await sure.click()
      for (const d of SIMPLE) await decide(page, d, log)
      await page.getByTestId('import-run').click()
      await importDone(page, run.userData)
      await log.screen(page, 'wynik importu', '[data-testid="import-done"]')
    })
    await log.step('Ustawienia → Konta: saldo otwarcia mBanku', async () => {
      await page.getByTestId('nav-settings').click()
      await page.getByTestId('settings-tab-accounts').click()
      await page.waitForTimeout(500)
      const row = page.locator('[data-testid="account-row"]').first()
      await amount(row.getByTestId('account-opening'), '18000')
      await page.waitForTimeout(500)
      const date = row.getByTestId('account-opening-date')
      await date.click()
      await date.fill('01.09.2025')
      await date.press('Enter')
      await page.waitForTimeout(800)
      log.line(`mBank: saldo teraz ${await row.getByTestId('account-balance').innerText()}, otwarcie „${await row.getByTestId('account-opening').inputValue()}” z dnia „${await date.inputValue()}”`)
      log.line(`balances: ${JSON.stringify(recordsOf(dataDir, 'balances').map((x) => [x.accountId, x.kind, x.date, x.amount]))}`)
    })
    await log.step('KR.6 wariant – baner, Dowództwo', async () => {
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(1500)
      const b = await log.screen(page, 'Mostek przed kreatorem (z saldem otwarcia)', 'body')
      await log.shot(page, 'KR.6-wariant-mostek')
      reading('kr', 'KR.6', `${STATE}, przed kreatorem`, { mostek: b.replace(/\s+/g, ' ').slice(b.replace(/\s+/g, ' ').indexOf('Komendy'), 2500) })
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(1500)
      await log.screen(page, 'Operacje (baner)', 'body')
      await page.keyboard.press('Control+8')
      await page.waitForTimeout(1500)
      await log.screen(page, 'Dowództwo przed kreatorem', 'main')
      await log.shot(page, 'KR.6-wariant-dowodztwo')
      log.line(`game/: ${JSON.stringify(recordsOf(dataDir, 'game').map((g) => [g.month, Object.keys((g.days as object) ?? {})]))}`)
      log.line(`game w fi.json: ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.game)}`)
    })
    await log.step('KR.8 krok 1 z pustym mBankiem', async () => {
      await page.keyboard.press('Control+1')
      await openWizard(page)
      await amount(balanceField(page, 'Portfel XTB'), '1250')
      await page.waitForTimeout(400)
      const t = await log.screen(page, 'krok 1', WIZ)
      await log.shot(page, 'KR.8-krok1')
      log.line(`mBank pole: „${await balanceField(page, 'mBank').inputValue()}”`)
      reading('kr', 'KR.8', STATE, { podpowiedz_mbank: grab(t, /(Ma już saldo otwarcia[^\n]*)/) })
    })
    await log.step('KR.8 krok 6 i start', async () => {
      await toStep(page, 5)
      const t = await log.screen(page, 'krok 6', WIZ)
      await log.shot(page, 'KR.8-krok6')
      reading('kr', 'KR.8', `${STATE}, krok 6`, { obecne: await page.getByTestId('wizard-total').innerText(), osłony: await page.getByTestId('wizard-split-shields').innerText(), kadłub: await page.getByTestId('wizard-split-hull').inputValue(), tekst: grab(t, /(Obecne środki[^\n]*)/) })
      await toStep(page, 6)
      const sc = page.getByTestId('wizard-shortcut')
      await sc.click()
      await sc.press('Backspace')
      const fin = page.getByTestId('wizard-finish')
      log.line(`„Uruchom budżet”: disabled=${await fin.isDisabled()}, title=${await fin.getAttribute('title')}`)
      await fin.click()
      const seen = new Set<string>()
      for (let i = 0; i < 12; i++) {
        for (const x of await toasts(page)) seen.add(x.replace(/\s+/g, ' '))
        await page.waitForTimeout(250)
      }
      log.line(`toasty: ${[...seen].join(' || ')}`)
      await expect(page.getByTestId('page-bridge')).toBeVisible()
      await page.waitForTimeout(2500)
      await logRecorded(run, log)
      const b = await log.screen(page, 'Mostek po starcie', '[data-testid="page-bridge"]')
      await log.shot(page, 'KR.8-mostek')
      const bal = recordsOf(dataDir, 'balances')
      log.line(`balances: ${JSON.stringify(bal.map((x) => [x.accountId, x.kind, x.date, x.amount]))}`)
      log.line(`budget: ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.budget)}`)
      reading('kr', 'KR.8', `${STATE}, po starcie`, {
        salda_otwarcia_mbank: bal.filter((x) => x.accountId === MBANK_ACCOUNT_ID).map((x) => `${x.kind} ${x.date} ${x.amount}`).join('; '),
        suma_kont: grab(b.replace(/\n/g, ' '), /Suma kont budżetu: ([\d  ,]+ zł)/),
        stan: grab(b.replace(/\n/g, ' '), /(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/)
      })
      await page.getByTestId('nav-settings').click()
      await page.getByTestId('settings-tab-accounts').click()
      await page.waitForTimeout(600)
      const rows = page.getByTestId('account-row')
      for (let i = 0; i < (await rows.count()); i++) {
        const r = rows.nth(i)
        log.line(`konto ${i}: saldo teraz ${await r.getByTestId('account-balance').innerText()}, saldo otwarcia „${await r.getByTestId('account-opening').inputValue()}” z dnia „${await r.getByTestId('account-opening-date').inputValue()}”`)
      }
      await page.keyboard.press('Control+8')
      await page.waitForTimeout(1500)
      await log.screen(page, 'Dowództwo po starcie', 'main')
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
