/** US.7 – US.10: warstwy, rozkazy, cisza nocna, próg dziennika (state rok, copy). Observation only. */
import { test, type Page } from '@playwright/test'
import { reading } from './lab'
import { fiOf, goSettings, quickWin, run, say, snap, text, toasts, typed } from './us-pomoc'

const bridge = async (page: Page, n = 1100): Promise<string> => {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(900)
  return (await text(page, '[data-testid="page-bridge"]')).replace(/\n+/g, ' | ').slice(0, n)
}

test('US.7 warstwy', async () => {
  const N = 'us-warstwy'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'layers')
    const sh = page.getByTestId('layers-shields')
    const hu = page.getByTestId('layers-hull')
    say('US.7 domyślne', { shields: await sh.inputValue(), hull: await hu.inputValue(), orders: fiOf(N).settings.orders, layers: fiOf(N).settings.layers })
    const b0 = await bridge(page)
    say('US.7 Mostek 3/6', b0)
    reading('us', 'US.7', 'rok 3/6', { mostek: b0.slice(0, 600) })
    for (const v of ['4', '0', '25']) {
      await goSettings(page, 'layers')
      await typed(page, sh, v)
      say(`US.7 osłony ${v}`, { value: await sh.inputValue(), toasts: await toasts(page), fi: fiOf(N).settings.layers.shieldSalaries })
      if (v === '4') {
        const b = await bridge(page)
        say('US.7 Mostek po 4 (bez restartu)', b)
        reading('us', 'US.7', 'rok 4/6', { mostek: b.slice(0, 600) })
        await goSettings(page, 'layers')
      }
    }
    await snap(page, 'US.7-poza-zakresem')
    // below the minimum shields
    await typed(page, page.getByTestId('orders-min-shields'), '3')
    say('US.7 min=3 przy celu 4', { toasts: await toasts(page), min: fiOf(N).settings.orders.minShieldSalaries })
    await typed(page, sh, '2')
    say('US.7 cel 2 poniżej minimum 3', { value: await sh.inputValue(), toasts: await toasts(page), fi: fiOf(N).settings.layers.shieldSalaries })
    await typed(page, page.getByTestId('orders-min-shields'), '1')
    await typed(page, hu, '9')
    const b9 = await bridge(page)
    say('US.7 Mostek kadłub 9', b9)
    reading('us', 'US.7', 'rok 4/9', { mostek: b9.slice(0, 600) })
    await goSettings(page, 'layers')
    await typed(page, hu, '0')
    say('US.7 kadłub 0', { value: await hu.inputValue(), toasts: await toasts(page) })
    await typed(page, hu, '37')
    say('US.7 kadłub 37', { value: await hu.inputValue(), toasts: await toasts(page) })
    await typed(page, hu, '6')
    // assumed costs
    const ac = page.getByLabel('Przyjęte koszty')
    await typed(page, ac, '4000')
    say('US.7 przyjęte 4000', { value: await ac.inputValue(), fi: fiOf(N).settings.layers.assumedCosts })
    await typed(page, ac, '')
    say('US.7 przyjęte puste', { value: await ac.inputValue(), fi: fiOf(N).settings.layers.assumedCosts })
    await snap(page, 'US.7-layers')
    say('US.7 stan końcowy', fiOf(N).settings.layers)
  } finally {
    await app.close()
  }
})

test('US.8 rozkazy', async () => {
  const N = 'us-rozkazy'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'layers')
    say('US.8 domyślne', fiOf(N).settings.orders)
    const cmd0 = async () => {
      await page.keyboard.press('Control+8')
      await page.getByTestId('page-command').waitFor()
      await page.waitForTimeout(800)
      return (await text(page, '[data-testid="page-command"]')).replace(/\n+/g, ' | ')
    }
    const c0 = await cmd0()
    say('US.8 Dowództwo – rozkazy', c0.slice(0, 1800))
    await snap(page, 'US.8-dowodztwo')
    await goSettings(page, 'layers')
    const min = page.getByTestId('orders-min-shields')
    await typed(page, min, '5')
    say('US.8 min 5 ponad cel 3', { toasts: await toasts(page), min: fiOf(N).settings.orders.minShieldSalaries })
    await typed(page, min, '2')
    say('US.8 min 2', fiOf(N).settings.orders.minShieldSalaries)
    await typed(page, page.getByTestId('orders-cargo'), '20')
    await typed(page, page.getByLabel('Cisza od'), '22:00')
    await typed(page, page.getByLabel('Cisza do'), '04:00')
    await typed(page, page.getByLabel('Próg dziennika'), '300')
    await page.getByText('Firewall: dopłata do XTB', { exact: false }).click()
    await page.waitForTimeout(500)
    say('US.8 po zmianach – fi.json', fiOf(N).settings.orders)
    const c1 = await cmd0()
    say('US.8 Dowództwo po zmianach', c1.slice(0, 1800))
    await snap(page, 'US.8-dowodztwo-po')
    // the orders editable in Dowództwo?
    say('US.8 Dowództwo – pola', await page.locator('[data-testid="page-command"] input, [data-testid="page-command"] a, [data-testid="page-command"] button').evaluateAll((els) => els.map((e) => `${e.tagName}:${(e.textContent ?? '').trim().slice(0, 40)}|${(e as HTMLInputElement).value ?? ''}|${e.getAttribute('aria-label') ?? ''}`)))
    await page.keyboard.press('Control+5')
    await page.waitForTimeout(900)
    say('US.8 Ładownia – linia zanurzenia', (await text(page, '[data-testid="page-cargo"]')).replace(/\n+/g, ' | ').slice(0, 1300))
    await snap(page, 'US.8-ladownia')
    const q = await quickWin(app, page)
    await q.getByTestId('quick-amount').fill('250')
    await q.getByTestId('quick-time').fill('23:30')
    await q.getByTestId('quick-time').press('Tab')
    await page.waitForTimeout(500)
    say('US.8 szybki wpis 250 zł 23:30 (próg 300, cisza 22–04)', { log: await q.getByTestId('quick-log').count(), text: (await q.getByTestId('quick-entry').innerText().catch(() => '')).slice(-500) })
    await snap(q, 'US.8-szybki')
  } finally {
    await app.close()
  }
})

test('US.9 cisza nocna', async () => {
  const N = 'us-cisza'
  const r = await run(N)
  const { app, page } = r
  try {
    const set = async (from: string, to: string) => {
      await goSettings(page, 'layers')
      await typed(page, page.getByLabel('Cisza od'), from)
      await typed(page, page.getByLabel('Cisza do'), to)
      say(`US.9 ustawione ${from}–${to}`, { fi: fiOf(N).settings.orders.quietHours, toasts: await toasts(page) })
    }
    const quickAt = async (label: string, time: string, amount = '10') => {
      const q = await quickWin(app, page)
      await q.getByTestId('quick-amount').fill(amount)
      await q.getByTestId('quick-amount').press('Tab')
      await q.getByTestId('quick-time').fill(time)
      await q.getByTestId('quick-time').press('Tab')
      await q.waitForTimeout(400)
      const night = await q.getByText('cisza nocna', { exact: true }).count()
      const log = await q.getByTestId('quick-log').count()
      await q.getByTestId('quick-save').click()
      await q.waitForTimeout(700)
      const msg = await q.getByTestId('quick-message').innerText().catch(() => '(brak)')
      say(`US.9 ${label}: ${time}`, { badgeNight: night, logBlock: log, afterSave: msg })
      await q.keyboard.press('Escape').catch(() => undefined)
      await page.waitForTimeout(500)
    }
    await set('22:00', '02:00')
    await quickAt('22–02', '01:30')
    await quickAt('22–02', '02:00')
    await quickAt('22–02', '21:59')
    await quickAt('22–02', '22:00')
    await set('01:00', '06:00')
    await quickAt('01–06', '02:00')
    await quickAt('01–06', '23:30')
    await set('23:00', '23:00')
    await quickAt('od=do', '23:00')
    await quickAt('od=do', '12:00')
    say('US.9 od=do – bridge ok?', (await bridge(page, 200)))
    await goSettings(page, 'notify')
    await set('23:00', '05:00')
    await goSettings(page, 'notify')
    await typed(page, page.getByTestId('notify-evening-time'), '23:30')
    say('US.9 wieczorne 23:30 przy ciszy 23:00–05:00', { quiet: await text(page, '[data-testid="notify-evening-quiet"]').catch(() => '(brak napisu)'), config: (await import('./us-pomoc')).configOf(N).prefs.notify.eveningTime })
    await snap(page, 'US.9-wieczorne')
  } finally {
    await app.close()
  }
})

test('US.10 próg dziennika', async () => {
  const N = 'us-prog'
  const r = await run(N)
  const { app, page } = r
  try {
    const thr = async (v: string) => {
      await goSettings(page, 'layers')
      await typed(page, page.getByLabel('Próg dziennika'), v)
      say(`US.10 próg ${v}`, fiOf(N).settings.orders.impulseThreshold)
    }
    const quickAmt = async (a: string) => {
      const q = await quickWin(app, page)
      await q.getByTestId('quick-amount').fill(a)
      await q.getByTestId('quick-amount').press('Tab')
      await q.getByTestId('quick-time').fill('12:00')
      await q.getByTestId('quick-time').press('Tab')
      await q.waitForTimeout(500)
      const log = await q.getByTestId('quick-log').count()
      await q.keyboard.press('Escape')
      await page.waitForTimeout(500)
      return log
    }
    const editorAmt = async (a: string) => {
      await page.keyboard.press('Control+n')
      await page.getByTestId('operation-editor').waitFor()
      await page.waitForTimeout(500)
      await typed(page, 'operation-amount', a, 'Tab')
      await page.waitForTimeout(500)
      const t = await text(page, '[data-testid="operation-editor"]')
      return /plan czy impuls/i.test(t)
    }
    await thr('200')
    for (const a of ['199,99', '200', '200,00']) say(`US.10 próg 200: kwota ${a}`, { szybki: await quickAmt(a), edytor: await editorAmt(a) })
    await thr('0')
    say('US.10 próg 0: 5000', { szybki: await quickAmt('5000'), edytor: await editorAmt('5000') })
    await thr('')
    say('US.10 próg pusty: 5000', { szybki: await quickAmt('5000'), edytor: await editorAmt('5000'), fi: fiOf(N).settings.orders.impulseThreshold })
    await thr('200')
    await goSettings(page, 'layers')
    await snap(page, 'US.10')
  } finally {
    await app.close()
  }
})
