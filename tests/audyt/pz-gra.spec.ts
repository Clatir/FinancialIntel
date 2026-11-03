// PZ (AU-9b, przekrój liczb): gra na NOWYM stanie „rok” (odnowionym 03.11 15:16 – dni 04.09–01.11 zamrożone po imporcie
// historii banku). Odczyt Dowództwa w całości (stopień i od kiedy, licznik do awansu, poważne w miesiącu, klasa, seria,
// rekord, misja tygodnia, misje minione, osiągnięcia, pasek dni, dziennik wachty) i Mostka (klasa, energia, Daily Bias,
// meldunki) – do porównania z wyrocznią (tests/audyt/wyrocznia). Każdy odczyt z migawką folderu
// (C:\FI-audyt\migawki\pz\<punkt>-<n>\dane bez backups i .history, \ictj). Tylko obserwacja – bez zmian danych.
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { test, type Page } from '@playwright/test'
import { LAB, reading, shot, start, text, useState } from './lab'
import { briefing, command, energy, gameFiles, go, out, textOf, toasts } from './dw-pomoc'

const RUN = 'pz-gra'
const STATE = 'rok (odnowiony 03.11 15:16; dni gry 04.09–01.11 zamrożone po imporcie historii)'

const skip = (root: string) => (src: string) => {
  const rel = relative(root, src)
  if (!rel) return true
  const top = rel.split(sep)[0]
  return top !== 'backups' && top !== '.history' && !/\.tmp(-\w+)?$/i.test(rel)
}

/** The data folder (and ICTTJ's) as it is now: C:\FI-audyt\migawki\pz\<point>-<n>\dane (\ictj) – the next free n. */
function snapshot(point: string, dataDir: string, ictjDir?: string): string {
  const base = join(LAB, 'migawki', 'pz')
  mkdirSync(base, { recursive: true })
  const stem = point.replace(/[^\w.-]+/g, '_')
  let n = 1
  while (existsSync(join(base, `${stem}-${n}`))) n++
  const dir = join(base, `${stem}-${n}`)
  cpSync(dataDir, join(dir, 'dane'), { recursive: true, filter: skip(dataDir) })
  if (ictjDir && existsSync(ictjDir)) cpSync(ictjDir, join(dir, 'ictj'), { recursive: true })
  return dir
}

const flat = (v: unknown): string | number | null => (v == null ? null : typeof v === 'string' || typeof v === 'number' ? v : JSON.stringify(v))
const clean = (s: unknown) => String(s).replace(/\s+/g, ' ').trim()

/** A reading with the snapshot taken first (the app's writes settle before). */
async function rd(page: Page, point: string, values: Record<string, unknown>, dataDir: string, ictjDir?: string): Promise<string> {
  await page.waitForTimeout(1500)
  const mig = snapshot(point, dataDir, ictjDir)
  const v: Record<string, string | number | null> = {}
  for (const [k, x] of Object.entries(values)) v[k] = flat(x)
  v._migawka = mig
  reading('pz', point, STATE, v)
  return mig
}

test('PZ – gra na nowym stanie rok (Dowództwo w całości, Mostek)', async () => {
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const gameBefore = gameFiles(st.dataDir)
  dump('gra-przed', gameBefore)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(8000)

    // Mostek: klasa w nagłówku, energia dziś, Daily Bias, meldunki (misja tygodnia).
    const bridge = await text(page)
    dump('mostek', bridge)
    const e = await energy(page)
    const brief = await briefing(page)
    dump('mostek-odprawa', { e, brief })
    await shot(page, 'PZ.gra-mostek')
    await rd(
      page,
      'PZ.mostek',
      {
        naglowek: clean(bridge.split('ODPRAWA')[0]),
        energia: e.energia,
        podpis: clean(e.podpis),
        bias: clean(e.bias),
        misja: brief.find((b) => /Misja tygodnia/.test(b)) ?? '(brak meldunku misji)',
        meldunki: brief.join(' | ')
      },
      st.dataDir,
      st.ictjDir
    )

    // Dowództwo panel po panelu.
    await go(page, '8', 'page-command')
    await page.waitForTimeout(1500)
    const c = await command(page)
    const whole = await text(page, '[data-testid="page-command"]')
    dump('dowodztwo', c)
    dump('dowodztwo-tekst', whole)
    await shot(page, 'PZ.gra-dowodztwo')
    const stripN = await page.getByTestId('command-strip').locator('span').count()
    const logN = await page.getByTestId('command-log-entry').count()
    dump('liczniki', { stripN, logN })

    await rd(
      page,
      'PZ.dowodztwo',
      {
        head: clean(c.head),
        stopien: clean(c.rank),
        klasa: clean(c.klasa),
        seria: clean(c.seria),
        serieDni: clean(c.streak),
        dzis: clean(c.today),
        misja: clean(c.misja),
        misjaStatus: clean(c.misjaStatus),
        misjePoprzednie: (c.poprzednie as string[]).join(' | ') || '(brak)',
        osiagniecia: (c.osiagniecia as string[]).join(' | ') || '(brak)',
        ukryte: clean(c.ukryte)
      },
      st.dataDir,
      st.ictjDir
    )
    await rd(page, 'PZ.pasek', { dni: stripN, pasek: (c.strip as string[]).join(' | ') }, st.dataDir, st.ictjDir)
    await rd(page, 'PZ.dziennik', { wpisy: logN, dziennik: (c.log as string[]).join(' | ') }, st.dataDir, st.ictjDir)

    // Panel dziennika – tekst całego panelu (gdyby wpisy były zwinięte / ucięte).
    const logPanel = await textOf(page.getByTestId('command-log-entry').first().locator('xpath=ancestor::section[1]'))
    dump('dziennik-panel', logPanel)

    // The whole log scrolled into view to its end (a virtualised list would add entries on scroll).
    const last = page.getByTestId('command-log-entry').last()
    if (await last.count()) await last.scrollIntoViewIfNeeded()
    await page.waitForTimeout(800)
    const logN2 = await page.getByTestId('command-log-entry').count()
    dump('liczniki-po-przewinieciu', { logN2 })
    if (logN2 !== logN) {
      const c2 = await command(page)
      await rd(page, 'PZ.dziennik', { wpisy: logN2, dziennik: (c2.log as string[]).join(' | ') }, st.dataDir, st.ictjDir)
    }

    dump('toasty', await toasts(page))
    dump('gra-po', gameFiles(st.dataDir))
    dump('gra-zmiana', { taSama: JSON.stringify(gameFiles(st.dataDir)) === JSON.stringify(gameBefore) })
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
