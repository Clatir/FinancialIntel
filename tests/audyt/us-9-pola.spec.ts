/** US.32 (pola Ustawień: Esc, Enter, Ctrl+2), US.31 (zakładka Import w trybie tylko do odczytu). */
import { test } from '@playwright/test'
import { start, useState } from './lab'
import { editFi, fiOf, goSettings, run, say, snap, text, toasts } from './us-pomoc'

test('US.32 pola Ustawień', async () => {
  const N = 'us-pola'
  const r = await run(N)
  const { app, page } = r
  try {
    const cases: Array<[string, string, () => ReturnType<typeof page.locator>, string, () => unknown]> = [
      ['nazwa konta', 'accounts', () => page.getByTestId('account-name').nth(2), 'Konto-ESC', () => fiOf(N).settings.accounts[2].name],
      ['nazwa kategorii', 'categories', () => page.getByTestId('category-name').nth(2), 'Kat-ESC', () => fiOf(N).settings.categories.map((c: any) => c.name).filter((n: string) => /ESC/.test(n))],
      ['imię domownika', 'household', () => page.getByTestId('member-name').nth(1), 'Dom-ESC', () => fiOf(N).settings.household.members[1].name],
      ['Osłony – cel', 'layers', () => page.getByTestId('layers-shields'), '5', () => fiOf(N).settings.layers.shieldSalaries],
      ['Saldo otwarcia', 'accounts', () => page.getByTestId('account-opening').nth(2), '777', () => 'x'],
      ['Cisza od', 'layers', () => page.getByLabel('Cisza od'), '21:15', () => fiOf(N).settings.orders.quietHours.from]
    ]
    for (const [label, tab, loc, val, file] of cases) {
      await goSettings(page, tab)
      const f = loc()
      const old = await f.inputValue()
      // Esc
      await f.click()
      await f.press('Control+a')
      await f.pressSequentially(val)
      await f.press('Escape')
      await page.waitForTimeout(700)
      const afterEsc = { pole: await f.inputValue(), ustawienia: await page.getByTestId('settings-tab-' + tab).count(), plik: file() }
      // Enter
      await f.click()
      await f.press('Control+a')
      await f.pressSequentially(val)
      await f.press('Enter')
      await page.waitForTimeout(900)
      const afterEnter = { pole: await f.inputValue(), plik: file() }
      // leaving the field with Ctrl+2: a typed value saved or lost?
      await f.click()
      await f.press('Control+a')
      await f.pressSequentially(val + '1')
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(900)
      await goSettings(page, tab)
      const afterCtrl2 = { pole: await f.inputValue(), plik: file() }
      say(`US.32 ${label}`, { przed: old, poEsc: afterEsc, poEnter: afterEnter, poCtrl2: afterCtrl2 })
      // restore
      await f.click()
      await f.press('Control+a')
      await f.pressSequentially(old)
      await f.press('Enter')
      await page.waitForTimeout(500)
    }
  } finally {
    await app.close()
  }
})

test('US.31 zakładka Import w trybie tylko do odczytu', async () => {
  const N = 'us-ro2'
  const { dataDir, ictjDir } = useState('rok', N)
  editFi(dataDir, (fi) => {
    fi.schemaVersion = 2
  })
  const r = await start(N, { dataDir, ictjDir })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(1500)
    await goSettings(page, 'import')
    const info = await page.evaluate(() => {
      const els = [...document.querySelectorAll('main button, main input, main select')] as HTMLInputElement[]
      return els.map((e) => `${e.tagName.toLowerCase()}[${(e.getAttribute('data-testid') ?? e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 24)}]${e.disabled || e.closest('fieldset:disabled') ? ' WYŁĄCZONY' : ' aktywny'}`)
    })
    say('US.31 Import – elementy', info.filter((x, i, a) => a.indexOf(x) === i).slice(0, 40))
    say('US.31 Import – baner', await page.getByTestId('settings-read-only').count())
    const own = page.getByTestId('own-name-input')
    await own.fill('RO TEST').catch(() => undefined)
    await page.getByTestId('own-name-add').click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('US.31 Import – dodanie nazwiska w trybie RO', { lista: await page.getByTestId('own-name').allInnerTexts(), toasts: await toasts(page) })
    await goSettings(page, 'ictj')
    say('US.31 ICTTJ – baner', await page.getByTestId('settings-read-only').count())
    say('US.31 wskaźnik zapisu', await page.locator('header, [class*="border-b"]').first().innerText().catch(() => ''))
    say('US.31 pasek górny', (await text(page, 'body')).split('\n').filter((l) => /zapis|odczyt/i.test(l)).slice(0, 5))
    await snap(page, 'US.31-import')
  } finally {
    await app.close()
  }
})
