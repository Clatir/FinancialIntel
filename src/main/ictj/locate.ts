/**
 * Where ICTTJ is on this computer (D72): its data folder as a suggestion (only the path, from ICTTJ's own config.json
 * in the app data – nothing else of it is used) and its program for „Otwórz ICTTJ” (the installed one found by itself,
 * the portable one chosen once).
 */
import { execFile } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { DataStore } from '../datastore/store'

/** ICTTJ's product names: its config.json lives in `%APPDATA%\<name>`, its program is `<name>.exe`. */
const PRODUCTS = ['ICT Trade Journal', 'ICT Trade Journal Beta'] as const

/** The data folder ICTTJ uses on this computer (its real one when it shows the demo), or null. */
export async function suggestIctjDir(appData: string): Promise<string | null> {
  for (const product of PRODUCTS) {
    let raw: Record<string, unknown>
    try {
      raw = JSON.parse(await fs.readFile(join(appData, product, 'config.json'), 'utf8')) as Record<string, unknown>
    } catch {
      continue
    }
    const dir = raw.sampleMode === true ? raw.lastRealDir : raw.dataDir
    if (typeof dir === 'string' && dir && (await DataStore.inspect(dir)) === 'ictj') return dir
  }
  return null
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 5000, windowsHide: true }, (err, stdout) => resolve(err ? '' : String(stdout)))
  })
}

/** The installed ICTTJ (per-user NSIS, its folder may have been changed in the installer): the default place, then the registry. */
async function installedIctj(env: NodeJS.ProcessEnv): Promise<string | null> {
  const local = env.LOCALAPPDATA
  if (local) {
    const exe = join(local, 'Programs', PRODUCTS[0], `${PRODUCTS[0]}.exe`)
    if (existsSync(exe)) return exe
  }
  const root = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
  const found = await run('reg', ['query', root, '/s', '/f', PRODUCTS[0], '/d'])
  const keys: string[] = []
  let key = ''
  for (const line of found.split(/\r?\n/)) {
    if (/^HKEY_/.test(line)) key = line.trim()
    else if (key && /DisplayName\s+REG_SZ\s+ICT Trade Journal(?! Beta)/.test(line)) keys.push(key)
  }
  for (const k of keys) {
    const out = await run('reg', ['query', k, '/v', 'InstallLocation'])
    const loc = /InstallLocation\s+REG_\w+\s+(.+)/.exec(out)?.[1]?.trim()
    const exe = loc ? join(loc, `${PRODUCTS[0]}.exe`) : null
    if (exe && existsSync(exe)) return exe
  }
  return null
}

/** The program to start: the one chosen on this computer (a portable copy), else the installed one. */
export async function findIctjExe(chosen: string | null, env: NodeJS.ProcessEnv = process.env): Promise<{ exe: string | null; source: 'chosen' | 'installed' | null }> {
  if (chosen && existsSync(chosen)) return { exe: chosen, source: 'chosen' }
  if (process.platform !== 'win32') return { exe: null, source: null }
  const exe = await installedIctj(env)
  return { exe, source: exe ? 'installed' : null }
}
