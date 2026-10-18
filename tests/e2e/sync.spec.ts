import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { recordRelPath } from '../../src/shared/paths'
import { launch } from './app'
import { records } from './files'

/** What the main process has on disk now (the watcher's rescan without waiting for it). */
const rescan = () => (globalThis as unknown as { fi: { rescan(): Promise<void> } }).fi.rescan()

test('zmiana fi.json z drugiego komputera, kopia konfliktu OneDrive i plik z błędem', async () => {
  const { page, app, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    const file = join(dataDir, 'fi.json')
    const fi = JSON.parse(await fs.readFile(file, 'utf8'))

    // Another computer renamed the ship (OneDrive wrote the file): taken without asking (nothing edited here).
    const theirs = { ...fi, updatedAt: new Date(Date.now() + 1000).toISOString(), updatedBy: 'LAPTOP', settings: { ...fi.settings, shipName: 'Orzeł' } }
    await fs.writeFile(file, `${JSON.stringify(theirs, null, 2)}\n`)
    await page.evaluate(rescan)
    await expect(page.getByTestId('menu-ship-name')).toHaveText('okręt Orzeł')

    // A copy made by OneDrive next to it: a conflict to resolve.
    const copy = { ...theirs, updatedAt: new Date(Date.now() + 2000).toISOString(), updatedBy: 'PC2', settings: { ...theirs.settings, shipName: 'Jastrząb' } }
    await fs.writeFile(join(dataDir, 'fi-PC2.json'), `${JSON.stringify(copy, null, 2)}\n`)
    // A half-synced record: a problem, never overwritten.
    await fs.mkdir(join(dataDir, 'transactions', '2026'), { recursive: true })
    await fs.writeFile(join(dataDir, 'transactions', '2026', '2026-10-16_01JB0000000000000000000000.json'), '{ "id": ')
    await page.evaluate(rescan)
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

test('pole w trakcie pisania a zmiana tego wpisu na drugim komputerze (1.4.3): wpisany tekst zostaje, okno to mówi', async () => {
  const { page, app, dataDir, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+n')
    await page.getByTestId('operation-amount').fill('12,50')
    await page.getByTestId('operation-amount').press('Enter')
    await expect.poll(async () => (await records(dataDir, 'transactions')).length).toBe(1)
    const [op] = await records(dataDir, 'transactions')
    // Typing here, not left yet; meanwhile another computer names the same operation (OneDrive brings it).
    await page.getByTestId('operation-counterparty').click()
    await page.getByTestId('operation-counterparty').fill('Mój sklep')
    const file = join(dataDir, ...recordRelPath('transactions', op as never).split('/'))
    await fs.writeFile(file, `${JSON.stringify({ ...op, counterparty: 'Sklep z laptopa', updatedAt: new Date(Date.now() + 1000).toISOString(), updatedBy: 'LAPTOP' }, null, 2)}\n`)
    await page.evaluate(rescan)
    await expect(page.getByTestId('operation-row')).toContainText('Sklep z laptopa')
    await page.getByTestId('operation-counterparty').press('Enter')
    await expect(page.getByRole('status').filter({ hasText: 'zmienił się w międzyczasie na innym komputerze' })).toBeVisible()
    await expect.poll(async () => (await records(dataDir, 'transactions'))[0]?.counterparty).toBe('Mój sklep')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
