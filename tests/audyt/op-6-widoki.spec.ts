/** OP.10, OP.11, OP.12 – zapisane widoki, filtr tego komputera, kolumny; ponowne uruchomienie i drugi komputer. */
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { start } from './lab'
import { enrich, goInbox, goOps, MBANK, opt, rows, run, say, shown, snap, step, sums, text, toasts, WALLET } from './op-pomoc'

const count = async (page: Page) => (await sums(page)).split('\n')[0]!
const chips = async (page: Page) => page.getByTestId('operations-view').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}${e.getAttribute('data-active') ? ' [aktywny]' : ''}`))
const state = async (page: Page) => ({
  okres: await text(page, '[data-testid="operations-period"]'),
  konto: (await page.getByTestId('operations-accounts').innerText()).replace(/\s+/g, ' '),
  rodzaj: (await page.getByTestId('operations-kinds').innerText()).replace(/\s+/g, ' '),
  kategoria: (await page.getByTestId('operations-categories').innerText()).replace(/\s+/g, ' '),
  więcej: (await page.getByTestId('operations-more').innerText()).replace(/\s+/g, ' '),
  licznik: await count(page),
  mójFiltr: await shown(page.getByTestId('operations-stored-filter')),
  kolumny: (await page.getByTestId('operations-columns').innerText()).replace(/\s+/g, ' ')
})

async function saveView(page: Page, name: string, withPeriod: boolean) {
  await page.getByTestId('operations-view-save').click()
  await page.getByTestId('operations-view-name').fill(name)
  if (withPeriod) await page.getByTestId('operations-view-period').check()
  await page.getByTestId('operations-view-confirm').click()
  await page.waitForTimeout(600)
}

test('OP.10 OP.11 OP.12 – widoki, filtr komputera, kolumny', async () => {
  const name = 'op-widoki'
  const r = await run(name, enrich)
  const dataDir = r.dataDir
  const ictjDir = join(r.dir, 'ictj')
  let { page, app } = r
  const errors = [...r.errors]
  try {
    await goOps(page)
    // OP.12 columns.
    await page.getByTestId('operations-columns').click()
    const colMenu = await page.getByTestId('operations-columns-menu').innerText().catch(async () => text(page, '[role="dialog"]').catch(() => ''))
    const colInputs = await page.locator('input[data-testid^="operations-column-"], [data-testid="operations-columns-menu"] input').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')}${(e as HTMLInputElement).disabled ? ' (nieaktywne)' : ''}${(e as HTMLInputElement).checked ? ' [x]' : ''}`))
    say('OP.12 menu kolumn', { menu: colMenu, pola: colInputs })
    for (const c of ['time', 'tags', 'account']) await page.getByTestId(`operations-column-${c}`).uncheck()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.12 po ukryciu 3', { przycisk: await page.getByTestId('operations-columns').innerText(), nagłówek: await text(page, '[data-testid="operations-header"]') })
    await snap(page, 'OP.12-kolumny')

    // OP.10 views.
    await page.getByTestId('operations-categories').click()
    await page.getByTestId('operations-categories-01KDEFCAT00000000000000100').check()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-more').click()
    await page.getByTestId('operations-amount-min').fill('50')
    await page.getByTestId('operations-amount-min').press('Tab')
    await page.keyboard.press('Escape')
    await saveView(page, 'Jedzenie > 50 zł', false)
    say('OP.10 widok A zapisany', { toast: await toasts(page), chipy: await chips(page), stan: await state(page) })
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(400)
    say('OP.10 po zmianie miesiąca – chip A', await chips(page))
    await saveView(page, 'Październik', true)
    say('OP.10 widok B (z okresem) zapisany', { toast: await toasts(page), chipy: await chips(page) })
    await page.getByTestId('operations-clear').click()
    await page.waitForTimeout(300)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(300)
    say('OP.10 wyczyszczone, wrzesień', await state(page))
    await page.getByTestId('operations-view-apply').filter({ hasText: 'Jedzenie > 50 zł' }).click()
    await page.waitForTimeout(400)
    say('OP.10 klik A (bez okresu)', { stan: await state(page), chipy: await chips(page) })
    await page.getByTestId('operations-view-apply').filter({ hasText: 'Październik' }).click()
    await page.waitForTimeout(400)
    say('OP.10 klik B (z okresem)', { stan: await state(page), chipy: await chips(page) })
    await snap(page, 'OP.10-widok-z-okresem')
    // Same name again (another filter).
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await saveView(page, 'Jedzenie > 50 zł', false)
    say('OP.10 ta sama nazwa', { toast: await toasts(page), chipy: await chips(page), fi: JSON.parse(readFileSync(join(dataDir, 'fi.json'), 'utf8')).settings.operationViews.map((v: any) => `${v.name} · konta ${v.filter.accounts?.length ?? 0} · okres ${v.withPeriod}`) })
    // Delete B, then „Cofnij”.
    await page.getByTestId('operations-view').filter({ hasText: 'Październik' }).getByTestId('operations-view-delete').click()
    await page.waitForTimeout(500)
    say('OP.10 usunięty B', { toast: await toasts(page), chipy: await chips(page) })
    await page.getByRole('status').filter({ hasText: /Październik|widok/i }).getByRole('button', { name: 'Cofnij' }).click().catch(() => undefined)
    await page.waitForTimeout(500)
    say('OP.10 po Cofnij', await chips(page))
    // OP.11: own filter of this computer.
    await page.getByTestId('operations-clear').click()
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${MBANK}`).check()
    await page.keyboard.press('Escape')
    await page.getByTestId('operations-kinds').click()
    await page.getByTestId('operations-kinds-expense').check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('OP.11 własny filtr ustawiony', await state(page))
    await app.close()

    // Restart of the same computer.
    const r2 = await start(name, { dataDir, ictjDir, fresh: false })
    r2.page.setDefaultTimeout(15_000)
    page = r2.page
    app = r2.app
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goOps(page)
    say('OP.11/OP.12/OP.10 po ponownym uruchomieniu', { stan: await state(page), chipy: await chips(page) })
    // From Meldunki.
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /bez kategorii/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(600)
    say('OP.11 z Meldunków', await state(page))
    await page.getByTestId('operations-accounts').click()
    await page.getByTestId(`operations-accounts-${WALLET}`).check()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.11 zmiana w widoku z Meldunków', await state(page))
    await page.getByTestId('operations-stored-filter').click()
    await page.waitForTimeout(400)
    say('OP.11 po „mój filtr”', await state(page))
    await snap(page, 'OP.11-moj-filtr')
    // From the bridge: a button leading to Operacje.
    await step('z Mostka', async () => {
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(800)
      const btns = await page.getByTestId('page-bridge').getByRole('button').allInnerTexts()
      say('OP.11 przyciski Mostka', btns.filter((b) => /Pokaż|Operac|zakup/i.test(b)))
      const b = page.getByTestId('page-bridge').getByRole('button', { name: /Pokaż zakupy|Pokaż w Operacjach|Pokaż/ }).first()
      await b.click()
      await page.waitForTimeout(700)
      say('OP.11 z Mostka', await state(page))
      if (await shown(page.getByTestId('operations-stored-filter'))) {
        await page.getByTestId('operations-stored-filter').click()
        await page.waitForTimeout(400)
        say('OP.11 z Mostka → „mój filtr”', await state(page))
      }
    })
    // OP.12 note cell, a new entry with the counterparty hidden, the default columns.
    await goOps(page)
    await page.getByTestId('operations-clear').click().catch(() => undefined)
    await page.getByTestId('operations-period-menu').click()
    await page.getByRole('button', { name: 'Bieżący miesiąc' }).click()
    await page.waitForTimeout(400)
    const noteCell = async (who: string) => {
      const c = page.getByTestId('operation-row').filter({ hasText: who }).getByTestId('operation-row-note')
      return { tekst: await opt(c), dymek: await opt(c, 'title') }
    }
    say('OP.12 notatka – Pizzeria Napoli (wielowierszowa)', await noteCell('Pizzeria Napoli'))
    say('OP.12 notatka – Carrefour (opisy części)', await noteCell('Carrefour'))
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-column-counterparty').uncheck()
    await page.keyboard.press('Escape')
    await page.getByTestId('operation-new').click()
    await page.waitForTimeout(400)
    say('OP.12 nowa przy ukrytym kontrahencie', (await rows(page).allInnerTexts()).filter((t) => /nowa operacja/.test(t)).map((t) => t.replace(/\s+/g, ' ')))
    await snap(page, 'OP.12-nowa-bez-kontrahenta')
    await page.keyboard.press('Control+1')
    await goOps(page)
    await page.getByTestId('operations-columns').click()
    await page.getByTestId('operations-columns-reset').click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('OP.12 przywróć domyślne', { przycisk: await page.getByTestId('operations-columns').innerText(), nagłówek: await text(page, '[data-testid="operations-header"]') })
    // Hide 3 again before the second computer (each computer its own).
    await page.getByTestId('operations-columns').click()
    for (const c of ['time', 'tags', 'account']) await page.getByTestId(`operations-column-${c}`).uncheck()
    await page.keyboard.press('Escape')
    errors.push(...r2.errors)
    await app.close()

    // The second computer on the same folder.
    const r3 = await start(`${name}-pc2`, { dataDir, ictjDir, machine: 'AUDYT-2' })
    r3.page.setDefaultTimeout(15_000)
    page = r3.page
    app = r3.app
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await goOps(page)
    say('OP.10/OP.12 drugi komputer', { stan: await state(page), chipy: await chips(page), nagłówek: await text(page, '[data-testid="operations-header"]') })
    await page.getByTestId('operations-view-apply').filter({ hasText: 'Jedzenie > 50 zł' }).first().click()
    await page.waitForTimeout(400)
    say('OP.10 drugi komputer – widok A', { stan: await state(page), nagłówek: await text(page, '[data-testid="operations-header"]') })
    await snap(page, 'OP.10-drugi-komputer')
    errors.push(...r3.errors)
    say('errors', errors)
  } finally {
    await app.close()
  }
})
