/**
 * AU-11 skeptical check W2 – KR.12 / KR.23 / R-4 (step 6 base and the shields after the start) and KR.19 (proposals of
 * the persona's history: TAURON every 2 months, SPOTIFY stopped in July).
 * State: a new folder (first-run proposal) + kr-dzis.csv in step 2 (the persona's history + two purchases of today:
 * −45,90 and −12,00). Answers: Ania ma oddać 240, Łukasz Żółć zaliczka 300; mBank 8 432,17, Portfel XTB 1 250; salary
 * proposed; nothing in the cargo; ICTTJ skipped; split proposed.
 */
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { MBANK_ACCOUNT_ID } from '../../src/shared/schema/budget'
import { reading } from './lab'
import { KR_FILES, Log, SIMPLE, WIZ, amount, balanceField, disarmAutostart, importFromWizard, logRecorded, newBudget, openWizard, readJson, recordsOf, toStep, toasts } from './kr-pomoc'

const NAME = 'w2-kr-a'
const STATE = 'pusty + kr-dzis.csv (historia persony + dziś −45,90 i −12,00), Ania 240 / Łukasz 300 (przebieg w2-kr-a)'

test('W2 – KR.12 / KR.23 / R-4 / KR.19', async () => {
  test.setTimeout(25 * 60_000)
  const log = new Log(NAME)
  const { run, dataDir } = await newBudget(NAME, log)
  const { page } = run
  try {
    await openWizard(page)
    await log.step('krok 1 – domownicy i salda', async () => {
      await page.getByTestId('wizard-member-name').fill('Ania')
      await page.getByTestId('wizard-member-add').click()
      await page.waitForTimeout(400)
      await page.getByTestId('wizard-member-name').fill('Łukasz Żółć')
      await page.getByTestId('wizard-member-add').click()
      await page.waitForTimeout(400)
      await amount(page.locator('[data-testid="wizard-member-row"][data-name="Ania"]').getByTestId('wizard-member-owed'), '240')
      await amount(page.locator('[data-testid="wizard-member-row"][data-name="Łukasz Żółć"]').getByTestId('wizard-member-deposit'), '300')
      await amount(balanceField(page, 'mBank'), '8432,17')
      await amount(balanceField(page, 'Portfel XTB'), '1250')
      await page.waitForTimeout(300)
      await log.screen(page, 'krok 1', WIZ)
    })
    await log.step('krok 2 – import kr-dzis.csv', async () => {
      await page.getByTestId('wizard-next').click()
      await importFromWizard(run, log, join(KR_FILES, 'kr-dzis.csv'), SIMPLE)
      await page.getByTestId('import-back-to-wizard').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(1500)
      await toStep(page, 0)
      await log.screen(page, 'krok 1 po imporcie', WIZ)
      log.line(`pola: mBank „${await balanceField(page, 'mBank').inputValue()}”, Portfel „${await balanceField(page, 'Portfel XTB').inputValue()}”`)
    })
    await log.step('krok 3 i 4 (KR.19)', async () => {
      await toStep(page, 2)
      await log.screen(page, 'krok 3', WIZ)
      await toStep(page, 3)
      await log.screen(page, 'krok 4', WIZ)
      await log.shot(page, 'W2-KR.19-krok4')
      const cargo = page.getByTestId('wizard-cargo')
      const props: string[] = []
      for (let i = 0; i < (await cargo.count()); i++) props.push((await cargo.nth(i).innerText()).replace(/\s+/g, ' '))
      log.line(`propozycje ładowni: ${props.join(' | ')}`)
      reading('w2', 'KR.19', STATE, { propozycje: props.join(' | ') })
    })
    await log.step('krok 6 (KR.12 / R-4)', async () => {
      await toStep(page, 5)
      const t = await log.screen(page, 'krok 6', WIZ)
      await log.shot(page, 'W2-KR.12-krok6')
      reading('w2', 'KR.12', `${STATE}, krok 6`, {
        obecne: await page.getByTestId('wizard-total').innerText(),
        oslony: await page.getByTestId('wizard-split-shields').innerText(),
        kadlub: await page.getByTestId('wizard-split-hull').inputValue(),
        tekst: t.match(/(Obecne środki[^\n]*)/)?.[1] ?? null
      })
    })
    await log.step('start', async () => {
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
      await log.shot(page, 'W2-KR.12-mostek')
      const bal = recordsOf(dataDir, 'balances')
      log.line(`balances: ${JSON.stringify(bal.map((x) => [x.accountId, x.kind, x.date, x.amount]))}`)
      const fi = readJson(dataDir, 'fi.json') as any
      log.line(`budget: ${JSON.stringify(fi.settings.budget)}`)
      const flat = b.replace(/\n/g, ' ')
      reading('w2', 'KR.12', `${STATE}, po starcie – Mostek`, {
        stan: flat.match(/(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/)?.[1] ?? null,
        saldo_otwarcia_mbank: (bal.find((x) => x.accountId === MBANK_ACCOUNT_ID)?.amount as number) ?? null
      })
      await page.keyboard.press('Control+5')
      await page.waitForTimeout(1500)
      await log.screen(page, 'Ładownia', 'main')
      await log.shot(page, 'W2-KR.19-ladownia')
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
