// LA, przebieg C2 (stan „rok + strażnik ładowni i propozycje”): LA.6 rachunek zmienny, LA.7 propozycje z historii, LA.15
// nowa cena, LA.16 jedna kwota, LA.17 kontener bez płatności. Narzędzie obserwacji – oceny w docs/audyt/raport/LA.md.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { recorded, shot, start, useState } from './lab'
import { briefing, bridgeState, build, C, cargoScreen, go, monthAt, openContainer, out, rd, ready, recordsOf, textOf, toasts } from './la-pomoc'

const RUN = 'la-c2'
const STATE = 'rok + strażnik i propozycje (la-c2)'

test('LA przebieg C2 – strażnik ładowni: LA.6, LA.7, LA.15, LA.16, LA.17', async () => {
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('stan', build(st.dataDir, ['testnet', 'straznik', 'propozycje']))
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
      await shot(page, `LA-c2-BLAD-${name}`).catch(() => undefined)
    }
  }
  const inbox = async () => {
    await page.keyboard.press('Control+Shift+M')
    await page.getByTestId('page-inbox').waitFor({ timeout: 30_000 })
    await page.waitForTimeout(600)
    return page.locator('[data-testid="inbox-item"]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-kind')}|${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`))
  }
  const cont = (name: string) => recordsOf(st.dataDir, 'containers').find((c) => c.name === name)
  try {
    await ready(page)
    await step('start', async () => {
      const o = await briefing(page)
      const b = await bridgeState(page)
      await shot(page, 'LA.15-mostek')
      const inb = await inbox()
      await shot(page, 'LA.15-meldunki')
      await go(page, '5', 'page-cargo')
      const c = await cargoScreen(page)
      await shot(page, 'LA.7-ladownia')
      dump('C2-start', { o, b, inb, c })
      rd('LA.7', `${STATE} – propozycje`, { propozycje: c.propozycje, lista: await page.getByTestId('cargo-proposal').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-name')}|cykl=${e.getAttribute('data-cycle')}|${(e as HTMLElement).innerText.replace(/\s+/g, ' ')}`)) }, st)
      rd('LA.15', `${STATE} – start`, { odprawa: o.map((x) => x.text), meldunki: inb, wiersze: c.rows, masa: c.masa }, st)
    })
    // ---- LA.6 ----
    await step('LA.6', async () => {
      await go(page, '5', 'page-cargo')
      const ed = await openContainer(page, 'Prąd')
      const price = (await textOf(page.getByTestId('container-price'))).replace(/\n/g, ' | ')
      const hist = (await textOf(page.getByTestId('container-history'))).replace(/\n/g, ' | ')
      const row = await page.locator('[data-testid="cargo-row"][data-name="Prąd"]').innerText()
      const gas = await page.getByTestId('cargo-proposal').filter({ hasText: 'PGNIG' }).allInnerTexts()
      await shot(page, 'LA.6-prad')
      const pay = recordsOf(st.dataDir, 'transactions').filter((t) => /TAURON/.test(t.counterparty)).map((t) => `${t.date} ${t.amount}`).sort()
      dump('LA.6', { ed, price, hist, row, gas, pay })
      rd('LA.6', `${STATE} – Prąd 200 zł zmienny`, { wiersz: row.replace(/\s+/g, ' '), propozycja: price, historia: hist, platnosci: pay, propozycjaGaz: gas.map((x) => x.replace(/\s+/g, ' ')) }, st)
    })
    // ---- LA.7 ----
    await step('LA.7', async () => {
      await go(page, '5', 'page-cargo')
      const n0 = recordsOf(st.dataDir, 'containers').length
      const p = page.getByTestId('cargo-proposal').filter({ hasText: 'KASPERSKY' }).first()
      const target = (await p.count()) ? p : page.getByTestId('cargo-proposal').first()
      const which = await target.getAttribute('data-name')
      await target.getByTestId('cargo-proposal-add').click()
      await page.waitForTimeout(600)
      const f = page.getByTestId('cargo-new')
      const form = (await textOf(f)).replace(/\n/g, ' | ')
      const fields = (await f.count())
        ? {
            nazwa: await f.getByTestId('container-name').inputValue(),
            kwota: await f.getByTestId('container-amount').inputValue(),
            cykl: await f.getByTestId('container-cycle').evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.text ?? ''),
            data: await f.getByTestId('container-due').inputValue(),
            odbiorca: await f.getByTestId('container-counterparty').inputValue(),
            kategoria: await f.locator('select[aria-label="Kategoria"]').evaluate((e) => (e as HTMLSelectElement).selectedOptions[0]?.text ?? '')
          }
        : {}
      await shot(page, 'LA.7-formularz')
      const n1 = recordsOf(st.dataDir, 'containers').length
      await f.getByRole('button', { name: 'Anuluj', exact: true }).click()
      await page.waitForTimeout(400)
      const q = page.getByTestId('cargo-proposal').filter({ hasText: 'STREFA' }).first()
      const ign = (await q.count()) ? q : page.getByTestId('cargo-proposal').nth(1)
      const ignName = await ign.getAttribute('data-name')
      await ign.getByTestId('cargo-proposal-ignore').click()
      await page.waitForTimeout(800)
      const t = await toasts(page)
      const after = await page.getByTestId('cargo-proposal').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')))
      const unignore = await textOf(page.getByTestId('cargo-proposals-unignore'))
      await shot(page, 'LA.7-ukryte')
      await page.getByTestId('cargo-proposals-unignore').click()
      await page.waitForTimeout(800)
      const back = await page.getByTestId('cargo-proposal').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')))
      const unignore2 = await page.getByTestId('cargo-proposals-unignore').count()
      dump('LA.7', { which, form, fields, n0, n1, ignName, t, after, unignore, back, unignore2, ignored: JSON.parse(readFileSync(join(st.dataDir, 'fi.json'), 'utf8')).settings.cargo })
    })
    // ---- LA.15 ----
    await step('LA.15', async () => {
      await go(page, '5', 'page-cargo')
      const ed0 = await openContainer(page, 'Netflix')
      const price0 = (await textOf(page.getByTestId('container-price'))).replace(/\n/g, ' | ')
      const disney = await openContainer(page, 'Disney+')
      const hbo = await openContainer(page, 'HBO Max')
      const spotify = await openContainer(page, 'Spotify')
      await openContainer(page, 'Netflix')
      await shot(page, 'LA.15-netflix')
      const mPrev = await monthAt(page, -1)
      const mCur = await monthAt(page, 0)
      rd('LA.15', `${STATE} – przed „Zaktualizuj”`, { cena: price0, ladowniaM0: mCur.ladownia, ladowniaM1: mPrev.ladownia, disney, hbo }, st)
      // Pass 1: „Zaktualizuj” and „Cofnij” at once.
      await go(page, '5', 'page-cargo')
      await openContainer(page, 'Netflix')
      const btn = await textOf(page.getByTestId('container-price-update'))
      await page.getByTestId('container-price-update').click()
      await page.waitForTimeout(600)
      const t1 = await toasts(page)
      const hist1 = (await textOf(page.getByTestId('container-history'))).replace(/\n/g, ' | ')
      const rec1 = cont('Netflix')
      await shot(page, 'LA.15-zaktualizowany')
      const a = page.getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      const hadUndo = await a.count()
      if (hadUndo) await a.last().click()
      await page.waitForTimeout(1200)
      const rec2 = cont('Netflix')
      const price2 = (await textOf(page.getByTestId('container-price'))).replace(/\n/g, ' | ')
      // Pass 2: „To nie zmiana ceny”.
      await page.getByTestId('container-price-ignore').click()
      await page.waitForTimeout(600)
      const t3 = await toasts(page)
      const rec3 = cont('Netflix')
      const price3 = await textOf(page.getByTestId('container-price'))
      const o3 = await (async () => {
        await go(page, '1', 'page-bridge')
        return (await briefing(page)).filter((x) => /Netflix/.test(x.text)).map((x) => x.text)
      })()
      const inb3 = (await inbox()).filter((x) => /Netflix/.test(x))
      await go(page, '5', 'page-cargo')
      await openContainer(page, 'Netflix')
      const price3b = await textOf(page.getByTestId('container-price'))
      dump('LA.15-1', { ed0, price0, disney, hbo, spotify, btn, t1, hist1, rec1: { amount: rec1?.amount, past: rec1?.past, priceIgnored: rec1?.priceIgnored }, hadUndo, rec2: { amount: rec2?.amount, past: rec2?.past }, price2, t3, rec3: { amount: rec3?.amount, priceIgnored: rec3?.priceIgnored }, price3, o3, inb3, price3b })
      rd('LA.15', `${STATE} – po „To nie zmiana ceny”`, { cena: price3b, odprawaNetflix: o3, meldunkiNetflix: inb3, rekord: JSON.stringify({ amount: rec3?.amount, priceIgnored: rec3?.priceIgnored }) }, st)
      // Pass 3: the ignore taken back (the record's priceIgnored cleared), then „Zaktualizuj” for the plan of M0 and M-1.
      await page.evaluate(() => undefined)
    })
    await step('LA.15-3', async () => {
      // „To nie zmiana ceny” is undone by its toast only; after it the price is set by hand in the editor: 49 from this month.
      await go(page, '5', 'page-cargo')
      await openContainer(page, 'Netflix')
      const amount = page.getByTestId('cargo-editor').getByTestId('container-amount')
      await amount.click()
      await amount.fill('49')
      await amount.press('Tab')
      await page.waitForTimeout(1000)
      const t = await toasts(page)
      const hist = (await textOf(page.getByTestId('container-history'))).replace(/\n/g, ' | ')
      const rec = cont('Netflix')
      await shot(page, 'LA.16-historia')
      const mPrev = await monthAt(page, -1)
      const mCur = await monthAt(page, 0)
      dump('LA.15-3', { t, hist, rec: { amount: rec?.amount, past: rec?.past }, mPrev: mPrev.ladownia, mCur: mCur.ladownia })
      rd('LA.15', `${STATE} – Netflix 49 zł od listopada 2026 (kwota zmieniona w edytorze)`, { historia: hist, ladowniaM0: mCur.ladownia, ladowniaM1: mPrev.ladownia, podzialM1: mPrev.podzial }, st)
      rd('LA.16', `${STATE} – przed „Jedna kwota…”`, { historia: hist, ladowniaM1: mPrev.ladownia, ladowniaM0: mCur.ladownia }, st)
      // ---- LA.16 ----
      await go(page, '5', 'page-cargo')
      await openContainer(page, 'Netflix')
      await page.getByTestId('container-history-clear').click()
      await page.waitForTimeout(700)
      const t2 = await toasts(page)
      const hist2 = await textOf(page.getByTestId('container-history'))
      const rec2 = cont('Netflix')
      await shot(page, 'LA.16-po')
      const mPrev2 = await monthAt(page, -1)
      const mCur2 = await monthAt(page, 0)
      dump('LA.16', { t2, hist2, rec2: { amount: rec2?.amount, past: rec2?.past }, mPrev2: mPrev2.ladownia, mCur2: mCur2.ladownia })
      rd('LA.16', `${STATE} – po „Jedna kwota we wszystkich miesiącach”`, { toast: t2.join(' / '), historia: hist2, ladowniaM1: mPrev2.ladownia, ladowniaM0: mCur2.ladownia }, st)
    })
    // ---- LA.17 ----
    await step('LA.17', async () => {
      await go(page, '5', 'page-cargo')
      const c0 = await cargoScreen(page)
      const eds: Record<string, string> = {}
      for (const n of ['Siłownia', 'Spotify', 'Audioteka', 'CityFit']) eds[n] = await openContainer(page, n)
      await openContainer(page, 'Siłownia')
      const dead = (await textOf(page.getByTestId('container-dead'))).replace(/\n/g, ' | ')
      await shot(page, 'LA.17-silownia')
      rd('LA.17', `${STATE} – przed zrzutem Siłowni`, { masa: c0.masa, linia: c0.linia, sygnal: dead, wiersze: c0.rows }, st)
      await page.getByTestId('container-dead-drop').click()
      await page.waitForTimeout(800)
      const t1 = await toasts(page)
      const rec1 = cont('Siłownia')
      const c1 = await cargoScreen(page)
      await shot(page, 'LA.17-po-zrzucie')
      const undo = page.getByTestId('toast-action').filter({ hasText: 'Cofnij' })
      const hadUndo = await undo.count()
      if (hadUndo) await undo.last().click()
      await page.waitForTimeout(800)
      const rec1b = cont('Siłownia')
      rd('LA.17', `${STATE} – po „Zrzuć z ładowni” (Siłownia)`, { masa: c1.masa, linia: c1.linia, toast: t1.join(' / '), zarchiwizowany: String(rec1?.archived) }, st)
      // Brought back by hand when there was no „Cofnij”.
      if (cont('Siłownia')?.archived) {
        await page.locator('label', { hasText: 'zarchiwizowane' }).locator('input').check()
        await page.waitForTimeout(300)
        await openContainer(page, 'Siłownia')
        await page.getByTestId('container-archived').click()
        await page.waitForTimeout(800)
        await page.locator('label', { hasText: 'zarchiwizowane' }).locator('input').uncheck()
      }
      const rec2 = cont('Siłownia')
      await openContainer(page, 'Siłownia')
      const dead2 = await textOf(page.getByTestId('container-dead'))
      await page.getByTestId('container-dead-keep').click()
      await page.waitForTimeout(800)
      const t3 = await toasts(page)
      const rec3 = cont('Siłownia')
      const dead3 = await textOf(page.getByTestId('container-dead'))
      const badge3 = await page.locator('[data-testid="cargo-row"][data-name="Siłownia"]').innerText()
      await shot(page, 'LA.17-nadal-place')
      await go(page, '1', 'page-bridge')
      const o = (await briefing(page)).map((x) => x.text)
      const inb = await inbox()
      dump('LA.17', { c0, eds, dead, t1, rec1: { archived: rec1?.archived, archivedAt: rec1?.archivedAt }, c1, hadUndo, rec1b: { archived: rec1b?.archived }, rec2: { archived: rec2?.archived, aliveAt: rec2?.aliveAt }, dead2, t3, rec3: { aliveAt: rec3?.aliveAt }, dead3, badge3, o, inb })
      rd('LA.17', `${STATE} – po „Nadal płacę” (Siłownia)`, { toast: t3.join(' / '), sygnal: dead3, odprawa: o.filter((x) => /płatności|anulowan|Siłownia|Spotify|Audioteka/.test(x)), meldunki: inb.filter((x) => /Siłownia|Spotify|Audioteka|bez płatności/.test(x)) }, st)
    })
    dump('powiadomienia', await recorded(r.app).then((x) => x.toasts).catch((e) => String(e)))
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
