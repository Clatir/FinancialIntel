/**
 * Audit KR – step 6 „Podział środków” (KR.23, KR.24).
 * State: a new folder, no history; ICTTJ of this computer – a lab folder with one forecast „Plan A” and its goal „A”
 * 5 000 zł (priority 1); own goal „B” 3 500 zł added in step 5.
 * Answers: mBank 40 000,00, Portfel XTB 0, Gotówka empty; salary 4 000,00 (shields target 3 × 4 000 = 12 000), average
 * costs 3 650,00 (hull target 6 × 3 650 = 21 900); the split changed and restored, started with the proposal.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LAB, reading } from './lab'
import { Log, WIZ, amount, balanceField, checksums, diff, disarmAutostart, logDiff, logRecorded, newBudget, openWizard, readJson, recordsOf, toStep, toasts } from './kr-pomoc'

const NAME = process.env.KR_RUN ?? 'kr-podzial'
const STATE = `pusty, bez historii; ICTTJ: cel „A” 5 000 (prognoza); cel własny „B” 3 500; salda 40 000; pensja 4 000; średnie koszty 3 650 (przebieg ${NAME})`

function put(root: string, rel: string, data: unknown) {
  const file = join(root, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

async function split(page: Page, log: Log, label: string): Promise<Record<string, string>> {
  const goals: string[] = []
  const gi = page.getByTestId('wizard-split-goal')
  for (let i = 0; i < (await gi.count()); i++) goals.push(`${await gi.nth(i).getAttribute('data-name')}=${await gi.nth(i).locator('input').inputValue()}`)
  const shieldsEl = page.getByTestId('wizard-split-shields')
  const v = {
    obecne: await page.getByTestId('wizard-total').innerText(),
    osłony: await shieldsEl.innerText(),
    osłony_czerwone: String(/text-down/.test((await shieldsEl.getAttribute('class')) ?? '')),
    kadłub: await page.getByTestId('wizard-split-hull').inputValue(),
    cele: goals.join('; '),
    komunikat: (await page.getByTestId('wizard-split-over').count()) ? await page.getByTestId('wizard-split-over').innerText() : ''
  }
  log.line(`[${label}] ${JSON.stringify(v)}`)
  return v
}

test('KR – podział środków na start (KR.23, KR.24)', async () => {
  test.setTimeout(20 * 60_000)
  const log = new Log(NAME)
  const dir = join(LAB, 'przebiegi', NAME)
  const ictj = join(dir, 'ictj')
  rmSync(ictj, { recursive: true, force: true })
  put(ictj, 'journal.json', { schemaVersion: 1, settings: {} })
  put(ictj, 'forecasts/01KAZ71000000000000000A001.json', {
    schemaVersion: 1,
    id: '01KAZ71000000000000000A001',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    name: 'Plan A',
    currency: 'PLN',
    firstMonth: '2026-10',
    goals: [{ id: '01KAZ72000000000000000A001', name: 'A', month: 12, amount: 5000, enabled: true, flexible: false }]
  })
  mkdirSync(join(dir, 'brak-ictj', 'ICT Trade Journal'), { recursive: true })
  writeFileSync(join(dir, 'brak-ictj', 'ICT Trade Journal', 'config.json'), JSON.stringify({ dataDir: ictj }, null, 2))
  const ictjBefore = checksums(ictj)
  rmSync(join(dir, 'OneDrive'), { recursive: true, force: true })
  const { run, dataDir } = await newBudget(NAME, log)
  const { page } = run
  try {
    await openWizard(page)
    await log.step('kroki 1–5', async () => {
      await amount(balanceField(page, 'mBank'), '40000')
      await amount(balanceField(page, 'Portfel XTB'), '0')
      await toStep(page, 2)
      await amount(page.getByTestId('wizard-salary'), '4000')
      await amount(page.getByTestId('wizard-assumed-costs'), '3650')
      await page.waitForTimeout(300)
      await log.screen(page, 'krok 3', WIZ)
      await toStep(page, 4)
      await page.getByTestId('wizard-ictj-suggested').click()
      await expect.poll(async () => page.locator('[data-testid="wizard-goal"]').count(), { timeout: 45_000 }).toBeGreaterThan(0)
      await page.getByTestId('wizard-goal-name').fill('B')
      await amount(page.getByTestId('wizard-goal-target'), '3500')
      await page.getByTestId('wizard-goal-add').click()
      await expect(page.locator('[data-testid="wizard-goal"][data-name="B"]')).toBeVisible()
      await log.screen(page, 'krok 5', WIZ)
    })
    await log.step('KR.23 krok 6 – propozycja i zmiany', async () => {
      await toStep(page, 5)
      await page.waitForTimeout(500)
      await log.screen(page, 'krok 6 – propozycja', WIZ)
      await log.shot(page, 'KR.23-propozycja')
      reading('kr', 'KR.23', `${STATE}, krok 6 – propozycja`, await split(page, log, 'propozycja'))
      await amount(page.getByTestId('wizard-split-hull'), '15000')
      await page.waitForTimeout(300)
      await log.screen(page, 'krok 6 – kadłub 15 000', WIZ)
      await log.shot(page, 'KR.23-kadlub15000')
      reading('kr', 'KR.23', `${STATE}, krok 6 – kadłub 15 000`, await split(page, log, 'kadłub 15 000'))
      await page.getByRole('button', { name: 'propozycja', exact: true }).click()
      await page.waitForTimeout(300)
      reading('kr', 'KR.23', `${STATE}, krok 6 – po „propozycja”`, await split(page, log, 'po „propozycja”'))
      await amount(page.locator('[data-testid="wizard-split-goal"][data-name="B"] input'), '500')
      await page.waitForTimeout(300)
      reading('kr', 'KR.23', `${STATE}, krok 6 – cel B 500`, await split(page, log, 'cel B 500'))
      await log.screen(page, 'krok 6 – cel B 500', WIZ)
      await page.getByRole('button', { name: 'cele – propozycja', exact: true }).click()
      await page.waitForTimeout(300)
      reading('kr', 'KR.23', `${STATE}, krok 6 – po „cele – propozycja”`, await split(page, log, 'po „cele – propozycja”'))
    })
    await log.step('KR.24 kadłub ponad środki', async () => {
      await amount(page.getByTestId('wizard-split-hull'), '39000')
      await page.waitForTimeout(300)
      await log.screen(page, 'krok 6 – kadłub 39 000', WIZ)
      await log.shot(page, 'KR.24-kadlub39000')
      reading('kr', 'KR.24', `${STATE}, krok 6 – kadłub 39 000`, await split(page, log, 'kadłub 39 000'))
      await toStep(page, 6)
      const fin = page.getByTestId('wizard-finish')
      await fin.hover({ force: true })
      await page.waitForTimeout(500)
      log.line(`„Uruchom budżet”: disabled=${await fin.isDisabled()}, title=„${await fin.getAttribute('title')}”`)
      await log.shot(page, 'KR.24-krok7')
      await toStep(page, 5)
      await page.getByRole('button', { name: 'propozycja', exact: true }).click()
      await page.waitForTimeout(300)
      await split(page, log, 'po poprawie')
      await toStep(page, 6)
      log.line(`„Uruchom budżet” po poprawie: disabled=${await fin.isDisabled()}, title=„${await fin.getAttribute('title')}”`)
    })
    await log.step('KR.23 start z propozycją', async () => {
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
      const b = await log.screen(page, 'Mostek po starcie', '[data-testid="page-bridge"]')
      await log.shot(page, 'KR.23-mostek')
      const flat = b.replace(/\n/g, ' ')
      reading('kr', 'KR.23', `${STATE}, po starcie – Mostek`, { stan: flat.match(/(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/)?.[1] ?? null })
      log.line(`budget: ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.budget)}`)
      log.line(`goals: ${JSON.stringify(recordsOf(dataDir, 'goals').map((g) => [g.id, g.name, g.source, g.target, g.priority]))}`)
      await page.keyboard.press('Control+6')
      await page.waitForTimeout(1500)
      const g = await log.screen(page, 'Mapa gwiezdna', 'main')
      await log.shot(page, 'KR.23-mapa')
      const inputs = await page.locator('main input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).filter(Boolean))
      log.line(`pola Mapy: ${inputs.join(' | ')}`)
      reading('kr', 'KR.23', `${STATE}, po starcie – Mapa gwiezdna`, { mapa: g.replace(/\s+/g, ' ').slice(0, 1500), pola: inputs.join(' | ') })
    })
    logDiff(log, 'folder ICTTJ', diff(ictjBefore, checksums(ictj)))
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
