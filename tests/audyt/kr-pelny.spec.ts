/**
 * Audit KR – the typical first run (KR.1, KR.2, KR.6, KR.13, KR.15, KR.17, KR.19–KR.22, KR.26–KR.28, KR.32) and the
 * state „start” for the other areas (C:\FI-audyt\stany\start, ictj-start).
 * Answers: mBank = the bank's balance now (rok-nowe-historia's end, 72 073,56), Portfel XTB 2 450,00, Gotówka 180,00;
 * member „Anna”; the persona's history imported (Przyjmij pewne + the persona's group decisions, Anna's money as her
 * income); the salary proposed; shields 3, hull 6; cargo: rent, Netia, P4, Netflix, CityFit, PZU, Tauron (when
 * proposed); envelopes as proposed; ICTTJ of this computer (copy of ictj-rok) + own goal „Rower górski” 3 500; the split
 * proposed; ship „Flagowiec”, default orders; the shortcut cleared (the lab has no global shortcut); start with Windows
 * as proposed (recorded only).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { CASH_CATEGORY_ID } from '../../src/shared/schema/budget'
import { LAB, reading, start } from './lab'
import { buildPersona } from './persona'
import { Log, WIZ, amount, balanceField, checksums, decide, diff, disarmAutostart, formatCheck, importFromWizard, logDiff, logRecorded, readJson, recordsOf, toStep, toasts, type Decision } from './kr-pomoc'

const NAME = 'kr-pelny'
const STATE = 'pusty + rok-historia.csv (przebieg kr-pelny)'
const grab = (t: string, re: RegExp) => t.match(re)?.[1] ?? null

/** The persona's decisions for a folder without its records: loans as loans, Anna's money her income, Marek's income. */
function typicalDecisions(): Decision[] {
  const P = buildPersona('2026-11-03')
  return P.decisions.map((d): Decision => {
    if (d.option.startsWith('loan:')) return { token: d.token, dir: d.dir, option: 'loan' }
    if (d.token === 'anna testowa') return { token: d.token, dir: d.dir, optionLabel: 'Od domownika: Anna – reszta jako przychód' }
    if (d.token === 'marek testowy') return { token: d.token, dir: d.dir, option: 'income' }
    return { token: d.token, dir: d.dir, option: d.option, categoryId: d.categoryId ?? null }
  })
}

test('KR – pełny kreator (wariant typowy) i stan start', async () => {
  test.setTimeout(30 * 60_000)
  const log = new Log(NAME)
  const dir = join(LAB, 'przebiegi', NAME)
  // ICTTJ of „this computer”: a copy of ictj-rok, its path in ICTTJ's own config.json (FI_ICTJ_APPDATA of the lab run).
  const ictj = join(dir, 'ictj')
  rmSync(ictj, { recursive: true, force: true })
  cpSync(join(LAB, 'stany', 'ictj-rok'), ictj, { recursive: true })
  mkdirSync(join(dir, 'brak-ictj', 'ICT Trade Journal'), { recursive: true })
  writeFileSync(join(dir, 'brak-ictj', 'ICT Trade Journal', 'config.json'), JSON.stringify({ dataDir: ictj }, null, 2))
  const ictjBefore = checksums(ictj)
  rmSync(join(dir, 'OneDrive'), { recursive: true, force: true })
  const dataDir = join(dir, 'OneDrive', 'FinancialIntel')
  const docs = join(process.env.USERPROFILE ?? 'C:\\', 'Documents', 'FinancialIntel')
  log.line(`Dokumenty\\FinancialIntel przed: ${existsSync(docs)}`)

  const run = await start(NAME, { usePreset: false })
  const { page } = run
  try {
    // ---------------- KR.1
    await log.step('KR.1 ekran wyboru folderu', async () => {
      await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
      await expect(page.getByTestId('setup-default')).toBeVisible({ timeout: 15_000 })
      await page.waitForTimeout(800)
      await log.screen(page, 'okno', 'body')
      await log.shot(page, 'KR.1')
      log.line(`menu boczne widoczne: ${await page.getByTestId('nav-bridge').count()}`)
      log.line(`folder danych przed kliknięciem istnieje: ${existsSync(dataDir)}`)
    })
    // ---------------- KR.2
    await log.step('KR.2 utworzenie z propozycji', async () => {
      await page.getByTestId('setup-default').click()
      await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(2000)
      log.line(`pliki folderu: ${[...checksums(dataDir).keys()].join(', ')}`)
      const raw = readFileSync(join(dataDir, 'fi.json'), 'utf8')
      log.line(`fi.json: wcięcie 2 = ${raw.startsWith('{\n  "')}, końcowe \\n = ${raw.endsWith('}\n')}, format JSON.stringify(…,2) = ${raw === `${JSON.stringify(JSON.parse(raw), null, 2)}\n`}`)
      const fi = JSON.parse(raw) as { schemaVersion: number; settings: Record<string, unknown> }
      const s = fi.settings as Record<string, any>
      log.line(`schemaVersion ${fi.schemaVersion}; shipName ${s.shipName}`)
      log.line(`konta: ${JSON.stringify((s.accounts as any[]).map((a) => [a.name, a.kind, a.archived]))}`)
      const cats = s.categories as any[]
      const mains = cats.filter((c) => !c.parentId)
      for (const m of mains) log.line(`kategoria: ${m.name} [${m.envelope ?? m.kind ?? ''}] ${JSON.stringify(Object.fromEntries(Object.entries(m).filter(([k]) => !['id', 'name', 'parentId', 'createdAt', 'updatedAt'].includes(k))))} → ${cats.filter((c) => c.parentId === m.id).map((c) => c.name).join(', ')}`)
      log.line(`reguły: ${JSON.stringify(s.import?.rules ?? s.rules ?? null).slice(0, 1500)}`)
      log.line(`klucze settings: ${Object.keys(s).join(', ')}`)
      log.line(`userData: ${readdirSync(run.userData).join(', ')}`)
      log.line(`Dokumenty\\FinancialIntel po: ${existsSync(docs)}`)
      await page.getByTestId('nav-settings').click()
      await page.getByTestId('settings-tab-accounts').click()
      await page.waitForTimeout(500)
      await log.screen(page, 'Ustawienia → Konta', 'main')
      await page.getByTestId('settings-tab-categories').click()
      await page.waitForTimeout(500)
      await log.screen(page, 'Ustawienia → Kategorie', 'main')
      await log.shot(page, 'KR.2-kategorie')
      await page.getByTestId('settings-tab-import').click()
      await page.waitForTimeout(500)
      await log.screen(page, 'Ustawienia → Import z banku', 'main')
    })
    // ---------------- KR.6
    await log.step('KR.6 baner kreatora', async () => {
      await page.keyboard.press('Control+1')
      await expect(page.getByTestId('page-bridge')).toBeVisible()
      await page.waitForTimeout(500)
      await log.screen(page, 'Mostek przed kreatorem', 'body')
      await log.shot(page, 'KR.6-mostek')
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(1000)
      await log.screen(page, 'Operacje przed kreatorem', 'body')
      await log.shot(page, 'KR.6-operacje')
      await page.keyboard.press('Control+8')
      await page.waitForTimeout(800)
      await log.screen(page, 'Dowództwo przed kreatorem', 'main')
      await page.keyboard.press('Control+1')
      await page.getByTestId('banner-wizard-start').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      log.line(`baner na ekranie kreatora: ${await page.getByTestId('banner-wizard-start').count()}`)
    })
    // ---------------- step 1
    await log.step('Krok 1 – salda i domownik', async () => {
      await log.screen(page, 'krok 1 (pusty)', WIZ)
      await log.shot(page, 'KR.7-krok1')
      await amount(balanceField(page, 'mBank'), '72073,56')
      await amount(balanceField(page, 'Portfel XTB'), '2450')
      await amount(balanceField(page, 'Gotówka'), '180')
      await page.getByTestId('wizard-member-name').fill('Anna')
      await page.getByTestId('wizard-member-add').click()
      await page.waitForTimeout(500)
      await log.screen(page, 'krok 1 (wypełniony)', WIZ)
    })
    // ---------------- KR.13
    await log.step('KR.13 krok 2 – import i powrót', async () => {
      await page.getByTestId('wizard-next').click()
      await log.screen(page, 'krok 2 przed importem', WIZ)
      await importFromWizard(run, log, join(LAB, 'pliki', 'rok-historia.csv'), typicalDecisions(), 'KR.13-import-przed')
      await log.screen(page, 'nagłówek Importu', '[data-testid="page-import"] > div')
      log.line(`„Wróć do kreatora”: ${await page.getByTestId('import-back-to-wizard').count()}`)
      log.line(`baner kreatora na Imporcie: ${await page.getByTestId('banner-wizard-start').count()}`)
      await log.shot(page, 'KR.13-import-po')
      await page.getByTestId('import-back-to-wizard').click()
      await expect(page.getByTestId('page-wizard')).toBeVisible()
      await page.waitForTimeout(1500)
      await log.screen(page, 'krok po powrocie', WIZ)
      await log.shot(page, 'KR.13-powrot')
      const tx = recordsOf(dataDir, 'transactions')
      log.line(`plików operacji: ${tx.length}; pierwsza ${tx.map((t) => t.date as string).sort()[0]}`)
      log.line(`backups/pre-import: ${existsSync(join(dataDir, 'backups', 'pre-import')) ? readdirSync(join(dataDir, 'backups', 'pre-import')).join(', ') : 'brak'}`)
      const h = await page.getByTestId('wizard-history').innerText().catch(() => '')
      reading('kr', 'KR.13', STATE, { licznik: h, plikow_operacji: tx.length })
      await toStep(page, 0)
      log.line(`salda po powrocie: mBank ${await balanceField(page, 'mBank').inputValue()}, Portfel ${await balanceField(page, 'Portfel XTB').inputValue()}, Gotówka ${await balanceField(page, 'Gotówka').inputValue()}`)
      await log.screen(page, 'krok 1 po powrocie', WIZ)
    })
    // ---------------- KR.15 / KR.17
    await log.step('KR.15 / KR.17 krok 3', async () => {
      await toStep(page, 2)
      const t = await log.screen(page, 'krok 3', WIZ)
      await log.shot(page, 'KR.15-krok3')
      const salary = await page.getByTestId('wizard-salary').inputValue()
      log.line(`pole pensji: ${salary}`)
      reading('kr', 'KR.15', STATE, { podpowiedz: grab(t, /(Średnie koszty netto[^\n]*)/), pole: salary })
      const shields = page.getByLabel('Osłony w pensjach')
      const hull = page.getByLabel('Kadłub w miesiącach')
      const t3 = await log.screen(page, 'krok 3 domyślnie', WIZ)
      reading('kr', 'KR.17', STATE, { osłony: grab(t3, /(Cel osłon:[^\n]*)/), kadłub: grab(t3, /(Cel kadłuba:[^\n]*)/), stan: 'domyślne 3 / 6' })
      await shields.fill('4')
      await hull.fill('9')
      await hull.press('Tab')
      const t4 = await log.screen(page, 'krok 3: osłony 4, kadłub 9', WIZ)
      reading('kr', 'KR.17', STATE, { osłony: grab(t4, /(Cel osłon:[^\n]*)/), kadłub: grab(t4, /(Cel kadłuba:[^\n]*)/), stan: '4 / 9' })
      for (const v of ['2,5', '0']) {
        await shields.fill(v)
        log.line(`osłony „${v}”: aria-invalid ${await shields.getAttribute('aria-invalid')}`)
        await shields.press('Enter')
        log.line(`  po Enter: ${await shields.inputValue()}`)
        await hull.fill(v)
        log.line(`kadłub „${v}”: aria-invalid ${await hull.getAttribute('aria-invalid')}`)
        await hull.press('Enter')
        log.line(`  po Enter: ${await hull.inputValue()}`)
      }
      // The minimum of the orders above the target (step 7), with the target 4.
      await toStep(page, 6)
      const min = page.locator('div.grid', { has: page.getByText('Minimalne osłony (pensje)', { exact: true }) }).locator('input')
      log.line(`minimalne osłony domyślnie: ${await min.inputValue()}`)
      await min.fill('5')
      log.line(`minimalne osłony „5” przy celu 4: aria-invalid ${await min.getAttribute('aria-invalid')}`)
      await log.screen(page, 'krok 7 z minimum 5', WIZ)
      await log.shot(page, 'KR.17-minimum')
      await min.press('Enter')
      log.line(`  po Enter: ${await min.inputValue()}`)
      await toStep(page, 2)
      await shields.fill('3')
      await shields.press('Enter')
      await hull.fill('6')
      await hull.press('Enter')
      const t5 = await log.screen(page, 'krok 3 z powrotem 3 / 6', WIZ)
      log.line(`osłony ${await shields.inputValue()}, kadłub ${await hull.inputValue()}`)
      reading('kr', 'KR.17', STATE, { osłony: grab(t5, /(Cel osłon:[^\n]*)/), kadłub: grab(t5, /(Cel kadłuba:[^\n]*)/), stan: 'z powrotem 3 / 6' })
    })
    // ---------------- KR.19 / KR.20 / KR.21 (read)
    await log.step('KR.19–KR.21 krok 4', async () => {
      await toStep(page, 3)
      const t = await log.screen(page, 'krok 4 (nic nie zaznaczone)', WIZ)
      await log.shot(page, 'KR.19-krok4')
      const cargo = page.getByTestId('wizard-cargo')
      const n = await cargo.count()
      let checked = 0
      for (let i = 0; i < n; i++) if (await cargo.nth(i).locator('input').isChecked()) checked++
      log.line(`propozycji ładowni: ${n}, zaznaczonych samo: ${checked}`)
      const props: string[] = []
      for (let i = 0; i < n; i++) props.push((await cargo.nth(i).innerText()).replace(/\s+/g, ' '))
      reading('kr', 'KR.19', STATE, { propozycje: props.join(' | ') })
      const env = page.getByTestId('wizard-envelope')
      const envs: string[] = []
      for (let i = 0; i < (await env.count()); i++) envs.push(`${await env.nth(i).getAttribute('data-name')}=${await env.nth(i).locator('input').inputValue()}`)
      log.line(`koperty (propozycje): ${envs.join('; ')}`)
      reading('kr', 'KR.20', STATE, { naglowek: grab(t, /(Koperty pierwszego miesiąca[^\n]*)/), koperty: envs.join('; '), bez_kategorii: grab(t, /(Bez kategorii[^\n]*)/) })
      for (let i = 0; i < n; i++) {
        const name = (await cargo.nth(i).getAttribute('data-name')) ?? ''
        if (/WSPÓLNOTA|WSPOLNOTA|NETIA|^P4|NETFLIX|CITYFIT|PZU|TAURON/i.test(name)) await cargo.nth(i).locator('input').check()
      }
      await page.waitForTimeout(500)
      const t2 = await log.screen(page, 'krok 4 po wyborze ładowni', WIZ)
      await log.shot(page, 'KR.21-krok4')
      const envs2: string[] = []
      for (let i = 0; i < (await env.count()); i++) envs2.push(`${await env.nth(i).getAttribute('data-name')}=${await env.nth(i).locator('input').inputValue()}`)
      log.line(`koperty po wyborze ładowni: ${envs2.join('; ')}`)
      reading('kr', 'KR.21', STATE, {
        wybrane: props.filter((p) => /WSPÓLNOTA|WSPOLNOTA|NETIA|P4|NETFLIX|CITYFIT|PZU|TAURON/i.test(p)).join(' | '),
        koperty: envs2.join('; '),
        pensja: grab(t2, /Pensja\n([^\n]*)/),
        plan: grab(t2, /Ładownia \(stałe koszty\) \+ odkładki \+ koperty\n([^\n]*)/),
        odkladki: grab(t2, /(Odkładki w tym miesiącu[^\n]*)/),
        niezaplanowane: grab(t2, /((?:Niezaplanowane \(łupy\)|Plan przekracza pensję o)\n[^\n]*)/),
        przydzial: grab(t2, /(Podstawowy przydział dzienny[^\n]*)/)
      })
    })
    // ---------------- KR.22
    await log.step('KR.22 krok 5 ICTTJ i cele', async () => {
      await toStep(page, 4)
      await log.screen(page, 'krok 5 przed wyborem', WIZ)
      await log.shot(page, 'KR.22-przed')
      const sug = page.getByTestId('wizard-ictj-suggested')
      log.line(`„Użyj folderu ICTTJ z tego komputera”: ${await sug.count()}`)
      await sug.click()
      await expect.poll(async () => page.locator('[data-testid="wizard-goal"]').count(), { timeout: 45_000 }).toBeGreaterThan(0)
      await page.waitForTimeout(1500)
      await log.screen(page, 'krok 5 po wyborze', WIZ)
      await page.getByTestId('wizard-goal-name').fill('Zero')
      await amount(page.getByTestId('wizard-goal-target'), '0')
      log.line(`„Dodaj cel” przy kwocie 0: disabled=${await page.getByTestId('wizard-goal-add').isDisabled()}`)
      await page.getByTestId('wizard-goal-name').fill('Rower górski')
      await amount(page.getByTestId('wizard-goal-target'), '3500')
      await page.getByTestId('wizard-goal-add').click()
      await expect(page.locator('[data-testid="wizard-goal"][data-name="Rower górski"]')).toBeVisible()
      const t = await log.screen(page, 'krok 5 z celem własnym', WIZ)
      await log.shot(page, 'KR.22-po')
      log.line(`wersja 1.1 w tekście: ${/1\.1/.test(t)}`)
      logDiff(log, 'folder ICTTJ po kroku 5', diff(ictjBefore, checksums(ictj)))
      log.line(`goals/ w folderze danych: ${JSON.stringify(recordsOf(dataDir, 'goals').map((g) => [g.name, g.source, g.target, g.priority]))}`)
    })
    // ---------------- KR.23 (read)
    await log.step('krok 6 – podział (odczyt)', async () => {
      await toStep(page, 5)
      const t = await log.screen(page, 'krok 6', WIZ)
      await log.shot(page, 'KR.28-krok6')
      const goals: string[] = []
      const gi = page.getByTestId('wizard-split-goal')
      for (let i = 0; i < (await gi.count()); i++) goals.push(`${await gi.nth(i).getAttribute('data-name')}=${await gi.nth(i).locator('input').inputValue()}`)
      const tanks: string[] = []
      const ti = page.getByTestId('wizard-split-tank')
      for (let i = 0; i < (await ti.count()); i++) tanks.push(`${await ti.nth(i).getAttribute('data-name')}=${await ti.nth(i).locator('input').inputValue()}`)
      reading('kr', 'KR.28', STATE, {
        obecne: await page.getByTestId('wizard-total').innerText(),
        osłony: await page.getByTestId('wizard-split-shields').innerText(),
        kadłub: await page.getByTestId('wizard-split-hull').inputValue(),
        cele: goals.join('; '),
        zbiorniki: tanks.join('; '),
        tekst: grab(t, /(Obecne środki[^\n]*)/)
      })
    })
    // ---------------- KR.26 / KR.27 (defaults)
    await log.step('KR.26 / KR.27 krok 7 – wartości domyślne', async () => {
      await toStep(page, 6)
      await log.screen(page, 'krok 7', WIZ)
      await log.shot(page, 'KR.26-krok7')
      const sc = page.getByTestId('wizard-shortcut')
      log.line(`skrót (pole): ${(await sc.inputValue().catch(async () => sc.innerText()))}`)
      log.line(`autostart: ${await page.getByTestId('wizard-autostart').getAttribute('aria-checked')} / ${await page.getByTestId('wizard-autostart').getAttribute('data-state')}`)
      // The lab has no global shortcut: cleared before the start (Backspace).
      await sc.click()
      await sc.press('Backspace')
      await page.waitForTimeout(300)
      log.line(`skrót po Backspace: ${(await sc.inputValue().catch(async () => sc.innerText()))}`)
      const fin = page.getByTestId('wizard-finish')
      log.line(`„Uruchom budżet”: disabled=${await fin.isDisabled()}, title=${await fin.getAttribute('title')}`)
    })
    // ---------------- KR.28
    const before = checksums(dataDir)
    await log.step('KR.28 Uruchom budżet', async () => {
      await page.getByTestId('wizard-finish').click()
      const seen = new Set<string>()
      for (let i = 0; i < 12; i++) {
        for (const t of await toasts(page)) seen.add(t.replace(/\s+/g, ' '))
        await page.waitForTimeout(250)
      }
      log.line(`toasty: ${[...seen].join(' || ')}`)
      await expect(page.getByTestId('page-bridge')).toBeVisible()
      await page.waitForTimeout(3000)
      await log.screen(page, 'Mostek po starcie', 'body')
      await log.shot(page, 'KR.28-mostek')
      await logRecorded(run, log)
      logDiff(log, 'folder po „Uruchom budżet”', diff(before, checksums(dataDir)))
      const fi = readJson(dataDir, 'fi.json') as any
      log.line(`budget: ${JSON.stringify(fi.settings.budget)}`)
      log.line(`layers: ${JSON.stringify(fi.settings.layers)}; orders: ${JSON.stringify(fi.settings.orders)}; shipName ${fi.settings.shipName}`)
      log.line(`household: ${JSON.stringify(fi.settings.household)}`)
      log.line(`balances: ${JSON.stringify(recordsOf(dataDir, 'balances').map((b) => [b.accountId, b.kind, b.date, b.amount]))}`)
      log.line(`months: ${JSON.stringify(recordsOf(dataDir, 'months').map((m) => [m.month, m.salary, m.envelopes]))}`)
      log.line(`containers: ${JSON.stringify(recordsOf(dataDir, 'containers').map((c) => [c.name, c.amount, c.cycleMonths, c.dueMonth, c.dueDay, c.variable, c.counterparty]))}`)
      const fc = formatCheck(dataDir)
      log.line(`format JSON: plików ${fc.files}, złych ${fc.bad.length} ${fc.bad.slice(0, 10).join(', ')}`)
      const cfg = JSON.parse(readFileSync(join(run.userData, 'config.json'), 'utf8'))
      log.line(`config.json: ${JSON.stringify(cfg)}`)
      log.line(`baner kreatora: ${await page.getByTestId('banner-wizard-start').count()}`)
    })
    // ---------------- readings after the start
    await log.step('Odczyty po starcie', async () => {
      const b = await log.screen(page, 'Mostek – panel', '[data-testid="page-bridge"]')
      reading('kr', 'KR.28', `${STATE}, po starcie`, { mostek: b.replace(/\s+/g, ' ').slice(0, 3000) })
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(1500)
      const m = await log.screen(page, 'Plan miesiąca', 'main')
      await log.shot(page, 'KR.21-plan')
      reading('kr', 'KR.21', `${STATE}, po starcie – Plan miesiąca`, { plan: m.replace(/\s+/g, ' ').slice(0, 3000) })
      await page.keyboard.press('Control+5')
      await page.waitForTimeout(1500)
      const c = await log.screen(page, 'Ładownia', 'main')
      await log.shot(page, 'KR.19-ladownia')
      reading('kr', 'KR.19', `${STATE}, po starcie – Ładownia`, { ladownia: c.replace(/\s+/g, ' ').slice(0, 3000) })
      await page.keyboard.press('Control+6')
      await page.waitForTimeout(1500)
      const g = await log.screen(page, 'Mapa gwiezdna', 'main')
      reading('kr', 'KR.28', `${STATE}, po starcie – Mapa gwiezdna`, { mapa: g.replace(/\s+/g, ' ').slice(0, 2000) })
    })
    // ---------------- KR.32
    await log.step('KR.32 gra po kreatorze', async () => {
      await page.keyboard.press('Control+8')
      await page.waitForTimeout(2000)
      await log.screen(page, 'Dowództwo', 'main')
      await log.shot(page, 'KR.32-dowodztwo')
      log.line(`game/: ${existsSync(join(dataDir, 'game')) ? readdirSync(join(dataDir, 'game')).join(', ') : 'brak'}`)
      for (const g of recordsOf(dataDir, 'game')) log.line(`game ${g.month}: dni ${Object.keys((g.days as object) ?? {}).join(', ')}`)
      log.line(`game.start: ${JSON.stringify((readJson(dataDir, 'fi.json') as any).settings.game)}`)
    })
    // ---------------- KR.28 palette
    await log.step('KR.28 paleta – Kreator startu budżetu', async () => {
      await page.keyboard.press('Control+1')
      await page.keyboard.press('Control+k')
      await expect(page.getByTestId('palette')).toBeVisible()
      await page.getByTestId('palette-input').fill('Kreator startu')
      await page.waitForTimeout(400)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(800)
      await log.screen(page, 'kreator na działającym budżecie', 'body')
      await log.shot(page, 'KR.28-paleta')
    })
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    disarmAutostart(run.userData)
  }
  // ---------------- the state „start”
  if ((readJson(dataDir, 'fi.json') as any)?.settings?.budget?.start) {
    const target = join(LAB, 'stany', 'start')
    rmSync(target, { recursive: true, force: true })
    cpSync(dataDir, target, { recursive: true })
    rmSync(join(LAB, 'stany', 'ictj-start'), { recursive: true, force: true })
    cpSync(ictj, join(LAB, 'stany', 'ictj-start'), { recursive: true })
    log.line(`stan start: skopiowany do ${target} (+ ictj-start)`)
  } else log.line('stan start: NIE skopiowany (budżet nie wystartował)')
  logDiff(log, 'folder ICTTJ na końcu', diff(ictjBefore, checksums(ictj)))
})
