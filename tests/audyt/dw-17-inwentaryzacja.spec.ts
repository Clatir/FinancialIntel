// DW, przebieg 17 (DW.29 – potwierdzenie „Inwentaryzacji”): misja W45 podmieniona na „balances”; import historii z
// mBanku z ostatniego tygodnia (saldo w pliku) → „Na razie …” i potwierdzenie salda mBanku w folderze; potem ręczne
// potwierdzenie mBanku w Ustawieniach → Konta. Narzędzie obserwacji.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { importDone } from '../e2e/app'
import { answerDialogs, shot, start, text, useState } from './lab'
import { editJson, go, out, textOf } from './dw-pomoc'

test('DW.29 – Inwentaryzacja: saldo z pliku banku', async () => {
  const RUN = 'dw-17'
  const st = useState('rok', RUN)
  editJson(join(st.dataDir, 'game', '2026-11.json'), (g) => {
    g.missions = g.missions.map((m: { week: string }) => (m.week === '2026-W45' ? { ...m, template: 'balances', params: {} } : m))
  })
  const dump = out(RUN)
  const confirmations = () =>
    readdirSync(join(st.dataDir, 'balances', '2026'))
      .map((f) => JSON.parse(readFileSync(join(st.dataDir, 'balances', '2026', f), 'utf8')) as { date: string; kind: string; accountId: string; amount: number; createdAt: string })
      .filter((b) => b.kind === 'confirmation')
      .map((b) => `${b.date} ${b.accountId.slice(-1)} ${b.amount} (zapis ${b.createdAt})`)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  const status = async () => {
    await go(page, '8', 'page-command')
    return (await textOf(page.getByTestId('command-mission'))).replace(/\s*\n\s*/g, ' | ')
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(4000)
    const s: Record<string, unknown> = { przed: await status(), potwierdzeniaPrzed: confirmations() }
    await go(page, '3', 'page-import')
    await answerDialogs(r.app, { paths: ['C:\\FI-audyt\\pliki\\rok-nowe-historia.csv'] })
    await page.getByTestId('import-pick').click()
    await page.getByTestId('import-file').waitFor({ state: 'visible', timeout: 60_000 })
    s.plik = (await textOf(page.getByTestId('import-file'))).replace(/\s+/g, ' ').slice(0, 300)
    await page.getByTestId('import-run').click()
    await importDone(page, r.userData)
    s.wynik = (await text(page, '[data-testid="import-done"]')).replace(/\s+/g, ' ').slice(0, 300)
    s.poImporcie = await status()
    await shot(page, 'DW.29-inwentaryzacja-dowodztwo')
    s.potwierdzeniaPo = confirmations()
    await go(page, '1', 'page-bridge')
    s.odprawaSalda = (await text(page, '[data-testid="page-bridge"]')).split('\n').filter((l) => /saldo|Saldo/.test(l)).slice(0, 4)
    await shot(page, 'DW.29-inwentaryzacja-po-imporcie')
    // mBank confirmed by hand in the settings.
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(800)
    await page.getByText('Konta', { exact: true }).first().click()
    await page.waitForTimeout(800)
    const row = page.locator('[data-testid="account-row"][data-name="mBank"]')
    const bal = (await textOf(row.getByTestId('account-balance'))).replace(/[^\d,−-]/g, '').replace('−', '-')
    const f = row.getByTestId('account-confirm-amount')
    await f.click()
    await f.fill(bal)
    await f.press('Tab')
    await row.getByTestId('account-confirm').click()
    await page.waitForTimeout(800)
    if (await page.getByTestId('confirm-ask-yes').count()) await page.getByTestId('confirm-ask-yes').click()
    s.recznieMbank = { saldo: bal, status: await status(), potwierdzenia: confirmations() }
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})
