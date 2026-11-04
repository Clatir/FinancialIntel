/** IN.1 – IN.8: menu, skróty ekranów, Ctrl+N, Ctrl+S, Ctrl+$, rozmiar, paleta (state rok, copy). */
import { test, type Page } from '@playwright/test'
import { recorded } from './lab'
import { fiOf, goSettings, mute, quickWin, run, say, snap, text, toasts, typed } from './us-pomoc'

const PAGES = ['bridge', 'operations', 'import', 'month', 'cargo', 'starmap', 'radar', 'command', 'intel', 'reports', 'inbox', 'sync']
const whichPage = async (page: Page): Promise<string> => {
  for (const p of PAGES) if (await page.getByTestId(`page-${p}`).count()) return p
  if (await page.getByTestId('settings-tab-general').count()) return 'settings'
  if (await page.getByTestId('sync-machine').count()) return 'sync'
  return '?'
}

test('IN.1 – IN.2 menu i skróty', async () => {
  const N = 'in-menu'
  const r = await run(N)
  const { app, page } = r
  try {
    const nav = page.getByTestId('side-menu')
    say('IN.1 menu', (await text(page, '[data-testid="side-menu"]')).replace(/\n/g, ' | '))
    const items = await nav.locator('button').evaluateAll((els) => els.map((e) => [(e.textContent ?? '').replace(/\s+/g, ' ').trim(), e.getAttribute('data-testid'), e.className.includes('accent') || e.getAttribute('aria-current') ? 'AKTYWNY?' : '']))
    say('IN.1 przyciski menu', items)
    const labels = ['Mostek', 'Operacje', 'Import', 'Plan miesiąca', 'Ładownia', 'Mapa gwiezdna', 'Radar', 'Dowództwo', 'Wywiad', 'Raporty', 'Meldunki', 'Synchronizacja', 'Ustawienia']
    for (const l of labels) {
      await nav.locator('button', { hasText: l }).first().click()
      await page.waitForTimeout(1000)
      const active = await nav.locator('button', { hasText: l }).first().evaluate((e) => e.className.replace(/\s+/g, ' ').slice(0, 160))
      say(`IN.1 klik „${l}”`, { ekran: await whichPage(page), klasa: active.includes('accent') ? 'aktywny (akcent)' : active, teksty: (await text(page, 'main')).slice(0, 80).replace(/\n/g, ' | ') })
    }
    const badge = await nav.getByTestId('nav-inbox').innerText()
    await page.keyboard.press('Control+Shift+M')
    await page.waitForTimeout(800)
    const count = await text(page, '[data-testid="inbox-count"]')
    const sections = await page.locator('[data-testid^="inbox-"][data-testid$="x"]').count()
    say('IN.1 licznik Meldunków', { menu: badge.replace(/\n/g, ' '), ekran: count, pozycji: await page.getByTestId('inbox-item').count().catch(() => '?') })
    say('IN.1 licznik Synchronizacji', (await nav.getByTestId('nav-sync').innerText()).replace(/\n/g, ' '))
    await page.keyboard.press('Control+Shift+Y')
    await page.waitForTimeout(800)
    say('IN.1 Synchronizacja ekran', (await text(page, 'main')).slice(0, 500))
    await snap(page, 'IN.1-sync')
    await snap(page, 'IN.1-menu')

    // IN.2: shortcuts from every screen, with and without focus in a text field
    const keys: Array<[string, string]> = [['Control+1', 'bridge'], ['Control+2', 'operations'], ['Control+3', 'import'], ['Control+4', 'month'], ['Control+5', 'cargo'], ['Control+6', 'starmap'], ['Control+7', 'radar'], ['Control+8', 'command'], ['Control+9', 'intel'], ['Control+0', 'reports'], ['Control+,', 'settings'], ['Control+Shift+Y', 'sync'], ['Control+Shift+M', 'inbox']]
    const bad: string[] = []
    await page.keyboard.press('Control+1')
    for (const [from] of [['bridge'], ['operations'], ['month'], ['settings']]) {
      for (const [k, want] of keys) {
        const start = { bridge: 'Control+1', operations: 'Control+2', month: 'Control+4', settings: 'Control+,' }[from as string]!
        await page.keyboard.press(start)
        await page.waitForTimeout(350)
        await page.keyboard.press(k)
        await page.waitForTimeout(450)
        const got = await whichPage(page)
        if (got !== want) bad.push(`z ${from}: ${k} -> ${got} (oczekiwano ${want})`)
      }
    }
    say('IN.2 skróty z ekranów – odchylenia', bad.length ? bad : '(brak – wszystkie 52 przejścia zgodne)')
    // in a text field
    await page.keyboard.press('Control+2')
    await page.getByTestId('operations-search').click()
    await page.getByTestId('operations-search').fill('abc')
    const bad2: string[] = []
    for (const [k, want] of keys) {
      await page.keyboard.press('Control+2')
      await page.waitForTimeout(300)
      const f = page.getByTestId('operations-search')
      await f.click()
      await f.fill('')
      await page.keyboard.press(k)
      await page.waitForTimeout(400)
      const got = await whichPage(page)
      const stray = await page.evaluate(() => [...document.querySelectorAll('input')].map((i) => i.value).filter((v) => /^\d$/.test(v)))
      if (got !== want || stray.length) bad2.push(`${k} z pola -> ${got}, znaki w polach: ${stray}`)
    }
    say('IN.2 skróty z pola tekstowego – odchylenia', bad2.length ? bad2 : '(brak)')
    // Esc / back in Settings, Sync, Inbox
    for (const [k, p] of [['Control+,', 'Ustawienia'], ['Control+Shift+Y', 'Synchronizacja'], ['Control+Shift+M', 'Meldunki']] as const) {
      await page.keyboard.press('Control+4')
      await page.waitForTimeout(400)
      await page.keyboard.press(k)
      await page.waitForTimeout(500)
      await page.locator('main').click({ position: { x: 5, y: 5 } }).catch(() => undefined)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      const viaEsc = await whichPage(page)
      await page.keyboard.press(k)
      await page.waitForTimeout(500)
      await page.evaluate(() => window.dispatchEvent(new MouseEvent('mouseup', { button: 3, bubbles: true })))
      await page.waitForTimeout(500)
      say(`IN.2 ${p}: Esc -> ${viaEsc}; przycisk „wstecz” -> ${await whichPage(page)} (poprzedni: month)`, '')
    }
  } finally {
    await app.close()
  }
})

test('IN.3 Ctrl+N', async () => {
  const N = 'in-ctrln'
  const r = await run(N)
  const { app, page } = r
  try {
    const bad: string[] = []
    for (const k of ['Control+1', 'Control+2', 'Control+3', 'Control+4', 'Control+5', 'Control+6', 'Control+7', 'Control+8', 'Control+9', 'Control+0', 'Control+,', 'Control+Shift+Y', 'Control+Shift+M']) {
      await page.keyboard.press(k)
      await page.waitForTimeout(500)
      const from = await whichPage(page)
      await page.keyboard.press('Control+n')
      await page.waitForTimeout(900)
      const got = await whichPage(page)
      const editor = await page.getByTestId('operation-editor').count()
      const date = await page.getByTestId('operation-date').inputValue().catch(() => '')
      if (got !== 'operations' || !editor) bad.push(`z ${from}: Ctrl+N -> ${got}, edytor ${editor}`)
      else if (!bad.length && k === 'Control+1') say('IN.3 data nowego wpisu', date)
    }
    say('IN.3 odchylenia z ekranów', bad.length ? bad : '(brak – 13/13)')
    // over the palette and a dialog
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(400)
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(400)
    await page.keyboard.press('Control+n')
    await page.waitForTimeout(700)
    say('IN.3 nad paletą', { ekran: await whichPage(page), paleta: await page.getByTestId('palette').count() })
    await page.keyboard.press('Escape')
    // previous month with a category filter, then add an expense
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(800)
    await page.getByTestId('operations-prev-month').click()
    await page.waitForTimeout(500)
    await page.getByTestId('operations-search').fill('Biedronka')
    await page.waitForTimeout(500)
    say('IN.3 filtr przed', { okres: await text(page, '[data-testid="operations-period"]'), wierszy: await page.getByTestId('operation-row').count(), zapisany: await page.getByTestId('operations-stored-filter').count() })
    await page.keyboard.press('Control+n')
    await page.waitForTimeout(900)
    await typed(page, 'operation-amount', '33', 'Tab')
    await page.getByTestId('operation-counterparty').fill('Test-IN3-Sklep')
    await page.getByTestId('operation-counterparty').press('Enter')
    await page.waitForTimeout(1200)
    say('IN.3 po dopisaniu', { okres: await text(page, '[data-testid="operations-period"]'), szukaj: await page.getByTestId('operations-search').inputValue(), widoczny: (await page.getByTestId('operation-row').allInnerTexts()).filter((t) => /IN3/.test(t)).length, wierszy: await page.getByTestId('operation-row').count() })
    await snap(page, 'IN.3-po-dopisaniu')
  } finally {
    await app.close()
  }
})

test('IN.4 – IN.6', async () => {
  const N = 'in-zapis'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'general')
    const f = page.getByTestId('ship-name-input')
    await f.click()
    await f.press('Control+a')
    await f.pressSequentially('Zapis-Test')
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(800)
    say('IN.4 Ctrl+S', { toasts: await toasts(page), wskaznik: await text(page, '[data-testid="save-state"]'), fi: fiOf(N).settings.shipName })
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('zapisz')
    await page.waitForTimeout(500)
    say('IN.4 paleta „zapisz”', await page.getByRole('option').allInnerTexts())
    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)
    say('IN.4 po „Zapisz teraz”', { toasts: await toasts(page), wskaznik: await text(page, '[data-testid="save-state"]') })
    await snap(page, 'IN.4')

    // IN.6 zoom
    const zoom = async () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => Math.round(w.webContents.getZoomFactor() * 100)))
    const q = await quickWin(app, page)
    await q.waitForTimeout(500)
    const seq: Array<[string, number]> = []
    await page.locator('main').click({ position: { x: 5, y: 5 } }).catch(() => undefined)
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Control+Plus')
      await page.waitForTimeout(250)
      seq.push(['Ctrl+Plus', (await zoom())[0]!])
    }
    say('IN.6 Ctrl+Plus ×7 (kolejne rozmiary okien)', { glowne: seq.map((s) => s[1]), wszystkie: await zoom() })
    const down: number[] = []
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Control+Minus')
      await page.waitForTimeout(250)
      down.push((await zoom())[0]!)
    }
    say('IN.6 Ctrl+Minus ×8', { glowne: down, wszystkie: await zoom() })
    await page.keyboard.press('Control+Equal')
    await page.waitForTimeout(250)
    say('IN.6 Ctrl+=', await zoom())
    await page.keyboard.press('Control+Shift+0')
    await page.waitForTimeout(300)
    say('IN.6 Ctrl+Shift+0', await zoom())
    await page.keyboard.press('Control+NumpadAdd')
    await page.waitForTimeout(300)
    say('IN.6 Ctrl+Num+', await zoom())
    await page.keyboard.press('Control+Shift+0')
    await page.keyboard.press('Control+0')
    await page.waitForTimeout(500)
    say('IN.6 Ctrl+0', { ekran: await whichPage(page), zoom: await zoom() })
    await goSettings(page, 'view')
    say('IN.6 suwak', await text(page, '[data-testid="settings-zoom-value"]'))
    // in the quick window
    await q.bringToFront().catch(() => undefined)
    await q.keyboard.press('Control+Plus')
    await q.waitForTimeout(300)
    say('IN.6 Ctrl+Plus w szybkim wpisie', await zoom())
  } finally {
    await app.close()
  }
})

test('IN.5 Ctrl+$', async () => {
  const N = 'in-ukryj'
  const r = await run(N)
  const { app, page } = r
  try {
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(700)
    say('IN.5 toast po ukryciu', await toasts(page))
    const leaks: string[] = []
    for (const k of ['Control+1', 'Control+2', 'Control+3', 'Control+4', 'Control+5', 'Control+6', 'Control+7', 'Control+8', 'Control+9', 'Control+0', 'Control+Shift+M', 'Control+Shift+Y', 'Control+,']) {
      await page.keyboard.press(k)
      await page.waitForTimeout(900)
      const t = await text(page, 'body')
      const m = t.match(/[−-]?\d[\d  ]*,\d{2}\s?zł/g) ?? []
      if (m.length) leaks.push(`${k}: ${m.slice(0, 5).join(' | ')} (${m.length})`)
    }
    say('IN.5 widoczne kwoty (jeśli są)', leaks.length ? leaks : '(żadnej)')
    // Settings → Konta
    await goSettings(page, 'accounts')
    const t = await text(page, 'main')
    say('IN.5 Ustawienia/Konta – kwoty', t.match(/[−-]?\d[\d  ]*,\d{2}\s?zł/g) ?? '(żadnej)')
    // palette search by amount
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('1240')
    await page.waitForTimeout(600)
    say('IN.5 paleta po kwocie', (await page.getByRole('option').allInnerTexts()).slice(0, 5))
    await page.keyboard.press('Escape')
    // history dialog (opening balance)
    await goSettings(page, 'accounts')
    await page.getByRole('button', { name: /historia/i }).first().click()
    await page.waitForTimeout(800)
    say('IN.5 Historia – kwoty', ((await text(page, '[role="dialog"]').catch(() => '')).match(/[−-]?\d[\d  ]*,\d{2}\s?zł/g)) ?? '(żadnej)')
    await page.keyboard.press('Escape')
    // amount field in edit
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(900)
    await page.getByTestId('operation-row').first().click()
    await page.waitForTimeout(600)
    const amt = page.getByTestId('operation-amount')
    say('IN.5 pole kwoty – przed fokusem', await amt.inputValue())
    await amt.click()
    say('IN.5 pole kwoty – w edycji', await amt.inputValue())
    await page.keyboard.press('Escape')
    // quick entry
    const q = await quickWin(app, page)
    await q.getByTestId('quick-amount').fill('45')
    await q.getByTestId('quick-amount').press('Tab')
    await q.waitForTimeout(500)
    say('IN.5 szybki wpis', (await text(q, 'body')).split('\n').filter((l) => /zł/.test(l)))
    await q.keyboard.press('Escape')
    // detached panel
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(600)
    await page.getByTitle('Otwórz w osobnym oknie (pełny ekran)').first().click()
    await page.waitForTimeout(2000)
    const det = app.windows().find((w) => w.url().includes('detach'))
    say('IN.5 panel odłączony', det ? (await text(det, 'body')).replace(/\n/g, ' | ').slice(0, 300) : '(brak okna)')
    say('IN.5 zapis prób powiadomień', (await recorded(app)).toasts.map((t) => t.body))
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(700)
    say('IN.5 drugi Ctrl+$', await toasts(page))
  } finally {
    await app.close()
  }
})

test('IN.7 – IN.8 paleta', async () => {
  const N = 'in-paleta'
  const r = await run(N)
  const { app, page } = r
  try {
    await page.getByTestId('open-palette').click()
    await page.waitForTimeout(500)
    say('IN.7 paleta pusta (przycisk „Komendy”)', (await page.getByRole('option').allInnerTexts()).map((s) => s.replace(/\n/g, ' ')))
    await snap(page, 'IN.7-paleta')
    await page.keyboard.press('Escape')
    const q = async (s: string) => {
      await page.keyboard.press('Control+k')
      await page.getByTestId('palette-input').fill(s)
      await page.waitForTimeout(700)
      const o = (await page.getByRole('option').allInnerTexts()).map((x) => x.replace(/\n/g, ' · '))
      const empty = await text(page, '[data-testid="palette"]').catch(() => '')
      return { q: s, wyniki: o.slice(0, 12), n: o.length, pusty: o.length ? '' : empty.slice(-80) }
    }
    for (const s of ['ladownia', 'kopia', 'zapisz', 'ukryj', 'xyz']) {
      say(`IN.7 „${s}”`, await q(s))
      await page.keyboard.press('Escape')
    }
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('ladownia')
    await page.waitForTimeout(500)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)
    say('IN.7 Enter na „ladownia”', await whichPage(page))
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    say('IN.7 po Esc – fokus', await page.evaluate(() => document.activeElement?.tagName + ' ' + (document.activeElement?.getAttribute('data-testid') ?? '')))
    // commands
    for (const s of ['Nowa operacja', 'Szybki wpis', 'Kopia zapasowa teraz', 'Otwórz folder logów', 'Sprawdź aktualizacje', 'Zapisz teraz']) {
      const res = await q(s)
      say(`IN.7 polecenie „${s}”`, res.wyniki.slice(0, 3))
      await page.keyboard.press('Escape')
    }
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('Kopia zapasowa teraz')
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)
    say('IN.7 „Kopia zapasowa teraz” wykonana', await toasts(page))
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('Otwórz folder logów')
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(800)
    say('IN.7 „Otwórz folder logów” (zapis)', (await recorded(app)).opened)
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').fill('Sprawdź aktualizacje')
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2500)
    say('IN.7 „Sprawdź aktualizacje”', { ekran: await whichPage(page), toasts: await toasts(page) })

    // IN.8
    const finds = ['pierogarnia', '1240', '12,50', 'netflix', 'wakacje', 'laptop', 'pozyczka', 'marek', 'cisza nocna', 'wynagrodzenie']
    for (const s of finds) {
      const res = await q(s)
      say(`IN.8 „${s}”`, res)
      await page.keyboard.press('Escape')
    }
    // enter on a few
    for (const s of ['netflix', 'wakacje', 'pozyczka', 'marek', 'cisza nocna', '1240']) {
      await page.keyboard.press('Control+k')
      await page.getByTestId('palette-input').fill(s)
      await page.waitForTimeout(600)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1200)
      const tab = await page.evaluate(() => document.querySelector('[data-testid^="settings-tab-"][class*="accent"]')?.getAttribute('data-testid') ?? '')
      say(`IN.8 Enter „${s}”`, { ekran: await whichPage(page), zakladka: tab, wyrozniony: await page.locator('[data-focus][class*="accent"], [data-highlight], .animate-focus').count(), rozwinieta: await page.getByTestId('operation-editor').count(), tekst: (await text(page, 'main')).slice(0, 100).replace(/\n/g, ' | ') })
      await snap(page, `IN.8-${s.replace(/\W+/g, '_')}`)
    }
  } finally {
    await app.close()
  }
})
