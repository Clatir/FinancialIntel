/**
 * Audit KR – moving through the wizard, leaving it and coming back (KR.30, KR.31; KR.13: the banner „Kreator startu” on
 * the Import screen while the wizard runs).
 * State: a new folder + kr-krotka.csv imported in step 2 (the history is not what is checked here).
 * Answers typed again and again: mBank 10 000,00, Portfel XTB 0, salary 5 000,00; member „Kasia”, goal „Wakacje”
 * 2 000,00; „Przerwij kreator”; then the app closed during the wizard and started again.
 */
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { start } from './lab'
import { KR_FILES, Log, SIMPLE, WIZ, amount, balanceField, checksums, diff, importFromWizard, logDiff, newBudget, openWizard, readJson, recordsOf, toStep } from './kr-pomoc'

const NAME = process.env.KR_RUN ?? 'kr-nawigacja'

async function answers(page: Page): Promise<string> {
  const step = await page.locator(`${WIZ} h1`).innerText().catch(() => '?')
  await toStep(page, 0)
  const b = `mBank „${await balanceField(page, 'mBank').inputValue()}”, Portfel „${await balanceField(page, 'Portfel XTB').inputValue()}”`
  await toStep(page, 2)
  const s = `pensja „${await page.getByTestId('wizard-salary').inputValue()}”`
  return `[otwarty na: ${step}] ${b}, ${s}`
}

async function fill(page: Page): Promise<void> {
  await toStep(page, 0)
  await amount(balanceField(page, 'mBank'), '10000')
  await amount(balanceField(page, 'Portfel XTB'), '0')
  await toStep(page, 2)
  await amount(page.getByTestId('wizard-salary'), '5000')
}

async function steps(page: Page): Promise<string> {
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const b = page.getByTestId(`wizard-step-${i}`)
    const cls = (await b.getAttribute('class')) ?? ''
    out.push(`${i + 1}:${(await b.innerText()).replace(/\s+/g, ' ')}${cls.includes('border-accent') ? '[bieżący]' : ''}${(await b.locator('svg').count()) ? '[✓]' : ''}`)
  }
  return out.join(' | ')
}

test('KR.30 / KR.31 – nawigacja, przerwanie, opuszczenie i powrót', async () => {
  test.setTimeout(20 * 60_000)
  const log = new Log(NAME)
  const first = await newBudget(NAME, log)
  const dataDir = first.dataDir
  let run = first.run
  try {
    const { page } = run
    await openWizard(page)
    await log.step('KR.30 Dalej / Wstecz przez wszystkie kroki', async () => {
      log.line(`krok 1: Wstecz disabled=${await page.getByTestId('wizard-back').isDisabled()}; lista: ${await steps(page)}`)
      await amount(balanceField(page, 'mBank'), '10000')
      await amount(balanceField(page, 'Portfel XTB'), '0')
      await page.getByTestId('wizard-member-name').fill('Kasia')
      await page.getByTestId('wizard-member-add').click()
      await page.getByTestId('wizard-next').click()
      await importFromWizard(run, log, join(KR_FILES, 'kr-krotka.csv'), SIMPLE)
      await page.getByTestId('import-back-to-wizard').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      for (let i = 1; i < 7; i++) {
        log.line(`krok ${i + 1}: h1 „${await page.locator(`${WIZ} h1`).innerText()}”; lista: ${await steps(page)}`)
        if (i === 2) await amount(page.getByTestId('wizard-salary'), '5000')
        if (i === 4) {
          await page.getByTestId('wizard-goal-name').fill('Wakacje')
          await amount(page.getByTestId('wizard-goal-target'), '2000')
          await page.getByTestId('wizard-goal-add').click()
          await page.waitForTimeout(500)
        }
        if (i < 6) await page.getByTestId('wizard-next').click()
      }
      await log.shot(page, 'KR.30-krok7')
      log.line(`krok 7: „Dalej” widoczny=${await page.getByTestId('wizard-next').count()}, „Uruchom budżet”=${await page.getByTestId('wizard-finish').count()}`)
      for (let i = 6; i > 0; i--) await page.getByTestId('wizard-back').click()
      log.line(`po Wstecz ×6: h1 „${await page.locator(`${WIZ} h1`).innerText()}”, Wstecz disabled=${await page.getByTestId('wizard-back').isDisabled()}`)
      await page.getByTestId('wizard-step-5').click()
      await page.waitForTimeout(300)
      log.line(`klik w krok 6: h1 „${await page.locator(`${WIZ} h1`).innerText()}”, obecne ${await page.getByTestId('wizard-total').innerText()}, cele ${(await page.getByTestId('wizard-split-goal').allInnerTexts()).join(';').replace(/\s+/g, ' ')}; lista: ${await steps(page)}`)
      await log.shot(page, 'KR.30-skok6')
      log.line(`odpowiedzi: ${await answers(page)}`)
    })
    await log.step('KR.13 baner „Kreator startu” na ekranie Import w trakcie kreatora', async () => {
      await toStep(page, 1)
      await page.getByTestId('wizard-import').click()
      await expect(page.getByTestId('page-import')).toBeVisible()
      log.line(`na Imporcie: „Wróć do kreatora” ${await page.getByTestId('import-back-to-wizard').count()}, baner „Kreator startu” ${await page.getByTestId('banner-wizard-start').count()}`)
      await log.shot(page, 'KR.13-baner-import')
      await page.getByTestId('banner-wizard-start').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(300)
      log.line(`po banerze z Importu: ${await answers(page)}`)
      await log.shot(page, 'KR.13-po-banerze')
    })
    await log.step('KR.31 Ctrl+2 i powrót banerem', async () => {
      await fill(page)
      log.line(`przed wyjściem: ${await answers(page)}`)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(1000)
      await log.screen(page, 'Operacje w trakcie kreatora (baner)', 'body')
      await page.getByTestId('banner-wizard-start').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(300)
      log.line(`po powrocie banerem: ${await answers(page)}`)
      await log.shot(page, 'KR.31-baner')
    })
    await log.step('KR.31 Ctrl+2 i powrót paletą', async () => {
      await fill(page)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.keyboard.press('Control+k')
      await expect(page.getByTestId('palette')).toBeVisible()
      await page.getByTestId('palette-input').fill('Kreator startu')
      await page.waitForTimeout(400)
      await page.keyboard.press('Enter')
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(300)
      log.line(`po powrocie paletą: ${await answers(page)}`)
      await log.shot(page, 'KR.31-paleta')
    })
    const beforeAbort = checksums(dataDir)
    await log.step('KR.30 Przerwij kreator', async () => {
      await fill(page)
      await toStep(page, 6)
      await page.getByRole('button', { name: 'Przerwij kreator' }).click()
      await page.waitForTimeout(1500)
      await log.screen(page, 'po „Przerwij kreator”', 'body')
      await log.shot(page, 'KR.30-przerwij')
      log.line(`strona kreatora po przerwaniu: ${await page.getByTestId('page-wizard').count()}, Mostek: ${await page.getByTestId('page-bridge').count()}`)
      logDiff(log, 'folder po przerwaniu', diff(beforeAbort, checksums(dataDir)))
      const fi = readJson(dataDir, 'fi.json') as any
      log.line(`budget: ${JSON.stringify(fi.settings.budget)}; domownicy: ${fi.settings.household.members.map((m: any) => m.name).join(', ')}`)
      log.line(`balances: ${recordsOf(dataDir, 'balances').length}, months: ${recordsOf(dataDir, 'months').length}, goals: ${JSON.stringify(recordsOf(dataDir, 'goals').map((g) => [g.name, g.target]))}`)
      await page.getByTestId('nav-settings').click()
      await page.getByTestId('settings-tab-household').click()
      await page.waitForTimeout(500)
      const names = await page.locator('main input').evaluateAll((els) => els.filter((e) => e.getAttribute('aria-label') === 'Imię domownika').map((e) => (e as HTMLInputElement).value))
      log.line(`Ustawienia → Domownicy: ${names.join(', ')}`)
      await page.keyboard.press('Control+6')
      await page.waitForTimeout(800)
      await log.screen(page, 'Mapa gwiezdna po przerwaniu', 'main')
    })
    await log.step('KR.31 zamknięcie w trakcie kreatora', async () => {
      await page.keyboard.press('Control+1')
      await openWizard(page)
      await fill(page)
      log.line(`przed zamknięciem: ${await answers(page)}`)
    })
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  const afterClose = checksums(dataDir)
  log.line(`po zamknięciu: balances ${recordsOf(dataDir, 'balances').length}, months ${recordsOf(dataDir, 'months').length}, budget ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.budget)}`)
  run = await start(NAME, { fresh: false, dataDir })
  try {
    const { page } = run
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    await log.screen(page, 'po ponownym uruchomieniu', 'body')
    await log.shot(page, 'KR.31-restart')
    await openWizard(page)
    log.line(`kreator po ponownym uruchomieniu: ${await answers(page)}`)
    await toStep(page, 0)
    await log.screen(page, 'krok 1 po ponownym uruchomieniu', WIZ)
    logDiff(log, 'folder: zamknięcie → ponowny start', diff(afterClose, checksums(dataDir)))
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})
