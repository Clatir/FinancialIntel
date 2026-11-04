// DW, przebieg 8 (DW.13, DW.34, DW.35): persona „rok” z ciszą nocną przesuniętą na bieżącą godzinę (rozkaz w folderze,
// od godziny przed teraz do 3 h po). Dopisane przed startem: płatność kontenera Netflix teraz (z wpisem), zakup z importu
// dziś (bez godziny), zamrożony 10.10 zakup o godzinie z nowego okna (z wpisem). Szybkie wpisy w ciszy: impuls bez
// potwierdzenia → z potwierdzeniem, „plan”; edytor – godzina w ciszy bez wpisu. Potem rozkazy: Dowództwo ↔ Ustawienia,
// minimum osłon ponad cel, restart. Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { test, type Page } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { addRecords, briefing, cat, command, editSettings, energy, go, MBANK, out, quickWindow, textOf } from './dw-pomoc'

const NETFLIX = '01KAZ400000000000000000004'
const pad = (n: number) => String(n).padStart(2, '0')

async function today(page: Page): Promise<string> {
  await go(page, '8', 'page-command')
  return (await textOf(page.getByTestId('command-today'))).replace(/\s*\n\s*/g, ' | ')
}

test('DW.13 / DW.34 / DW.35 – cisza nocna i rozkazy', async () => {
  const RUN = 'dw-8'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const w = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Warsaw' })
  const hh = Number(w.slice(11, 13))
  const mm = Number(w.slice(14, 16))
  const from = `${pad((hh + 23) % 24)}:00`
  const to = `${pad((hh + 3) % 24)}:00`
  const before = `${pad(hh)}:${pad(Math.max(0, mm - 10))}`
  editSettings(st.dataDir, (s) => {
    s.orders.quietHours = { from, to }
  })
  addRecords(st.dataDir, 'transactions', [
    { date: '2026-11-03', time: before, accountId: MBANK, kind: 'expense', amount: -4900, categoryId: cat(602), counterparty: 'Netflix', containerId: NETFLIX, logNote: 'nocna płatność subskrypcji', createdAt: new Date().toISOString() },
    {
      date: '2026-11-03',
      time: null,
      accountId: MBANK,
      kind: 'expense',
      amount: -4000,
      categoryId: cat(101),
      counterparty: 'BIEDRONKA DW',
      createdAt: new Date().toISOString(),
      bank: { format: 'mbank', key: 'mbank:dw0000000000000b:0', description: 'ZAKUP PRZY UŻYCIU KARTY BIEDRONKA DW', counterparty: '', operation: 'ZAKUP PRZY UŻYCIU KARTY', category: '', pending: false, importedAt: new Date().toISOString(), source: 'lista' }
    },
    { date: '2026-10-10', time: `${pad(hh)}:30`, accountId: MBANK, kind: 'expense', amount: -3000, categoryId: cat(103), counterparty: 'Kino DW', impulse: 'impulse', logNote: 'seans', createdAt: '2026-10-10T20:00:00.000Z' }
  ])
  dump('wariant', { cisza: `${from}–${to}`, przed: before })
  let r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const { app, page } = r
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const c0 = await (async () => {
      await go(page, '8', 'page-command')
      return command(page)
    })()
    dump('0-start', { today: c0.today, strip: (c0.strip as string[]).join(' | '), log: (c0.log as string[]).slice(0, 12) })
    await shot(page, 'DW.13-start')

    // 1. An impulse at night: saved without the confirmation?
    let q = await quickWindow(app, page)
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('30')
    await q.getByTestId('quick-counterparty').fill('Nocny DW1')
    await q.getByTestId('quick-category').selectOption(cat(103))
    await q.waitForTimeout(400)
    dump('1-formularz', { czas: await q.getByTestId('quick-time').inputValue(), log: await textOf(q.getByTestId('quick-log')) })
    await q.getByTestId('quick-amount').press('Enter')
    await q.waitForTimeout(800)
    dump('1-enter-bez-potwierdzenia', { komunikat: await textOf(q.getByTestId('quick-message')), oknoOtwarte: !q.isClosed() })
    await shot(q, 'DW.13-szybki-wpis-bez-potwierdzenia')
    if (!q.isClosed()) {
      await q.getByTestId('quick-log-note').fill('głód po pracy')
      await q.getByTestId('quick-night-ok').check()
      await q.getByTestId('quick-amount').press('Enter')
      await page.waitForTimeout(1500)
    }
    dump('1-dzis', await today(page))

    // 2. A purchase „plan” at night.
    q = await quickWindow(app, page)
    await q.getByTestId('quick-amount').click()
    await q.getByTestId('quick-amount').fill('250')
    await q.getByTestId('quick-counterparty').fill('Nocny plan DW2')
    await q.getByTestId('quick-category').selectOption(cat(602))
    await q.waitForTimeout(400)
    await q.getByTestId('quick-log').getByRole('radio', { name: 'plan' }).click().catch(async () => q.getByTestId('quick-log').getByText('plan', { exact: true }).click())
    await q.getByTestId('quick-log-note').fill('bilety kupione zgodnie z planem')
    await q.getByTestId('quick-night-ok').check()
    dump('2-formularz', await textOf(q.getByTestId('quick-log')))
    await q.getByTestId('quick-amount').press('Enter')
    await page.waitForTimeout(1500)
    dump('2-dzis', await today(page))
    await shot(page, 'DW.13-dzis')

    // 3. The editor: a new expense with an hour in the quiet hours and no entry.
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-editor').waitFor({ timeout: 20_000 })
    await page.getByTestId('operation-amount').click()
    await page.getByTestId('operation-amount').fill('15')
    await page.getByTestId('operation-amount').press('Tab')
    await page.getByTestId('operation-time').click()
    await page.getByTestId('operation-time').fill(before)
    await page.getByTestId('operation-time').press('Tab')
    await page.waitForTimeout(600)
    dump('3-edytor', { night: await textOf(page.getByTestId('operation-night')), potwierdzenie: await textOf(page.getByTestId('operation-night-confirm')) })
    await shot(page, 'DW.13-edytor')
    await page.getByTestId('operation-log').fill('kolacja')
    await page.getByTestId('operation-amount').click()
    await page.waitForTimeout(600)
    dump('3-edytor-z-wpisem', { status: await textOf(page.getByTestId('operation-night-status')) })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)
    dump('3-dzis', await today(page))
    const c3 = await command(page)
    dump('3-zamrozone', { strip: (c3.strip as string[]).join(' | '), log: (c3.log as string[]).slice(0, 12) })
    reading('dw', 'DW.13', `rok, cisza ${from}–${to}`, { dzis: String(c3.today).replace(/\s+/g, ' ') })

    // DW.34 – the orders: quiet hours 22:00–06:00 in Dowództwo → Ustawienia; the load line 35 % there → Dowództwo.
    const fields = page.getByTestId('command-orders-fields')
    const qf = fields.getByLabel('Cisza od')
    await qf.click()
    await qf.fill('22:00')
    await qf.press('Tab')
    const qt = fields.getByLabel('Cisza do')
    await qt.click()
    await qt.fill('06:00')
    await qt.press('Tab')
    await page.waitForTimeout(800)
    dump('4-dowodztwo-rozkazy', await textOf(page.getByTestId('command-orders')))
    dump('4-dzis-po-zmianie-ciszy', await today(page))
    await page.getByTestId('command-orders-edit').click()
    await page.waitForTimeout(1200)
    const settingsText = await text(page)
    dump('4-ustawienia', settingsText.slice(settingsText.indexOf('Minimalne osłony') - 200, settingsText.indexOf('Minimalne osłony') + 800))
    dump('4-ustawienia-cisza', { od: await page.getByLabel('Cisza od').first().inputValue(), do: await page.getByLabel('Cisza do').first().inputValue() })
    const cargo = page.getByTestId('orders-cargo').first()
    await cargo.click()
    await cargo.fill('35')
    await cargo.press('Tab')
    await page.waitForTimeout(800)
    await shot(page, 'DW.34-ustawienia')
    await go(page, '8', 'page-command')
    dump('5-dowodztwo-linia', { linia: await page.getByTestId('command-orders-fields').getByTestId('orders-cargo').inputValue() })
    // Minimum shields above the target (3 salaries): 4.
    const ms = page.getByTestId('command-orders-fields').getByTestId('orders-min-shields')
    await ms.click()
    await ms.fill('4')
    await ms.press('Tab')
    await page.waitForTimeout(1000)
    dump('6-minimum-ponad-cel', { pole: await ms.inputValue(), rozkazy: await textOf(page.getByTestId('command-orders')), dzis: await textOf(page.getByTestId('command-today')) })
    await shot(page, 'DW.34-minimum-ponad-cel')
    dump('6-mostek', await briefing(page.context().pages()[0]!).catch(() => []))
    const e = await energy(page)
    dump('6-odprawa', { e, items: await briefing(page) })
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
  r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(3000)
    await go(r.page, '8', 'page-command')
    const f = r.page.getByTestId('command-orders-fields')
    dump('7-po-restarcie', {
      ciszaOd: await f.getByLabel('Cisza od').inputValue(),
      ciszaDo: await f.getByLabel('Cisza do').inputValue(),
      linia: await f.getByTestId('orders-cargo').inputValue(),
      minimum: await f.getByTestId('orders-min-shields').inputValue(),
      rozkazy: await textOf(r.page.getByTestId('command-orders'))
    })
    await shot(r.page, 'DW.34-po-restarcie')
  } finally {
    await r.app.close()
  }
})
