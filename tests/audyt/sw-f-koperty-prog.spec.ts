/**
 * SW.6 (second part) and SW.18 (variant) – a category outside the envelopes („Prezenty i inne” with envelope „brak” in
 * Ustawienia → Kategorie) and the captain's log threshold 0. Special state: fi.json – Prezenty i inne envelope null,
 * orders.impulseThreshold 0.
 */
import { test } from '@playwright/test'
import { reading, text } from './lab'
import { CAT, added, bridge, brief, category, editFi, enterSave, log, openFresh, openRok, ops, qread, snap, typeAmount } from './sw-pomoc'

const monthEnergy = (s: string) => /Energia · pensja miesiąca do wydania ([^A-ZŁ]+zł)/.exec(s)?.[1]?.trim() ?? '?'
const shields = (s: string) => /Osłony · bufor na pensje ([^/]+)\//.exec(s)?.[1]?.trim() ?? '?'

test('SW koperta „brak” i próg 0: 6, 18', async () => {
  test.setTimeout(15 * 60_000)
  const run = 'sw-f'
  const { app, page, dataDir } = await openRok(run, (d) =>
    editFi(d, (fi) => {
      fi.settings.categories.find((c: { id: string }) => c.id === CAT.gifts).envelope = null
      fi.settings.orders.impulseThreshold = 0
    })
  )
  try {
    // ---- SW.6 – poza kopertami
    let before = await ops(dataDir)
    const b0 = await bridge(page)
    log(run, 'SW.6 przed: energia', b0.energy, '| energia miesiąca', monthEnergy(b0.state), '| osłony', shields(b0.state), '| koperty', b0.envelopes)
    let q = await openFresh(app, page)
    await typeAmount(q, '100,00')
    await category(q, CAT.gift)
    const p1 = await qread(q)
    log(run, 'SW.6 Prezenty 100', p1.preview)
    await snap(q, 'SW.6-poza-kopertami-brak')
    await typeAmount(q, '7 000,00')
    const p2 = await qread(q)
    log(run, 'SW.6 Prezenty 7000 (podgląd)', p2.preview, '| klasa', await q.locator('[data-testid="quick-preview-outside"] span.text-down').allInnerTexts())
    await snap(q, 'SW.6-z-oslon')
    await typeAmount(q, '100,00')
    log(run, 'SW.6 zapis', await enterSave(app, q))
    await page.waitForTimeout(1200)
    const b1 = await bridge(page)
    log(run, 'SW.6 po: energia', b1.energy, '| energia miesiąca', monthEnergy(b1.state), '| osłony', shields(b1.state), '| koperty', b1.envelopes)
    log(run, 'SW.6 nowe', (await added(dataDir, before)).map(brief))
    reading('sw', 'SW.6', 'rok+prezenty-bez-koperty', { energiaPrzed: b0.energy, energiaPo: b1.energy, A: monthEnergy(b0.state), B: monthEnergy(b1.state), podglad100: p1.preview, podglad7000: p2.preview })

    // ---- SW.18 – próg 0
    before = await ops(dataDir)
    q = await openFresh(app, page)
    await typeAmount(q, '5 000,00')
    await category(q, CAT.clothes)
    log(run, 'SW.18 próg 0 – 5000 dziennik', await q.getByTestId('quick-log').count(), (await qread(q)).log)
    await snap(q, 'SW.18-prog-0')
    log(run, 'SW.18 próg 0 zapis', await enterSave(app, q, 'quick-category'))
    await page.waitForTimeout(800)
    log(run, 'SW.18 nowe', (await added(dataDir, before)).map(brief))
    await page.keyboard.press('Control+9')
    await page.waitForTimeout(2500)
    log(run, 'SW.18 próg 0 – Wywiad dziennik', (await page.getByTestId('intel-log').innerText().catch(() => '(brak intel-log)')).replace(/\s+/g, ' ').slice(0, 900))
    await page.getByTestId('intel-log').scrollIntoViewIfNeeded().catch(() => undefined)
    await snap(page, 'SW.18-prog-0-wywiad')
    const t = await text(page, 'main')
    log(run, 'SW.18 próg 0 – „bez oznaczenia”/„nieoznacz” w Wywiadzie', (t.match(/[^\n]*(bez oznaczenia|nieoznacz)[^\n]*/gi) ?? []).slice(0, 6))
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    const mo = await text(page, 'main')
    log(run, 'SW.18 próg 0 – Mostek: „impuls”/„oznacz”', (mo.match(/[^\n]*(impuls|oznacz)[^\n]*/gi) ?? []).slice(0, 6))
    await page.keyboard.press('Control+8')
    await page.waitForTimeout(2000)
    const dw = await text(page, 'main')
    log(run, 'SW.18 próg 0 – Dowództwo: „impuls”/„oznacz”', (dw.match(/[^\n]*(impuls|oznacz|plan czy)[^\n]*/gi) ?? []).slice(0, 8))
    await page.keyboard.press('Control+1')
  } finally {
    await app.close()
  }
})
