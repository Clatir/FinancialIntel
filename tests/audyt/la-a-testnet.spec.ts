// LA, przebieg A (stan „rok + TESTNET”): LA.1 nowy kontener (szkic, łączenie płatności), LA.18 usunięcie z płatnościami
// i „Cofnij”, LA.14 „Połącz płatności”, LA.2 linia zanurzenia. Narzędzie obserwacji – oceny w docs/audyt/raport/LA.md.
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { briefing, bridgeState, build, cargoScreen, colorOf, go, monthAt, openContainer, out, rd, ready, recordsOf, textOf, toasts } from './la-pomoc'

const RUN = 'la-a'
const STATE = 'rok + TESTNET (la-a)'

test('LA przebieg A – TESTNET: LA.1, LA.18, LA.14, LA.2', async () => {
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('stan', build(st.dataDir, ['testnet', 'testnet-wstecz', 'testnet-dzienne', 'koperta700']))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
      await shot(page, `LA-a-BLAD-${name}`).catch(() => undefined)
    }
  }
  const testnetTx = () => recordsOf(st.dataDir, 'transactions').filter((t) => t.counterparty === 'TESTNET SP Z O O').map((t) => `${t.date} ${t.amount} ${t.categoryId?.slice(-3)} c=${t.containerId ?? '-'}`).sort()
  try {
    await ready(page)
    // ---- LA.1 ----
    await step('LA.1-przed', async () => {
      const b = await bridgeState(page)
      await go(page, '5', 'page-cargo')
      const c = await cargoScreen(page)
      const m = await monthAt(page, 0)
      const m1 = await monthAt(page, -1)
      dump('LA.1-przed', { b, c, m, m1 })
      rd('LA.1', `${STATE} – przed dodaniem`, { masa: c.masa, linia: c.linia, ladowniaPodzial: m.ladownia, koperty: m.koperty, przydzial: m.przydzial, kopertyM1: m1.koperty, mostek: b.stan, energia: b.energia }, st)
    })
    await step('LA.1-formularz', async () => {
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click()
      const f = page.getByTestId('cargo-new')
      await f.getByTestId('container-name').fill('Internet')
      await f.locator('[aria-label="Rodzaj kontenera"]').getByText('abonament', { exact: true }).click()
      const amount = f.getByTestId('container-amount')
      await amount.click()
      await amount.fill('79')
      await amount.press('Tab')
      await f.getByTestId('container-cycle').selectOption('1')
      const due = f.getByTestId('container-due')
      await due.click()
      await due.fill('15.11.2026')
      await due.press('Tab')
      await f.locator('select[aria-label="Konto"]').selectOption({ label: 'mBank' })
      await f.locator('select[aria-label="Kategoria"]').selectOption('01KDEFCAT00000000000000700')
      const cp = f.getByTestId('container-counterparty')
      await cp.click()
      await cp.fill('TESTNET')
      await cp.press('Tab')
      await page.waitForTimeout(500)
      dump('LA.1-formularz', (await textOf(f)).replace(/\n/g, ' | '))
      await shot(page, 'LA.1-formularz')
      // The draft kept while another screen is looked at.
      await go(page, '1', 'page-bridge')
      await go(page, '5', 'page-cargo')
      const kept = page.getByTestId('cargo-new')
      const keptText = (await kept.count()) ? (await textOf(kept)).replace(/\n/g, ' | ') : '(brak formularza)'
      const fields = (await kept.count())
        ? {
            nazwa: await kept.getByTestId('container-name').inputValue(),
            kwota: await kept.getByTestId('container-amount').inputValue(),
            data: await kept.getByTestId('container-due').inputValue(),
            odbiorca: await kept.getByTestId('container-counterparty').inputValue(),
            kategoria: await kept.locator('select[aria-label="Kategoria"]').evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.text ?? ''),
            konto: await kept.locator('select[aria-label="Konto"]').evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.text ?? ''),
            rodzaj: await kept.locator('[aria-label="Rodzaj kontenera"] [aria-checked="true"]').innerText()
          }
        : {}
      dump('LA.1-szkic-po-powrocie', { keptText, fields })
      await shot(page, 'LA.1-szkic')
      const before = recordsOf(st.dataDir, 'containers').length
      await page.getByTestId('cargo-new-save').click()
      await page.waitForTimeout(1200)
      const t = await toasts(page)
      const after = recordsOf(st.dataDir, 'containers').length
      const c = await cargoScreen(page)
      const ed = await textOf(page.getByTestId('cargo-editor'))
      dump('LA.1-po-dodaniu', { t, before, after, c, ed: ed.replace(/\n/g, ' | '), tx: testnetTx() })
      await shot(page, 'LA.1-po')
    })
    await step('LA.1-po', async () => {
      const m = await monthAt(page, 0)
      const m1 = await monthAt(page, -1)
      await shot(page, 'LA.1-plan-M-1')
      const b = (await go(page, '1', 'page-bridge'), await bridgeState(page))
      await go(page, '5', 'page-cargo')
      const c = await cargoScreen(page)
      dump('LA.1-po-ekrany', { m, m1, b, c })
      rd('LA.1', `${STATE} – po dodaniu „Internet” 79 zł`, { masa: c.masa, linia: c.linia, ladowniaPodzial: m.ladownia, koperty: m.koperty, przydzial: m.przydzial, kopertyM1: m1.koperty, mostek: b.stan, energia: b.energia }, st)
    })
    await step('LA.1-operacje', async () => {
      await page.keyboard.press('Control+2')
      await page.getByTestId('page-operations').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(800)
      const period = await page.getByTestId('operations-period').innerText().catch(() => '')
      if (period !== 'cała historia') {
        await page.getByTestId('operations-period-menu').click()
        await page.getByTestId('operations-period-all').click()
        await page.waitForTimeout(500)
      }
      await page.getByTestId('operations-search').fill('TESTNET')
      await page.waitForTimeout(800)
      const rows = (await page.getByTestId('operation-row').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')).slice(0, 25)
      await page.getByTestId('operation-row').first().click()
      await page.waitForTimeout(600)
      const sel = page.getByTestId('operation-container')
      const cargo = (await sel.count()) ? await sel.evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.text ?? '') : '(brak pola Ładownia)'
      dump('LA.1-operacje', { rows, cargo })
      await shot(page, 'LA.1-operacje')
      await page.keyboard.press('Escape')
    })

    // ---- LA.18 ----
    const del = async (label: string, undo: boolean) => {
      await go(page, '5', 'page-cargo')
      await openContainer(page, 'Internet')
      await page.getByTestId('container-delete').click()
      await page.getByTestId('container-delete-confirm').click()
      await page.waitForTimeout(600)
      const t1 = await toasts(page)
      await page.keyboard.press('Control+4')
      await page.getByTestId('page-month').waitFor()
      await page.waitForTimeout(500)
      const kop = (await textOf(page.getByTestId('month-envelopes'))).replace(/\n/g, ' | ')
      const prz = (await textOf(page.getByTestId('month-daily'))).replace(/\n/g, ' | ')
      const t2 = await toasts(page)
      let undone = '(nie)'
      if (undo) {
        const a = page.getByTestId('toast-action').filter({ hasText: 'Cofnij' })
        if (await a.count()) {
          await a.last().click()
          undone = 'kliknięto Cofnij'
        } else undone = '(brak przycisku Cofnij w toaście)'
        await page.waitForTimeout(2000)
      }
      dump(`LA.18-${label}`, { t1, t2, kop, prz, undone, kontenery: recordsOf(st.dataDir, 'containers').filter((c) => c.name === 'Internet').length, tx: testnetTx() })
      return { kop, prz, t1, undone }
    }
    await step('LA.18-usun-cofnij', async () => {
      const x = await del('usun-i-cofnij', true)
      await shot(page, 'LA.18-po-cofnij')
      const m = await monthAt(page, 0)
      const b = (await go(page, '1', 'page-bridge'), await bridgeState(page))
      await go(page, '5', 'page-cargo')
      const c = await cargoScreen(page)
      dump('LA.18-po-cofnij', { m, b, c, tx: testnetTx() })
      rd('LA.18', `${STATE} – po usunięciu „Internet” (odczyt w 8 s toastu)`, { koperty: x.kop, przydzial: x.prz, toast: x.t1.join(' / ') }, st)
      rd('LA.18', `${STATE} – po „Cofnij”`, { koperty: m.koperty, przydzial: m.przydzial, energia: b.energia, masa: c.masa }, st)
    })
    await step('LA.18-usun', async () => {
      const x = await del('usun', false)
      await shot(page, 'LA.18-po-usunieciu')
      const b = (await go(page, '1', 'page-bridge'), await bridgeState(page))
      const m = await monthAt(page, 0)
      const d = await monthAt(page, -1)
      dump('LA.18-po-usunieciu', { x, b, m, d })
      rd('LA.18', `${STATE} – po usunięciu „Internet” (bez Cofnij)`, { koperty: m.koperty, przydzial: m.przydzial, energia: b.energia, debriefingM1: d.debriefing, kopertyM1: d.koperty }, st)
    })
    // ---- LA.14 (and the last step of LA.18): a new container of the payee, the payee set afterwards ----
    await step('LA.14', async () => {
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click()
      const f = page.getByTestId('cargo-new')
      await f.getByTestId('container-name').fill('Internet TESTNET')
      const amount = f.getByTestId('container-amount')
      await amount.click()
      await amount.fill('79')
      await amount.press('Tab')
      await f.locator('select[aria-label="Kategoria"]').selectOption('01KDEFCAT00000000000000700')
      await page.getByTestId('cargo-new-save').click()
      await page.waitForTimeout(1000)
      const ed = page.getByTestId('cargo-editor')
      const cp = ed.getByTestId('container-counterparty')
      await cp.click()
      await cp.fill('TESTNET')
      await cp.press('Tab')
      await page.waitForTimeout(800)
      const link = page.getByTestId('container-link')
      const linkText = await textOf(link)
      await shot(page, 'LA.14-przycisk')
      const b0 = (await go(page, '1', 'page-bridge'), await bridgeState(page))
      const m0 = await monthAt(page, 0)
      rd('LA.14', `${STATE} – kontener „Internet TESTNET” bez połączonych płatności, przed „Połącz”`, { przycisk: linkText, koperty: m0.koperty, przydzial: m0.przydzial, energia: b0.energia }, st)
      await go(page, '5', 'page-cargo')
      await openContainer(page, 'Internet TESTNET')
      await page.getByTestId('container-link').click()
      await page.waitForTimeout(1200)
      const t = await toasts(page)
      const c = await cargoScreen(page)
      const edText = await openContainer(page, 'Internet TESTNET')
      await shot(page, 'LA.14-po')
      const b1 = (await go(page, '1', 'page-bridge'), await bridgeState(page))
      const m1 = await monthAt(page, 0)
      await shot(page, 'LA.14-plan')
      dump('LA.14', { linkText, t, c, edText, b0, m0, b1, m1, tx: testnetTx() })
      rd('LA.14', `${STATE} – po „Połącz płatności”`, { toast: t.join(' / '), koperty: m1.koperty, przydzial: m1.przydzial, energia: b1.energia, stan: JSON.stringify((c.rows as Array<{ name: string; text: string }>).find((x) => x.name === 'Internet TESTNET')) }, st)
    })

    // ---- LA.2 ----
    await step('LA.2', async () => {
      await go(page, '1', 'page-bridge')
      const b0 = await bridgeState(page)
      const state = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
      const massColor0 = await colorOf(state.getByText('Masa ładunku', { exact: true }).locator('..').locator('span').nth(1))
      await go(page, '5', 'page-cargo')
      const c0 = await cargoScreen(page)
      await page.getByTestId('cargo-add').click()
      const f = page.getByTestId('cargo-new')
      await f.getByTestId('container-name').fill('Rata kredytu')
      const amount = f.getByTestId('container-amount')
      await amount.click()
      await amount.fill('700')
      await amount.press('Tab')
      await page.waitForTimeout(600)
      const warn = await textOf(page.getByTestId('cargo-over-warning'))
      const sim = (await textOf(f.getByTestId('cargo-sim'))).replace(/\n/g, ' | ')
      const btn1 = await textOf(page.getByTestId('cargo-new-save'))
      await shot(page, 'LA.2-ostrzezenie')
      rd('LA.2', `${STATE} + Internet TESTNET – przed dodaniem „Rata kredytu” 700 zł`, { masa: c0.masa, linia: c0.linia, ostrzezenie: warn, symulacja: sim, mostek: b0.stan }, st)
      const n0 = recordsOf(st.dataDir, 'containers').length
      await page.getByTestId('cargo-new-save').click()
      await page.waitForTimeout(800)
      const n1 = recordsOf(st.dataDir, 'containers').length
      const btn2 = await textOf(page.getByTestId('cargo-new-confirm'))
      await shot(page, 'LA.2-drugie-potwierdzenie')
      await page.getByTestId('cargo-new-confirm').click()
      await page.waitForTimeout(1200)
      const n2 = recordsOf(st.dataDir, 'containers').length
      const c1 = await cargoScreen(page)
      await go(page, '1', 'page-bridge')
      const b1 = await bridgeState(page)
      const massColor1 = await colorOf(state.getByText('Masa ładunku', { exact: true }).locator('..').locator('span').nth(1))
      const odprawa = await briefing(page)
      await page.getByTestId('state-range-why').click().catch(() => undefined)
      await page.waitForTimeout(300)
      const rangeWhy = await textOf(page.getByTestId('state-range-lines'))
      await shot(page, 'LA.2-mostek')
      rd('LA.2', `${STATE} + Internet TESTNET + „Rata kredytu” 700 zł`, { masa: c1.masa, linia: c1.linia, mostek: b1.stan, kolorMasy: massColor1, odprawa: odprawa.filter((x) => /Masa ładunku/.test(x.text)).map((x) => x.text).join(' / '), zasiegSkad: rangeWhy.replace(/\n/g, ' | ') }, st)
      // A second new container, cancelled.
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click()
      const g = page.getByTestId('cargo-new')
      await g.getByTestId('container-name').fill('Do anulowania')
      const a2 = g.getByTestId('container-amount')
      await a2.click()
      await a2.fill('500')
      await a2.press('Tab')
      await page.waitForTimeout(400)
      await g.getByRole('button', { name: 'Anuluj', exact: true }).click()
      await page.waitForTimeout(800)
      const n3 = recordsOf(st.dataDir, 'containers').length
      const formLeft = await page.getByTestId('cargo-new').count()
      const names = recordsOf(st.dataDir, 'containers').map((c) => c.name)
      dump('LA.2', { b0, massColor0, c0, warn, sim, btn1, n0, n1, btn2, n2, c1, b1, massColor1, odprawa, rangeWhy, n3, formLeft, names })
    })
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
