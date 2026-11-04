/** Dopowiedzenia: ME.3 („Pokaż zakupy” na czystym „rok”, „Pokaż korektę”, „Synchronizacja”), ME.8 (sygnał kategorii). */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { addRecords, cat, enrich, goInbox, MBANK, opt, rows, run, say, snap, sums, text, WALLET } from './op-pomoc'

const count = async (page: Page) => (await sums(page)).split(String.fromCharCode(10))[0]!

test('ME.3 „Pokaż zakupy” na czystym „rok”', async () => {
  const r = await run('me-pokaz-zakupy')
  const { page, app, errors } = r
  try {
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /do oddania/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(800)
    say('ME.3 „Pokaż zakupy” (Marek: do oddania 360 zł)', {
      okres: await text(page, '[data-testid="operations-period"]'),
      oznaczenia: (await page.getByTestId('operations-marks').innerText()).replace(/\s+/g, ' '),
      więcej: (await page.getByTestId('operations-more').innerText()).replace(/\s+/g, ' '),
      licznik: await count(page),
      wiersze: (await rows(page).allInnerTexts()).slice(0, 8).map((t) => t.replace(/\s+/g, ' '))
    })
    await snap(page, 'ME.3-pokaz-zakupy')
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.3 podwójne korekty i plik z błędem – przyciski', async () => {
  const r = await run('me-korekty', (d) => {
    addRecords(d, 'transactions', [
      { date: '2026-10-27', accountId: MBANK, kind: 'correction', counterparty: 'Korekta salda', amount: 1500, updatedBy: 'LAPTOP-KAPITANA' },
      { date: '2026-10-29', accountId: MBANK, kind: 'correction', counterparty: 'Korekta salda', amount: 1500, updatedBy: 'PC-STACJONARNY' }
    ])
    mkdirSync(join(d, 'transactions', '2026'), { recursive: true })
    writeFileSync(join(d, 'transactions', '2026', '2026-10-15_01KQPAZ0000000000000000001.json'), '{ "zepsuty": ')
  })
  const { page, app, errors } = r
  try {
    await goInbox(page)
    const corr = page.getByTestId('inbox-item').filter({ hasText: /korekta salda/ })
    say('ME.3 podwójne korekty – meldunek i przyciski', { tekst: await opt(corr), przyciski: await corr.getByRole('button').allInnerTexts() })
    await corr.getByRole('button', { name: 'Pokaż korektę' }).click()
    await page.waitForTimeout(700)
    say('ME.3 „Pokaż korektę”', { operacje: await page.getByTestId('page-operations').isVisible().catch(() => false), edytor: await page.getByTestId('operation-editor-title').innerText().catch(() => '-'), data: await page.getByTestId('operation-date').inputValue().catch(() => '-') })
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /plik z błędem/ }).getByTestId('inbox-open').click()
    await page.waitForTimeout(800)
    const t = await text(page, 'main').catch(() => text(page))
    say('ME.3 „Synchronizacja” – ekran', t.split('\n').filter((l) => /PLIKI Z PROBLEMAMI|Pliki z problemami|zepsuty|2026-10-15|Uszkodzony|KONFLIKTY/i.test(l)).slice(0, 8))
    await goInbox(page)
    await page.getByTestId('inbox-item').filter({ hasText: /korekta salda/ }).getByRole('button', { name: 'to nie powtórzenie' }).click()
    await page.waitForTimeout(600)
    say('ME.3 „to nie powtórzenie”', { toast: await page.getByRole('status').allInnerTexts(), meldunek: await opt(page.getByTestId('inbox-item').filter({ hasText: /korekta salda/ })) })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('ME.8 sygnał kategorii ponad 2× średniej', async () => {
  const r = await run('me-sygnal-kategorii', (d) => {
    enrich(d)
    addRecords(d, 'transactions', [{ date: '2026-11-02', accountId: WALLET, counterparty: 'WETERYNARZ AZOR', amount: -62000, categoryId: cat('0402') }])
  })
  const { page, app, errors } = r
  try {
    await goInbox(page)
    say('ME.8 sygnały', (await page.getByTestId('inbox-item').allInnerTexts()).filter((t) => /zwykle|średniej|Nowy kontrahent|Dwa obciążenia/.test(t)).map((t) => t.replace(/\s+/g, ' ')))
    await snap(page, 'ME.8-kategoria')
    say('errors', errors)
  } finally {
    await app.close()
  }
})
