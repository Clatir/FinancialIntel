import { promises as fs } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { BACKUP_DIRS_KEPT, ConfigStore, backupDirsAfter, earlierBackupDirsOf } from '../../src/main/config'

const dirs: string[] = []
async function configDir(): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'fi-config-ap28-'))
  dirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true })
})

const until = async (check: () => Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await check()) return true
    await new Promise((r) => setTimeout(r, 25))
  }
  return false
}

describe('config.json zajęty w trakcie pracy (AP-28, US.33)', () => {
  it('nieudany zapis ponawia się sam – zmiana trafia do pliku, gdy tylko się da, bez kolejnej zmiany', async () => {
    const dir = await configDir()
    const config = new ConfigStore(dir, 0, 40)
    await config.load()
    await config.update({ importDir: 'C:/Pobrane' })
    // config.json held (here: a folder in its place – every system refuses the rename onto it).
    await fs.rm(join(dir, 'config.json'))
    await fs.mkdir(join(dir, 'config.json'))
    await fs.writeFile(join(dir, 'config.json', 'blokada'), 'x')
    await expect(config.update({ prefs: { ...config.get().prefs, zoom: 1.2 } })).rejects.toThrow()
    // Works at once in memory; let go – written by itself.
    expect(config.get().prefs.zoom).toBe(1.2)
    await fs.rm(join(dir, 'config.json'), { recursive: true, force: true })
    const written = await until(async () => {
      const text = await fs.readFile(join(dir, 'config.json'), 'utf8').catch(() => '')
      return text.length > 0 && (JSON.parse(text) as { prefs?: { zoom?: number } }).prefs?.zoom === 1.2
    })
    expect(written).toBe(true)
    expect((await new ConfigStore(dir).load()).importDir).toBe('C:/Pobrane')
  })
})

describe('folder kopii zmieniony (AP-28, DA.14, T434)', () => {
  const same = (a: string, b: string) => resolve(a).toLowerCase() === resolve(b).toLowerCase()
  const DATA = 'C:/OneDrive/FinancialIntel'
  const OTHER = 'D:/Drugi/FinancialIntel'

  it('poprzedni folder kopii na początku listy; powrót do niego zdejmuje go z listy; inne foldery danych bez zmian', () => {
    let list = backupDirsAfter([], DATA, `${DATA}/backups`, 'E:/Kopie/FinancialIntel-1', same)
    expect(list).toEqual([{ dataDir: DATA, dir: `${DATA}/backups` }])
    list = backupDirsAfter([...list, { dataDir: OTHER, dir: `${OTHER}/backups` }], DATA, 'E:/Kopie/FinancialIntel-1', 'F:/Kopie/FinancialIntel-1', same)
    expect(list.map((e) => e.dir)).toEqual(['E:/Kopie/FinancialIntel-1', `${DATA}/backups`, `${OTHER}/backups`])
    // Back to the folder of the data: it is the current one, not an earlier one (the case of the path does not matter).
    list = backupDirsAfter(list, DATA.toLowerCase(), 'F:/Kopie/FinancialIntel-1', `${DATA}/BACKUPS`, same)
    expect(list.map((e) => e.dir)).toEqual(['F:/Kopie/FinancialIntel-1', 'E:/Kopie/FinancialIntel-1', `${OTHER}/backups`])
    // The same folder chosen again: nothing new.
    expect(backupDirsAfter(list, DATA, `${DATA}/backups`, `${DATA}/backups/`, same)).toEqual(list)
  })

  it('wcześniejsze foldery tego folderu danych, bez bieżącego i bez powtórzeń; lista ma granicę', () => {
    const list = [
      { dataDir: DATA, dir: 'E:/Kopie' },
      { dataDir: OTHER, dir: 'X:/Obce' },
      { dataDir: DATA, dir: `${DATA}/backups` },
      { dataDir: DATA, dir: 'e:/kopie' }
    ]
    expect(earlierBackupDirsOf(list, DATA, `${DATA}/backups`, same)).toEqual(['E:/Kopie'])
    let long: ReturnType<typeof backupDirsAfter> = []
    for (let i = 0; i < BACKUP_DIRS_KEPT + 3; i++) long = backupDirsAfter(long, DATA, `K:/${i}`, `K:/${i + 1}`, same)
    expect(long).toHaveLength(BACKUP_DIRS_KEPT)
    expect(long[0]!.dir).toBe(`K:/${BACKUP_DIRS_KEPT + 2}`)
  })
})
