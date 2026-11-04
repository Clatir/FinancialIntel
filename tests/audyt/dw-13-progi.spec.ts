// DW, przebieg 13 (DW.36): progi gry – wartości spoza zakresu, awans > okno, ułamek; zapis po restarcie; folder tylko do
// odczytu (fi.json w formacie nowszej wersji); obniżony próg degradacji (2) przed zamrożeniem dni od 20.10 (w październiku
// poważne 22.10 i 23.10). Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { shot, start, useState } from './lab'
import { command, dropGameDays, editJson, editSettings, go, out, textOf, toasts } from './dw-pomoc'

async function put(page: Page, id: string, v: string): Promise<{ pole: string; toasty: string[] }> {
  const f = page.getByTestId(id)
  await f.click()
  await f.fill(v)
  await f.press('Tab')
  await page.waitForTimeout(700)
  return { pole: await f.inputValue(), toasty: await toasts(page) }
}

test('DW.36 – walidacja progów, restart', async () => {
  const RUN = 'dw-13a'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const game = () => JSON.parse(readFileSync(join(st.dataDir, 'fi.json'), 'utf8')).settings.game
  let r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(3000)
    await go(r.page, '8', 'page-command')
    const s: Record<string, unknown> = {}
    s['awans-40'] = { ...(await put(r.page, 'game-promote-days', '40')), plik: game().promoteDays }
    s['okno-0'] = { ...(await put(r.page, 'game-window-days', '0')), plik: game().windowDays }
    s['okno-400'] = { ...(await put(r.page, 'game-window-days', '400')), plik: game().windowDays }
    s['misja-2,5'] = { ...(await put(r.page, 'game-mission-days', '2,5')), plik: game().missionDays }
    s['okno-20-przy-awansie-30'] = { ...(await put(r.page, 'game-window-days', '20')), plik: game().windowDays }
    s['awans-25'] = { ...(await put(r.page, 'game-promote-days', '25')), plik: game().promoteDays }
    s['procent-25'] = { ...(await put(r.page, 'game-serious-pct', '25')), plik: game().seriousEnvelopePct }
    s.stopien = await textOf(r.page.getByTestId('command-rank'))
    s.dopisek = (await textOf(r.page.getByTestId('command-orders'))).split('\n').slice(-1)[0]
    await shot(r.page, 'DW.36-progi')
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
  r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await r.page.waitForTimeout(3000)
    await go(r.page, '8', 'page-command')
    const ids = ['game-promote-days', 'game-window-days', 'game-serious-pct', 'game-demote', 'game-mission-days']
    const v: Record<string, string> = {}
    for (const id of ids) v[id] = await r.page.getByTestId(id).inputValue()
    dump('po-restarcie', { pola: v, plik: game(), stopien: await textOf(r.page.getByTestId('command-rank')) })
  } finally {
    await r.app.close()
  }
})

test('DW.36 – folder tylko do odczytu', async () => {
  const RUN = 'dw-13b'
  const st = useState('rok', RUN)
  editJson(join(st.dataDir, 'fi.json'), (f) => {
    f.schemaVersion = 2
  })
  const dump = out(RUN)
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.waitForTimeout(8000)
    await r.page.keyboard.press('Control+8')
    await r.page.waitForTimeout(1500)
    const s: Record<string, unknown> = {}
    s.ekran = await r.page.getByTestId('page-command').count()
    if (s.ekran) {
      for (const id of ['game-promote-days', 'game-window-days', 'game-demote']) {
        const f = r.page.getByTestId(id)
        s[id] = { readonly: await f.getAttribute('readonly'), disabled: await f.isDisabled(), editable: await f.isEditable() }
      }
      s.rozkazy = { disabled: await r.page.getByTestId('command-orders-fields').evaluate((e) => (e as HTMLFieldSetElement).disabled) }
      s.baner = (await r.page.locator('body').innerText()).split('\n').filter((l) => /odczytu/i.test(l)).slice(0, 3)
      await shot(r.page, 'DW.36-tylko-do-odczytu')
    }
    dump('kroki', s)
  } finally {
    await r.app.close()
  }
})

test('DW.36 – obniżony próg degradacji (2) działa przy kolejnym poważnym naruszeniu', async () => {
  const RUN = 'dw-13c'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  dump('wariant', { dropped: dropGameDays(st.dataDir, '2026-10-20') })
  editSettings(st.dataDir, (s) => {
    s.game.demoteSerious = 2
  })
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    for (let i = 0; i < 16; i++) {
      await r.page.waitForTimeout(500)
      if (await r.page.getByTestId('celebration').count()) await r.page.keyboard.press('Escape')
    }
    await go(r.page, '8', 'page-command')
    const c = await command(r.page)
    dump('kroki', { rank: c.rank, log: (c.log as string[]).slice(0, 14) })
  } finally {
    await r.app.close()
  }
})
