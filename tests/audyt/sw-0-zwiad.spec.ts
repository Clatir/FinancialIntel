// SW – reconnaissance: what the persona „rok” shows around the quick entry (Mostek, household, accounts), no changes.
import { test } from '@playwright/test'
import { text } from './lab'
import { bridge, log, openQuick, openRok, qread, qtext, snap } from './sw-pomoc'

test('SW zwiad', async () => {
  const run = 'sw-zwiad'
  const { app, page } = await openRok(run)
  try {
    log(run, 'mostek', await bridge(page))
    const q = await openQuick(app, page)
    log(run, 'okno', await qread(q))
    log(run, 'tekst', await qtext(q))
    log(run, 'konta', await q.getByTestId('quick-account').evaluate((s: HTMLSelectElement) => [...s.options].map((o) => o.textContent)))
    log(run, 'kategorie', await q.getByTestId('quick-category').evaluate((s: HTMLSelectElement) => [...s.options].map((o) => o.textContent).join(' | ')))
    await snap(q, 'sw-zwiad-okno')
    await q.keyboard.press('Escape')
    await page.getByTestId('nav-settings').click()
    await page.getByTestId('settings-tab-household').click()
    await page.waitForTimeout(800)
    log(run, 'domownicy', (await text(page, 'main')).slice(0, 3000))
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(800)
    log(run, 'konta-ust', (await text(page, 'main')).slice(0, 2000))
    await page.getByTestId('settings-tab-notify').click()
    await page.waitForTimeout(800)
    log(run, 'powiadomienia', (await text(page, 'main')).slice(0, 2500))
  } finally {
    await app.close()
  }
})
