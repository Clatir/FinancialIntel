// RE.12: pełna kopia ZIP z Raportów i z Ustawień – lista plików, czas, rozpakowanie do pustego folderu i otwarcie go
// w laboratorium (te same liczby Mostka).
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { reading, start, text, useState } from './lab'
import { answerSave, EXPORT, go, goReports, proposed, run, say, snap, step, toasts, unzip, waitFile } from './re-pomoc'

const names = (zip: string): string[] =>
  JSON.parse(execFileSync('python', ['-c', `import zipfile,json,sys;sys.stdout.write(json.dumps(zipfile.ZipFile(r'${zip}').namelist()))`], { encoding: 'utf8' })) as string[]

async function bridge(page: import('@playwright/test').Page): Promise<Record<string, string>> {
  await go(page, '1', 'page-bridge')
  await page.waitForTimeout(1500)
  const t = await text(page, '[data-testid="page-bridge"]')
  const lines = t.split('\n')
  const i = lines.findIndex((l) => /ENERGIA DZI/i.test(l))
  return { energia: lines.slice(i, i + 3).join(' '), odprawa: (await text(page, 'section[data-panel="bridge:Odprawa"]')).replace(/\n+/g, ' | ').slice(0, 1500), strona: t.replace(/\n+/g, ' | ').slice(0, 3000) }
}

test('RE.12 ZIP z Raportów i z Ustawień, otwarcie kopii', async () => {
  const r = await run('re-12')
  const { page, app, errors } = r
  let orig: Record<string, string> = {}
  try {
    orig = await bridge(page)
    say('RE.12 Mostek oryginału', { energia: orig.energia })
    await goReports(page, 'Eksport')
    const a = `${EXPORT}\\re-12-raporty.zip`
    await answerSave(app, a)
    const t0 = Date.now()
    await page.getByTestId('export-zip').click()
    const okA = await waitFile(a, 60_000)
    const tA = Date.now() - t0
    await page.waitForTimeout(1000)
    say('RE.12 ZIP z Raportów', { czas_ms_do_pojawienia_pliku: tA, rozmiar: okA ? statSync(a).size : 'BRAK', propozycja: (await proposed(app)).slice(-1), toast: await toasts(page) })
    await page.waitForTimeout(6500)
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-folder').click()
    await page.waitForTimeout(800)
    const b = `${EXPORT}\\re-12-ustawienia.zip`
    await answerSave(app, b)
    const t1 = Date.now()
    await page.getByTestId('export-zip').click()
    const okB = await waitFile(b, 60_000)
    const tB = Date.now() - t1
    await page.waitForTimeout(1000)
    say('RE.12 ZIP z Ustawień', { czas_ms: tB, rozmiar: okB ? statSync(b).size : 'BRAK', propozycja: (await proposed(app)).slice(-1), toast: await toasts(page) })
    await snap(page, 'RE.12-ustawienia')
    const na = names(a)
    const nb = names(b)
    const setA = new Set(na)
    const setB = new Set(nb)
    say('RE.12 zestawy', { raporty: na.length, ustawienia: nb.length, tylkoR: na.filter((x) => !setB.has(x)).slice(0, 10), tylkoU: nb.filter((x) => !setA.has(x)).slice(0, 10), zKopiami: na.filter((x) => /^backups|\.presence/.test(x)).length, zKropkami: na.filter((x) => x.includes('..')).length })
    const kolekcje: Record<string, number> = {}
    for (const n of na) kolekcje[n.split('/')[0]!] = (kolekcje[n.split('/')[0]!] ?? 0) + 1
    reading('re', 'RE.12', 'rok', { plikow_zip_raporty: na.length, plikow_zip_ustawienia: nb.length, wg_kolekcji: JSON.stringify(kolekcje), energia_oryginal: orig.energia ?? '' })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('RE.12 otwarcie rozpakowanej kopii', async () => {
  const dir = unzip(`${EXPORT}\\re-12-raporty.zip`, 're-12-kopia')
  const st = useState('rok', 're-12-orig')
  // The original, started afresh on its own copy of „rok”, and the copy from the ZIP started on the unpacked folder.
  const o = await start('re-12-orig', { dataDir: st.dataDir, ictjDir: st.ictjDir })
  o.page.setDefaultTimeout(15_000)
  let orig: Record<string, string> = {}
  try {
    await o.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await o.page.waitForTimeout(2500)
    orig = await bridge(o.page)
    await go(o.page, '2', 'page-operations')
    say('RE.12 Operacje oryginału (pasek)', (await text(o.page, '[data-testid="operations-sums"]')).replace(/\n+/g, ' | '))
  } finally {
    await o.app.close()
  }
  const c = await start('re-12-kopia', { dataDir: dir, ictjDir: st.ictjDir })
  c.page.setDefaultTimeout(15_000)
  try {
    await c.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await c.page.waitForTimeout(2500)
    const copy = await bridge(c.page)
    say('RE.12 Mostek oryginału', orig.energia ?? '')
    say('RE.12 Mostek kopii', copy.energia ?? '')
    say('RE.12 odprawa równa', { równa: orig.odprawa === copy.odprawa, oryginał: orig.odprawa, kopia: copy.odprawa })
    await step('salda', async () => {
      await go(c.page, '2', 'page-operations')
      const bar = (await text(c.page, '[data-testid="operations-sums"]')).replace(/\n+/g, ' | ')
      await go(c.page, '1', 'page-bridge')
      say('RE.12 Operacje kopii (pasek)', bar)
      await snap(c.page, 'RE.12-kopia-operacje')
      reading('re', 'RE.12', 'kopia z ZIP', { energia_kopia: copy.energia ?? '', pasek_kopia: bar })
    })
    say('RE.12 folder kopii po otwarciu', join(dir))
    say('errors', c.errors)
  } finally {
    await c.app.close()
  }
})
