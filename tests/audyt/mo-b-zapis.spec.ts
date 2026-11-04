// MO, przebieg B (persona „rok” + nowy plik mBanku w folderze pobranych): jedna liczba na wszystkich ekranach przed
// i po zapisie 37,00 Jedzenie (MO.34), panele w osobnych oknach (MO.32), kolejność ostatnich operacji i zapamiętany filtr
// (MO.31), „Odsłuchaj” z podstawionym syntezatorem – tekst zamiast dźwięku (MO.17), łupy „na następny miesiąc” (MO.5),
// pozycja nowego pliku z banku i jej kliknięcie (MO.12).
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { test, type ElectronApplication, type Page } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { briefingItems, go, out, quickWindow, readBridge, textOf, where } from './mo-pomoc'

const RUN = 'mo-b'

async function quick(app: ElectronApplication, page: Page, amount: string, who: string, time: string): Promise<string> {
  const q = await quickWindow(app, page)
  const head = await textOf(q.locator('[data-testid="quick-entry"] > div').first())
  await q.getByTestId('quick-amount').click()
  await q.getByTestId('quick-amount').fill(amount)
  await q.getByTestId('quick-counterparty').fill(who)
  await q.getByTestId('quick-counterparty').press('Tab')
  await q.getByTestId('quick-time').fill(time)
  await q.getByTestId('quick-time').press('Tab')
  await q.waitForTimeout(400)
  const cat = await q.getByTestId('quick-category').inputValue().catch(() => '?')
  await q.getByTestId('quick-save').click()
  await page.waitForTimeout(1500)
  return `${head} | kategoria ${cat}`
}

async function quickHead(app: ElectronApplication, page: Page): Promise<string> {
  const q = await quickWindow(app, page)
  const head = await textOf(q.locator('[data-testid="quick-entry"] > div').first())
  await q.keyboard.press('Escape')
  await page.waitForTimeout(500)
  return head
}

test('MO przebieg B – jedna liczba, osobne okna, zapis, odsłuch, łupy, nowy plik', async () => {
  const st = useState('rok', RUN)
  const dir = join('C:\\FI-audyt', 'przebiegi', RUN)
  mkdirSync(join(dir, 'pobrane'), { recursive: true })
  copyFileSync(join('C:\\FI-audyt', 'pliki', 'rok-nowe-historia.csv'), join(dir, 'pobrane', 'rok-nowe-historia.csv'))
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (e) {
      dump(`BLAD-${name}`, String(e))
    }
  }
  const energyEverywhere = async (label: string, wins: Record<string, Page>) => {
    const r: Record<string, string> = {}
    for (const [k, w] of Object.entries(wins)) r[`okno ${k}`] = (await w.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400)
    r.szybkiWpis = await quickHead(app, page)
    await go(page, '4', 'page-month')
    r.plan = `${await textOf(page.getByTestId('month-energy-today'))}`
    await go(page, '0', 'page-reports')
    await page.getByTestId('page-reports').getByText('Odprawa', { exact: true }).first().click()
    await page.waitForTimeout(500)
    r.raporty = (await textOf(page.getByTestId('reports-briefing'))).split('\n').slice(0, 5).join(' | ')
    await go(page, '1', 'page-bridge')
    r.mostek = `${await textOf(page.getByTestId('bridge-energy'))} ${await textOf(page.getByTestId('bridge-energy-why'))}`
    r.czas = new Date().toISOString()
    dump(`MO.34-${label}`, r)
    reading('mo', 'MO.34', 'rok', { moment: label, ...r })
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)

    // MO.32 – trzy panele w osobnych oknach.
    const wins: Record<string, Page> = {}
    await step('odlacz', async () => {
      for (const name of ['Odprawa', 'Stan okrętu', 'Koperty']) {
        const sec = page.locator(`section:not([hidden])[data-panel="bridge:${name}"]`)
        const [win] = await Promise.all([app.waitForEvent('window'), sec.getByTestId('panel-detach').click()])
        await win.waitForLoadState('domcontentloaded')
        await win.waitForTimeout(1200)
        wins[name] = win
        dump(`MO.32-okno-${name}`, { tytul: await textOf(win.getByTestId('detached-title')), tekst: await win.locator('body').innerText() })
        await win.screenshot({ path: `C:\\FI-audyt\\zrzuty\\MO.32-${name.replace(/\s+/g, '_')}.png` })
      }
      dump('MO.32-mostek-po-odlaczeniu', (await text(page, '[data-testid="page-bridge"]')).slice(0, 800))
    })
    await step('przed', () => energyEverywhere('przed', wins))

    // Główne okno na Operacjach; zapis 37,00 Biedronka (Jedzenie) z szybkiego wpisu.
    await step('zapis-37', async () => {
      await go(page, '2', 'page-operations')
      const r = await quick(app, page, '37', 'Biedronka', '12:00')
      dump('MO.34-zapis', r)
      await page.waitForTimeout(1500)
      const live: Record<string, string> = {}
      for (const [k, w] of Object.entries(wins)) live[k] = (await w.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400)
      dump('MO.32-okna-po-zapisie-glowne-na-operacjach', live)
      await wins.Odprawa?.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.32-Odprawa-po-zapisie.png' })
      // Kliknięcie pozycji odprawy w osobnym oknie (asteroida → Ładownia).
      const item = wins.Odprawa!.locator('[data-testid="briefing-item"][data-kind="asteroid"]').first()
      await item.click()
      await page.waitForTimeout(1500)
      dump('MO.32-klik-w-oknie', { glowne: await where(page) })
      const item2 = wins.Odprawa!.locator('[data-testid="briefing-item"][data-kind="mission"]').first()
      await item2.click()
      await page.waitForTimeout(1500)
      dump('MO.32-klik-w-oknie-2', { glowne: await where(page) })
    })
    await step('po', () => energyEverywhere('po', wins))

    // MO.17 – „Odsłuchaj” z podstawionym syntezatorem (tekst zamiast dźwięku).
    await step('odsluch', async () => {
      await page.evaluate(() => {
        const g = window as unknown as { __spoken: string[] }
        g.__spoken = []
        speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
          g.__spoken.push(`[${u.lang} ${u.voice?.name ?? 'bez głosu'}] ${u.text}`)
        }
      })
      await page.getByTestId('briefing-speak').click()
      await page.waitForTimeout(500)
      await page.keyboard.press('Control+Shift+Digit4')
      await page.waitForTimeout(600)
      await page.getByTestId('briefing-speak').click()
      await page.waitForTimeout(500)
      dump('MO.17-mowa', await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken))
      dump('MO.17-ukryte-mostek', (await text(page, '[data-testid="page-bridge"]')).slice(0, 700))
      await page.keyboard.press('Control+Shift+Digit4')
      await page.waitForTimeout(600)
    })

    // MO.31 – kolejność dzisiejszych: zapis 07:00 po zapisie 12:00.
    await step('MO.31-kolejnosc', async () => {
      await quick(app, page, '5', 'Żabka', '07:00')
      await go(page, '1', 'page-bridge')
      dump('MO.31-wiersze', (await page.locator('[data-testid="bridge-recent-row"]').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ')))
    })
    // MO.31 – zapamiętany filtr (Konto: mBank) a kliknięcie wiersza z poprzedniego miesiąca.
    await step('MO.31-filtr', async () => {
      await go(page, '2', 'page-operations')
      await page.getByText(/^Konto: wszystkie/).first().click()
      await page.waitForTimeout(400)
      await page.getByRole('menuitemcheckbox', { name: 'mBank' }).or(page.getByRole('option', { name: 'mBank' })).or(page.locator('[role="menu"] >> text=mBank')).first().click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      dump('MO.31-filtr-ustawiony', (await text(page, '[data-testid="page-operations"]')).slice(0, 300))
      await shot(page, 'MO.31-filtr-ustawiony')
      await go(page, '1', 'page-bridge')
      const older = page.locator('[data-testid="bridge-recent-row"]').filter({ hasText: /30\.10/ }).first()
      dump('MO.31-klik', await older.innerText())
      await older.click()
      await page.waitForTimeout(1500)
      dump('MO.31-po-kliknieciu', (await text(page, '[data-testid="page-operations"]')).slice(0, 700))
      await shot(page, 'MO.31-po-kliknieciu')
      await go(page, '1', 'page-bridge')
      await go(page, '2', 'page-operations')
      dump('MO.31-z-menu', (await text(page, '[data-testid="page-operations"]')).slice(0, 400))
      await shot(page, 'MO.31-z-menu')
      const mine = page.getByText('mój filtr', { exact: true })
      if (await mine.count()) {
        await mine.first().click()
        await page.waitForTimeout(800)
        dump('MO.31-moj-filtr', (await text(page, '[data-testid="page-operations"]')).slice(0, 400))
      } else dump('MO.31-moj-filtr', '(brak „mój filtr”)')
    })

    // MO.5 – łupy października: 300 zł „na następny miesiąc”.
    await step('MO.5-lupy', async () => {
      await go(page, '1', 'page-bridge')
      const before = await readBridge(page)
      await go(page, '4', 'page-month')
      const next = page.getByTestId('loot-next')
      dump('MO.5-lupy-panel', await textOf(page.getByTestId('loot')))
      await next.click()
      await next.fill('300')
      await next.press('Tab')
      await page.getByTestId('loot-confirm').click()
      await page.waitForTimeout(1500)
      dump('MO.5-lupy-po', await textOf(page.getByTestId('loot')))
      await go(page, '1', 'page-bridge')
      const after = await readBridge(page)
      dump('MO.5-lupy-rozbicie', { przed: before.rozbicie, po: after.rozbicie, energiaPrzed: before.energia, energiaPo: after.energia, podpisPo: after.podpis, stanPo: after.stan })
      await page.getByTestId('bridge-energy-why').click()
      await shot(page, 'MO.5-lupy')
      await page.getByTestId('bridge-energy-why').click()
      reading('mo', 'MO.5', 'rok + łupy 300 na następny miesiąc', { rozbicie: JSON.stringify(after.rozbicie), energia: String(after.energia) })
    })

    // MO.12 – nowy plik z banku w pobranych.
    await step('MO.12-plik', async () => {
      await go(page, '1', 'page-bridge')
      let items = await briefingItems(page.locator('section[data-panel="bridge:Odprawa"]').first())
      for (let i = 0; i < 10 && !items.some((x) => x.text.includes('importuj.')); i++) {
        await page.waitForTimeout(3000)
        items = await briefingItems(page.locator('section[data-panel="bridge:Odprawa"]').first())
      }
      dump('MO.12-odprawa', items.filter((x) => x.kind === 'import'))
      const it = page.locator('section[data-panel="bridge:Odprawa"] [data-testid="briefing-item"][data-kind="import"]').filter({ hasText: 'importuj.' }).first()
      if (await it.count()) {
        await it.click()
        await page.waitForTimeout(4000)
        dump('MO.12-import', { gdzie: await where(page), tekst: (await text(page, '[data-testid="page-import"]')).slice(0, 1500) })
        await shot(page, 'MO.12-import')
      }
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
