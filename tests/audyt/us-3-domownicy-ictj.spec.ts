/** US.11 – US.15: domownicy, ICTTJ (folder, scenariusz, program), import z banku (state rok / start, copies). */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { LAB, answerDialogs, reading, recorded, start, useState } from './lab'
import { configOf, dataDirOf, editFi, fiOf, goSettings, run, say, snap, text, toasts, typed, userDataOf } from './us-pomoc'

const rowOf = (page: Page, name: string) => page.locator(`[data-testid="member-row"][data-name="${name}"]`)

test('US.11 domownicy', async () => {
  const N = 'us-dom'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'household')
    await page.getByTestId('member-add').click()
    await page.waitForTimeout(500)
    say('US.11 nowy', await page.getByTestId('member-name').evaluateAll((e) => e.map((x) => (x as HTMLInputElement).value)))
    await typed(page, page.getByTestId('member-name').last(), 'Babcia Zosia')
    const bz = rowOf(page, 'Babcia Zosia')
    const bank = bz.getByTestId('member-bank-input')
    await typed(page, bank, 'ZOFIA KOWALSKA')
    say('US.11 nazwa w banku', await bz.getByTestId('member-bank-name').allInnerTexts())
    await typed(page, bank, 'zofia kowalska')
    say('US.11 duplikat nazwy w banku', { names: await bz.getByTestId('member-bank-name').allInnerTexts(), toasts: await toasts(page) })
    await typed(page, bank, 'ZOFIA KOWALSKA')
    say('US.11 duplikat dokładny', await bz.getByTestId('member-bank-name').allInnerTexts())
    await bz.getByRole('button', { name: 'Usuń ZOFIA KOWALSKA' }).click()
    say('US.11 po ×', await bz.getByTestId('member-bank-name').allInnerTexts())
    await typed(page, bank, 'ZOFIA KOWALSKA')
    await bz.getByTestId('member-via').selectOption({ label: 'Anna' })
    for (const l of ['pytaj', 'zaliczka', 'przychód']) {
      await bz.getByText(l, { exact: true }).first().click()
      await page.waitForTimeout(1200)
      say(`US.11 inflow ${l}`, fiOf(N).settings.household.members?.find?.((m: any) => m.name === 'Babcia Zosia')?.inflow)
    }
    await typed(page, page.getByTestId('member-name').last(), '')
    say('US.11 puste imię', await toasts(page))
    await typed(page, page.getByTestId('member-name').last(), 'anna')
    say('US.11 duplikat imienia', await toasts(page))
    // owner of the quick entry / editor
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-editor').waitFor()
    await page.waitForTimeout(500)
    const finOpts = async () => (await page.locator('[data-testid="operation-editor"] select').evaluateAll((els) => els.map((e) => [...(e as HTMLSelectElement).options].map((o) => o.text).join(' / ')))).filter((s) => /finansuje/.test(s))
    say('US.11 edytor – finansuje', await finOpts())
    await goSettings(page, 'household')
    // archive an existing member with a balance and old operations
    const marek = rowOf(page, 'Marek')
    const balBefore = await marek.getByTestId('member-balance').innerText()
    await marek.getByTestId('member-archived').click()
    await page.waitForTimeout(600)
    say('US.11 Marek archiwum – saldo przed/po', { przed: balBefore, po: await marek.getByTestId('member-balance').innerText().catch(() => '(brak salda)') })
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-editor').waitFor()
    await page.waitForTimeout(500)
    say('US.11 edytor po archiwum Marka', await finOpts())
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(800)
    await page.getByTestId('operations-search').fill('Bilet dla Marka')
    await page.waitForTimeout(600)
    say('US.11 stare operacje Marka', await page.getByTestId('operation-row').allInnerTexts())
    await goSettings(page, 'household')
    await snap(page, 'US.11')
  } finally {
    await app.close()
  }
})

test('US.12 daty rozliczeń', async () => {
  const N = 'us-dom2'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'household')
    const balances = async (l: string) => {
      const o: Record<string, string> = {}
      for (const n of ['Anna', 'Kasia', 'Marek']) o[n] = await rowOf(page, n).getByTestId('member-balance').innerText().catch(() => '(brak)')
      say(`US.12 salda – ${l}`, { ...o, since: await page.getByTestId('household-since').inputValue().catch(() => '(od startu)') })
      reading('us', 'US.12', 'rok ' + l, o)
      return o
    }
    await balances('początek')
    say('US.12 stan', fiOf(N).settings.household)
    await page.getByTestId('household-since-today').click()
    await page.waitForTimeout(700)
    await balances('od dziś')
    await page.getByTestId('household-since-budget').click()
    await page.waitForTimeout(700)
    await balances('od startu budżetu')
    await page.getByTestId('household-since-today').click()
    await page.waitForTimeout(500)
    await typed(page, 'household-since', '01.01.2025')
    say('US.12 data sprzed startu', await text(page, '[data-testid="household-since-row"]'))
    await snap(page, 'US.12-przed-startem')
    await balances('01.01.2025')
    await typed(page, 'household-since', '01.09.2025')
    await balances('01.09.2025')
    await page.getByTestId('household-since-budget').click()
    await page.waitForTimeout(500)
    // opening balance: Anna "ma oddać" 150
    const anna = rowOf(page, 'Anna')
    await anna.getByText('ma oddać', { exact: true }).click()
    await typed(page, anna.getByTestId('member-opening'), '150')
    await page.waitForTimeout(700)
    await balances('Anna ma oddać 150')
    say('US.12 Anna fi', fiOf(N).settings.household)
    await page.getByTestId('household-since-today').click()
    await page.waitForTimeout(700)
    await balances('Anna 150 + od dziś')
    await page.getByTestId('household-since-budget').click()
    await page.waitForTimeout(700)
    await balances('Anna 150 + od startu')
    // assign-from
    await page.getByTestId('household-assign-today').click().catch(() => undefined)
    await page.waitForTimeout(500)
    say('US.12 assign-from', await text(page, '[data-testid="household-assign-row"]'))
    await balances('assign od dziś')
    await page.getByTestId('household-assign-all').click().catch(() => undefined)
    await page.waitForTimeout(500)
    await snap(page, 'US.12')
  } finally {
    await app.close()
  }
})

const sha = (dir: string): string => {
  const h = createHash('sha256')
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else h.update(p.slice(dir.length)).update(readFileSync(p))
    }
  }
  walk(dir)
  return h.digest('hex').slice(0, 16)
}

test('US.13 – US.14 ICTTJ', async () => {
  const N = 'us-ictj'
  const { dataDir } = useState('start', N)
  const base = join(LAB, 'przebiegi', N)
  const ictj = join(base, 'ictj-fix')
  rmSync(ictj, { recursive: true, force: true })
  cpSync(join(LAB, 'stany', 'ictj-start'), ictj, { recursive: true })
  const appdata = join(base, 'appdata')
  rmSync(appdata, { recursive: true, force: true })
  mkdirSync(join(appdata, 'ICT Trade Journal'), { recursive: true })
  writeFileSync(join(appdata, 'ICT Trade Journal', 'config.json'), JSON.stringify({ dataDir: ictj }))
  const emptyDir = join(base, 'pusty-ictj')
  mkdirSync(emptyDir, { recursive: true })
  const before = sha(ictj)
  const r = await start(N, { dataDir, env: { FI_ICTJ_APPDATA: appdata } })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(1500)
    await goSettings(page, 'ictj')
    say('US.13 start (bez wyboru)', await text(page, 'main'))
    await snap(page, 'US.13-podpowiedz')
    for (const [lab, p] of [['folder FI', dataDir], ['pusty folder', emptyDir], ['folder ICTTJ', ictj]] as const) {
      await answerDialogs(app, { paths: [p] })
      await page.getByTestId('ictj-pick').click()
      await page.waitForTimeout(1500)
      say(`US.13 „Wskaż folder…” – ${lab}`, { status: await text(page, '[data-testid="ictj-status"]'), dir: await text(page, '[data-testid="ictj-dir"]'), tekst: (await text(page, 'main')).split('\n').filter((l) => /ICTTJ|ICT Trade|brak pliku|folder/i.test(l)).slice(0, 8), toasts: await toasts(page), config: configOf(N).ictj })
      await snap(page, `US.13-${lab.replace(/ /g, '_')}`)
    }
    await page.getByTestId('ictj-off').click()
    await page.waitForTimeout(800)
    say('US.13 po „Nie czytaj”', { status: await text(page, '[data-testid="ictj-status"]'), dir: await text(page, '[data-testid="ictj-dir"]'), config: configOf(N).ictj, scenariusz: await page.getByTestId('ictj-forecast').inputValue().catch(() => '?') })
    await snap(page, 'US.13-nie-czytaj')
    await answerDialogs(app, { paths: [ictj] })
    await page.getByTestId('ictj-pick').click()
    await page.waitForTimeout(1500)
    // --- US.14
    const sel = page.getByTestId('ictj-forecast')
    say('US.14 scenariusze', { value: await sel.inputValue(), options: await sel.locator('option').allInnerTexts(), fi: fiOf(N).settings.ictj })
    const other = (await sel.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))).find((v) => v && v !== fiOf(N).settings.ictj.forecastId)
    if (other) {
      await sel.selectOption(other)
      await page.waitForTimeout(500)
      say('US.14 po zmianie (przed potwierdzeniem)', { confirm: await text(page, '[data-testid="ictj-forecast-confirm"]').catch(() => '(brak pytania)'), fi: fiOf(N).settings.ictj.forecastId })
      await snap(page, 'US.14-pytanie')
      await page.getByRole('button', { name: 'Anuluj', exact: true }).click()
      await page.waitForTimeout(500)
      say('US.14 po Anuluj', { value: await sel.inputValue(), fi: fiOf(N).settings.ictj.forecastId })
      await sel.selectOption(other)
      await page.getByTestId('ictj-forecast-confirm-ok').click()
      await page.waitForTimeout(1200)
      say('US.14 po „Zmień scenariusz”', { value: await sel.inputValue(), fi: fiOf(N).settings.ictj.forecastId })
      await page.keyboard.press('Control+6')
      await page.waitForTimeout(1000)
      say('US.14 Mapa gwiezdna', (await text(page, '[data-testid="page-starmap"]')).replace(/\n+/g, ' | ').slice(0, 900))
      await goSettings(page, 'ictj')
    }
    // program
    say('US.14 program', await text(page, '[data-testid="ictj-program"]'))
    const fake = join(base, 'ICTTJ-atrapa.exe')
    writeFileSync(fake, 'MZ')
    await answerDialogs(app, { paths: [fake] })
    await page.getByTestId('ictj-pick-exe').click()
    await page.waitForTimeout(800)
    say('US.14 po wskazaniu .exe', { program: await text(page, '[data-testid="ictj-program"]'), config: configOf(N).ictj })
    await page.getByTestId('ictj-open').click()
    await page.waitForTimeout(1000)
    say('US.14 „Otwórz ICTTJ” (ustawienia)', { toasts: await toasts(page), log: readFileSync(join(userDataOf(N), 'logs', 'main.log'), 'utf8').split('\n').filter((l) => /ICTTJ/.test(l)).slice(-4) })
    await page.getByTestId('nav-open-ictj').click().catch(async () => page.getByText('Otwórz ICTTJ').first().click())
    await page.waitForTimeout(800)
    say('US.14 „Otwórz ICTTJ” (menu)', { toasts: await toasts(page) })
    await page.getByRole('button', { name: 'Zapomnij wybór' }).click()
    await page.waitForTimeout(600)
    say('US.14 po Zapomnij', { program: await text(page, '[data-testid="ictj-program"]'), config: configOf(N).ictj })
    say('US.13 opened', (await recorded(app)).opened)
  } finally {
    await app.close()
  }
  say('US.13 sumy kontrolne ICTTJ (fikstura)', { przed: before, po: sha(ictj) })
  const l = await start('us-ictj-laptop', { dataDir, machine: 'LAPTOP' })
  try {
    await l.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await l.page.waitForTimeout(1200)
    await goSettings(l.page, 'ictj')
    say('US.13 LAPTOP', { status: await text(l.page, '[data-testid="ictj-status"]'), dir: await text(l.page, '[data-testid="ictj-dir"]'), forecast: await l.page.getByTestId('ictj-forecast').inputValue(), config: configOf('us-ictj-laptop').ictj })
  } finally {
    await l.app.close()
  }
})

test('US.15 import z banku', async () => {
  const N = 'us-import'
  const { dataDir, ictjDir } = useState('rok', N)
  const pobrane = join(LAB, 'przebiegi', N, 'pobrane')
  rmSync(pobrane, { recursive: true, force: true })
  mkdirSync(pobrane, { recursive: true })
  const r = await start(N, { dataDir, ictjDir, env: { FI_BANK_FILES_POLL_MS: '1000' } })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(1500)
    await goSettings(page, 'import')
    const own = page.getByTestId('own-name-input')
    say('US.15 nazwiska', await page.getByTestId('own-name').allInnerTexts())
    say('US.15 Dodaj przy pustym', await page.getByTestId('own-name-add').isDisabled())
    await own.fill('ANNA NOWAK')
    say('US.15 Dodaj z tekstem', await page.getByTestId('own-name-add').isDisabled())
    await page.getByTestId('own-name-add').click()
    await own.fill('anna nowak')
    say('US.15 duplikat – Dodaj', { disabled: await page.getByTestId('own-name-add').isDisabled(), lista: await page.getByTestId('own-name').allInnerTexts() })
    await own.fill('')
    await page.getByTestId('own-name').filter({ hasText: 'ANNA NOWAK' }).getByRole('button').click()
    await page.waitForTimeout(500)
    say('US.15 po usunięciu', await page.getByTestId('own-name').allInnerTexts())
    // bank files: a file already in Pobrane at the start, then switched off, a new file, switched on
    const mostekMeldunki = async () => {
      await page.keyboard.press('Control+1')
      await page.getByTestId('page-bridge').waitFor()
      await page.waitForTimeout(800)
      return (await text(page, '[data-testid="page-bridge"]')).split(String.fromCharCode(10)).filter((l) => /Nowy meldunek z mBanku/.test(l))
    }
    const toggle = page.getByTestId('settings-bank-files')
    say('US.15 przełącznik domyślnie', { checked: await toggle.isChecked().catch(() => '?'), config: configOf(N).prefs.bankFiles })
    say('US.15 Mostek – meldunki o plikach (pusty folder Pobrane)', await mostekMeldunki())
    cpSync(join(LAB, 'pliki', 'rok-nowe-historia.csv'), join(pobrane, 'mbank-A.csv'))
    await page.waitForTimeout(6000)
    say('US.15 włączone + plik A', { mostek: await mostekMeldunki(), toasty: (await recorded(app)).toasts.filter((t) => /mBank/.test(t.title + t.body)).map((t) => t.title + ': ' + t.body) })
    await goSettings(page, 'import')
    await toggle.click()
    await page.waitForTimeout(1500)
    say('US.15 po wyłączeniu', { config: configOf(N).prefs.bankFiles, mostek: await mostekMeldunki() })
    cpSync(join(LAB, 'pliki', 'rok-nowe-lista.csv'), join(pobrane, 'mbank-B.csv'))
    await page.waitForTimeout(6000)
    say('US.15 wyłączone + plik B', { mostek: await mostekMeldunki(), toasty: (await recorded(app)).toasts.filter((t) => /mBank/.test(t.title + t.body)).map((t) => t.title + ': ' + t.body) })
    await goSettings(page, 'import')
    await toggle.click()
    await page.waitForTimeout(6000)
    say('US.15 ponownie włączone', { mostek: await mostekMeldunki(), toasty: (await recorded(app)).toasts.filter((t) => /mBank/.test(t.title + t.body)).map((t) => t.title + ': ' + t.body) })
    await goSettings(page, 'import')
    const again = page.getByText('pokazuj znowu', { exact: false })
    say('US.15 „pokazuj znowu”', { ile: await again.count(), tekst: await again.allInnerTexts() })
    await snap(page, 'US.15-meldunki')
  } finally {
    await app.close()
  }
})

test('US.15b połączone nazwy', async () => {
  const N = 'us-import2'
  const { dataDir, ictjDir } = useState('rok', N)
  editFi(dataDir, (fi) => {
    fi.settings.import.aliases = {
      'zabka z1': { to: 'zabka', label: 'ZABKA Z1', toLabel: 'ŻABKA', at: '2026-10-01T10:00:00.000Z' },
      'zabka z2': { to: 'zabka', label: 'ZABKA Z2', toLabel: 'ŻABKA', at: '2026-10-02T10:00:00.000Z' },
      'dino 4': { to: 'dino', label: 'DINO 4', toLabel: 'DINO', at: '2026-10-03T10:00:00.000Z' }
    }
  })
  const r = await start(N, { dataDir, ictjDir })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(1500)
    await goSettings(page, 'import')
    say('US.15 połączone przed', await page.getByTestId('alias').allInnerTexts())
    await page.getByTestId('aliases-unmerge-all').click()
    await page.waitForTimeout(600)
    say('US.15 po „Rozłącz wszystkie”', { aliases: await page.getByTestId('alias').count(), toasts: await toasts(page), fi: Object.keys(fiOf(N).settings.import.aliases ?? {}) })
    await page.getByTestId('toast-action').first().click()
    await page.waitForTimeout(600)
    say('US.15 po Cofnij', { aliases: await page.getByTestId('alias').allInnerTexts() })
    await snap(page, 'US.15-cofnij')
  } finally {
    await app.close()
  }
})
