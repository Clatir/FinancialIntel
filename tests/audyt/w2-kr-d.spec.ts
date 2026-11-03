/**
 * AU-11 skeptical check W2 – KR.29 (copy of kr-ro.spec.ts with own run names and shots): the wizard on a folder that cannot be written.
 * (a) the point's variant: a new folder (first-run proposal), closed, every file and folder given the Windows attribute
 *     „tylko do odczytu” (attrib +R /S /D), started again; answers mBank 5 000, Portfel 0, salary 4 000, costs 3 000.
 * (b) the app's own read-only mode: a new folder whose fi.json says schemaVersion 2 (a newer app's format).
 * The attribute is taken off at the end of (a).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { start } from './lab'
import { Log, WIZ, amount, balanceField, checksums, diff, disarmAutostart, logDiff, newBudget, readJson, recordsOf, toStep, toasts } from './kr-pomoc'

async function checkWizard(page: Page, log: Log): Promise<void> {
  log.line(`„Dodaj domownika” (pusty): disabled=${await page.getByTestId('wizard-member-add').isDisabled()}; pole imienia: disabled=${await page.getByTestId('wizard-member-name').isDisabled()}`)
  await page.getByTestId('wizard-member-name').fill('Ola').catch(() => undefined)
  log.line(`„Dodaj domownika” z imieniem: disabled=${await page.getByTestId('wizard-member-add').isDisabled()}`)
  await amount(balanceField(page, 'mBank'), '5000')
  await amount(balanceField(page, 'Portfel XTB'), '0')
  await toStep(page, 2)
  await amount(page.getByTestId('wizard-salary'), '4000')
  await amount(page.getByTestId('wizard-assumed-costs'), '3000')
  await toStep(page, 4)
  await page.getByTestId('wizard-goal-name').fill('Test')
  await amount(page.getByTestId('wizard-goal-target'), '100')
  log.line(`„Dodaj cel” z nazwą i kwotą: disabled=${await page.getByTestId('wizard-goal-add').isDisabled()}; „Wybierz folder…” disabled=${await page.getByTestId('wizard-ictj-pick').isDisabled()}`)
  await toStep(page, 6)
  const fin = page.getByTestId('wizard-finish')
  log.line(`„Uruchom budżet”: disabled=${await fin.isDisabled()}, title=„${await fin.getAttribute('title')}”`)
  await log.screen(page, 'krok 7', WIZ)
}

async function tryFinish(page: Page, log: Log): Promise<void> {
  const fin = page.getByTestId('wizard-finish')
  if (await fin.isDisabled()) return
  await page.getByTestId('wizard-shortcut').click()
  await page.getByTestId('wizard-shortcut').press('Backspace')
  await fin.click()
  const seen = new Set<string>()
  for (let i = 0; i < 20; i++) {
    for (const x of await toasts(page)) seen.add(x.replace(/\s+/g, ' '))
    await page.waitForTimeout(250)
  }
  log.line(`toasty po „Uruchom budżet”: ${[...seen].join(' || ')}`)
  await page.waitForTimeout(2000)
  await log.screen(page, 'okno po „Uruchom budżet”', 'body')
}

test('KR.29 (a) – folder z atrybutem tylko do odczytu', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'w2-kr-d3'
  const log = new Log(NAME)
  const first = await newBudget(NAME, log)
  const dataDir = first.dataDir
  await first.run.app.close()
  execFileSync('attrib', ['+R', join(dataDir, '*'), '/S', '/D'])
  execFileSync('attrib', ['+R', dataDir])
  log.line(`attrib: ${execFileSync('attrib', [join(dataDir, 'fi.json')], { encoding: 'utf8' }).trim()}`)
  const before = checksums(dataDir)
  const run = await start(NAME, { fresh: false, dataDir })
  const { page } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    await log.screen(page, 'Mostek (folder z atrybutem R)', 'body')
    await log.shot(page, 'W2-KR.29-atrybut-mostek')
    log.line(`baner kreatora: ${await page.getByTestId('banner-wizard-start').count()}; komunikat tylko do odczytu: ${await page.getByText(/tylko do odczytu/).count()}`)
    await page.getByTestId('banner-wizard-start').click()
    await expect(page.getByTestId('page-wizard')).toBeVisible()
    await checkWizard(page, log)
    await log.shot(page, 'W2-KR.29-atrybut-krok7')
    await tryFinish(page, log)
    await log.shot(page, 'W2-KR.29-atrybut-po')
    logDiff(log, 'folder (atrybut R) po próbie startu', diff(before, checksums(dataDir)))
    log.line(`fi.json budget: ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.budget)}; balances ${recordsOf(dataDir, 'balances').length}; months ${recordsOf(dataDir, 'months').length}; members ${(readJson(dataDir, 'fi.json') as any).settings.household.members.map((m: any) => m.name).join(', ')}`)
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ').slice(0, 1500) : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
    execFileSync('attrib', ['-R', join(dataDir, '*'), '/S', '/D'])
    execFileSync('attrib', ['-R', dataDir])
  }
})

test('KR.29 (b) – folder tylko do odczytu (format nowszej wersji)', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'w2-kr-d2'
  const log = new Log(NAME)
  const first = await newBudget(NAME, log)
  const dataDir = first.dataDir
  await first.run.app.close()
  const fiPath = join(dataDir, 'fi.json')
  const fi = JSON.parse(readFileSync(fiPath, 'utf8'))
  fi.schemaVersion = 2
  writeFileSync(fiPath, `${JSON.stringify(fi, null, 2)}\n`)
  const before = checksums(dataDir)
  const run = await start(NAME, { fresh: false, dataDir })
  const { page } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    await log.screen(page, 'Mostek (format v2)', 'body')
    await log.shot(page, 'W2-KR.29-nowszy-mostek')
    log.line(`baner kreatora: ${await page.getByTestId('banner-wizard-start').count()}`)
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('Kreator startu')
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('page-wizard')).toBeVisible()
    await checkWizard(page, log)
    await log.shot(page, 'W2-KR.29-nowszy-krok7')
    await tryFinish(page, log)
    logDiff(log, 'folder (v2) po próbie', diff(before, checksums(dataDir)))
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ').slice(0, 1500) : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
