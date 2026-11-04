// RA, przebieg 2 – salda kont naprzód (RA.10) na folderach zbudowanych od zera (seedFolder) – stan „brzegi” z punktu:
//  V1: start budżetu 01.10.2026, salda otwarcia 01.10: mBank 1 500 zł, Portfel XTB 3 000 zł, Gotówka 1 000 zł; pensja
//      3 000 zł od 10.2026; boja „Czynsz” −2 000 zł z mBanku na 10.11.2026 (za 7 dni);
//  V2: jak V1, ale Portfel XTB 200 zł (Gotówka 1 000 zł – gotówka nigdy nie jest źródłem przelewu);
//  V3: jak V1, ale mBank −100 zł (saldo ujemne już dziś).
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { seedFolder } from '../e2e/seed'
import { LAB, shot, start, text } from './lab'
import { ACC, briefing, go, layerOf, out, readLayers, readNow, readRadar, recordsOf, stepper, toasts, where } from './mg-pomoc'

function folder(run: string, mbank: number, wallet: number): string {
  const dir = join(LAB, 'przebiegi', run)
  const dataDir = join(dir, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  seedFolder(dataDir, {
    settings: (s) => ({
      ...s,
      budget: { ...s.budget, start: '2026-10-01' },
      accounts: s.accounts.some((a) => a.id === ACC.cash) ? s.accounts : [...s.accounts, { id: ACC.cash, name: 'Gotówka', kind: 'cash', importFormat: null, archived: false }]
    }),
    records: {
      balances: [
        { date: '2026-10-01', accountId: ACC.mbank, kind: 'opening', amount: mbank },
        { date: '2026-10-01', accountId: ACC.xtb, kind: 'opening', amount: wallet },
        { date: '2026-10-01', accountId: ACC.cash, kind: 'opening', amount: 100000 }
      ],
      months: [{ month: '2026-10', salary: 300000, envelopes: {} }],
      scheduled: [{ name: 'Czynsz', date: '2026-11-10', amount: -200000, yearly: false, categoryId: '01KDEFCAT00000000000000201', accountId: ACC.mbank, counterparty: 'WSPÓLNOTA', remind: [14, 3] }]
    }
  })
  return dataDir
}

const VARIANTS: Array<{ run: string; label: string; mbank: number; wallet: number; transfer: boolean }> = [
  { run: 'ra-2a', label: 'brzegi V1: mBank 1 500, Portfel XTB 3 000, Gotówka 1 000, boja Czynsz −2 000 z mBanku 10.11', mbank: 150000, wallet: 300000, transfer: true },
  { run: 'ra-2b', label: 'brzegi V2: mBank 1 500, Portfel XTB 200, Gotówka 1 000, boja Czynsz −2 000 z mBanku 10.11', mbank: 150000, wallet: 20000, transfer: false },
  { run: 'ra-2c', label: 'brzegi V3: mBank −100, Portfel XTB 3 000, Gotówka 1 000, boja Czynsz −2 000 z mBanku 10.11', mbank: -10000, wallet: 300000, transfer: false }
]

for (const v of VARIANTS) {
  test(`RA.10 – ${v.label}`, async () => {
    const dataDir = folder(v.run, v.mbank, v.wallet)
    const dirs = { dataDir }
    const dump = out(v.run)
    const step = stepper(dump)
    const { app, page, errors } = await start(v.run, { dataDir })
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
      await page.waitForTimeout(4000)
      let before: Record<string, string> = {}
      await step('przed', async () => {
        before = await readLayers(page)
        const b = await briefing(page)
        const r = await (async () => {
          await go(page, '7', 'page-radar')
          return readRadar(page)
        })()
        dump('przed', { warstwy: before, odprawa: b, konta: r.accounts, panel: r.panels['radar-accounts'], os: r.items.map((i) => `${i.day} ${i.kindLabel} ${i.name} ${i.amount} ${i.shields}`) })
        await shot(page, `RA.10-${v.run}`)
        await readNow(page, 'ra', 'RA.10', v.label, dirs, async () => ({
          konta: r.panels['radar-accounts'],
          odprawa: b.map((x) => `[${x.kind}] ${x.text}`).join(' || '),
          oslony: layerOf(before.stan, 'Osłony'),
          energia: layerOf(before.stan, 'Energia'),
          sumaKont: (before.stan.match(/Suma kont budżetu: [^ ]+ ?[^ ]* zł/) ?? ['?'])[0],
          stan: before.stan
        }))
      })
      if (v.transfer)
        await step('przelew', async () => {
          await go(page, '7', 'page-radar')
          await page.getByTestId('radar-account-transfer').first().click()
          await page.waitForTimeout(1500)
          const t = await toasts(page)
          const w = await where(page)
          const ed = (await text(page, '[data-testid="operation-editor"]').catch(() => '(brak edytora)')).replace(/\s+/g, ' ')
          const tx = recordsOf(dataDir, 'transactions').map((x) => `${x.date} ${x.kind} ${x.amount} ${x.accountId} → ${x.counterAccountId} ${x.counterAmount ?? ''}`)
          await shot(page, 'RA.10-przelew')
          await page.keyboard.press('Escape')
          const after = await readLayers(page)
          const b = await briefing(page)
          await go(page, '7', 'page-radar')
          const r = await readRadar(page)
          dump('po-przelewie', { toasty: t, okno: w, edytor: ed.slice(0, 600), operacje: tx, warstwy: after, odprawa: b, konta: r.accounts })
          await readNow(page, 'ra', 'RA.10', `${v.label} – po „Zaplanuj przelew własny”`, dirs, async () => ({
            konta: r.panels['radar-accounts'],
            odprawa: b.map((x) => `[${x.kind}] ${x.text}`).join(' || '),
            oslony: layerOf(after.stan, 'Osłony'),
            energia: layerOf(after.stan, 'Energia'),
            sumaKont: (after.stan.match(/Suma kont budżetu: [^ ]+ ?[^ ]* zł/) ?? ['?'])[0],
            operacje: tx.join(' | '),
            stan: after.stan
          }))
          // „Cofnij” of the toast.
          await page.getByRole('status').filter({ hasText: 'Przelew' }).getByTestId('toast-action').first().click().catch(() => undefined)
          await page.waitForTimeout(1500)
          const r2 = await readRadar(page)
          dump('po-cofnij', { operacje: recordsOf(dataDir, 'transactions').map((x) => `${x.date} ${x.kind} ${x.amount}`), konta: r2.accounts })
        })
      dump('bledy-okna', errors)
    } finally {
      await app.close()
    }
  })
}
