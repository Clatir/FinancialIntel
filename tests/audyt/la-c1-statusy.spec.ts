// LA, przebieg C1 (stan „rok + statusy”): LA.5 dzień 31 w krótszym miesiącu, LA.12 stan opłat w miesiącu, LA.13
// „Zapłacone” bez importu. Narzędzie obserwacji – oceny w docs/audyt/raport/LA.md.
import { test } from '@playwright/test'
import { recorded, shot, start, useState } from './lab'
import { briefing, bridgeState, build, cargoScreen, go, monthAt, openContainer, out, rd, ready, recordsOf, textOf, toasts } from './la-pomoc'

const RUN = 'la-c1'
const STATE = 'rok + statusy (la-c1)'

test('LA przebieg C1 – statusy: LA.5, LA.12, LA.13', async () => {
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('stan', build(st.dataDir, ['statusy']))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
      await shot(page, `LA-c1-BLAD-${name}`).catch(() => undefined)
    }
  }
  const netiaTx = () => recordsOf(st.dataDir, 'transactions').filter((t) => /NETIA/.test(t.counterparty) && t.date >= '2026-10-01').map((t) => `${t.date} ${t.amount} ${t.accountId?.slice(-2)} ${t.categoryId?.slice(-3)} c=${t.containerId ?? '-'} bank=${t.bank ? 1 : 0}`)
  try {
    await ready(page)
    await step('LA.12', async () => {
      const b = await bridgeState(page)
      const o = await briefing(page)
      await shot(page, 'LA.12-mostek')
      await go(page, '5', 'page-cargo')
      const c = await cargoScreen(page)
      await shot(page, 'LA.12-ladownia')
      const eds: Record<string, unknown> = {}
      for (const row of c.rows as Array<{ name: string }>) {
        await openContainer(page, row.name)
        const ed = page.getByTestId('cargo-editor')
        const month = ed.getByTestId('container-month')
        eds[row.name] = {
          stan: (await month.count()) ? await month.getAttribute('data-state') : '(brak „W tym miesiącu”)',
          wTymMiesiacu: (await textOf(month)).replace(/\n/g, ' | '),
          platnosc: (await ed.locator('xpath=.//*[contains(text(),"Najbliższa") or contains(text(),"Co miesiąc,")]').allInnerTexts()).join(' / '),
          zaplacone: await textOf(ed.getByTestId('container-paid')),
          zaplaconeOd: await textOf(ed.getByTestId('container-paid-from')),
          due: await ed.getByTestId('container-due').inputValue()
        }
        if (row.name === 'Rata leasingu') await shot(page, 'LA.5-ladownia')
        if (row.name === 'CityFit') await shot(page, 'LA.12-cityfit')
      }
      await go(page, '7', 'page-radar')
      const rad = (await textOf(page.getByTestId('radar-items'))).replace(/\n/g, ' | ')
      const items = await page.locator('[data-testid="radar-items"] [data-testid="radar-item"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-kind')}|${e.getAttribute('data-state') ?? ''}|${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
      await shot(page, 'LA.5-radar')
      dump('LA.12', { b, o, c, eds, rad, items })
      rd('LA.12', `${STATE} – stan opłat 03.11`, { wiersze: c.rows, edytory: eds, odprawa: o.map((x) => x.text), radar: items }, st)
      rd('LA.5', `${STATE} – Rata leasingu (dzień 31)`, { wiersz: JSON.stringify((c.rows as Array<{ name: string }>).find((x) => x.name === 'Rata leasingu')), edytor: eds['Rata leasingu'], radar: items.filter((x) => /leasing/i.test(x)) }, st)
    })
    await step('LA.13', async () => {
      await go(page, '1', 'page-bridge')
      const b0 = await bridgeState(page)
      const m0 = await monthAt(page, 0)
      rd('LA.13', `${STATE} – przed „Zapłacone” (Internet Netia)`, { energia: b0.energia, przydzial: m0.przydzial, koperty: m0.koperty }, st)
      await go(page, '5', 'page-cargo')
      await openContainer(page, 'Internet Netia')
      const btn = await textOf(page.getByTestId('container-paid'))
      const t0 = Date.now()
      await page.getByTestId('container-paid').click()
      await page.waitForTimeout(700)
      const t = await toasts(page)
      const ed = (await textOf(page.getByTestId('cargo-editor'))).replace(/\n/g, ' | ')
      const badge = await page.locator('[data-testid="cargo-row"][data-name="Internet Netia"] [data-testid="cargo-state"]').innerText()
      await shot(page, 'LA.13-zaplacone')
      const tx1 = netiaTx()
      // Operacje: the operation of today.
      await page.keyboard.press('Control+2')
      await page.getByTestId('page-operations').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(600)
      await page.getByTestId('operations-search').fill('NETIA')
      await page.waitForTimeout(600)
      const rows = (await page.getByTestId('operation-row').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ')).slice(0, 5)
      await page.getByTestId('operation-row').first().click()
      await page.waitForTimeout(500)
      const opEd = (await textOf(page.getByTestId('operation-editor'))).replace(/\n/g, ' | ')
      const cargoField = page.getByTestId('operation-container')
      const cargo = (await cargoField.count()) ? await cargoField.evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.text ?? '') : '(brak)'
      await shot(page, 'LA.13-operacje')
      const tLater = await toasts(page)
      const elapsed = Date.now() - t0
      let undo = '(toast „Cofnij” już zniknął)'
      const act = page.getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      if (await act.count()) {
        await act.last().click()
        undo = 'kliknięto Cofnij z Operacji'
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1000)
      const tx2 = netiaTx()
      const b1 = (await go(page, '1', 'page-bridge'), await bridgeState(page))
      const m1 = await monthAt(page, 0)
      dump('LA.13-1', { btn, t, ed, badge, tx1, rows, opEd, cargo, tLater, elapsed, undo, tx2, b1, m1 })
      rd('LA.13', `${STATE} – po „Zapłacone” Internet Netia 60 zł (dziś)${undo.startsWith('klik') ? ' i po „Cofnij”' : ''}`, { energia: b1.energia, przydzial: m1.przydzial, koperty: m1.koperty, operacje: JSON.stringify(tx2) }, st)
      // Second time: „Cofnij” at once (within the toast).
      if (!undo.startsWith('klik')) {
        await go(page, '5', 'page-cargo')
        await openContainer(page, 'Internet Netia')
        const has = await page.getByTestId('container-paid').count()
        if (has) {
          await page.getByTestId('container-paid').click()
          await page.waitForTimeout(700)
          const b2 = (await go(page, '1', 'page-bridge'), await bridgeState(page))
          const m2 = await monthAt(page, 0)
          rd('LA.13', `${STATE} – po „Zapłacone” Internet Netia (drugi raz, przed „Cofnij”)`, { energia: b2.energia, przydzial: m2.przydzial, koperty: m2.koperty, operacje: JSON.stringify(netiaTx()) }, st)
          const a2 = page.getByTestId('toast-action').filter({ hasText: 'Cofnij' })
          const had = await a2.count()
          if (had) await a2.last().click()
          await page.waitForTimeout(1200)
          await go(page, '5', 'page-cargo')
          const after = await openContainer(page, 'Internet Netia')
          const badge2 = await page.locator('[data-testid="cargo-row"][data-name="Internet Netia"] [data-testid="cargo-state"]').innerText()
          dump('LA.13-2', { had, after, badge2, tx: netiaTx(), b2, m2 })
          const b3 = (await go(page, '1', 'page-bridge'), await bridgeState(page))
          rd('LA.13', `${STATE} – po „Cofnij” (drugi raz)`, { energia: b3.energia, operacje: JSON.stringify(netiaTx()), stan: badge2 }, st)
        } else dump('LA.13-2', { brak: 'brak przycisku Zapłacone po pierwszym razie', ed: await textOf(page.getByTestId('cargo-editor')) })
      }
      await go(page, '5', 'page-cargo')
      const lease = await openContainer(page, 'Rata leasingu')
      await shot(page, 'LA.13-leasing')
      dump('LA.13-leasing', { lease, od: await textOf(page.getByTestId('container-paid-from')), btn: await page.getByTestId('container-paid').count() })
    })
    dump('powiadomienia', await recorded(r.app).then((x) => x.toasts).catch((e) => String(e)))
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
