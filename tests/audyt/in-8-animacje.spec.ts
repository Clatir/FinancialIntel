/** IN.24 – czasy animacji przy włączonych animacjach (laboratorium ma prefers-reduced-motion). */
import { test } from '@playwright/test'
import { goSettings, run, say, snap } from './us-pomoc'

const SCAN = () => {
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)
  const trans = new Map<string, number>()
  const anim = new Map<string, number>()
  for (const el of document.querySelectorAll('body, body *')) {
    const cs = getComputedStyle(el)
    if (cs.transitionDuration !== '0s') bump(trans, `${cs.transitionDuration}`)
    if (cs.animationName !== 'none') bump(anim, `${cs.animationName} ${cs.animationDuration} ×${cs.animationIterationCount}`)
  }
  return { trans: [...trans.entries()].map(([k, v]) => `${k} ×${v}`), anim: [...anim.entries()].map(([k, v]) => `${k} ×${v}`) }
}

test('IN.24 czasy animacji', async () => {
  const r = await run('in-anim')
  const { app, page } = r
  try {
    say('IN.24 media prefers-reduced-motion w oknie', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.waitForTimeout(500)
    say('IN.24 po emulacji', await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
    const trans = new Set<string>()
    const anim = new Set<string>()
    for (const k of ['Control+1', 'Control+2', 'Control+3', 'Control+4', 'Control+5', 'Control+6', 'Control+7', 'Control+8', 'Control+9', 'Control+0', 'Control+Shift+M', 'Control+,']) {
      await page.keyboard.press(k)
      await page.waitForTimeout(100)
      const early = await page.evaluate(SCAN)
      early.anim.forEach((x) => anim.add(x))
      await page.waitForTimeout(1200)
      const s = await page.evaluate(SCAN)
      s.trans.forEach((x) => trans.add(x.replace(/ ×\d+$/, '')))
      s.anim.forEach((x) => anim.add(x))
    }
    say('IN.24 przejścia – różne czasy', [...trans].sort())
    say('IN.24 animacje – nazwa czas ×powtórzenia', [...anim].sort())
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(40)
    say('IN.24 paleta (po 40 ms)', (await page.evaluate(SCAN)).anim)
    await page.keyboard.press('Escape')
    await page.keyboard.press('F1')
    await page.waitForTimeout(40)
    say('IN.24 ściągawka (po 40 ms)', (await page.evaluate(SCAN)).anim)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+Shift+Digit4')
    await page.waitForTimeout(40)
    say('IN.24 toast (po 40 ms)', (await page.evaluate(SCAN)).anim)
    await page.keyboard.press('Control+Shift+Digit4')
    // looping check: animations running with infinite iterations
    say('IN.24 pętle (infinite) na wszystkich ekranach', await page.evaluate(() => document.getAnimations().filter((a) => (a.effect?.getComputedTiming().iterations ?? 1) === Infinity).map((a) => (a as CSSAnimation).animationName ?? a.constructor.name)))
  } finally {
    await app.close()
  }
})

test('IN.28 fokus: pole, paleta, okno modalne', async () => {
  const r = await run('in-fokus')
  const { app, page } = r
  try {
    await goSettings(page, 'general')
    const f = page.getByTestId('ship-name-input')
    const look = () => f.evaluate((e) => { const cs = getComputedStyle(e); return [cs.borderTopColor, cs.outlineStyle, cs.boxShadow, cs.backgroundColor].join(' | ') })
    const before = await look()
    await f.focus()
    say('IN.28 pole tekstowe – styl bez fokusu / z fokusem', { bez: before, z: await look() })
    await snap(page, 'IN.28-pole')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('Control+k')
    await page.getByTestId('palette-input').waitFor()
    const inside = async () => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return `${a?.tagName}:${a?.getAttribute('data-testid') ?? (a?.textContent ?? '').slice(0, 20)} wPalecie=${!!a?.closest('[data-testid="palette"],[data-testid="palette-container"]')}` })
    const seq: string[] = [await inside()]
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      seq.push(await inside())
    }
    say('IN.28 Tab przy otwartej palecie', seq)
    await page.keyboard.press('Escape')
    await goSettings(page, 'accounts')
    await page.getByRole('button', { name: /historia/i }).first().click()
    await page.waitForTimeout(500)
    const insideDlg = async () => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return `${a?.tagName}:${(a?.textContent ?? '').slice(0, 20)} wOknie=${!!a?.closest('[role="dialog"]')}` })
    const seq2: string[] = [await insideDlg()]
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      seq2.push(await insideDlg())
    }
    say('IN.28 Tab w oknie Historia', seq2)
    await snap(page, 'IN.28-okno')
  } finally {
    await app.close()
  }
})
