/** Potwierdzenia 2: IN.4 (tylko do odczytu, świeży przebieg), US.6 (energia dziś po archiwizacji), IN.19 (kilka banerów naraz). */
import { test } from '@playwright/test'
import { start, useState } from './lab'
import { editFi, fiOf, goSettings, restart, run, say, snap, text, toasts, typed } from './us-pomoc'

test('IN.4 tylko do odczytu (powtórka)', async () => {
  const N = 'in-ro3'
  const { dataDir, ictjDir } = useState('rok', N)
  editFi(dataDir, (fi) => {
    fi.schemaVersion = 2
  })
  const r = await start(N, { dataDir, ictjDir })
  r.page.setDefaultTimeout(15_000)
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r.page.waitForTimeout(1800)
    say('IN.27 wskaźnik w górnym pasku (tylko odczyt)', await r.page.locator('header, [class*="border-b"]').first().innerText().catch(() => ''))
    await r.page.keyboard.press('Control+s')
    await r.page.waitForTimeout(800)
    say('IN.4 Ctrl+S w trybie tylko do odczytu', await toasts(r.page))
    await goSettings(r.page, 'general')
    await r.page.getByTestId('ship-name-input').click({ force: true }).catch(() => undefined)
    say('IN.4 pole nazwy okrętu wyłączone', await r.page.getByTestId('ship-name-input').isDisabled())
    await r.page.keyboard.press('Control+n')
    await r.page.waitForTimeout(800)
    say('IN.4 Ctrl+N w trybie tylko do odczytu', { ekran: await r.page.getByTestId('page-operations').count(), edytor: await r.page.getByTestId('operation-editor').count(), toasts: await toasts(r.page) })
  } finally {
    await r.app.close()
  }
})

test('US.6 energia dziś po archiwizacji kategorii z kopertą', async () => {
  const N = 'us-kat3'
  const r = await run(N)
  const { app, page } = r
  try {
    const dayEnergy = async () => {
      await page.keyboard.press('Control+1')
      await page.getByTestId('page-bridge').waitFor()
      await page.waitForTimeout(900)
      const t = await text(page, '[data-testid="page-bridge"]')
      const i = t.search(/ENERGIA DZI/i)
      return t.slice(i, i + 110).replace(/\n/g, ' ')
    }
    say('US.6 energia dziś – początek', await dayEnergy())
    await goSettings(page, 'categories')
    const row = page.locator('[data-testid="category-row"][data-name="Osobiste"]')
    await row.getByTestId('category-archive').click()
    await page.waitForTimeout(800)
    const t1 = await toasts(page)
    say('US.6 po archiwizacji Osobiste (codzienna 350 zł)', { toast: t1, energia: await dayEnergy() })
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(900)
    say('US.6 Plan miesiąca – koperty (Osobiste?)', (await text(page, '[data-testid="page-month"]')).split('\n').filter((l) => /Osobiste/.test(l)))
    await goSettings(page, 'categories')
    await page.getByTestId('toast-action').first().click().catch(() => undefined)
    await page.waitForTimeout(800)
    say('US.6 po Cofnij', { energia: await dayEnergy(), kat: fiOf(N).settings.categories.find((c: any) => c.name === 'Osobiste') })
    await page.keyboard.press('Control+4')
    await page.waitForTimeout(900)
    say('US.6 Plan miesiąca po Cofnij', (await text(page, '[data-testid="page-month"]')).split('\n').filter((l) => /Osobiste/.test(l)))
  } finally {
    await app.close()
  }
})

test('IN.19 kilka banerów naraz', async () => {
  const N = 'in-baner4'
  const s = useState('start', N)
  editFi(s.dataDir, (fi) => {
    fi.schemaVersion = 2
  })
  const r0 = await start(N, { dataDir: s.dataDir, ictjDir: s.ictjDir })
  await r0.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r0.app.close()
  const r1 = await restart(N, { edit: (c) => { c.updates = { ...c.updates, lastRunVersion: '1.15.3' } }, ictjDir: s.ictjDir })
  r1.page.setDefaultTimeout(15_000)
  try {
    await r1.page.waitForTimeout(2500)
    say('IN.19 banery naraz (tylko do odczytu + zaktualizowano)', await r1.page.locator('[data-testid^="banner-"]').evaluateAll((els) => els.filter((e) => e.getAttribute('data-testid')!.split('-').length === 2).map((e) => [e.getAttribute('data-testid'), (e.textContent ?? '').slice(0, 140)])))
    await snap(r1.page, 'IN.19-kilka')
    for (const k of ['Control+2', 'Control+3', 'Control+5']) {
      await r1.page.keyboard.press(k)
      await r1.page.waitForTimeout(800)
    }
    await snap(r1.page, 'IN.19-kilka-import')
    // the first row of the screen's controls must be under the banners
    say('IN.19 położenie górnego paska ekranu', await r1.page.evaluate(() => {
      const b = document.querySelector('[data-testid^="banner-"]')?.parentElement?.getBoundingClientRect()
      const m = document.querySelector('main')?.getBoundingClientRect()
      return { banery: b ? [Math.round(b.top), Math.round(b.bottom)] : null, main: m ? [Math.round(m.top), Math.round(m.bottom)] : null }
    }))
    await r1.page.getByTestId('banner-updated').getByRole('button').last().click()
    await r1.page.waitForTimeout(600)
    say('IN.19 po „×” na jednym banerze', await r1.page.locator('[data-testid^="banner-"]').count())
  } finally {
    await r1.app.close()
  }
})
