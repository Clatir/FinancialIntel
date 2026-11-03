/**
 * AU-11 skeptical check W2 – KR.13 (the banner „Kreator startu” on the Import screen during the wizard), KR.31 (leaving
 * the wizard and coming back by the banner / the palette; closing during the wizard), then KR.23 (step 6 vs the Mostek
 * after the start, no operations of today).
 * State: a new folder + kr-krotka.csv imported in step 2. Answers: mBank 10 000, Portfel XTB 0, salary 5 000; after the
 * restart: mBank 40 000, Portfel 0, salary 4 000, goal „B” 3 500, split proposed.
 */
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { reading, start } from './lab'
import { KR_FILES, Log, SIMPLE, WIZ, amount, balanceField, disarmAutostart, importFromWizard, newBudget, openWizard, readJson, recordsOf, toStep, toasts } from './kr-pomoc'

const NAME = 'w2-kr-b'

/** The answers as the fields show them – read without moving the wizard first (the step it opened on is logged). */
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

test('W2 – KR.13 / KR.31 / KR.23', async () => {
  test.setTimeout(25 * 60_000)
  const log = new Log(NAME)
  const first = await newBudget(NAME, log)
  const dataDir = first.dataDir
  let run = first.run
  try {
    const { page } = run
    await openWizard(page)
    await log.step('kroki 1–2 z importem, potem pensja', async () => {
      await amount(balanceField(page, 'mBank'), '10000')
      await amount(balanceField(page, 'Portfel XTB'), '0')
      await page.getByTestId('wizard-next').click()
      await importFromWizard(run, log, join(KR_FILES, 'kr-krotka.csv'), SIMPLE)
      await page.getByTestId('import-back-to-wizard').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(800)
      await log.screen(page, 'krok 2 po „Wróć do kreatora”', WIZ)
      await toStep(page, 2)
      await amount(page.getByTestId('wizard-salary'), '5000')
      log.line(`kontrola (po „Wróć do kreatora” i pensji): ${await answers(page)}`)
    })
    await log.step('KR.13 baner na ekranie Import', async () => {
      await toStep(page, 1)
      await page.getByTestId('wizard-import').click()
      await expect(page.getByTestId('page-import')).toBeVisible()
      const banner = page.getByTestId('banner-wizard-start')
      log.line(`na Imporcie: „Wróć do kreatora” ${await page.getByTestId('import-back-to-wizard').count()}, baner ${await banner.count()} – „${(await banner.count()) ? (await banner.locator('xpath=..').innerText()).replace(/\s+/g, ' ') : ''}”`)
      await log.shot(page, 'W2-KR.13-import')
      await banner.click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(300)
      log.line(`po banerze z Importu: ${await answers(page)}`)
      await log.shot(page, 'W2-KR.13-po-banerze')
    })
    await log.step('KR.31 Ctrl+2 i baner', async () => {
      await fill(page)
      log.line(`przed wyjściem: ${await answers(page)}`)
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(1000)
      const banner = page.getByTestId('banner-wizard-start')
      log.line(`baner w Operacjach: „${(await banner.locator('xpath=..').innerText().catch(() => '?')).replace(/\s+/g, ' ')}”`)
      await banner.click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(300)
      log.line(`po powrocie banerem: ${await answers(page)}`)
      await log.shot(page, 'W2-KR.31-baner')
    })
    await log.step('KR.31 Ctrl+2 i paleta', async () => {
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
      await log.shot(page, 'W2-KR.31-paleta')
    })
    await log.step('KR.31 zamknięcie w trakcie', async () => {
      await fill(page)
      log.line(`przed zamknięciem: ${await answers(page)}`)
    })
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  log.line(`po zamknięciu: balances ${recordsOf(dataDir, 'balances').length}, months ${recordsOf(dataDir, 'months').length}, budget ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.budget)}`)
  run = await start(NAME, { fresh: false, dataDir })
  try {
    const { page } = run
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    await log.screen(page, 'Mostek po ponownym uruchomieniu', '[data-testid="page-bridge"]')
    await openWizard(page)
    log.line(`kreator po ponownym uruchomieniu: ${await answers(page)}`)
    await log.shot(page, 'W2-KR.31-restart')
    await log.step('KR.23 – 40 000, pensja 4 000, cel B 3 500, start z propozycją', async () => {
      await toStep(page, 0)
      await amount(balanceField(page, 'mBank'), '40000')
      await amount(balanceField(page, 'Portfel XTB'), '0')
      await toStep(page, 2)
      await amount(page.getByTestId('wizard-salary'), '4000')
      await toStep(page, 4)
      await page.getByTestId('wizard-goal-name').fill('B')
      await amount(page.getByTestId('wizard-goal-target'), '3500')
      await page.getByTestId('wizard-goal-add').click()
      await page.waitForTimeout(500)
      await toStep(page, 5)
      const t = await log.screen(page, 'krok 6', WIZ)
      await log.shot(page, 'W2-KR.23-krok6')
      reading('w2', 'KR.23', 'pusty + kr-krotka.csv, 40 000 / pensja 4 000 / cel B 3 500 (w2-kr-b), krok 6', {
        obecne: await page.getByTestId('wizard-total').innerText(),
        oslony: await page.getByTestId('wizard-split-shields').innerText(),
        kadlub: await page.getByTestId('wizard-split-hull').inputValue(),
        tekst: t.match(/(Obecne środki[^\n]*)/)?.[1] ?? null
      })
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
      const b = await log.screen(page, 'Mostek po starcie', '[data-testid="page-bridge"]')
      await log.shot(page, 'W2-KR.23-mostek')
      reading('w2', 'KR.23', 'w2-kr-b po starcie – Mostek', { stan: b.replace(/\n/g, ' ').match(/(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/)?.[1] ?? null })
      log.line(`budget: ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.budget)}`)
      log.line(`months: ${JSON.stringify(recordsOf(dataDir, 'months').map((m) => [m.month, m.salary, m.paid ?? null]))}`)
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
