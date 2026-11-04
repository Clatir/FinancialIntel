/**
 * Audit KR – a wizard without a bank history (KR.14), the amounts' edges (KR.10, the large balance), the ship and orders
 * (KR.26), this computer's shortcut and start with Windows (KR.27), the conditions of „Uruchom budżet” (KR.29).
 * State: a new folder; config.json of this computer prepared before the first start: quick entry Ctrl+Shift+Q and
 * „Zamykaj do zasobnika” off (the lab's other runs have no shortcut – this run registers Ctrl+Shift+Q, then Ctrl+Alt+K,
 * for about a minute).
 * Answers: Portfel XTB 0; mBank tried „1.200”, „12,345”, −150,00, finally 1 234 567,89; salary empty / 0 / 4 000,00;
 * average costs 3 200,00; no cargo, no envelopes; ICTTJ skipped; ship „Żółta Łódź Świętej Pamięci Admirała” (41 chars
 * tried), „Dziennik od kwoty” 0, firewall off; shortcut Ctrl+Alt+K; start with Windows as shown.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LAB, reading } from './lab'
import { Log, WIZ, amount, balanceField, disarmAutostart, logRecorded, newBudget, openWizard, readJson, toStep, toasts } from './kr-pomoc'

const NAME = process.env.KR_RUN ?? 'kr-komputer'
const STATE = `pusty, bez historii; config.json: skrót Ctrl+Shift+Q, zamykanie do zasobnika wyłączone (przebieg ${NAME})`
const grab = (t: string, re: RegExp) => t.match(re)?.[1] ?? null

async function finishState(page: Page, log: Log, label: string): Promise<void> {
  await toStep(page, 6)
  const fin = page.getByTestId('wizard-finish')
  log.line(`[${label}] „Uruchom budżet”: disabled=${await fin.isDisabled()}, title=„${await fin.getAttribute('title')}”`)
}

async function tryAmount(page: Page, log: Log, label: string, value: string): Promise<void> {
  const f = balanceField(page, 'mBank')
  await f.click()
  await f.fill(value)
  log.line(`mBank „${value}”: aria-invalid ${await f.getAttribute('aria-invalid')}`)
  await f.press('Enter')
  await page.waitForTimeout(400)
  log.line(`  po Enter: „${await f.inputValue()}”; toasty: ${(await toasts(page)).map((x) => x.replace(/\s+/g, ' ')).join(' || ')}`)
}

test('KR – bez historii, brzegi kwot, okręt i rozkazy, ten komputer, warunki startu', async () => {
  test.setTimeout(20 * 60_000)
  const log = new Log(NAME)
  const dir = join(LAB, 'przebiegi', NAME)
  rmSync(join(dir, 'userdata'), { recursive: true, force: true })
  rmSync(join(dir, 'OneDrive'), { recursive: true, force: true })
  mkdirSync(join(dir, 'userdata'), { recursive: true })
  const cfg = { prefs: { quickShortcut: 'Control+Shift+Q', sounds: { enabled: false } }, updates: { prefs: { autoCheck: false, autoDownload: false } }, tray: { closeToTray: false } }
  writeFileSync(join(dir, 'userdata', 'config.json'), JSON.stringify(cfg, null, 2))
  log.line(`config.json przed: ${JSON.stringify(cfg)}`)
  const { run, dataDir } = await newBudget(NAME, log, { fresh: false })
  const { page } = run
  try {
    await openWizard(page)
    await log.step('KR.29 przycisk bez sald i pensji', async () => {
      await finishState(page, log, 'nic nie wpisane')
      await toStep(page, 0)
      await amount(balanceField(page, 'Portfel XTB'), '0')
      await page.waitForTimeout(300)
      await log.screen(page, 'krok 1 – Portfel 0', WIZ)
      log.line(`Portfel pole: „${await balanceField(page, 'Portfel XTB').inputValue()}”`)
      await finishState(page, log, 'Portfel 0, mBank puste')
    })
    await log.step('KR.10 brzegi kwot mBanku', async () => {
      await toStep(page, 0)
      await tryAmount(page, log, 'kropka', '1.200')
      await tryAmount(page, log, 'trzy miejsca', '12,345')
      await tryAmount(page, log, 'minus', '-150,00')
      const t = await log.screen(page, 'krok 1 – mBank −150', WIZ)
      await log.shot(page, 'KR.10-minus-krok1')
      await toStep(page, 5)
      await log.screen(page, 'krok 6 – mBank −150', WIZ)
      await log.shot(page, 'KR.10-minus-krok6')
      reading('kr', 'KR.10', `${STATE}, mBank −150, Portfel 0`, { obecne: await page.getByTestId('wizard-total').innerText(), osłony: await page.getByTestId('wizard-split-shields').innerText(), kadłub: await page.getByTestId('wizard-split-hull').inputValue(), krok1: grab(t, /(mBank[^\n]*\n[^\n]*)/) })
      await toStep(page, 0)
      await tryAmount(page, log, 'duża', '1 234 567,89')
      await toStep(page, 5)
      await log.screen(page, 'krok 6 – mBank 1 234 567,89', WIZ)
      await log.shot(page, 'KR.10-duza-krok6')
      reading('kr', 'KR.10', `${STATE}, mBank 1 234 567,89, Portfel 0`, { obecne: await page.getByTestId('wizard-total').innerText(), osłony: await page.getByTestId('wizard-split-shields').innerText(), kadłub: await page.getByTestId('wizard-split-hull').inputValue() })
    })
    await log.step('KR.14 kroki 2–4 bez historii; KR.29 pensja', async () => {
      await toStep(page, 1)
      await log.screen(page, 'krok 2', WIZ)
      await toStep(page, 2)
      await log.screen(page, 'krok 3 – pusty', WIZ)
      await log.shot(page, 'KR.14-krok3')
      await finishState(page, log, 'pensja pusta')
      await toStep(page, 2)
      await amount(page.getByTestId('wizard-salary'), '0')
      log.line(`pensja „0” → pole „${await page.getByTestId('wizard-salary').inputValue()}”`)
      await finishState(page, log, 'pensja 0')
      await toStep(page, 2)
      await amount(page.getByTestId('wizard-salary'), '4000')
      await amount(page.getByTestId('wizard-assumed-costs'), '3200')
      await page.waitForTimeout(300)
      const t = await log.screen(page, 'krok 3 – pensja 4 000, koszty 3 200', WIZ)
      reading('kr', 'KR.14', `${STATE}, krok 3`, { osłony: grab(t, /(Cel osłon:[^\n]*)/), kadłub: grab(t, /(Cel kadłuba:[^\n]*)/) })
      await toStep(page, 3)
      await log.screen(page, 'krok 4', WIZ)
      await log.shot(page, 'KR.14-krok4')
      await toStep(page, 4)
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(300)
      await log.screen(page, 'krok 6', WIZ)
    })
    await log.step('KR.26 / KR.27 krok 7', async () => {
      await toStep(page, 6)
      const inputs = async () => page.locator(`${WIZ} input`).evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label') ?? e.getAttribute('data-testid') ?? '?'}=${(e as HTMLInputElement).value}`))
      log.line(`pola domyślnie: ${(await inputs()).join(' | ')}`)
      const sw = async (label: string) => page.locator(`label:has-text("${label}") [role="switch"]`).getAttribute('aria-checked')
      log.line(`firewall: ${await sw('Firewall')}, autostart: ${await sw('Uruchamiaj z Windows')}`)
      const sc = page.getByTestId('wizard-shortcut')
      log.line(`skrót (pole): ${await sc.inputValue().catch(async () => sc.innerText())}`)
      await log.screen(page, 'krok 7 domyślnie', WIZ)
      await log.shot(page, 'KR.27-krok7-przed')
      const ship = page.getByTestId('wizard-ship')
      const name = 'Żółta Łódź Świętej Pamięci Admirała'
      await ship.fill(`${name}ABCDEF`)
      log.line(`nazwa 41 znaków (${`${name}ABCDEF`.length}): pole „${await ship.inputValue()}” (${(await ship.inputValue()).length} znaków)`)
      await ship.fill(name)
      await ship.press('Tab')
      log.line(`nazwa: „${await ship.inputValue()}” (${name.length} znaków)`)
      await amount(page.getByLabel('Próg dziennika', { exact: true }), '0')
      log.line(`Dziennik od kwoty po „0”: „${await page.getByLabel('Próg dziennika', { exact: true }).inputValue()}”`)
      await page.locator('label:has-text("Firewall") [role="switch"]').click()
      await sc.click()
      await page.keyboard.press('Control+Alt+K')
      await page.waitForTimeout(300)
      log.line(`skrót po Ctrl+Alt+K: ${await sc.inputValue().catch(async () => sc.innerText())}`)
      log.line(`firewall: ${await sw('Firewall')}, autostart: ${await sw('Uruchamiaj z Windows')}`)
      log.line(`pola po zmianach: ${(await inputs()).join(' | ')}`)
      await log.screen(page, 'krok 7 po zmianach', WIZ)
      await log.shot(page, 'KR.26-krok7-po')
      await finishState(page, log, 'komplet')
    })
    await log.step('start', async () => {
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
      const b = await log.screen(page, 'okno po starcie', 'body')
      await log.shot(page, 'KR.26-mostek')
      const flat = b.replace(/\n/g, ' ')
      reading('kr', 'KR.14', `${STATE}, po starcie – Mostek`, { energia_dzis: grab(flat, /(ENERGIA DZIŚ.*?skąd ta liczba\?)/), stan: grab(flat, /(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/), przychody: grab(flat, /(PRZYCHODY.*?)(?:OSTATNIE|$)/) })
      reading('kr', 'KR.10', `${STATE}, po starcie z mBank 1 234 567,89 – Mostek`, { stan: grab(flat, /(STAN OKRĘTU.*?Suma kont budżetu: [\d  ,]+ zł)/) })
      const fiRaw = readFileSync(join(dataDir, 'fi.json'), 'utf8')
      const fi = JSON.parse(fiRaw)
      log.line(`fi.json: shipName „${fi.settings.shipName}”, orders ${JSON.stringify(fi.settings.orders)}, layers ${JSON.stringify(fi.settings.layers)}, budget ${JSON.stringify(fi.settings.budget)}`)
      log.line(`fi.json zawiera skrót: ${/Shift\+Q|Alt\+K|quickShortcut|launchAtLogin/i.test(fiRaw)}`)
      log.line(`config.json po: ${readFileSync(join(run.userData, 'config.json'), 'utf8').replace(/\s+/g, ' ')}`)
      log.line(`months: ${JSON.stringify(readJson(dataDir, 'months/2026-11.json'))}`)
    })
    await log.step('Ustawienia i Dowództwo', async () => {
      await page.getByTestId('nav-settings').click()
      for (const tab of ['general', 'layers', 'notify', 'system']) {
        await page.getByTestId(`settings-tab-${tab}`).click()
        await page.waitForTimeout(600)
        await log.screen(page, `Ustawienia → ${tab}`, 'main')
        const inputs = await page.locator('main input, main [role="switch"]').evaluateAll((els) =>
          els.map((e) => `${e.getAttribute('aria-label') ?? e.closest('label')?.textContent?.trim().slice(0, 50) ?? e.getAttribute('data-testid') ?? '?'}=${e.getAttribute('role') === 'switch' ? e.getAttribute('aria-checked') : (e as HTMLInputElement).value}`)
        )
        log.line(`pola ${tab}: ${inputs.join(' | ')}`)
        await log.shot(page, `KR.27-ustawienia-${tab}`)
      }
      await page.keyboard.press('Control+8')
      await page.waitForTimeout(1500)
      await log.screen(page, 'Dowództwo', 'main')
      const inputs = await page.locator('main input, main [role="switch"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label') ?? '?'}=${e.getAttribute('role') === 'switch' ? e.getAttribute('aria-checked') : (e as HTMLInputElement).value}`))
      log.line(`pola Dowództwa: ${inputs.join(' | ')}`)
      await log.shot(page, 'KR.26-dowodztwo')
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
})
