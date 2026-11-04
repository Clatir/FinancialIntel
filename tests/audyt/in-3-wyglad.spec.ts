/** IN.16 – IN.28: puste stany, długie nazwy, błędy, banery, teksty, tokeny, akcenty, animacje, Co nowego, zapis, klawiatura. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { start, useState } from './lab'
import { addRecords, cat, editSettings, MBANK, WALLET } from './op-pomoc'
import { configOf, dataDirOf, fiOf, goSettings, mute, quickWin, restart, run, say, snap, text, toasts, typed, userDataOf } from './us-pomoc'

const NAVS = [
  ['Control+1', 'Mostek'], ['Control+2', 'Operacje'], ['Control+3', 'Import'], ['Control+4', 'Plan'], ['Control+5', 'Ładownia'], ['Control+6', 'Mapa'], ['Control+7', 'Radar'],
  ['Control+8', 'Dowództwo'], ['Control+9', 'Wywiad'], ['Control+0', 'Raporty'], ['Control+Shift+M', 'Meldunki'], ['Control+Shift+Y', 'Synchronizacja']
] as const

const BAD = /NaN|undefined|Invalid Date|\[object|null\b|Infinity/

async function tourTexts(page: Page, wait = 1100): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [k, n] of NAVS) {
    await page.keyboard.press(k)
    await page.waitForTimeout(wait)
    out[n] = await text(page, 'main')
  }
  return out
}

test('IN.16 puste stany (nowy budżet przed kreatorem)', async () => {
  const N = 'in-pusty'
  const r = await start(N, { usePreset: false })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('setup-default').waitFor({ timeout: 60_000 })
    await page.getByTestId('setup-default').click()
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(1500)
    say('IN.16 baner', await text(page, '[data-testid="banner-wizard"]').catch(() => '(brak)'))
    const t = await tourTexts(page)
    for (const [n, v] of Object.entries(t)) {
      say(`IN.16 ${n}`, { zle: v.match(BAD)?.[0] ?? null, tekst: v.replace(/\n+/g, ' | ').slice(0, 700) })
      await page.keyboard.press(NAVS.find((x) => x[1] === n)![0])
      await page.waitForTimeout(700)
      await snap(page, `IN.16-${n}`)
    }
    await goSettings(page, 'folder')
    say('IN.16 Folder i kopie', (await text(page, 'main')).split('\n').filter((l) => /Brak|kopi/i.test(l)))
    for (const tab of ['household', 'import', 'ictj']) {
      await goSettings(page, tab)
      say(`IN.16 Ustawienia/${tab}`, (await text(page, 'main')).replace(/\n+/g, ' | ').slice(200, 900))
    }
    await page.keyboard.press('Control+Shift+Y')
    await page.waitForTimeout(800)
    say('IN.16 Synchronizacja (cały tekst)', await text(page, 'main'))
  } finally {
    await app.close()
  }
})

test('IN.17 długie nazwy i duże kwoty', async () => {
  const N = 'in-brzegi'
  const { dataDir, ictjDir } = useState('rok', N)
  const long40 = 'Żółć Gęślą Jaźń Żółć Gęślą Jaźń Żółć Gęś'
  const long120 = 'Bardzo Długa Nazwa Kontrahenta Żółć Gęślą Jaźń Spółka z ograniczoną odpowiedzialnością Sp. k. Oddział w Gdańsku ul. Świętojańska 12/3'.slice(0, 120)
  editSettings(dataDir, (s) => {
    s.shipName = long40
    s.accounts[1].name = long40
    s.categories.find((c: any) => c.name === 'Rozrywka i hobby').name = long40
  })
  addRecords(dataDir, 'transactions', [
    { accountId: WALLET, kind: 'expense', date: '2026-11-03', time: '09:15', counterparty: long120, amount: -123456789, categoryId: cat('0101') },
    { accountId: MBANK, kind: 'income', date: '2026-11-03', time: '09:20', counterparty: 'Żółć Gęślą Jaźń Sp. z o.o.', amount: 250000000 },
    { accountId: WALLET, kind: 'expense', date: '2026-11-03', time: '09:25', counterparty: 'Mała Żabka', amount: -100000000, categoryId: cat('0102') }
  ])
  const r = await start(N, { dataDir, ictjDir })
  const { app, page } = r
  page.setDefaultTimeout(15_000)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await page.waitForTimeout(2500)
    await snap(page, 'IN.17-menu-mostek')
    for (const [k, n] of NAVS.slice(0, 8)) {
      await page.keyboard.press(k)
      await page.waitForTimeout(1200)
      const over = await page.evaluate(() => {
        const bad: string[] = []
        for (const el of document.querySelectorAll('main *')) {
          const e = el as HTMLElement
          if (e.children.length) continue
          const t = (e.textContent ?? '').trim()
          if (!t) continue
          const cs = getComputedStyle(e)
          if (e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis' && e.clientWidth > 0) bad.push(`${t.slice(0, 40)} (${e.scrollWidth}>${e.clientWidth}, ${cs.overflow}/${cs.textOverflow})`)
        }
        return bad.slice(0, 8)
      })
      say(`IN.17 ${n}`, { ucięte_bez_wielokropka: over })
      await snap(page, `IN.17-${n}`)
    }
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('Bardzo Długa')
    await page.waitForTimeout(700)
    await snap(page, 'IN.17-paleta')
    say('IN.17 paleta', await page.getByRole('option').allInnerTexts())
    await page.keyboard.press('Escape')
    const q = await quickWin(app, page)
    await q.waitForTimeout(500)
    await snap(q, 'IN.17-szybki')
    say('IN.17 szybki wpis – konta', await q.getByTestId('quick-account').locator('option').allInnerTexts())
    await q.keyboard.press('Escape')
    say('IN.17 menu okręt', await page.getByTestId('menu-ship-name').evaluate((e) => ({ t: e.textContent, sw: e.scrollWidth, cw: e.clientWidth })))
    say('IN.17 zapis prób powiadomień', (await (await import('./lab')).recorded(app)).toasts.map((t) => t.body).filter((b) => /Żółć|Bardzo/.test(b)))
  } finally {
    await app.close()
  }
})

test('IN.18 błędne wartości w polach', async () => {
  const N = 'in-bledy'
  const r = await run(N)
  const { app, page } = r
  try {
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(900)
    await page.getByTestId('operation-row').first().click()
    await page.waitForTimeout(600)
    const probe = async (label: string, tid: string, vals: string[]) => {
      for (const v of vals) {
        const f = page.getByTestId(tid)
        const old = await f.inputValue()
        await f.click()
        await f.press('Control+a')
        await f.pressSequentially(v)
        await f.press('Enter')
        await page.waitForTimeout(500)
        say(`IN.18 ${label} „${v}”`, { przed: old, po: await f.inputValue(), toasts: await toasts(page), aria: await f.getAttribute('aria-invalid') })
      }
    }
    await probe('kwota', 'operation-amount', ['abc', '12,345', '-5', '1e3'])
    await probe('data', 'operation-date', ['31.02.2026', '99.99', 'jutro'])
    await probe('godzina', 'operation-time', ['25:00', '12:99', 'abc'])
    await goSettings(page, 'accounts')
    await typed(page, 'account-name', '')
    say('IN.18 pusta nazwa konta', await toasts(page))
    await page.keyboard.press('Control+6')
    await page.waitForTimeout(900)
    say('IN.18 Mapa gwiezdna – przyciski', await page.locator('[data-testid="page-starmap"] button').evaluateAll((els) => els.slice(0, 12).map((e) => (e.textContent ?? '').trim().slice(0, 30))))
    const add = page.getByRole('button', { name: /Cel|cel/ }).first()
    if (await add.count()) {
      await add.click()
      await page.waitForTimeout(600)
      say('IN.18 nowy cel – pola', await page.locator('[data-testid="page-starmap"] input').evaluateAll((els) => els.slice(0, 8).map((e) => `${e.getAttribute('aria-label') ?? e.getAttribute('data-testid')}=${(e as HTMLInputElement).value}`)))
    }
    await snap(page, 'IN.18')
  } finally {
    await app.close()
  }
})

test('IN.19 / IN.26 banery i Co nowego', async () => {
  const N = 'in-baner'
  const { dataDir, ictjDir } = useState('start', N)
  const r = await start(N, { dataDir, ictjDir, prefs: {} })
  await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
  await r.app.close()
  // lastRunVersion 1.15.3 from outside
  const cfgFile = join(userDataOf(N), 'config.json')
  const c = JSON.parse(readFileSync(cfgFile, 'utf8'))
  say('IN.26 lastRunVersion po 1. starcie', c.updates?.lastRunVersion)
  const r2 = await restart(N, { edit: (cc) => { cc.updates = { ...cc.updates, lastRunVersion: '1.15.3' } } })
  const { app, page } = r2
  try {
    await page.waitForTimeout(2500)
    say('IN.26 baner', await text(page, '[data-testid="banner-updated"]').catch(() => '(brak banera)'))
    await snap(page, 'IN.26-baner')
    await page.getByRole('button', { name: 'Co nowego' }).first().click().catch(() => undefined)
    await page.waitForTimeout(800)
    say('IN.26 po „Co nowego”', { zakladka: await page.getByTestId('settings-tab-updates').count(), notes: await text(page, '[data-testid="release-notes"]').catch(() => '(brak panelu)') })
    await snap(page, 'IN.26-co-nowego')
    say('IN.26 panel tytuł', (await text(page, 'main')).split('\n').filter((l) => /Co nowego/i.test(l)))
    await page.getByTestId('banner-updated').getByRole('button').last().click().catch(() => undefined)
    await page.waitForTimeout(600)
    say('IN.26 po „×”', await page.getByTestId('banner-updated').count())
    say('IN.26 config', configOf(N).updates)
  } finally {
    await app.close()
  }
  const r3 = await restart(N)
  try {
    await r3.page.waitForTimeout(2000)
    say('IN.26 po ponownym uruchomieniu – baner', await r3.page.getByTestId('banner-updated').count())
  } finally {
    await r3.app.close()
  }
  // IN.19: read-only folder + wizard + several banners
  const N2 = 'in-baner2'
  const s2 = useState('start', N2)
  const fi = JSON.parse(readFileSync(join(s2.dataDir, 'fi.json'), 'utf8'))
  const { writeFileSync } = await import('node:fs')
  fi.schemaVersion = 2
  writeFileSync(join(s2.dataDir, 'fi.json'), `${JSON.stringify(fi, null, 2)}\n`)
  const r4 = await start(N2, { dataDir: s2.dataDir, ictjDir: s2.ictjDir })
  r4.page.setDefaultTimeout(15_000)
  try {
    await r4.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r4.page.waitForTimeout(2000)
    say('IN.19 tylko do odczytu – banery', await r4.page.locator('[data-testid^="banner-"]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-testid'), (e.textContent ?? '').slice(0, 200)])))
    await snap(r4.page, 'IN.19-ro')
    await r4.page.keyboard.press('Control+n')
    await r4.page.waitForTimeout(800)
    await snap(r4.page, 'IN.19-ro-ctrln')
    say('IN.19 przyciski zasłonięte? (mostek – górny pasek)', await r4.page.getByTestId('open-palette').boundingBox())
  } finally {
    await r4.app.close()
  }
  // LAPTOP on the 'rok' state: autostart banner (choose „Nie”)
  const N3 = 'in-baner3'
  const s3 = useState('rok', N3)
  const r5 = await start(N3, { dataDir: s3.dataDir, ictjDir: s3.ictjDir, machine: 'LAPTOP' })
  r5.page.setDefaultTimeout(15_000)
  try {
    await r5.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r5.page.waitForTimeout(2500)
    say('IN.19 drugi komputer – banery', await r5.page.locator('[data-testid^="banner-"]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-testid'), (e.textContent ?? '').slice(0, 220)])))
    await snap(r5.page, 'IN.19-laptop')
    await r5.page.getByTestId('banner-autostart-no').click().catch(() => undefined)
    await r5.page.waitForTimeout(600)
    say('IN.19 po „Nie”', { baner: await r5.page.getByTestId('banner-autostart').count(), tray: configOf(N3).tray })
  } finally {
    await r5.app.close()
  }
})

test('IN.20 – IN.21 teksty', async () => {
  const N = 'in-teksty'
  const r = await run(N)
  const { app, page } = r
  try {
    const all: Record<string, string> = {}
    Object.assign(all, await tourTexts(page, 1200))
    for (const tab of ['general', 'accounts', 'categories', 'layers', 'household', 'import', 'ictj', 'notify', 'view', 'folder', 'system', 'updates']) {
      await goSettings(page, tab)
      all['Ustawienia/' + tab] = await text(page, 'main')
    }
    await page.keyboard.press('F1')
    await page.getByTestId('shortcuts').waitFor()
    all['F1'] = await text(page, '[data-testid="shortcuts"]')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(600)
    // tooltips (title attributes) of the whole app
    const titles = await page.evaluate(() => [...new Set([...document.querySelectorAll('[title]')].map((e) => e.getAttribute('title')!).filter(Boolean))])
    all['title-Mostek'] = titles.join('\n')
    const checks: Array<[string, RegExp]> = [
      ['słowo firma', /\bfirm[aąyieęu]\b/i],
      ['liczebnik 2-4 + dopełniacz', /\b[234] (operacji|wpisów|dni|plików|kopii|konfliktów|meldunków|celów|kontenerów|miesięcy)\b/],
      ['liczebnik 5+ + mianownik', /\b([5-9]|1[0-9]) (operacje|wpisy|pliki|kopie|konflikty|meldunki|cele|kontenery)\b/],
      ['1 + liczba mnoga', /\b1 (operacje|operacji|wpisy|wpisów|dni|plików|kopie|kopii)\b/],
      ['data ISO', /\b20\d\d-\d\d-\d\d\b/],
      ['kwota z kropką', /\b\d+\.\d{2}\s?zł/],
      ['kwota bez spacji tysięcy', /\b\d{4,},\d{2}\s?zł/],
      ['angielskie słowa', /\b(the|and|error|failed|loading|undefined|click|save|cancel|settings|please)\b/i],
      ['kody decyzji', /\((D|T|F|N|B)\d+[^)]{0,30}\)/],
      ['kropka dziesiętna w liczbie', /\b\d\.\d\b(?! mies)/]
    ]
    for (const [name, re] of checks) {
      const hits: string[] = []
      for (const [page, t] of Object.entries(all)) for (const m of t.matchAll(new RegExp(re, 'gi'))) hits.push(`${page}: …${t.slice(Math.max(0, m.index! - 30), m.index! + m[0].length + 25).replace(/\n/g, ' ')}…`)
      say(`IN.20/21 ${name}`, hits.slice(0, 25))
    }
    // dump everything for reading
    const { writeFileSync } = await import('node:fs')
    writeFileSync(join(dataDirOf(N), '..', 'teksty.txt'), Object.entries(all).map(([k, v]) => `##### ${k}\n${v}`).join('\n\n'))
  } finally {
    await app.close()
  }
})
