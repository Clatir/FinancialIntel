/** Powtórki: IN.10 (nazwa układu), IN.18 (cel ujemny, puste nazwy), IN.26 (Co nowego – potwierdzenie na świeżym przebiegu). */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { start, useState } from './lab'
import { configOf, fiOf, goSettings, restart, run, say, snap, text, toasts, typed, userDataOf } from './us-pomoc'

test('IN.10 zmiana nazwy i nadpisanie układu', async () => {
  const N = 'in-uklady3'
  const r = await run(N)
  const { app, page } = r
  try {
    await page.keyboard.press('Control+1')
    await page.getByTestId('page-bridge').waitFor()
    const menu = page.getByTestId('layout-menu')
    const ensureOpen = async () => {
      if (!(await page.getByTestId('layout-menu-body').count())) await menu.click()
      await page.waitForTimeout(400)
    }
    await page.getByTestId('panel-hide').first().click()
    await ensureOpen()
    await page.getByTestId('layout-preset-name').fill('Duży wykres')
    await page.getByTestId('layout-preset-save').click()
    await page.waitForTimeout(700)
    say('IN.10 zapis', await toasts(page))
    await ensureOpen()
    await page.getByTitle('Zmień nazwę').first().click()
    await page.getByLabel('Nowa nazwa układu').fill('Mały wykres')
    await page.getByTitle('Zapisz nazwę').click()
    await page.waitForTimeout(600)
    say('IN.10 po zmianie nazwy', { toasts: await toasts(page), lista: await page.getByTestId('layout-preset').allInnerTexts() })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.getByTestId('panel-hide').first().click()
    await page.waitForTimeout(400)
    await ensureOpen()
    const over = page.getByTitle('Zapisz w nim bieżący układ').first()
    say('IN.10 „Nadpisz” – wyłączony?', await over.isDisabled())
    if (!(await over.isDisabled())) {
      await over.click()
      await page.waitForTimeout(600)
      say('IN.10 po „Nadpisz”', { toasts: await toasts(page), lista: await page.getByTestId('layout-preset').allInnerTexts() })
    }
    await ensureOpen()
    await page.getByTestId('layout-reset-page').click()
    await page.waitForTimeout(600)
    say('IN.10 „Domyślny układ tej strony”', { toasts: await toasts(page), ukryte: (await menu.innerText()).replace(/\s+/g, ' ') })
    await ensureOpen()
    await page.getByTestId('layout-reset-all').click()
    await page.waitForTimeout(600)
    say('IN.10 „… wszystkich stron”', await toasts(page))
    await ensureOpen()
    await page.getByTestId('layout-preset-delete').first().click()
    await page.waitForTimeout(600)
    say('IN.10 „Usuń układ”', { toasts: await toasts(page), lista: await page.getByTestId('layout-preset').count() })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(700)
    await menu.click()
    say('IN.10 menu na Operacjach', await text(page, '[data-testid="layout-menu-body"]'))
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(500)
    await page.getByTestId('panel-hide').first().click()
    await ensureOpen()
    await page.getByTestId('layout-preset-name').fill('Duży wykres')
    await page.getByTestId('layout-preset-save').click()
    await page.waitForTimeout(1500)
    say('IN.10 w fi.json', JSON.stringify(fiOf(N)).includes('Duży wykres'))
    await goSettings(page, 'general')
    say('IN.10 przycisk Układ na Ustawieniach', await menu.count())
  } finally {
    await app.close()
  }
  const l = await start('in-uklady3-laptop', { dataDir: join('C:\\FI-audyt\\przebiegi', N, 'dane'), machine: 'LAPTOP' })
  try {
    l.page.setDefaultTimeout(15_000)
    await l.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await l.page.waitForTimeout(1500)
    await l.page.getByTestId('layout-menu').click()
    await l.page.waitForTimeout(500)
    say('IN.10 LAPTOP widzi układy', await l.page.getByTestId('layout-preset').allInnerTexts())
  } finally {
    await l.app.close()
  }
})

test('IN.18 cel ujemny; IN.26 Co nowego (świeży przebieg)', async () => {
  const N = 'in-cel'
  const r = await run(N)
  const { app, page } = r
  try {
    await page.keyboard.press('Control+6')
    await page.waitForTimeout(1200)
    say('IN.18 Mapa – pola formularza', await page.locator('[data-testid="page-starmap"] input').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid') ?? e.getAttribute('aria-label') ?? e.getAttribute('placeholder')}=${(e as HTMLInputElement).value}`)))
    const nameField = page.locator('[data-testid="page-starmap"] input[placeholder]').first()
    say('IN.18 pierwszy input', await nameField.getAttribute('placeholder'))
    await page.getByRole('button', { name: 'Dodaj cel' }).click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('IN.18 po „Dodaj cel” z pustym formularzem', await toasts(page))
    const inputs = page.locator('[data-testid="page-starmap"] input')
    const n = await inputs.count()
    say('IN.18 liczba pól', n)
    for (let i = 0; i < Math.min(n, 4); i++) say(`IN.18 pole ${i}`, await inputs.nth(i).evaluate((e) => [(e as HTMLInputElement).placeholder, e.getAttribute('aria-label'), e.getAttribute('data-testid')].join('|')))
    await snap(page, 'IN.18-mapa')
  } finally {
    await app.close()
  }
  // IN.26 on a fresh run
  const N2 = 'in-conowego'
  const s = useState('start', N2)
  const r0 = await start(N2, { dataDir: s.dataDir, ictjDir: s.ictjDir })
  await r0.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r0.app.close()
  const r1 = await restart(N2, { edit: (c) => { c.updates = { ...c.updates, lastRunVersion: '1.15.3' } }, ictjDir: s.ictjDir })
  try {
    await r1.page.waitForTimeout(2500)
    say('IN.26 baner', await text(r1.page, '[data-testid="banner-updated"]').catch(() => '(brak)'))
    await r1.page.getByRole('button', { name: 'Co nowego' }).first().click()
    await r1.page.waitForTimeout(1200)
    say('IN.26 Aktualizacje – cały tekst', await text(r1.page, 'main'))
    await snap(r1.page, 'IN.26-aktualizacje')
    say('IN.26 log', readFileSync(join(userDataOf(N2), 'logs', 'main.log'), 'utf8').split('\n').filter((l) => /aktualiz|update|notes|release/i.test(l)).slice(-6))
    say('IN.26 config.updates', configOf(N2).updates)
  } finally {
    await r1.app.close()
  }
})
