/** Potwierdzenia i uzupełnienia: US.6 (brak usuwania), US.7 (warstwy na Mostku), US.9 (od = do), US.16 (przekroczenie), US.23 (10 px), US.3 (filtry). */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { reading, recorded } from './lab'
import { dataDirOf, fiOf, goSettings, quickWin, run, say, snap, text, toasts, typed } from './us-pomoc'

const layers = async (page: Page) => {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(900)
  const g = async (id: string) => (await page.getByTestId(id).innerText().catch(() => '(brak)')).replace(/\n/g, ' ')
  return { energia: await g('state-energy'), oslony: await g('state-shields'), kadlub: await g('state-hull'), zasieg: await g('state-range'), cele: await g('state-targets-lines'), nadwyzka: await g('state-shields-over') }
}

test('US.7 warstwy na Mostku', async () => {
  const N = 'us-war2'
  const r = await run(N)
  const { app, page } = r
  try {
    const rd = async (label: string) => {
      const l = await layers(page)
      say(`US.7 Mostek – ${label}`, l)
      reading('us', 'US.7', `rok ${label}`, l as unknown as Record<string, string>)
    }
    await rd('osłony 3 / kadłub 6')
    await goSettings(page, 'layers')
    await typed(page, 'layers-shields', '4')
    await rd('osłony 4')
    await goSettings(page, 'layers')
    await typed(page, 'layers-hull', '9')
    await rd('osłony 4 / kadłub 9')
    await goSettings(page, 'layers')
    await typed(page, 'layers-shields', '3')
    await typed(page, 'layers-hull', '6')
    await page.getByLabel('Przyjęte koszty').click()
    await page.getByLabel('Przyjęte koszty').fill('4000')
    await page.getByLabel('Przyjęte koszty').press('Enter')
    await rd('przyjęte koszty 4000')
    await goSettings(page, 'layers')
    await snap(page, 'US.7-liczby')
    // decimals shown?
    await goSettings(page, 'layers')
    say('US.7 Minimalne osłony – pole', await page.getByTestId('orders-min-shields').inputValue())
  } finally {
    await app.close()
  }
})

test('US.6 usuwanie kategorii (potwierdzenie) i Cofnij', async () => {
  const N = 'us-kat2'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'categories')
    const byName = (n: string) => page.locator(`[data-testid="category-row"][data-name="${n}"]`)
    await page.getByTestId('category-add').click()
    await page.waitForTimeout(300)
    await typed(page, byName('Nowa kategoria').getByTestId('category-name'), 'Testowa')
    await byName('Testowa').getByTestId('category-add-sub').click()
    await page.waitForTimeout(300)
    say('IS.6 przyciski i teksty wiersza „Testowa”', (await byName('Testowa').innerText()).replace(/\n/g, ' | '))
    await byName('Testowa').getByTestId('category-archive').click()
    await page.waitForTimeout(400)
    say('US.6 po „archiwizuj” – przyciski wiersza', await byName('Testowa').locator('button').evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim() + '|' + (e.getAttribute('title') ?? ''))))
    say('US.6 w całych Ustawieniach/Kategorie jest słowo „usuń”?', /usu[ńn]/i.test(await text(page, 'main')))
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('usuń kategorię')
    await page.waitForTimeout(500)
    say('US.6 paleta „usuń kategorię”', await page.getByRole('option').allInnerTexts())
    await page.keyboard.press('Escape')
    await snap(page, 'US.6-brak-usuwania')
    // Cofnij after archiving a daily-envelope category: energy before / after / undo
    const en = async () => (await layers(page)).energia
    await goSettings(page, 'categories')
    const before = await en()
    await goSettings(page, 'categories')
    await byName('Osobiste').getByTestId('category-archive').click()
    await page.waitForTimeout(700)
    const toastText = await toasts(page)
    const after = await en()
    await goSettings(page, 'categories')
    say('US.6 Osobiste (codzienna) – archiwizacja', { toast: toastText, energiaPrzed: before, energiaPo: after })
    const undo = page.getByTestId('toast-action')
    if (await undo.count()) {
      await undo.first().click()
      await page.waitForTimeout(700)
      say('US.6 po Cofnij', { energia: await en(), archived: fiOf(N).settings.categories.find((c: any) => c.name === 'Osobiste').archived, envelope: fiOf(N).settings.categories.find((c: any) => c.name === 'Osobiste').envelope })
    } else say('US.6 Osobiste – brak toasta z Cofnij', toastText)
    await goSettings(page, 'categories')
    await byName('Osobiste').getByTestId('subcategory').first().locator('button').click()
    await page.waitForTimeout(500)
    say('US.6 podkategoria × – toasty', await toasts(page))
  } finally {
    await app.close()
  }
})

test('US.9 od = do', async () => {
  const N = 'us-cisza2'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'layers')
    const from = page.getByLabel('Cisza od')
    const to = page.getByLabel('Cisza do')
    await typed(page, from, '23:00')
    await typed(page, to, '23:00')
    await page.waitForTimeout(1500)
    say('US.9 pola po wpisaniu 23:00–23:00', { od: await from.inputValue(), do: await to.inputValue(), toasts: await toasts(page), fi: fiOf(N).settings.orders.quietHours })
    await snap(page, 'US.9-od-do')
    const q = await quickWin(app, page)
    await q.getByTestId('quick-amount').fill('10')
    await q.getByTestId('quick-amount').press('Tab')
    await q.getByTestId('quick-time').fill('23:00')
    await q.getByTestId('quick-time').press('Tab')
    await q.waitForTimeout(500)
    say('US.9 szybki wpis 23:00 przy oknie 23:00–' + (await to.inputValue()), { noc: await q.getByText('cisza nocna', { exact: true }).count(), log: await q.getByTestId('quick-log').count() })
    await q.getByTestId('quick-time').fill('03:00')
    await q.getByTestId('quick-time').press('Tab')
    await q.waitForTimeout(400)
    say('US.9 szybki wpis 03:00', { noc: await q.getByText('cisza nocna', { exact: true }).count() })
  } finally {
    await app.close()
  }
})

test('US.16 przekroczenie (czeka 90 s) / US.23 napisy 10 px / US.3 filtry', async () => {
  const N = 'us-pow2'
  const r = await run(N)
  const { app, page } = r
  try {
    await page.waitForTimeout(12_000)
    const base = (await recorded(app)).toasts.length
    const q = await quickWin(app, page)
    await q.getByTestId('quick-amount').fill('5000')
    await q.getByTestId('quick-amount').press('Tab')
    await q.getByTestId('quick-time').fill('12:00')
    await q.getByTestId('quick-time').press('Tab')
    await q.getByTestId('quick-save').click()
    await q.waitForTimeout(1500)
    say('US.16 komunikat zapisu', await q.getByTestId('quick-message').innerText().catch(() => '(brak)'))
    await q.keyboard.press('Escape').catch(() => undefined)
    await page.waitForTimeout(1000)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(1200)
    say('US.16 pierwszy wiersz Operacji', (await page.getByTestId('operation-row').first().innerText()).replace(/\n/g, ' | '))
    for (let i = 0; i < 9; i++) {
      await page.waitForTimeout(10_000)
      const n = (await recorded(app)).toasts.slice(base)
      if (n.length) {
        say(`US.16 nowe próby po ${(i + 1) * 10} s`, n.map((t) => `${t.title}: ${t.body}`))
        break
      }
    }
    say('US.16 wszystkie nowe', (await recorded(app)).toasts.slice(base).map((t) => `${t.title}: ${t.body}`))
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    say('US.16 Mostek – energia po wydatku', (await layers(page)).energia)

    // US.23: which text is 10 px in high contrast
    await goSettings(page, 'view')
    await page.getByTestId('settings-contrast').click()
    await page.waitForTimeout(600)
    const small: Record<string, string[]> = {}
    for (const k of ['Control+1', 'Control+2', 'Control+4', 'Control+5', 'Control+7', 'Control+8']) {
      await page.keyboard.press(k)
      await page.waitForTimeout(1000)
      small[k] = await page.evaluate(() => {
        const out: string[] = []
        for (const el of document.querySelectorAll('body *')) {
          if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim())) continue
          const fs = parseFloat(getComputedStyle(el).fontSize)
          if (fs < 12) out.push(`${fs}px: ${(el.textContent ?? '').trim().slice(0, 30)} (${el.tagName}.${(el.className + '').slice(0, 40)})`)
        }
        return out.slice(0, 6)
      })
    }
    say('US.23 napisy < 12 px przy wyższym kontraście', small)
    await goSettings(page, 'view')
    await page.getByTestId('settings-contrast').click()

    // US.3: the new account in Operacje's filter
    await goSettings(page, 'accounts')
    await page.getByTestId('account-add').click()
    await page.waitForTimeout(300)
    const last = page.getByTestId('account-row').last()
    await typed(page, last.getByTestId('account-name'), 'Konto oszczędnościowe')
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(1000)
    say('US.3 Operacje – selecty filtrów', await page.locator('[data-testid="page-operations"] select').evaluateAll((els) => els.map((e) => [...(e as HTMLSelectElement).options].map((o) => o.text).join(' / ').slice(0, 160))))
    await page.getByTestId('operations-sums').waitFor()
    say('US.3 Operacje – pasek sum', await text(page, '[data-testid="operations-sums"]'))
    await snap(page, 'US.3-operacje-filtr')
  } finally {
    await app.close()
  }
})
