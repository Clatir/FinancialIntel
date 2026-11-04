// PR, przebieg 8 (kopia persony „rok”): PR.9 – raty pożyczek z resztą w ostatniej części widoczne na ekranie: pierwsza rata
// 10.11.2026, więc wszystkie trzy mieszczą się w 90 dniach Radaru. Pożyczka udzielona 1 000 zł / 3, wzięta 100 zł / 3
// z kontenerem w Ładowni i wzięta 100 zł / 3 bez kontenera (spłata z osłon). Odczyt: Radar (pozycje), wiersze pożyczek,
// Ładownia (kontener raty), Plan miesiąca (Ładownia – stałe koszty).
import { test, type Page } from '@playwright/test'
import { start, useState } from './lab'
import { flat, go, out, rec, snap, stepper, textOf, type Ctx } from './pr-pomoc'

const RUN = 'pr-8'

async function loan(page: Page, o: { taken: boolean; name: string; who: string; amount: string; n: string; container?: boolean }): Promise<string[]> {
  await go(page, '7', 'page-radar')
  await page.getByRole('radio', { name: o.taken ? 'Biorę pożyczkę' : 'Pożyczam komuś' }).click()
  await page.getByTestId('loan-name').fill(o.name)
  await page.getByTestId('loan-counterparty').fill(o.who)
  const a = page.getByTestId('loan-amount')
  await a.click()
  await a.fill(o.amount)
  await a.press('Tab')
  const n = page.getByTestId('loan-installments')
  await n.click()
  await n.fill(o.n)
  await n.press('Tab')
  const first = page.getByLabel('Pierwsza rata')
  await first.click()
  await first.fill('10.11.2026')
  await first.press('Tab')
  if (o.taken && o.container === false) await page.getByTestId('loan-with-container').click()
  await page.waitForTimeout(400)
  const form = flat(await textOf(page.getByTestId('radar-new-loan')))
  await page.getByTestId('loan-save').click()
  await page.waitForTimeout(1500)
  return [form, (await page.getByRole('status').allInnerTexts()).join(' | ')]
}

test('PR przebieg 8 – raty z resztą w 90 dniach Radaru (PR.9)', async () => {
  const st = useState('rok', RUN)
  const ctx: Ctx = { run: RUN, dataDir: st.dataDir, ictjDir: st.ictjDir }
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  page.setDefaultTimeout(20_000)
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(4000)
    await step('udzielona', async () => dump('udzielona', await loan(page, { taken: false, name: 'Pożyczka R1', who: 'Ewa Testowa', amount: '1000', n: '3' })))
    await step('wzieta-kontener', async () => dump('wzieta-kontener', await loan(page, { taken: true, name: 'Kredyt R2', who: 'Bank R2', amount: '100', n: '3' })))
    await step('wzieta-oslony', async () => dump('wzieta-oslony', await loan(page, { taken: true, name: 'Kredyt R3', who: 'Bank R3', amount: '100', n: '3', container: false })))
    await rec(ctx, 'PR.9', 'rok + pożyczki: udzielona 1 000 zł / 3, wzięta 100 zł / 3 z kontenerem, wzięta 100 zł / 3 bez kontenera; pierwsze raty 10.11.2026', async () => {
      await go(page, '7', 'page-radar')
      const radar = await textOf(page.getByTestId('page-radar'))
      const items = [...radar.matchAll(/(\d\d\.\d\d)\n[^\n]*\n(Spłata|Rata): (Pożyczka R1|Kredyt R2|Kredyt R3)\n(?:[^\n]*\n)?([+−-][\d  ]+,\d{2} zł)/g)].map((m) => `${m[1]} ${m[2]} ${m[3]} ${m[4]}`)
      const rows: Record<string, string> = {}
      for (const n of ['Pożyczka R1', 'Kredyt R2', 'Kredyt R3']) rows[n] = flat(await textOf(page.locator(`[data-testid="loan-row"][data-name="${n}"]`)))
      await snap(page, 'PR.9-raty-radar')
      await go(page, '5', 'page-cargo')
      const cargo = await textOf(page.getByTestId('page-cargo'))
      const row = flat(/Rata: Kredyt R2[\s\S]*?zł\/m(\([^)]*\))?/.exec(cargo)?.[0] ?? '(brak)')
      await page.locator('[data-testid="cargo-row"][data-name="Rata: Kredyt R2"]').click().catch(() => undefined)
      await page.waitForTimeout(800)
      const opened = flat(await textOf(page.getByTestId('page-cargo')))
      await snap(page, 'PR.9-raty-ladownia')
      await go(page, '4', 'page-month')
      const plan = flat(/PODZIAŁ PENSJI[\s\S]*?KOPERTY PLANOWE/.exec(await textOf(page.getByTestId('page-month')))?.[0] ?? '?')
      return { radar_pozycje: items.join(' | '), ...Object.fromEntries(Object.entries(rows).map(([k, v]) => [`wiersz_${k}`, v])), ladownia_wiersz: row, ladownia_otwarty: opened.slice(0, 2500), plan_podzial: plan, radar: flat(radar).slice(0, 4000) }
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
