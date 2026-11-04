/**
 * Audit KR – balances of step 1 and the household at the start (KR.7, KR.9, KR.11, KR.12; KR.22 skipped).
 * State: a new folder (first-run proposal) + an operation typed on mBank dated in 5 days (−300,00 zł, written as the app
 * writes records before the second start) + kr-dzis.csv imported in step 2 (the persona's history and two card purchases
 * of today: −45,90 and −12,00).
 * Answers: mBank 8 432,17, Portfel XTB 1 250,00, Gotówka empty; „Ania” ma oddać 240,00 (a deposit tried too, then
 * 240 again), „Łukasz Żółć” zaliczka 300,00; salary proposed; no cargo; ICTTJ skipped; split proposed.
 */
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { ulid } from 'ulid'
import { addDays, warsawNow } from '../../src/shared/calc/dates'
import { MBANK_ACCOUNT_ID, defaultCategoryId } from '../../src/shared/schema/budget'
import { reading, start } from './lab'
import { KR_FILES, Log, WIZ, amount, balanceField, disarmAutostart, importFromWizard, logRecorded, newBudget, openWizard, readJson, recordsOf, toStep, toasts, writeRecord, SIMPLE } from './kr-pomoc'

const NAME = process.env.KR_RUN ?? 'kr-salda'
const STATE = `pusty + operacja ręczna mBank +5 dni −300 + kr-dzis.csv (przebieg ${NAME})`
const grab = (t: string, re: RegExp) => t.match(re)?.[1] ?? null


test('KR – salda kroku 1, operacja po dziś, domownicy na start', async () => {
  test.setTimeout(20 * 60_000)
  const log = new Log(NAME)
  const today = warsawNow().date
  const ahead = addDays(today, 5)
  // 1st start: the folder from the proposal; closed; the operation dated ahead written; 2nd start.
  const first = await newBudget(NAME, log)
  const dataDir = first.dataDir
  await first.run.app.close()
  const at = new Date().toISOString()
  const rel = writeRecord(dataDir, 'transactions', {
    schemaVersion: 1,
    id: ulid(),
    createdAt: at,
    updatedAt: at,
    updatedBy: 'AUDYT',
    date: ahead,
    time: null,
    accountId: MBANK_ACCOUNT_ID,
    kind: 'expense',
    amount: -30000,
    categoryId: defaultCategoryId(9, 2),
    counterparty: 'Sklep Rowerowy',
    note: 'zamówione, płatność za 5 dni',
    impulse: null,
    logNote: '',
    memberId: null,
    refundable: false,
    counterAccountId: null
  })
  log.line(`operacja z datą ${ahead}: ${rel}`)
  const run = await start(NAME, { dataDir, fresh: false })
  const { page } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    await openWizard(page)
    await log.step('KR.11 domownicy w kroku 1', async () => {
      await page.getByTestId('wizard-member-name').fill('Ania')
      await page.getByTestId('wizard-member-add').click()
      await page.waitForTimeout(400)
      await page.getByTestId('wizard-member-name').fill('Łukasz Żółć')
      await page.getByTestId('wizard-member-add').click()
      await page.waitForTimeout(400)
      const ania = page.locator('[data-testid="wizard-member-row"][data-name="Ania"]')
      const lukasz = page.locator('[data-testid="wizard-member-row"][data-name="Łukasz Żółć"]')
      log.line(`wiersze domowników: ${await page.getByTestId('wizard-member-row').count()} (${(await page.getByTestId('wizard-member-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')))).join(', ')})`)
      await amount(ania.getByTestId('wizard-member-owed'), '240')
      await amount(lukasz.getByTestId('wizard-member-deposit'), '300')
      await page.waitForTimeout(300)
      log.line(`Ania: ma oddać ${await ania.getByTestId('wizard-member-owed').inputValue()}, zaliczka ${await ania.getByTestId('wizard-member-deposit').inputValue()}`)
      await amount(ania.getByTestId('wizard-member-deposit'), '50')
      await page.waitForTimeout(300)
      log.line(`Ania po wpisaniu zaliczki 50: ma oddać „${await ania.getByTestId('wizard-member-owed').inputValue()}”, zaliczka „${await ania.getByTestId('wizard-member-deposit').inputValue()}”`)
      await amount(ania.getByTestId('wizard-member-owed'), '240')
      await page.waitForTimeout(300)
      log.line(`Ania po ponownym 240: ma oddać „${await ania.getByTestId('wizard-member-owed').inputValue()}”, zaliczka „${await ania.getByTestId('wizard-member-deposit').inputValue()}”`)
      log.line(`Łukasz: ma oddać „${await lukasz.getByTestId('wizard-member-owed').inputValue()}”, zaliczka „${await lukasz.getByTestId('wizard-member-deposit').inputValue()}”`)
      await log.screen(page, 'krok 1 z domownikami', WIZ)
      await log.shot(page, 'KR.11-krok1')
      const fi = readJson(dataDir, 'fi.json') as any
      log.line(`household w fi.json (przed startem): ${JSON.stringify(fi.settings.household)}`)
    })
    await log.step('KR.7 / KR.9 salda w kroku 1', async () => {
      await amount(balanceField(page, 'mBank'), '8432,17')
      await amount(balanceField(page, 'Portfel XTB'), '1250')
      await page.waitForTimeout(300)
      const t = await log.screen(page, 'krok 1 z saldami (przed importem)', WIZ)
      log.line(`Gotówka pole: „${await balanceField(page, 'Gotówka').inputValue()}”`)
      reading('kr', 'KR.7', STATE, { mbank_wpisane: '8 432,17', portfel_wpisane: '1 250,00', gotowka: 'puste', podpowiedz_mbank: grab(t, /(Na koncie [^\n]*)/) })
    })
    await log.step('krok 2 – import kr-dzis.csv', async () => {
      await page.getByTestId('wizard-next').click()
      await importFromWizard(run, log, join(KR_FILES, 'kr-dzis.csv'), SIMPLE)
      await page.getByTestId('import-back-to-wizard').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(1500)
      await log.screen(page, 'krok 2 po imporcie', WIZ)
      await toStep(page, 0)
      const t = await log.screen(page, 'krok 1 po imporcie', WIZ)
      await log.shot(page, 'KR.9-krok1')
      log.line(`salda: mBank „${await balanceField(page, 'mBank').inputValue()}”, Portfel „${await balanceField(page, 'Portfel XTB').inputValue()}”, Gotówka „${await balanceField(page, 'Gotówka').inputValue()}”`)
      reading('kr', 'KR.9', STATE, { mbank_teraz: await balanceField(page, 'mBank').inputValue(), podpowiedz: grab(t, /(Na koncie [^\n]*)/) })
    })
    await log.step('kroki 3–5', async () => {
      await toStep(page, 2)
      await log.screen(page, 'krok 3', WIZ)
      await toStep(page, 3)
      await log.screen(page, 'krok 4', WIZ)
      await toStep(page, 4)
      await log.screen(page, 'krok 5 (pominięty)', WIZ)
      await log.shot(page, 'KR.22-pominiety')
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(400)
      log.line(`po „Dalej” z kroku 5: ${await page.locator(`${WIZ} h1`).innerText()}`)
    })
    await log.step('KR.12 krok 6', async () => {
      await toStep(page, 5)
      const t = await log.screen(page, 'krok 6', WIZ)
      await log.shot(page, 'KR.12-krok6')
      reading('kr', 'KR.12', `${STATE}, krok 6`, {
        obecne: await page.getByTestId('wizard-total').innerText(),
        osłony: await page.getByTestId('wizard-split-shields').innerText(),
        kadłub: await page.getByTestId('wizard-split-hull').inputValue(),
        tekst: grab(t, /(Obecne środki[^\n]*)/)
      })
    })
    await log.step('krok 7 i start', async () => {
      await toStep(page, 6)
      const sc = page.getByTestId('wizard-shortcut')
      await sc.click()
      await sc.press('Backspace')
      await page.getByTestId('wizard-finish').click()
      const seen = new Set<string>()
      for (let i = 0; i < 12; i++) {
        for (const x of await toasts(page)) seen.add(x.replace(/\s+/g, ' '))
        await page.waitForTimeout(250)
      }
      log.line(`toasty: ${[...seen].join(' || ')}`)
      await expect(page.getByTestId('page-bridge')).toBeVisible()
      await page.waitForTimeout(2500)
      await logRecorded(run, log)
    })
    await log.step('po starcie – Mostek, pliki', async () => {
      const b = await log.screen(page, 'Mostek', '[data-testid="page-bridge"]')
      await log.shot(page, 'KR.12-mostek')
      const bal = recordsOf(dataDir, 'balances')
      log.line(`balances: ${JSON.stringify(bal.map((x) => [x.accountId, x.kind, x.date, x.amount]))}`)
      const fi = readJson(dataDir, 'fi.json') as any
      log.line(`budget: ${JSON.stringify(fi.settings.budget)}`)
      log.line(`household: ${JSON.stringify(fi.settings.household)}`)
      const tx = recordsOf(dataDir, 'transactions').filter((x) => (x.date as string) >= today)
      log.line(`operacje od dziś: ${JSON.stringify(tx.map((x) => [x.date, x.accountId, x.amount, x.counterparty]))}`)
      const v = (re: RegExp) => grab(b.replace(/\n/g, ' '), re)
      reading('kr', 'KR.7', `${STATE}, po starcie`, {
        saldo_otwarcia_mbank: (bal.find((x) => x.accountId === MBANK_ACCOUNT_ID)?.amount as number) ?? null,
        suma_kont: v(/Suma kont budżetu: ([\d  ,]+ zł)/)
      })
      reading('kr', 'KR.11', `${STATE}, po starcie – Mostek`, {
        rozliczenia: v(/(ROZLICZENIA Z DOMOWNIKAMI.*?)(?:PRZYCHODY|OSTATNIE)/)
      })
      reading('kr', 'KR.12', `${STATE}, po starcie – Mostek`, { stan: v(/(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/) })
    })
    await log.step('KR.7 Ustawienia → Konta', async () => {
      await page.getByTestId('nav-settings').click()
      await page.getByTestId('settings-tab-accounts').click()
      await page.waitForTimeout(600)
      const rows = page.getByTestId('account-row')
      for (let i = 0; i < (await rows.count()); i++) {
        const r = rows.nth(i)
        log.line(
          `konto ${await r.getByTestId('account-name').inputValue().catch(() => '?')}: saldo teraz ${await r.getByTestId('account-balance').innerText()}, saldo otwarcia „${await r.getByTestId('account-opening').inputValue()}” z dnia „${await r.getByTestId('account-opening-date').inputValue()}”`
        )
      }
      await log.shot(page, 'KR.7-konta')
    })
    await log.step('KR.11 Ustawienia → Domownicy', async () => {
      await page.getByTestId('settings-tab-household').click()
      await page.waitForTimeout(600)
      await log.screen(page, 'Ustawienia → Domownicy', 'main')
      const inputs = await page.locator('main input').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label') ?? e.getAttribute('data-testid') ?? ''}=${(e as HTMLInputElement).value}`))
      log.line(`pola: ${inputs.join(' | ')}`)
      await log.shot(page, 'KR.11-domownicy')
    })
    await log.step('KR.9 Operacje i Radar', async () => {
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(1500)
      const o = await log.screen(page, 'Operacje', 'main')
      reading('kr', 'KR.9', `${STATE}, po starcie – Operacje`, { konta: grab(o.replace(/\n/g, ' '), /(mBank [−\-\d  ,]+ zł.*?Gotówka [−\-\d  ,]+ zł)/) })
      await page.keyboard.press('Control+7')
      await page.waitForTimeout(2000)
      const r = await log.screen(page, 'Radar', 'main')
      await log.shot(page, 'KR.9-radar')
      reading('kr', 'KR.9', `${STATE}, po starcie – Radar`, { radar: r.replace(/\s+/g, ' ').slice(0, 2500) })
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
