// DW, przebieg 7 (DW.8): wariant „rok-ictj” – na kopii „rok” dni od 20.10 wycofane z gry; wpływ z XTB 3 200 zł z 31.10
// (D−3, wiersz banku jak z importu) – para wypłaty ICTTJ z 31.10, niezadokowana; dokowanie wypłaty 3 000 zł z 19.10 (wpływ
// 20.10) usunięte – para niezadokowana od 14 dni (ponad 7). Odczyt „ocenione do” i pasek; dokowanie 31.10 na Mostku;
// odczyt po zamrożeniu. Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { addRecords, command, dropGameDays, gameFiles, go, lastFrozen, MBANK, out } from './dw-pomoc'

test('DW.8 – dzień z niezadokowaną wypłatą z ICTTJ czeka', async () => {
  const RUN = 'dw-7'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const dropped = dropGameDays(st.dataDir, '2026-10-20')
  const dockDir = join(st.dataDir, 'dockings', '2026')
  const gone = readdirSync(dockDir).filter((f) => f.startsWith('2026-10-20_'))
  for (const f of gone) unlinkSync(join(dockDir, f))
  const [tx] = addRecords(st.dataDir, 'transactions', [
    {
      date: '2026-10-31',
      time: null,
      accountId: MBANK,
      kind: 'trading',
      amount: 320000,
      counterparty: 'XTB S.A.',
      title: 'WYPLATA SRODKOW 4421987',
      createdAt: '2026-11-01T08:00:00.000Z',
      bank: { format: 'mbank', key: 'mbank:dw0000000000000a:0', description: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY XTB S.A. WYPLATA SRODKOW 4421987', counterparty: 'XTB S.A.', operation: 'PRZELEW ZEWNĘTRZNY PRZYCHODZĄCY', category: '', pending: false, importedAt: '2026-11-01T08:00:00.000Z', source: 'historia' }
    }
  ])
  dump('wariant', { dropped, usunieteDokowania: gone, tx: tx?.id })
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    for (let i = 0; i < 20; i++) {
      await r.page.waitForTimeout(500)
      if (await r.page.getByTestId('celebration').count()) await r.page.keyboard.press('Escape')
    }
    await r.page.waitForTimeout(5000)
    const panel = r.page.locator('section[data-panel^="bridge:Dokowanie"]').first()
    dump('0-dokowanie', await panel.innerText().catch(() => '(brak panelu)'))
    dump('0-odprawa', await text(r.page, '[data-testid="page-bridge"]'))
    await go(r.page, '8', 'page-command')
    const c0 = await command(r.page)
    dump('0-dowodztwo', { plik: lastFrozen(st.dataDir), head: c0.head, strip: (c0.strip as string[]).slice(-16), log: (c0.log as string[]).slice(0, 12) })
    await shot(r.page, 'DW.8-przed-dokowaniem')
    reading('dw', 'DW.8', 'rok-ictj przed dokowaniem', { head: String(c0.head).replace(/\s+/g, ' '), plik: lastFrozen(st.dataDir) })
    // Docking of 31.10 on the bridge.
    await go(r.page, '1', 'page-bridge')
    await panel.getByRole('button').filter({ hasText: '31.10.2026' }).first().click()
    await r.page.waitForTimeout(1200)
    const dlg = r.page.locator('[role="dialog"]').last()
    dump('1-okno-dokowania', await dlg.innerText().catch(() => '(brak okna)'))
    await shot(r.page, 'DW.8-okno-dokowania')
    await r.page.getByTestId('docking-confirm').click()
    await r.page.waitForTimeout(1500)
    dump('1-po-dokowaniu-panel', await panel.innerText().catch(() => '(brak panelu)'))
    let last = lastFrozen(st.dataDir)
    for (let i = 0; i < 30 && last !== '2026-11-01'; i++) {
      await r.page.waitForTimeout(2000)
      last = lastFrozen(st.dataDir)
    }
    await go(r.page, '8', 'page-command')
    const c1 = await command(r.page)
    dump('2-po-dokowaniu', { plik: last, head: c1.head, strip: (c1.strip as string[]).slice(-16), log: (c1.log as string[]).slice(0, 12) })
    await shot(r.page, 'DW.8-po-dokowaniu')
    reading('dw', 'DW.8', 'rok-ictj po dokowaniu', { head: String(c1.head).replace(/\s+/g, ' '), plik: last })
    dump('gra', gameFiles(st.dataDir))
    dump('bledy', r.errors)
  } finally {
    await r.app.close()
  }
})
