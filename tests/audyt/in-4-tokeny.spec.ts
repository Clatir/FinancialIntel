/** IN.22 – IN.25, IN.27, IN.28: tokeny wobec ICTTJ, akcenty, cienie i gradienty, animacje, wskaźnik zapisu, klawiatura. */
import { readFileSync } from 'node:fs'
import { test, type Page } from '@playwright/test'
import { goSettings, run, say, snap, text } from './us-pomoc'

const ICTJ_CSS = 'C:\\CC-Projekty\\TradingJournal\\src\\renderer\\styles\\index.css'

const NAVS = [['Control+1', 'Mostek'], ['Control+2', 'Operacje'], ['Control+3', 'Import'], ['Control+4', 'Plan'], ['Control+5', 'Ładownia'], ['Control+6', 'Mapa'], ['Control+7', 'Radar'], ['Control+8', 'Dowództwo'], ['Control+9', 'Wywiad'], ['Control+0', 'Raporty'], ['Control+Shift+M', 'Meldunki'], ['Control+Shift+Y', 'Synchronizacja'], ['Control+,', 'Ustawienia']] as const

test('IN.22 tokeny wobec ICTTJ', async () => {
  const r = await run('in-tokeny')
  const { app, page } = r
  try {
    const css = readFileSync(ICTJ_CSS, 'utf8')
    const ictj: Record<string, string> = {}
    for (const m of css.matchAll(/--color-([a-z-]+):\s*([^;]+);/g)) ictj[m[1]!] = m[2]!.trim()
    const fi = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement)
      const out: Record<string, string> = {}
      for (const n of ['bg', 'panel', 'raised', 'hover', 'line', 'line-strong', 'fg', 'fg-strong', 'muted', 'dim', 'accent', 'accent-soft', 'up', 'down', 'warn']) out[n] = cs.getPropertyValue('--color-' + n).trim()
      out['font-sans'] = cs.getPropertyValue('--font-sans').trim()
      out['font-mono'] = cs.getPropertyValue('--font-mono').trim()
      return out
    })
    const diff: string[] = []
    for (const [k, v] of Object.entries(fi)) {
      const ref = k.startsWith('font') ? css.match(new RegExp(`--${k}:\\s*([^;]+);`))?.[1]?.trim() : ictj[k]
      if (ref?.toLowerCase() !== v.toLowerCase()) diff.push(`${k}: FI=${v} ICTTJ=${ref}`)
    }
    say('IN.22 tokeny FI', fi)
    say('IN.22 różnice wobec ICTTJ', diff.length ? diff : '(brak – wszystkie tokeny identyczne)')
    const calc = await page.evaluate(() => {
      const rgb = (el: Element, p: string) => getComputedStyle(el).getPropertyValue(p)
      const body = document.body
      const panel = document.querySelector('[data-testid="state-shields"]')?.closest('section, div[class*="bg-panel"]') ?? document.querySelector('.bg-panel')
      const num = document.querySelector('.num')
      const line = document.querySelector('[class*="border-line"]')
      return {
        body: [rgb(body, 'background-color'), rgb(body, 'color'), rgb(body, 'font-family'), rgb(body, 'font-size')],
        panel: panel ? [rgb(panel, 'background-color'), rgb(panel, 'border-top-width'), rgb(panel, 'border-top-color')] : null,
        num: num ? [rgb(num, 'font-family'), rgb(num, 'font-variant-numeric'), rgb(num, 'font-feature-settings')] : null,
        line: line ? [rgb(line, 'border-top-width'), rgb(line, 'border-top-color'), rgb(line, 'border-bottom-width')] : null
      }
    })
    say('IN.22 style obliczone', calc)
    say('IN.22 JetBrains Mono załadowany?', await page.evaluate(async () => (await document.fonts.ready, [...document.fonts].map((f) => `${f.family}:${f.status}`))))
    await snap(page, 'IN.22-mostek')
  } finally {
    await app.close()
  }
})

const SCAN = () => {
  const UP = 'rgb(46, 189, 133)'
  const DOWN = 'rgb(246, 70, 93)'
  const res = { up: new Map<string, number>(), down: new Map<string, number>(), shadow: new Map<string, number>(), grad: new Map<string, number>(), anim: new Map<string, number>(), trans: new Map<string, number>() }
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)
  for (const el of document.querySelectorAll('body, body *')) {
    const cs = getComputedStyle(el)
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).join(' ').trim()
    if (own) {
      if (cs.color === UP) bump(res.up, own.slice(0, 50))
      if (cs.color === DOWN) bump(res.down, own.slice(0, 50))
    }
    if (cs.backgroundColor === UP && el.clientWidth) bump(res.up, `[tło ${el.tagName}.${(el.className + '').slice(0, 40)}] ${own.slice(0, 20)}`)
    if (cs.backgroundColor === DOWN && el.clientWidth) bump(res.down, `[tło ${el.tagName}.${(el.className + '').slice(0, 40)}] ${own.slice(0, 20)}`)
    if (cs.boxShadow !== 'none' && el.clientWidth) bump(res.shadow, `${el.tagName}.${(el.className + '').slice(0, 50)} ${cs.boxShadow.slice(0, 50)}`)
    if (/gradient/.test(cs.backgroundImage) && el.clientWidth) bump(res.grad, `${el.tagName}.${(el.className + '').slice(0, 50)} ${cs.backgroundImage.slice(0, 60)}`)
    if (cs.animationName !== 'none') bump(res.anim, `${cs.animationName} ${cs.animationDuration} x${cs.animationIterationCount} ${(el.className + '').slice(0, 30)}`)
    if (cs.transitionDuration !== '0s') bump(res.trans, `${cs.transitionProperty.slice(0, 30)} ${cs.transitionDuration}`)
  }
  const o = (m: Map<string, number>) => [...m.entries()].map(([k, v]) => `${k} ×${v}`)
  return { up: o(res.up), down: o(res.down), shadow: o(res.shadow), grad: o(res.grad), anim: o(res.anim), trans: o(res.trans) }
}

test('IN.23 / IN.24 akcenty, cienie, animacje', async () => {
  const r = await run('in-akcenty')
  const { app, page } = r
  try {
    const trans = new Set<string>()
    const anim = new Set<string>()
    for (const [k, n] of NAVS) {
      await page.keyboard.press(k)
      await page.waitForTimeout(1500)
      const s = await page.evaluate(SCAN)
      say(`IN.23 ${n}`, { zielen: s.up.slice(0, 40), czerwien: s.down.slice(0, 40), cienie: s.shadow.slice(0, 10), gradienty: s.grad.slice(0, 10) })
      s.trans.forEach((x) => trans.add(x))
      s.anim.forEach((x) => anim.add(x))
      await snap(page, `IN.23-${n}`)
    }
    say('IN.24 przejścia (transition) – wszystkie ekrany', [...trans].sort())
    say('IN.24 animacje (animation) – wszystkie ekrany', [...anim].sort())
    // dialogs / palette / toast animation
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(600)
    const s2 = await page.evaluate(SCAN)
    say('IN.24 paleta', { trans: s2.trans, anim: s2.anim, cienie: s2.shadow, grad: s2.grad })
    await page.keyboard.press('Escape')
    await page.keyboard.press('F1')
    await page.waitForTimeout(600)
    const s3 = await page.evaluate(SCAN)
    say('IN.24 ściągawka', { trans: s3.trans, anim: s3.anim, cienie: s3.shadow })
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(300)
    const s4 = await page.evaluate(SCAN)
    say('IN.24 toast', { anim: s4.anim, cienie: s4.shadow })
    await page.keyboard.press('Control+Shift+Digit4')
    // looping animation names in the stylesheet
    say('IN.24 @keyframes w stylach', await page.evaluate(() => [...document.styleSheets].flatMap((ss) => { try { return [...ss.cssRules].filter((r) => r.constructor.name === 'CSSKeyframesRule').map((r) => (r as CSSKeyframesRule).name) } catch { return [] } })))
  } finally {
    await app.close()
  }
})

test('IN.27 – IN.28 wskaźnik zapisu i klawiatura', async () => {
  const N = 'in-klawiatura'
  const r = await run(N)
  const { app, page } = r
  try {
    await goSettings(page, 'general')
    say('IN.27 wskaźnik początkowy', await text(page, '[data-testid="save-state"]'))
    const f = page.getByTestId('ship-name-input')
    await f.click()
    await f.press('Control+a')
    await f.pressSequentially('Wskaznik')
    await f.press('Enter')
    const seen: string[] = []
    for (let i = 0; i < 12; i++) {
      seen.push(await text(page, '[data-testid="save-state"]').catch(() => '?'))
      await page.waitForTimeout(150)
    }
    say('IN.27 po edycji (kolejne odczyty co 150 ms)', [...new Set(seen)])
    // keyboard: Tab through Settings
    const walk = async (label: string, n: number, root?: string) => {
      const seq: string[] = []
      for (let i = 0; i < n; i++) {
        await page.keyboard.press('Tab')
        const d = await page.evaluate(() => {
          const e = document.activeElement as HTMLElement | null
          if (!e || e === document.body) return 'BODY'
          const cs = getComputedStyle(e)
          const vis = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? 'outline' : cs.boxShadow !== 'none' ? 'shadow' : /accent/.test(e.className) ? 'klasa-accent' : 'brak-widocznego'
          return `${e.tagName.toLowerCase()}[${(e.getAttribute('data-testid') ?? e.getAttribute('aria-label') ?? (e.textContent ?? '').trim()).slice(0, 28)}] ${vis}`
        })
        seq.push(d)
      }
      say(label, seq)
    }
    await page.locator('body').click({ position: { x: 600, y: 10 } }).catch(() => undefined)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await walk('IN.28 Tab po Ustawieniach (30)', 30)
    await goSettings(page, 'notify')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    const tg = page.getByTestId('sounds-enabled')
    await tg.focus()
    const was = await tg.isChecked().catch(() => null)
    await page.keyboard.press('Space')
    await page.waitForTimeout(400)
    say('IN.28 Spacja na przełączniku', { przed: was, po: await tg.isChecked().catch(() => null) })
    await page.keyboard.press('Space')
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(400)
    await walk('IN.28 Tab w palecie (6)', 6)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await walk('IN.28 Tab na Mostku (25)', 25)
    await snap(page, 'IN.28-fokus')
    // the side menu reachable by Tab?
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    const menuTab = await page.evaluate(() => [...document.querySelectorAll('[data-testid="side-menu"] button')].map((b) => (b as HTMLElement).tabIndex))
    say('IN.28 tabindex pozycji menu', menuTab)
  } finally {
    await app.close()
  }
})
