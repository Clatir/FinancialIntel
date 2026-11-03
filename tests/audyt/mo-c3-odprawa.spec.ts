// MO, przebieg C3 – stan szczególny odprawy na kopii persony „rok” (opis w raporcie MO.md): asteroidy (OC za 3 dni,
// opłata co kwartał za 14 dni, roczna za 15 dni, roczna opłacona przed terminem), potwierdzenia sald (mBank 2 dni temu,
// Portfel XTB 10 dni temu, Gotówka nigdy), ostatni import 3 dni temu, boja za 3 dni z kwotą ponad saldo mBanku, zwrot po
// terminie, domownicy Tata (40 dni, zwrot do przypisania), Mama (przez Tatę, 35 dni), Ania (20 dni).
// Punkty MO.10, MO.11, MO.12 (3 dni), MO.13, MO.14, MO.15.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { shot, start, text, reading, useState } from './lab'
import { ACC, auditId, briefingItems, editJson, go, out, textOf, where, writeRecord, writeTx } from './mo-pomoc'

const RUN = 'mo-c3'
const TATA = auditId(101)
const MAMA = auditId(102)
const ANIA = auditId(103)

/** The balance of an account at the end of a day, from the folder (opening + operations up to that day). */
function balanceAt(dataDir: string, accountId: string, day: string): number {
  let sum = 0
  for (const y of readdirSync(join(dataDir, 'balances'))) for (const f of readdirSync(join(dataDir, 'balances', y))) {
    const b = JSON.parse(readFileSync(join(dataDir, 'balances', y, f), 'utf8'))
    if (b.kind === 'opening' && b.accountId === accountId) sum += b.amount
  }
  for (const y of readdirSync(join(dataDir, 'transactions'))) for (const f of readdirSync(join(dataDir, 'transactions', y))) {
    const t = JSON.parse(readFileSync(join(dataDir, 'transactions', y, f), 'utf8'))
    if (t.date > day) continue
    if (t.accountId === accountId) sum += t.amount
    if (t.counterAccountId === accountId) sum -= t.amount
  }
  return sum
}

test('MO przebieg C3 – odprawa: asteroidy, salda, boja, zwrot po terminie, domownicy', async () => {
  const st = useState('rok', RUN)
  const d = st.dataDir
  const c = (id: string) => join(d, 'containers', `${id}.json`)
  editJson(c('01KAZ400000000000000000007'), (j) => void (j.dueDay = 6)) // OC – 06.11, za 3 dni
  editJson(c('01KAZ400000000000000000009'), (j) => Object.assign(j, { cycleMonths: 3, dueMonth: '2026-11', dueDay: 17 })) // Prąd co kwartał – 17.11, za 14 dni
  editJson(c('01KAZ400000000000000000008'), (j) => void (j.dueDay = 18)) // Podatek od nieruchomości – 18.11, za 15 dni
  const oc = JSON.parse(readFileSync(c('01KAZ400000000000000000007'), 'utf8'))
  writeRecord(d, `containers/${auditId(201)}.json`, { ...oc, id: auditId(201), name: 'Przegląd techniczny', amount: 9900, dueMonth: '2026-11', dueDay: 10, categoryId: '01KDEFCAT00000000000000302', counterparty: 'SKP TESTOWO' })
  writeTx(d, { id: auditId(202), date: '2026-11-02', time: '15:00', amount: -9900, categoryId: '01KDEFCAT00000000000000302', counterparty: 'SKP TESTOWO', containerId: auditId(201) })
  const mb = balanceAt(d, ACC.mbank, '2026-11-01')
  const xtb = balanceAt(d, ACC.xtb, '2026-10-24')
  writeRecord(d, `balances/2026/2026-11-01_${auditId(203)}.json`, { id: auditId(203), date: '2026-11-01', accountId: ACC.mbank, kind: 'confirmation', amount: mb, correctionId: null, note: 'audyt' })
  writeRecord(d, `balances/2026/2026-10-24_${auditId(204)}.json`, { id: auditId(204), date: '2026-10-24', accountId: ACC.xtb, kind: 'confirmation', amount: xtb, correctionId: null, note: 'audyt' })
  editJson(join(d, 'fi.json'), (j) => {
    j.settings.import.lastImport[ACC.mbank] = '2026-10-31T10:00:00.000Z'
    const base = { bankNames: [], inflow: 'advance', archived: false, via: null, opening: { owed: 0, deposit: 0 } }
    j.settings.household.members.push({ ...base, id: TATA, name: 'Tata', bankNames: ['JAN TATA'] }, { ...base, id: MAMA, name: 'Mama', via: TATA }, { ...base, id: ANIA, name: 'Ania' })
  })
  editJson(join(d, 'scheduled', '01KSEED0000000000000000034.json'), (j) => Object.assign(j, { date: '2026-11-06', amount: -7500000 }))
  editJson(join(d, 'transactions', '2026', '2026-10-22_01M6GDM914YEJ2RP70WV1T1NFS.json'), (j) => void (j.awaitReturn.until = '2026-11-01'))
  writeTx(d, { id: auditId(211), date: '2026-09-24', time: '16:00', amount: -20000, categoryId: '01KDEFCAT00000000000000203', counterparty: 'CASTORAMA', refundable: true, memberId: TATA })
  writeTx(d, { id: auditId(212), date: '2026-09-29', time: '16:00', amount: -15000, categoryId: '01KDEFCAT00000000000000802', counterparty: 'ROSSMANN', refundable: true, memberId: MAMA })
  writeTx(d, { id: auditId(213), date: '2026-10-14', time: '16:00', amount: -9000, categoryId: '01KDEFCAT00000000000000901', counterparty: 'EMPIK', refundable: true, memberId: ANIA })
  writeTx(d, { id: auditId(214), date: '2026-10-30', amount: 5000, kind: 'income', counterparty: 'JAN TATA', title: 'ZWROT', memberId: TATA, inflowKind: 'repay' })

  const { app, page, errors } = await start(RUN, { dataDir: d, ictjDir: st.ictjDir })
  const dump = out(RUN)
  dump('stan-przygotowany', { mBankSaldo0111: mb, xtbSaldo2410: xtb })
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
    }
  }
  const odprawa = () => page.locator('section[data-panel="bridge:Odprawa"]').first()
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(6000)
    const items = await briefingItems(odprawa())
    dump('odprawa', items)
    reading('mo', 'MO.11', 'rok-c3', Object.fromEntries(items.filter((i) => i.kind === 'asteroid').map((i, n) => [`${n}`, i.text])))
    reading('mo', 'MO.14', 'rok-c3', Object.fromEntries(items.filter((i) => i.kind === 'house').map((i, n) => [`${n}`, i.text])))
    reading('mo', 'MO.15', 'rok-c3', Object.fromEntries(items.map((i, n) => [`${n}:${i.kind}`, i.text])))
    await odprawa().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.15-odprawa.png' })
    dump('rozliczenia', await textOf(page.locator('section[data-panel="bridge:Rozliczenia z domownikami"]')))
    await page.locator('section[data-panel="bridge:Rozliczenia z domownikami"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.14-panel.png' })
    await step('ekrany', async () => {
      await go(page, '5', 'page-cargo')
      dump('ladownia', (await text(page, '[data-testid="page-cargo"]')).slice(0, 3000))
      await go(page, '7', 'page-radar')
      dump('radar', (await text(page, '[data-testid="page-radar"]')).slice(0, 6000))
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-accounts').click()
      await page.waitForTimeout(600)
      dump('konta', (await text(page, 'main')).slice(0, 2500))
      await go(page, '1', 'page-bridge')
    })
    await step('MO.10', async () => {
      const sel = 'section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"]'
      const n = await page.locator(sel).count()
      const res: string[] = []
      for (let i = 0; i < n; i++) {
        await go(page, '1', 'page-bridge')
        const it = page.locator(sel).nth(i)
        const kind = await it.getAttribute('data-kind')
        if (!['plan', 'account', 'return', 'anomaly', 'house', 'asteroid', 'balances', 'end', 'recurring', 'cargo', 'ictj', 'pit38'].includes(kind ?? '')) continue
        const label = `${kind}: ${(await it.innerText()).slice(0, 100)}`
        await it.click()
        await page.waitForTimeout(1500)
        const ed = await page.evaluate(() => {
          const e = document.querySelector('[data-testid="operation-editor"]') as HTMLElement | null
          const sel = Array.from(document.querySelectorAll('[aria-selected="true"], [data-selected="true"]')).map((x) => (x as HTMLElement).innerText.slice(0, 80).replace(/\s+/g, ' ')).slice(0, 2)
          return `${e ? e.innerText.slice(0, 120).replace(/\s+/g, ' ') : ''} sel=${JSON.stringify(sel)}`
        })
        res.push(`${i} ${label}\n   -> ${await where(page)} ${ed}`)
        await shot(page, `MO.10-c3-${i}`)
        await page.keyboard.press('Escape')
      }
      dump('MO.10', res.join('\n'))
    })
    // MO.15 – załatwienie jednej sprawy: Netflix „To nie zmiana ceny”, potem odprawa jeszcze raz.
    await step('MO.15-zalatw', async () => {
      await go(page, '1', 'page-bridge')
      await odprawa().locator('[data-testid="briefing-item"][data-kind="price"]').first().click()
      await page.waitForTimeout(1500)
      await page.getByRole('button', { name: 'To nie zmiana ceny' }).click()
      await page.waitForTimeout(1500)
      await go(page, '1', 'page-bridge')
      await page.waitForTimeout(1000)
      dump('odprawa-po-zalatwieniu', (await briefingItems(odprawa())).map((i) => `${i.kind}: ${i.text}`))
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
