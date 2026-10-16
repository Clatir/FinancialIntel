import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { launch } from './app'

test('zmiana fi.json z drugiego komputera, kopia konfliktu OneDrive i plik z błędem', async () => {
  const { page, app, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const file = join(dataDir, 'fi.json')
    const fi = JSON.parse(await fs.readFile(file, 'utf8'))

    // Another computer renamed the ship (OneDrive wrote the file): taken without asking (nothing edited here).
    const theirs = { ...fi, updatedAt: new Date(Date.now() + 1000).toISOString(), updatedBy: 'LAPTOP', settings: { ...fi.settings, shipName: 'Orzeł' } }
    await fs.writeFile(file, `${JSON.stringify(theirs, null, 2)}\n`)
    await page.evaluate(() => window.fi.rescan())
    await expect(page.getByTestId('menu-ship-name')).toHaveText('okręt Orzeł')

    // A copy made by OneDrive next to it: a conflict to resolve.
    const copy = { ...theirs, updatedAt: new Date(Date.now() + 2000).toISOString(), updatedBy: 'PC2', settings: { ...theirs.settings, shipName: 'Jastrząb' } }
    await fs.writeFile(join(dataDir, 'fi-PC2.json'), `${JSON.stringify(copy, null, 2)}\n`)
    // A half-synced record: a problem, never overwritten.
    await fs.mkdir(join(dataDir, 'transactions', '2026'), { recursive: true })
    await fs.writeFile(join(dataDir, 'transactions', '2026', '2026-10-16_01JB0000000000000000000000.json'), '{ "id": ')
    await page.evaluate(() => window.fi.rescan())
    await expect(page.getByTestId('banner-sync')).toBeVisible()
    await expect(page.getByTestId('nav-sync')).toContainText('2')

    await page.getByTestId('nav-sync').click()
    await expect(page.getByTestId('problem-row')).toHaveCount(1)
    await expect(page.getByTestId('newer-copy')).toBeVisible()
    await page.getByTestId('keep-copy').click()
    await expect(page.getByTestId('menu-ship-name')).toHaveText('okręt Jastrząb')
    await expect.poll(async () => (await fs.readdir(dataDir)).filter((n) => n.startsWith('fi')).sort()).toEqual(['fi.json'])
    expect(JSON.parse(await fs.readFile(file, 'utf8')).settings.shipName).toBe('Jastrząb')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
