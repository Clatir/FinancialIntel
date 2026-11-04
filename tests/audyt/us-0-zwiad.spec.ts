/** US.1 / US.27 / US.28 – every tab of Ustawienia on „rok”: texts and screenshots; no changes. */
import { test } from '@playwright/test'
import { SETTINGS_IDS } from './us-ids'
import { configOf, fiOf, goSettings, pane, run, say, snap, step, text } from './us-pomoc'

test('zwiad zakładek', async () => {
  const r = await run('us-zwiad')
  const { app, page, errors } = r
  try {
    say('menu', await text(page, '[data-testid="side-menu"]'))
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(600)
    for (const id of SETTINGS_IDS) {
      await step(id, async () => {
        await goSettings(page, id)
        say(`zakładka ${id}`, await pane(page))
        await snap(page, `US.1-${id}`)
      })
    }
    say('config.json', configOf('us-zwiad'))
    say('fi.json (settings)', JSON.stringify(fiOf('us-zwiad').settings).slice(0, 3000))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    say('po Esc', (await text(page, 'main')).slice(0, 200))
    say('errors', errors)
  } finally {
    await app.close()
  }
})
