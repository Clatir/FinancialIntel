// adapted from ICTTJ tests/fs/config.test.ts @ 84a8339
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { ConfigStore, publicConfig } from '../../src/main/config'

const dirs: string[] = []
async function configDir(): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'fi-config-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
})

describe('config.json tego komputera', () => {
  it('domyślnie: bez folderu, zasobnik przy zamknięciu, bez startu z Windows, aktualizacje automatycznie', async () => {
    const config = new ConfigStore(join(await configDir(), 'nowy'))
    const c = await config.load()
    expect(c).toMatchObject({
      dataDir: null,
      recentDirs: [],
      backupDirOverride: null,
      window: null,
      tray: { closeToTray: true, launchAtLogin: false, notified: false },
      updates: { prefs: { autoCheck: true, autoDownload: true }, pending: null, lastRunVersion: null, token: null, tokenEncrypted: false }
    })
    // The first write creates the userData folder.
    await config.update({ backupDirOverride: 'D:/Kopie' })
    expect(JSON.parse(await fs.readFile(config.file, 'utf8')).backupDirOverride).toBe('D:/Kopie')
  })

  it('getConfig bez tokenu GitHub – także gdy zapisany jawnym tekstem (bez safeStorage)', async () => {
    const dir = await configDir()
    const config = new ConfigStore(dir)
    await config.load()
    await config.update({ recentDirs: ['C:/FinancialIntel'] })
    await config.updateUpdates({ token: 'github_pat_plain_token_5678', tokenEncrypted: false })
    const out = publicConfig(config.get())
    expect(out.updates.token).toBeNull()
    expect(out.recentDirs).toEqual(['C:/FinancialIntel'])
    expect(JSON.stringify(out)).not.toContain('github_pat_plain')
    // The stored config keeps the token.
    expect(config.get().updates.token).toBe('github_pat_plain_token_5678')
    // Read back from disk: the token and its flag stay; a config without them gets none.
    const again = new ConfigStore(dir)
    expect((await again.load()).updates).toMatchObject({ token: 'github_pat_plain_token_5678', tokenEncrypted: false })
    await fs.writeFile(join(dir, 'config.json'), JSON.stringify({ updates: { lastRunVersion: '0.1.0' } }))
    expect((await new ConfigStore(dir).load()).updates).toMatchObject({ token: null, tokenEncrypted: false, lastRunVersion: '0.1.0' })
  })

  it('wartości złego typu i uszkodzony plik → wartości domyślne', async () => {
    const dir = await configDir()
    await fs.writeFile(
      join(dir, 'config.json'),
      JSON.stringify({
        dataDir: 'D:/OneDrive/FinancialIntel',
        recentDirs: ['a', 7, 'b', null, 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
        tray: { closeToTray: 'tak', launchAtLogin: true },
        updates: { prefs: { autoCheck: false, autoDownload: 'nie' }, pending: { version: '0.2.0' }, token: '' }
      })
    )
    const c = await new ConfigStore(dir).load()
    expect(c.dataDir).toBe('D:/OneDrive/FinancialIntel')
    expect(c.recentDirs).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(c.tray).toEqual({ closeToTray: true, launchAtLogin: true, notified: false })
    expect(c.updates).toMatchObject({ prefs: { autoCheck: false, autoDownload: true }, pending: null, token: null })

    await fs.writeFile(join(dir, 'config.json'), '{ "dataDir": ')
    const broken = await new ConfigStore(dir).load()
    expect(broken.dataDir).toBeNull()
    expect(broken.tray.closeToTray).toBe(true)
  })

  it('pobrana aktualizacja czeka w pending; ostatnie foldery: nowy na początku, bez powtórzeń, najwyżej 8', async () => {
    const dir = await configDir()
    const config = new ConfigStore(dir)
    await config.load()
    const pending = { version: '0.2.0', file: 'C:/x.exe', sha256: 'ab', mode: 'portable' as const, notes: 'Nowości' }
    await config.updateUpdates({ pending })
    for (let i = 0; i < 10; i++) await config.rememberDir(`D:/dane${i}`)
    await config.rememberDir('D:/dane5')
    const back = await new ConfigStore(dir).load()
    expect(back.updates.pending).toMatchObject(pending)
    expect(back.dataDir).toBe('D:/dane5')
    expect(back.recentDirs).toEqual(['D:/dane5', 'D:/dane9', 'D:/dane8', 'D:/dane7', 'D:/dane6', 'D:/dane4', 'D:/dane3', 'D:/dane2'])
  })

  it('szybkie zapisy po sobie: na dysku zawsze najnowszy stan', async () => {
    const dir = await configDir()
    const config = new ConfigStore(dir)
    await config.load()
    await Promise.all([
      config.update({ tray: { closeToTray: false, launchAtLogin: false, notified: false } }),
      config.update({ window: { width: 1200, height: 800, maximized: false } }),
      config.update({ tray: { closeToTray: false, launchAtLogin: false, notified: true } })
    ])
    const back = await new ConfigStore(dir).load()
    expect(back.tray).toEqual({ closeToTray: false, launchAtLogin: false, notified: true })
    expect(back.window).toEqual({ width: 1200, height: 800, maximized: false })
  })
})
