// DW, przebieg 6 (DW.22, DW.28, DW.36): wariant „rok-degradacja” – na kopii „rok” (Chorąży od 06.10) dni od 20.10
// wycofane z gry (aplikacja zamraża je od nowa, już z importem: 22.10 i 23.10 poważne przekroczenia kopert Prezenty i Dom);
// A – trzeci poważny: potwierdzony zakup w ciszy nocnej 27.10 23:40 (wpis dopisany do folderu) → degradacja w dniu 27.10;
// B – ten sam zakup 01.11 (2 poważne w październiku + 1 w listopadzie) → bez degradacji; potem próg „Degradacja po” 2.
// Misje W43 „Zero impulsów” i W44 „Cisza w eterze” dopisane ręcznie do game/ (nierozliczone) – rozliczy je aplikacja.
// Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, recorded, shot, start, useState } from './lab'
import { addRecords, cat, command, dropGameDays, editJson, gameFiles, go, MBANK, out, toasts } from './dw-pomoc'

function prepare(dataDir: string, nightDay: string): Record<string, unknown> {
  const dropped = dropGameDays(dataDir, '2026-10-20')
  editJson(join(dataDir, 'game', '2026-10.json'), (g) => {
    g.missions = [
      ...(g.missions ?? []),
      { id: '01KMSN00000000000000202643', template: 'impulse', week: '2026-W43', done: false, evaluatedAt: null, params: {} },
      { id: '01KMSN00000000000000202644', template: 'quiet', week: '2026-W44', done: false, evaluatedAt: null, params: {} }
    ]
  })
  const [tx] = addRecords(dataDir, 'transactions', [
    { date: nightDay, time: '23:40', accountId: MBANK, kind: 'expense', amount: -4500, categoryId: cat(103), counterparty: 'Nocny sklep DW', impulse: 'impulse', logNote: 'test degradacji', createdAt: `${nightDay}T22:41:00.000Z` }
  ])
  return { dropped, tx: tx?.id }
}

for (const [name, nightDay] of [
  ['A', '2026-10-27'],
  ['B', '2026-11-01']
] as const) {
  test(`DW.22 – degradacja, wariant ${name} (zakup nocny ${nightDay})`, async () => {
    const RUN = `dw-6${name.toLowerCase()}`
    const st = useState('rok', RUN)
    const dump = out(RUN)
    dump('wariant', prepare(st.dataDir, nightDay))
    const t0 = Date.now()
    let r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
    const seen: string[] = []
    const watch = setInterval(() => {
      toasts(r.page)
        .then((t) => {
          for (const x of t) if (!seen.some((s) => s.endsWith(` ${x}`))) seen.push(`${Math.round((Date.now() - t0) / 1000)}s ${x}`)
        })
        .catch(() => {})
    }, 300)
    try {
      await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
      for (let i = 0; i < 20; i++) {
        await r.page.waitForTimeout(500)
        if (await r.page.getByTestId('celebration').count()) {
          dump(`ekran-${i}`, await r.page.getByTestId('celebration').innerText())
          await r.page.keyboard.press('Escape')
        }
      }
      await r.page.waitForTimeout(4000)
      await shot(r.page, `DW.22-${name}-toasty`)
      await go(r.page, '8', 'page-command')
      const c = await command(r.page)
      dump('dowodztwo', c)
      await shot(r.page, `DW.22-${name}-dowodztwo`)
      reading('dw', 'DW.22', `rok-degradacja ${name}`, { stopien: String(c.rank).replace(/\s+/g, ' '), dziennik: (c.log as string[]).slice(0, 16).join(' | ') })
      reading('dw', 'DW.28', `rok-degradacja ${name}`, { poprzednie: (c.poprzednie as string[]).join(' | ') })
      dump('toasty', seen)
      dump('powiadomienia', (await recorded(r.app)).toasts)
      dump('gra', gameFiles(st.dataDir))
      if (name === 'B') {
        // DW.36 – „Degradacja po” 2 with 1 serious this month: the frozen ranks stay; the label shows the new limit.
        const f = r.page.getByTestId('game-demote')
        await f.click()
        await f.fill('2')
        await f.press('Tab')
        await r.page.waitForTimeout(1200)
        const c2 = await command(r.page)
        dump('prog-2', { rank: c2.rank, log: (c2.log as string[]).slice(0, 8), pole: await f.inputValue() })
        await shot(r.page, 'DW.36-degradacja-po-2')
      }
      dump('bledy', r.errors)
    } finally {
      clearInterval(watch)
      await r.app.close()
    }
    if (name === 'B') {
      r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false })
      try {
        await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
        await r.page.waitForTimeout(3000)
        await go(r.page, '8', 'page-command')
        const c3 = await command(r.page)
        dump('prog-2-po-restarcie', { rank: c3.rank, pole: await r.page.getByTestId('game-demote').inputValue() })
      } finally {
        await r.app.close()
      }
    }
  })
}
