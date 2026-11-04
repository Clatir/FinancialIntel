// The lab works: the released app starts off screen on its own folders, renders, and nothing reaches the desktop.
import { expect, test } from '@playwright/test'
import { onScreen, recorded, shot, start, text } from './lab'

test('laboratorium: wydanie startuje poza ekranem, na własnym folderze', async () => {
  const { app, page } = await start('smoke', { usePreset: false })
  try {
    await page.waitForTimeout(3000)
    const version = await app.evaluate(({ app: a }) => a.getVersion())
    console.log('wersja', version, 'okna na ekranie', await onScreen(app))
    console.log((await text(page)).slice(0, 600))
    const file = await shot(page, 'AU1-smoke')
    console.log('zrzut', file, JSON.stringify(await recorded(app)))
    expect(version).toBe('1.15.4')
    expect(await onScreen(app)).toBe(0)
  } finally {
    await app.close()
  }
})
