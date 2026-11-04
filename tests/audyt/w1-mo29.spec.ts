/**
 * W1 – MO.29 = DO.7 (W): „Wycofaj dokowanie” (CHANGELOG 1.15.2, N-PC-2) – looked for everywhere a user could look:
 * every screen (Ctrl+1…0, Meldunki), the Mostek's panel „Dokowanie” (docked rows, their window, right click), the editor
 * of the docked bank operation, the command palette (Ctrl+K „wycofaj” / „dokow”). State: plain „rok” + ICTTJ. Nothing saved.
 */
import { test } from '@playwright/test'
import { shot, start, useState } from './lab'
import { body, logger } from './w1-pomoc'

const RUN = 'w1-mo29'

test('W1 MO.29 – szukanie „Wycofaj dokowanie”', async () => {
  test.setTimeout(10 * 60_000)
  const log = logger(RUN)
  const { dataDir, ictjDir } = useState('rok', RUN)
  const { app, page } = await start(RUN, { dataDir, ictjDir })
  const count = async () => (await body(page)).match(/[^\n]*[Ww]ycofa[^\n]*/g) ?? []
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(5000)
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      await page.keyboard.press(`Control+${k}`)
      await page.waitForTimeout(1500)
      log(`ekran Ctrl+${k} – „wycofa…”`, await count())
    }
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(1500)
    const panel = page.locator('section[data-panel^="bridge:Dokowanie"]').first()
    log('panel Dokowanie', (await panel.innerText()).replace(/[ \t]+/g, ' '))
    const buttons = panel.getByRole('button')
    const n = await buttons.count()
    const labels = await buttons.allInnerTexts()
    log('przyciski panelu', labels.map((l) => l.replace(/\s+/g, ' ')))
    // every docked row: its window and a right click
    for (let i = 0; i < n; i++) {
      const lab = labels[i].replace(/\s+/g, ' ')
      if (!/zadokowan|19\.10|18\.09/i.test(lab)) continue
      await buttons.nth(i).click()
      await page.waitForTimeout(1200)
      const dlg = page.locator('[role="dialog"]').last()
      log(`okno „${lab.slice(0, 60)}”`, { przyciski: await dlg.getByRole('button').allInnerTexts(), wycofaj: (await dlg.innerText()).match(/[^\n]*[Ww]ycofa[^\n]*/g) ?? [] })
      await shot(page, `W1-MO.29-okno-${i}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      await buttons.nth(i).click({ button: 'right' })
      await page.waitForTimeout(600)
      log(`prawy klik „${lab.slice(0, 40)}”`, await count())
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
    // the command palette
    for (const q of ['wycofaj', 'dokow']) {
      await page.keyboard.press('Control+k')
      await page.waitForTimeout(700)
      await page.keyboard.type(q)
      await page.waitForTimeout(800)
      log(`Ctrl+K „${q}”`, ((await page.locator('[role="dialog"]').last().innerText().catch(() => '(brak okna)')) as string).replace(/[ \t]+/g, ' ').slice(0, 800))
      await shot(page, `W1-MO.29-paleta-${q}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
    // the docked bank operation's editor (XTB S.A. +3 000,00, 20.10)
    await page.keyboard.press('Control+2')
    await page.waitForTimeout(1000)
    await page.getByTestId('operations-period-menu').click()
    await page.getByTestId('operations-period-all').click()
    await page.getByTestId('operations-search').fill('XTB S.A.')
    await page.waitForTimeout(800)
    const rows = page.getByTestId('operation-row')
    log('wiersze XTB S.A.', (await rows.allInnerTexts()).slice(0, 8).map((r) => r.replace(/\s+/g, ' ')))
    const pick = rows.filter({ hasText: '3 000,00' }).first()
    await pick.click()
    await page.waitForTimeout(1200)
    log('edytor zadokowanej operacji', ((await page.getByTestId('operation-editor').innerText()).replace(/[ \t]+/g, ' ')).slice(0, 1500))
    log('edytor – „wycofa…” / „dokow…”', ((await page.getByTestId('operation-editor').innerText()).match(/[^\n]*([Ww]ycofa|[Dd]okow|[Oo]dep)[^\n]*/g)) ?? [])
    await shot(page, 'W1-MO.29-edytor')
    await pick.click({ button: 'right' })
    await page.waitForTimeout(600)
    log('prawy klik na operacji', await count())
    await page.keyboard.press('Escape')
  } finally {
    await app.close()
  }
})
