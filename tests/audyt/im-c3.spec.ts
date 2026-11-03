// Area IM – run im-c3 (rok, prepared): the balance of a file that does not agree (IM.34: H2, H3, an account with a late
// opening balance) and the dates of an account history (IM.54: HY).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { records } from '../e2e/files'
import { reading, start, useState } from './lab'
import { MBANK, Obs, PLIKI, cardH, historiaText, importAs, openFile, readFi, readable, short, statuses, step, tx, txs, writeFi, writeRecord } from './im-pomoc'
import { cp1250 } from './persona'

const LATE = '01KAZ900000000000000000002'

async function deleteOp(page: Page, query: string): Promise<string> {
  await page.keyboard.press('Control+2')
  await page.waitForTimeout(800)
  await page.getByTestId('operations-period-menu').click()
  await page.getByTestId('operations-period-all').click()
  await page.getByTestId('operations-search').fill(query)
  await page.waitForTimeout(800)
  const row = page.getByTestId('operation-row').first()
  const what = await row.innerText()
  await row.click()
  await page.getByTestId('operation-delete').click()
  await page.getByTestId('operation-delete-confirm').click()
  await page.waitForTimeout(1000)
  await page.getByTestId('operations-search').fill('')
  return what.replace(/\s+/g, ' ')
}

test('im-c3: saldo z pliku niezgodne, luka, późne saldo otwarcia; daty historii', async () => {
  const o = new Obs('im-c3')
  const { dataDir, ictjDir } = useState('rok', 'im-c3')
  // FI before H2: DROGERIA NATURA 23.10 −28,15 changed to −29,15 (another amount); an entry typed by hand without a row
  const all = await records(dataDir, 'transactions')
  const natura = all.find((t) => t.date === '2026-10-23' && t.amount === -2815)
  if (natura) writeRecord(dataDir, 'transactions', { ...natura, amount: -2915, updatedAt: '2026-10-28T10:00:00.000Z' })
  writeRecord(dataDir, 'transactions', tx('01KAZ960000000000000000001', { date: '2026-10-22', time: '15:00', amount: -4000, counterparty: 'Kwiaciarnia', categoryId: '01KDEFCAT00000000000000901' }))
  // an account of mBank with an opening balance on 03.11 (later than the end of H1)
  const fi = readFi(dataDir)
  fi.settings.accounts.push({ id: LATE, name: 'mBank firmowe', kind: 'bank', importFormat: 'mbank', archived: false })
  writeFi(dataDir, fi)
  writeRecord(dataDir, 'balances', { schemaVersion: 1, id: '01KAZ970000000000000000001', createdAt: '2026-11-03T08:00:00.000Z', updatedAt: '2026-11-03T08:00:00.000Z', date: '2026-11-03', accountId: LATE, kind: 'opening', amount: 100000, correctionId: null, note: '' })
  o.log('stan', ['DROGERIA NATURA 23.10: −28,15 → −29,15 (FI)', 'Kwiaciarnia −40,00 22.10 (wpis ręczny mBank, bez wiersza banku)', 'konto „mBank firmowe” z saldem otwarcia 1 000,00 zł na 03.11', `znaleziono operację Natury: ${!!natura}`])
  // HY: dates at the edges (IM.54) – new shops, the chain of balances not checked here
  const hy = historiaText(
    [
      { ...cardH('2025-12-01', 'SKLEP PIERWSZY GRUDNIA', -1000), date: '2025-12-01' },
      { ...cardH('2025-12-31', 'SKLEP SYLWESTROWY', -15000), booked: '2026-01-02' },
      cardH('2026-01-01', 'APTEKA NOWOROCZNA', -5000),
      cardH('2026-01-31', 'SKLEP OSTATNI STYCZNIA', -2000),
      cardH('2026-03-29', 'STACJA ZMIANA CZASU', -3000),
      cardH('2026-10-25', 'KIOSK ZMIANA CZASU', -4000)
    ],
    '2025-12-01',
    '2026-10-25',
    1000000
  )
  writeFileSync(join(PLIKI, 'HY.csv'), cp1250(hy.text))
  const run = await start('im-c3', { dataDir, ictjDir })
  const { app, page, userData } = run
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 90_000 })
    await step(o, page, 'IM.34-prep', async () => {
      o.log('IM.34 usunięta operacja (ZABKA 25.10 −31,95)', await deleteOp(page, '31,95'))
    })
    // ---------------- IM.34 – H2
    await step(o, page, 'IM.34-H2', async () => {
      const corr0 = (await txs(dataDir)).filter((t) => t.kind === 'correction').length
      await openFile(app, page, join(PLIKI, 'H2.csv'))
      o.log('IM.34 H2 podgląd', await readable(page, '[data-testid="import-summary"]'))
      o.log('IM.34 H2 dopasowania', await readable(page, '[data-testid="import-matches"]').catch(() => '(brak)'))
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1200)
      o.log('IM.34 H2 wynik', await readable(page, '[data-testid="import-done"]'))
      const tel = await readable(page, '[data-testid="bank-telemetry"]').catch(() => '(brak telemetrii)')
      o.log('IM.34 H2 telemetria', tel)
      reading('im', 'IM.34', 'rok przygotowany + H2 – telemetria', { tekst: tel.slice(0, 600), diff: await page.getByTestId('bank-telemetry').getAttribute('data-diff').catch(() => null) })
      await o.shot(page, 'IM.34-H2')
      const corr1 = (await txs(dataDir)).filter((t) => t.kind === 'correction').length
      o.log('IM.34 korekty przed / po (nic samo)', [corr0, corr1])
      o.log('IM.34 przycisk korekty', await page.getByTestId('bank-telemetry-confirm').innerText().catch(() => '(brak)'))
      const rows = page.getByTestId('bank-telemetry-extra-row')
      o.log('IM.34 pozycje listy', await rows.allInnerTexts())
      if (await rows.count()) {
        await rows.first().click()
        await page.waitForTimeout(1500)
        o.log('IM.34 klik pozycji – ekran', (await readable(page, 'main')).slice(0, 600))
        await o.shot(page, 'IM.34-klik')
      }
    })
    // ---------------- IM.34 – H3 (a gap)
    await step(o, page, 'IM.34-H3', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'H3.csv'))
      o.log('IM.34 H3 podgląd', await readable(page, '[data-testid="import-summary"]'))
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1200)
      o.log('IM.34 H3 wynik', await readable(page, '[data-testid="import-done"]'))
      o.log('IM.34 H3 telemetria', await readable(page, '[data-testid="bank-telemetry"]').catch(() => '(brak telemetrii)'))
      await o.shot(page, 'IM.34-H3')
    })
    // ---------------- IM.34 – a file onto the account with a late opening balance
    await step(o, page, 'IM.34-pozne', async () => {
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await openFile(app, page, join(PLIKI, 'H1.csv'))
      await page.getByTestId('import-account').selectOption({ label: 'mBank firmowe' })
      await page.waitForTimeout(1500)
      o.log('IM.34 późne saldo – plik', await readable(page, '[data-testid="import-file"]'))
      o.log('IM.34 późne saldo – podgląd', await readable(page, '[data-testid="import-summary"]'))
      await page.getByTestId('import-run').click()
      await expect(page.getByTestId('import-done')).toBeVisible({ timeout: 60_000 })
      await page.waitForTimeout(1200)
      o.log('IM.34 późne saldo – telemetria', await readable(page, '[data-testid="bank-telemetry"]').catch(() => '(brak telemetrii)'))
      o.log('IM.34 późne saldo – ekran', (await readable(page, '[data-testid="import-done"]')).slice(0, 1500))
      await o.shot(page, 'IM.34-pozne-saldo')
    })
    // ---------------- IM.54 – dates of the history
    await step(o, page, 'IM.54', async () => {
      const res = await importAs(app, page, userData, join(PLIKI, 'HY.csv'))
      o.log('IM.54 wynik', res)
      const ops = (await txs(dataDir)).filter((t) => /PIERWSZY GRUDNIA|SYLWESTROWY|NOWOROCZNA|OSTATNI STYCZNIA|ZMIANA CZASU/i.test(String(t.counterparty)))
      o.log('IM.54 operacje (plik)', ops.map((t) => `${short(t)} createdAt=${t.createdAt}`))
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(800)
      await page.getByTestId('operations-period-menu').click()
      await page.getByTestId('operations-period-all').click()
      for (const q of ['sylwestr', 'zmiana czasu', 'noworoczna']) {
        await page.getByTestId('operations-search').fill(q)
        await page.waitForTimeout(700)
        o.log(`IM.54 Operacje „${q}”`, await page.getByTestId('operation-row').allInnerTexts())
      }
      await page.getByTestId('operations-search').fill('sylwestr')
      await page.waitForTimeout(500)
      await page.getByTestId('operation-row').first().click()
      await page.waitForTimeout(500)
      o.log('IM.54 edytor sylwestra – data i godzina', { date: await page.getByTestId('operation-date').inputValue().catch(() => '-'), time: await page.getByTestId('operation-time').inputValue().catch(() => '-') })
      await o.shot(page, 'IM.54-sylwester')
      await page.getByTestId('operations-search').fill('')
      await page.keyboard.press('Control+9')
      await page.waitForTimeout(2500)
      const intel = await readable(page, 'main')
      o.log('IM.54 Wywiad – fragment Killzones', intel.split('\n').filter((l, i, a) => /killzone|00:00|0:00/i.test(l) || /killzone/i.test(a[i - 1] ?? '')).slice(0, 40).join('\n'))
    })
    o.log('statusy', await statuses(page))
    o.log('błędy okna', run.errors)
  } finally {
    await app.close()
  }
  void MBANK
  void readFileSync
})
