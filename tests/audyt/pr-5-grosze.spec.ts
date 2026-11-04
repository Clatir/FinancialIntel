// PR, przebieg 5 (kopia persony „rok”): PR.9 – grosze i podział z resztą w ostatniej części: nowy kontener roczny 1 240 zł
// (odkładki), kwoty „12,345” i „1.200” w polu kwoty kontenera, szybkiego wpisu i edytora operacji, liczba rat pożyczki
// jako ułamek, raty pożyczek 1 000 zł / 3 i 100 zł / 3. Przy okazji PR.3 – symulacja Ładowni („Zasięg po dodaniu”).
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { start, useState } from './lab'
import { flat, go, out, quickWindow, rec, snap, stepper, textOf, type Ctx } from './pr-pomoc'

const RUN = 'pr-5'
const GIFTS = '01KDEFCAT00000000000000901'

const toasts = (page: Page) => page.getByRole('status').allInnerTexts()

async function typeAmount(page: Page, testId: string, v: string, root: Page = page): Promise<{ wpisane: string; pole: string; toasty: string[] }> {
  const f = root.getByTestId(testId)
  await f.click()
  await f.fill(v)
  await f.press('Tab')
  await root.waitForTimeout(500)
  return { wpisane: v, pole: await f.inputValue(), toasty: (await toasts(root)).map((t) => t.replace(/\s+/g, ' ')) }
}

test('PR przebieg 5 – grosze i podział z resztą (PR.9)', async () => {
  const st = useState('rok', RUN)
  const ctx: Ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(5000)

    // PR.3 – Wywiad (kurs, „Zasięg i klasa”) wobec Mostka, stan rok bez zmian; zrzut jako dowód.
    await step('PR.3-wywiad', async () => {
      await rec(ctx, 'PR.3', 'rok – Wywiad: kurs („Zasięg i klasa”) i „paliwa starczy” wobec Mostka', async () => {
        await go(page, '1', 'page-bridge')
        const st = await textOf(page.locator('section[data-panel="bridge:Stan okrętu"]'))
        await go(page, '9', 'page-intel')
        await page.waitForTimeout(1500)
        const m = page.getByTestId('maneuver-range')
        if (await m.count()) await m.first().scrollIntoViewIfNeeded()
        await page.waitForTimeout(400)
        await snap(page, 'PR.3-rok-wywiad-kurs')
        const intel = await textOf(page.getByTestId('page-intel'))
        return {
          mostek_zasieg: /ZASIĘG\n([^\n]+)/.exec(st)?.[1] ?? '?',
          mostek_klasa: /KLASA\n([^\n]+)/.exec(st)?.[1] ?? '?',
          wywiad_kurs: flat(await textOf(m)),
          wywiad_kurs_sekcja: flat(await textOf(m.locator('xpath=ancestor::section[1]'))),
          wywiad_paliwo: [...intel.matchAll(/[^\n]*starczy[^\n]*/g)].map((x) => x[0]).join(' | ')
        }
      })
    })

    // A. Kontener roczny 1 240 zł, płatność 15.09.2027.
    await step('kontener-1240', async () => {
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click()
      await page.getByTestId('container-name').fill('Ubezpieczenie domu PR')
      await typeAmount(page, 'container-amount', '1240')
      await page.getByTestId('container-cycle').selectOption('12')
      const due = page.getByTestId('container-due')
      await due.click()
      await due.fill('15.09.2027')
      await due.press('Tab')
      await page.waitForTimeout(600)
      const form = await textOf(page.getByTestId('cargo-new'))
      dump('A-formularz', form)
      await snap(page, 'PR.9-kontener-1240-formularz')
      await rec(ctx, 'PR.3', 'rok – Ładownia, symulacja nowego kontenera 1 240 zł co rok (przed dodaniem)', async () => ({ symulacja: flat(await textOf(page.getByTestId('cargo-sim'))), formularz: flat(form) }))
      const save = page.getByTestId('cargo-new-save')
      await save.click()
      await page.waitForTimeout(800)
      if (await page.getByTestId('cargo-new-confirm').count()) await page.getByTestId('cargo-new-confirm').click()
      await page.waitForTimeout(1500)
      await go(page, '5', 'page-cargo')
      await rec(ctx, 'PR.9', 'rok + kontener „Ubezpieczenie domu PR” 1 240 zł co rok, płatność 15.09.2027', async () => ({
        wiersz: flat(await textOf(page.locator('[data-testid="cargo-row"][data-name="Ubezpieczenie domu PR"]'))),
        ladownia: flat(await textOf(page.getByTestId('page-cargo')))
      }))
      // The container opened: its details (installments of the tank).
      await page.locator('[data-testid="cargo-row"][data-name="Ubezpieczenie domu PR"]').click()
      await page.waitForTimeout(800)
      dump('A-kontener-otwarty', await textOf(page.getByTestId('page-cargo')))
      await snap(page, 'PR.9-kontener-1240')
    })

    // B. „12,345” i „1.200” w polu kwoty nowego kontenera (szkic, bez zapisu).
    await step('kontener-pole', async () => {
      await go(page, '5', 'page-cargo')
      await page.getByTestId('cargo-add').click().catch(() => undefined)
      await page.getByTestId('container-name').fill('Test pola PR')
      const a = await typeAmount(page, 'container-amount', '12,345')
      await snap(page, 'PR.9-kontener-12345')
      const b = await typeAmount(page, 'container-amount', '1.200')
      await snap(page, 'PR.9-kontener-1.200')
      const c = await typeAmount(page, 'container-amount', '1 200,5')
      dump('B-kontener-pole', { a, b, c, formularz: flat(await textOf(page.getByTestId('cargo-new'))) })
    })

    // C. Szybki wpis: „12,345”, potem „1.200” – zapis i odczyt zapisanej operacji.
    await step('szybki-pole', async () => {
      const q = await quickWindow(app, page)
      const a = await typeAmount(page, 'quick-amount', '12,345', q)
      const aPrev = flat(await textOf(q.getByTestId('quick-preview')))
      await snap(q, 'PR.9-szybki-12345')
      const b = await typeAmount(page, 'quick-amount', '1.200', q)
      await q.getByTestId('quick-counterparty').fill('Sklep PR9 kropka')
      await q.getByTestId('quick-category').selectOption(GIFTS)
      await q.getByTestId('quick-time').fill('')
      await q.getByTestId('quick-note').click()
      await q.waitForTimeout(500)
      const bPrev = flat(await textOf(q.getByTestId('quick-preview')))
      await snap(q, 'PR.9-szybki-1.200')
      dump('C-szybki', { a, aPrev, b, bPrev, komunikat: await textOf(q.getByTestId('quick-message')), zapisz: await q.getByTestId('quick-save').isEnabled() })
      await q.getByTestId('quick-save').click()
      await page.waitForTimeout(2500)
      await go(page, '2', 'page-operations')
      const search = page.getByTestId('operations-search')
      await search.fill('Sklep PR9')
      await page.waitForTimeout(1200)
      await rec(ctx, 'PR.9', 'rok + szybki wpis z kwotą wpisaną „1.200” (Prezenty i inne)', async () => ({ lista: flat(await textOf(page.getByTestId('operations-list'))), pasek: flat(await textOf(page.getByTestId('operations-sums'))) }))
      await snap(page, 'PR.9-zapisane-1.200')
      await search.fill('')
    })

    // D. Edytor operacji: „12,345” i „1.200”.
    await step('edytor-pole', async () => {
      await go(page, '2', 'page-operations')
      await page.keyboard.press('Control+n')
      await page.getByTestId('operation-amount').waitFor()
      const a = await typeAmount(page, 'operation-amount', '12,345')
      const b = await typeAmount(page, 'operation-amount', '1.200')
      await page.getByTestId('operation-counterparty').fill('Edytor PR9')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1200)
      dump('D-edytor', { a, b, edytor: flat(await textOf(page.getByTestId('operation-editor'))) })
      await snap(page, 'PR.9-edytor-1.200')
    })

    // E. Pożyczki: liczba rat „2,5”, potem 1 000 zł w 3 ratach (udzielona) i 100 zł w 3 ratach (wzięta, kontener).
    await step('pozyczki', async () => {
      await go(page, '7', 'page-radar')
      await page.getByTestId('loan-name').fill('Pożyczka PR9')
      await page.getByTestId('loan-counterparty').fill('Ewa Testowa')
      await typeAmount(page, 'loan-amount', '1000')
      const frac = await typeAmount(page, 'loan-installments', '2,5')
      await snap(page, 'PR.9-raty-ulamek')
      const frac2 = await typeAmount(page, 'loan-installments', '2.5')
      const three = await typeAmount(page, 'loan-installments', '3')
      dump('E-raty', { frac, frac2, three, panel: flat(await textOf(page.getByTestId('radar-new-loan'))) })
      await page.getByTestId('loan-save').click()
      await page.waitForTimeout(1500)
      await page.getByRole('radio', { name: 'Biorę pożyczkę' }).click()
      await page.getByTestId('loan-name').fill('Kredyt PR9')
      await page.getByTestId('loan-counterparty').fill('Bank PR9')
      await typeAmount(page, 'loan-amount', '100')
      await typeAmount(page, 'loan-installments', '3')
      await page.getByTestId('loan-save').click()
      await page.waitForTimeout(2000)
      await rec(ctx, 'PR.9', 'rok + pożyczka udzielona 1 000 zł / 3 raty i wzięta 100 zł / 3 raty', async () => {
        const radar = await textOf(page.getByTestId('page-radar'))
        const items = [...radar.matchAll(/(Spłata|Rata): (Pożyczka PR9|Kredyt PR9)[\s\S]{0,60}?([+−-]?[\d ]+,\d{2} zł)/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`)
        return { pozycje: items.join(' | '), pozyczka_PR9: flat(await textOf(page.locator('[data-testid="loan-row"][data-name="Pożyczka PR9"]'))), kredyt_PR9: flat(await textOf(page.locator('[data-testid="loan-row"][data-name="Kredyt PR9"]'))), radar: flat(radar) }
      })
      await snap(page, 'PR.9-pozyczki')
      await go(page, '5', 'page-cargo')
      dump('E-ladownia', flat(await textOf(page.getByTestId('page-cargo'))))
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
