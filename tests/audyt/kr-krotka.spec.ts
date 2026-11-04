/**
 * Audit KR – a history shorter than 3 full months (KR.18) and a start with a negative balance (KR.10).
 * KR.18 state: a new folder + kr-krotka.csv (the persona's rows 01.09–01.11 this year: September and October full, November
 * begun); answers: mBank 72 073,56, Portfel 0; average costs 3 500,00; the rest proposed, ICTTJ skipped.
 * KR.10 state: a new folder, no history; answers: mBank −150,00, Portfel 0, salary 4 000,00, average costs 3 200,00.
 */
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { reading } from './lab'
import { KR_FILES, Log, SIMPLE, WIZ, amount, balanceField, disarmAutostart, importFromWizard, logRecorded, newBudget, openWizard, readJson, toStep, toasts } from './kr-pomoc'

const grab = (t: string, re: RegExp) => t.match(re)?.[1] ?? null

async function finish(page: Page, log: Log): Promise<void> {
  await toStep(page, 6)
  const sc = page.getByTestId('wizard-shortcut')
  await sc.click()
  await sc.press('Backspace')
  const fin = page.getByTestId('wizard-finish')
  log.line(`„Uruchom budżet”: disabled=${await fin.isDisabled()}, title=„${await fin.getAttribute('title')}”`)
  await fin.click()
  const seen = new Set<string>()
  for (let i = 0; i < 12; i++) {
    for (const x of await toasts(page)) seen.add(x.replace(/\s+/g, ' '))
    await page.waitForTimeout(250)
  }
  log.line(`toasty: ${[...seen].join(' || ')}`)
  await expect(page.getByTestId('page-bridge')).toBeVisible()
  await page.waitForTimeout(2500)
}

test('KR.18 – historia krótsza niż 3 pełne miesiące', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'kr-krotka'
  const STATE = `pusty + kr-krotka.csv (01.09–01.11, 2 pełne miesiące) (przebieg ${NAME})`
  const log = new Log(NAME)
  const { run, dataDir } = await newBudget(NAME, log)
  const { page } = run
  try {
    await openWizard(page)
    await amount(balanceField(page, 'mBank'), '72073,56')
    await amount(balanceField(page, 'Portfel XTB'), '0')
    await page.getByTestId('wizard-next').click()
    await importFromWizard(run, log, join(KR_FILES, 'kr-krotka.csv'), SIMPLE)
    await page.getByTestId('import-back-to-wizard').click()
    await expect(page.getByTestId('page-wizard')).toBeVisible()
    await page.waitForTimeout(1500)
    await log.screen(page, 'krok 2 po imporcie', WIZ)
    await toStep(page, 2)
    await log.screen(page, 'krok 3 przed', WIZ)
    await amount(page.getByTestId('wizard-assumed-costs'), '3500')
    await page.waitForTimeout(300)
    const t = await log.screen(page, 'krok 3 – koszty 3 500', WIZ)
    await log.shot(page, 'KR.18-krok3')
    reading('kr', 'KR.18', `${STATE}, krok 3`, { pensja: await page.getByTestId('wizard-salary').inputValue(), propozycja: grab(t, /(Średnie koszty netto[^\n]*)/), kadłub: grab(t, /(Cel kadłuba:[^\n]*)/), osłony: grab(t, /(Cel osłon:[^\n]*)/) })
    await toStep(page, 3)
    await log.screen(page, 'krok 4', WIZ)
    await toStep(page, 5)
    const t6 = await log.screen(page, 'krok 6', WIZ)
    reading('kr', 'KR.18', `${STATE}, krok 6`, { obecne: await page.getByTestId('wizard-total').innerText(), osłony: await page.getByTestId('wizard-split-shields').innerText(), kadłub: await page.getByTestId('wizard-split-hull').inputValue(), tekst: grab(t6, /(Obecne środki[^\n]*)/) })
    await finish(page, log)
    await logRecorded(run, log)
    const b = await log.screen(page, 'Mostek', '[data-testid="page-bridge"]')
    await log.shot(page, 'KR.18-mostek')
    const flat = b.replace(/\n/g, ' ')
    reading('kr', 'KR.18', `${STATE}, po starcie – Mostek`, { stan: grab(flat, /(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/) })
    log.line(`layers: ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.layers)}`)
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})

test('KR.10 – start z ujemnym saldem mBanku', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'kr-minus'
  const STATE = `pusty, bez historii; mBank −150,00, Portfel 0, pensja 4 000, koszty 3 200 (przebieg ${NAME})`
  const log = new Log(NAME)
  const { run } = await newBudget(NAME, log)
  const { page } = run
  try {
    await openWizard(page)
    await amount(balanceField(page, 'mBank'), '-150')
    await amount(balanceField(page, 'Portfel XTB'), '0')
    await toStep(page, 2)
    await amount(page.getByTestId('wizard-salary'), '4000')
    await amount(page.getByTestId('wizard-assumed-costs'), '3200')
    await toStep(page, 5)
    await log.screen(page, 'krok 6', WIZ)
    await log.shot(page, 'KR.10-minus-krok6-start')
    reading('kr', 'KR.10', `${STATE}, krok 6`, { obecne: await page.getByTestId('wizard-total').innerText(), osłony: await page.getByTestId('wizard-split-shields').innerText(), kadłub: await page.getByTestId('wizard-split-hull').inputValue() })
    await finish(page, log)
    const b = await log.screen(page, 'Mostek', '[data-testid="page-bridge"]')
    await log.shot(page, 'KR.10-minus-mostek')
    reading('kr', 'KR.10', `${STATE}, po starcie – Mostek`, { stan: grab(b.replace(/\n/g, ' '), /(STAN OKRĘTU.*?Suma kont budżetu: [−\-\d  ,]+ zł)/), energia: grab(b.replace(/\n/g, ' '), /(ENERGIA DZIŚ.*?skąd ta liczba\?)/) })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
