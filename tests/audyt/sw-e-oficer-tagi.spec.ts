/**
 * SW.25, SW.26, SW.27, SW.29 – the officer's hints (bank brand, import rule, last used, chain dictionary, archived
 * category), tags and trips, a series by Ctrl+Enter, the templates. Special state (described in the report): a rule
 * „MOKKA DWORZEC” → Jedzenie · kawa i przekąski, a rule „Netia” → Subskrypcje i łączność · internet with that
 * subcategory archived; tag „Wakacje Chorwacja” on Lody Grycan of 30.10, „Remont” on Drogeria Natura of 23.10.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { reading, text } from './lab'
import { ACC, CAT, added, bridge, brief, category, editFi, enterSave, kind, log, openFresh, openRok, ops, qread, snap, typeAmount, typeIn, waitHidden } from './sw-pomoc'

function prepare(dataDir: string): void {
  editFi(dataDir, (fi) => {
    const rule = (id: string, match: string, label: string, categoryId: string) => ({ id, match, mode: 'exact', direction: 'out', label, kind: 'expense', categoryId, refundable: false, household: false, memberId: null, counterAccountId: null, learned: true, hits: 3, updatedAt: '2026-10-20T10:00:00.000Z' })
    fi.settings.import.rules.push(rule('01KSWREG000000000000000001', 'mokkadworzec', 'MOKKA DWORZEC', CAT.coffee), rule('01KSWREG000000000000000002', 'netia', 'Netia', '01KDEFCAT00000000000000702'))
    const c = fi.settings.categories.find((x: { id: string }) => x.id === '01KDEFCAT00000000000000702')
    c.archived = true
  })
  const dir = join(dataDir, 'transactions', '2026')
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    const t = JSON.parse(readFileSync(p, 'utf8'))
    const tag = f.startsWith('2026-10-30') && t.counterparty === 'Lody Grycan' ? 'Wakacje Chorwacja' : f.startsWith('2026-10-23') && t.counterparty === 'DROGERIA NATURA' ? 'Remont' : null
    if (tag) writeFileSync(p, `${JSON.stringify({ ...t, tags: [tag] }, null, 2)}\n`)
  }
}

const officerState = async (q: Page) => ({
  category: (await qread(q)).category,
  officer: (await q.getByTestId('quick-officer').count()) ? await q.getByTestId('quick-officer').innerText() : null,
  source: (await q.getByTestId('quick-officer').count()) ? await q.getByTestId('quick-officer').getAttribute('title') : null
})

test('SW oficer, tagi, seria, szablony: 25, 26, 27, 29', async () => {
  test.setTimeout(25 * 60_000)
  const run = 'sw-e'
  const { app, page, dataDir } = await openRok(run, prepare)
  try {
    // ---- SW.29 – szablony (przed zmianami tego przebiegu)
    let q = await openFresh(app, page)
    const tpl = q.getByTestId('quick-template')
    log(run, 'SW.29 szablony', await tpl.count(), await tpl.allInnerTexts())
    log(run, 'SW.29 edytor szablonów?', (await q.locator('body').innerText()).match(/szablon/gi))
    await typeAmount(q, '9,99')
    await tpl.nth(2).click()
    await q.waitForTimeout(300)
    log(run, 'SW.29 po kliknięciu 3. szablonu', await qread(q))
    await snap(q, 'SW.29')
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.25 – oficer: przygotowanie „Orlen” sprzed 2 dni z Auto · serwis (ostatnio użyta z marką)
    let before = await ops(dataDir)
    q = await openFresh(app, page)
    await typeAmount(q, '80,00')
    await typeIn(q, 'quick-counterparty', 'Orlen')
    log(run, 'SW.25 Orlen przed przygotowaniem', await officerState(q))
    await category(q, '01KDEFCAT00000000000000302')
    await typeIn(q, 'quick-date', '01.11')
    log(run, 'SW.25 zapis Orlen 01.11 Auto · serwis', await enterSave(app, q, 'quick-date'))
    log(run, 'SW.25 przygotowanie – nowe', (await added(dataDir, before)).map(brief))
    q = await openFresh(app, page)
    for (const name of ['Cityfit', 'Mokka', 'Mokka Dworzec', 'Orlen', 'Lidl', 'Kaufland', 'Netia', 'Sklepik u Zosi']) {
      await q.getByTestId('quick-category').selectOption('')
      await typeIn(q, 'quick-counterparty', name)
      const auto = await officerState(q)
      // The source: a manual category first, then the name again – the officer's button with its tooltip.
      await q.getByTestId('quick-category').selectOption(CAT.gift)
      await typeIn(q, 'quick-counterparty', '')
      await typeIn(q, 'quick-counterparty', name)
      const manual = await officerState(q)
      log(run, `SW.25 „${name}”`, 'pusta kategoria →', auto.category, '| przy ręcznej:', manual)
      if (name === 'Mokka Dworzec') await snap(q, 'SW.25-mokka-dworzec')
    }
    // Ręczny wybór zostaje, a „oficer: …” przyjmuje podpowiedź jednym kliknięciem
    await q.getByTestId('quick-category').selectOption(CAT.gift)
    await typeIn(q, 'quick-counterparty', 'Cityfit')
    await snap(q, 'SW.25-reczna')
    if (await q.getByTestId('quick-officer').count()) await q.getByTestId('quick-officer').click()
    log(run, 'SW.25 po kliknięciu „oficer”', await officerState(q))
    const list = await q.locator('#quick-counterparties option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))
    log(run, 'SW.25 lista kontrahentów', list.length, list)
    await q.keyboard.press('Escape')
    await waitHidden(app)

    // ---- SW.26 – tagi
    before = await ops(dataDir)
    await page.keyboard.press('Control+9')
    await page.waitForTimeout(2500)
    const exp0 = (await page.getByTestId('intel-expeditions').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    log(run, 'SW.26 Wyprawy przed', exp0.slice(0, 700))
    await page.keyboard.press('Control+1')
    q = await openFresh(app, page)
    log(run, 'SW.26 Tagi i podpowiedź', (await q.getByTestId('quick-tags').innerText().catch(() => '')).replace(/\s+/g, ' '), '| przycisk', (await q.getByTestId('quick-tag-last').count()) ? await q.getByTestId('quick-tag-last').innerText() : '(brak)')
    await q.getByTestId('quick-tag-last').click()
    await q.waitForTimeout(200)
    log(run, 'SW.26 po kliknięciu', await q.getByTestId('quick-tags-chip').evaluateAll((cs) => cs.map((c) => c.getAttribute('data-tag'))), '| przycisk nadal', await q.getByTestId('quick-tag-last').count())
    await typeAmount(q, '54,30')
    await typeIn(q, 'quick-counterparty', 'Konzum #wakacje-chorwacja')
    log(run, 'SW.26 oficer dla „Konzum #…”', await officerState(q))
    await typeIn(q, 'quick-note', '#Remont łazienki')
    await snap(q, 'SW.26-tagi')
    if (!(await qread(q)).category || (await qread(q)).category === '— bez kategorii —') await category(q, CAT.groceries)
    log(run, 'SW.26 zapis 1', await enterSave(app, q, 'quick-note'))
    q = await openFresh(app, page)
    await typeAmount(q, '42,00')
    await typeIn(q, 'quick-counterparty', 'Pizzeria #1')
    await category(q, '01KDEFCAT00000000000000102')
    log(run, 'SW.26 zapis 2', await enterSave(app, q, 'quick-counterparty'))
    await page.waitForTimeout(800)
    log(run, 'SW.26 nowe', (await added(dataDir, before)).map(brief))
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(2000)
    log(run, 'SW.26 Operacje', (await page.getByTestId('operation-row').allInnerTexts()).slice(0, 3).map((x) => x.replace(/\s+/g, ' ')))
    await snap(page, 'SW.26-operacje')
    await page.keyboard.press('Control+9')
    await page.waitForTimeout(2500)
    const exp1 = (await page.getByTestId('intel-expeditions').innerText().catch(() => '(brak)')).replace(/\s+/g, ' ')
    log(run, 'SW.26 Wyprawy po', exp1.slice(0, 700))
    await page.getByTestId('intel-expeditions').scrollIntoViewIfNeeded().catch(() => undefined)
    await snap(page, 'SW.26-wyprawy')
    reading('sw', 'SW.26', 'rok+tagi', { wyprawyPrzed: exp0.slice(0, 400), wyprawyPo: exp1.slice(0, 400) })
    await page.keyboard.press('Control+1')

    // ---- SW.27 – seria Ctrl+Enter: wczoraj, Portfel XTB, tag „Wakacje Chorwacja”
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await q.getByTestId('quick-yesterday').click()
    await q.getByTestId('quick-account').selectOption(ACC.xtb)
    if (await q.getByTestId('quick-tag-last').count()) await q.getByTestId('quick-tag-last').click()
    const series: string[] = []
    for (const [i, a] of ['12,00', '8,50', '30,00'].entries()) {
      await typeAmount(q, a)
      if (i === 0) await category(q, CAT.groceries)
      else if (!(await qread(q)).category || (await qread(q)).category === '— bez kategorii —') await category(q, CAT.groceries)
      const msg = await enterSave(app, q, 'quick-amount', 'Control+Enter')
      await q.waitForTimeout(400)
      const r = await qread(q)
      const tags = await q.getByTestId('quick-tags-chip').evaluateAll((cs) => cs.map((c) => c.getAttribute('data-tag')))
      series.push(msg)
      log(run, `SW.27 po Ctrl+Enter ${a}`, msg, '| stopka', r.message, '| formularz', { kind: r.kind, amount: r.amount, account: r.account, date: r.date, time: r.time, category: r.category, focus: r.focus, tags })
      if (i === 2) await snap(q, 'SW.27-seria')
    }
    await typeAmount(q, '5,00')
    await category(q, CAT.groceries)
    log(run, 'SW.27 czwarty Enter', await enterSave(app, q, 'quick-amount'), '| okno ukryte', await waitHidden(app))
    await page.waitForTimeout(1200)
    const n27 = await added(dataDir, before)
    log(run, 'SW.27 nowe', n27.length, n27.map(brief))
    const b27 = await bridge(page)
    log(run, 'SW.27 Mostek energia', b27.energy)
    reading('sw', 'SW.27', 'rok+tagi', { seria: series.join(' || '), mostek: b27.energy })

    // ---- SW.29 – szablony po zakupach domownika i wpływach (bez nich)
    q = await openFresh(app, page)
    await kind(q, 'Za domownika')
    await typeAmount(q, '33,00')
    await typeIn(q, 'quick-counterparty', 'Księgarnia Domowa')
    await category(q, CAT.gift)
    log(run, 'SW.29 zakup domownika', await enterSave(app, q, 'quick-counterparty'))
    q = await openFresh(app, page)
    await kind(q, 'Wpływ')
    await typeAmount(q, '20,00')
    await typeIn(q, 'quick-counterparty', 'Zwrot od kolegi')
    log(run, 'SW.29 wpływ', await enterSave(app, q, 'quick-counterparty'))
    q = await openFresh(app, page)
    log(run, 'SW.29 szablony na końcu', await q.getByTestId('quick-template').allInnerTexts(), '| powtórz ostatni', await q.getByTestId('quick-repeat').getAttribute('title'))
    await q.keyboard.press('Escape')
    void text
  } finally {
    await app.close()
  }
})
