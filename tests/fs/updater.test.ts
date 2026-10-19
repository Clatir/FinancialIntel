// adapted from ICTTJ tests/fs/updater.test.ts @ 84a8339
import { createHash, randomBytes } from 'node:crypto'
import { mkdtempSync, promises as fs } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHECKSUMS_ASSET, DEFAULT_UPDATE_PREFS, PORTABLE_ASSET, type PendingUpdate, type UpdatePrefs, type UpdateState } from '@shared/update'
import { NO_RELEASES_VISIBLE, TOKEN_INVALID, TOKEN_NO_ACCESS, Updater, type UpdaterDeps } from '../../src/main/update/updater'
import { downloadVerified } from '../../src/main/update/download'
import type { PortableSwapParams, RestartWatchParams } from '../../src/main/update/apply'

// Own small helpers: tests/fs/helpers.ts belongs to the data-folder tests.
const tempDir = (prefix: string): string => mkdtempSync(join(tmpdir(), prefix))
async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/** A release whose installer has the version in its name: still picked for an installed copy. */
const SETUP_ASSET = 'Financial-Intel-Setup-1.2.0.exe'
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')

type Serve = 'ok' | 'corrupt' | 'cut' | 'stall'
interface SiteFile {
  body: Buffer
  serve?: Serve
  /** Publish the GitHub "digest" for this asset. */
  digest?: boolean
}
interface Site {
  status: number
  version: string
  notes: string
  files: Record<string, SiteFile>
  /** Include SHA256SUMS.txt (hashes of the real bodies). */
  sums: boolean
  /** A private repository: the API answers only with this token (none = 404, another = 401). */
  token?: string
}

/** Local stand-in for the GitHub API and release downloads. */
async function releaseServer(site: Site) {
  const hits = new Map<string, number>()
  const agents = new Set<string>()
  // GitHub's file storage (another host): the API's asset URL redirects here; it refuses an Authorization header.
  const storageAuth: Array<string | null> = []
  const storage = createServer((req, res) => {
    storageAuth.push(req.headers.authorization ?? null)
    if (req.headers.authorization) {
      res.writeHead(400).end('only one auth mechanism allowed')
      return
    }
    const name = decodeURIComponent((req.url ?? '/').replace(/^\/file\//, ''))
    if (name === CHECKSUMS_ASSET) {
      res.end(Object.entries(site.files).map(([n, f]) => `${sha(f.body)}  ${n}\n`).join(''))
      return
    }
    const f = site.files[name]
    if (!f) return void res.writeHead(404).end()
    res.writeHead(200, { 'Content-Length': String(f.body.length), 'Content-Type': 'application/octet-stream' }).end(f.body)
  })
  await new Promise<void>((r) => storage.listen(0, 'localhost', r))
  const storageBase = `http://localhost:${(storage.address() as AddressInfo).port}`
  const names = () => [...Object.keys(site.files), ...(site.sums ? [CHECKSUMS_ASSET] : [])]
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/'
    hits.set(url, (hits.get(url) ?? 0) + 1)
    agents.add(req.headers['user-agent'] ?? '')
    if (site.token && url.startsWith('/repos/')) {
      const auth = req.headers.authorization
      if (!auth) return void res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"message":"Not Found"}')
      if (auth !== `Bearer ${site.token}`) return void res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"message":"Bad credentials"}')
    }
    const assetId = /^\/repos\/Clatir\/FinancialIntel\/releases\/assets\/(\d+)$/.exec(url)
    if (assetId) {
      if (req.headers.accept !== 'application/octet-stream') return void res.writeHead(415).end()
      const name = names()[Number(assetId[1])]
      if (!name) return void res.writeHead(404).end()
      res.writeHead(302, { Location: `${storageBase}/file/${encodeURIComponent(name)}` }).end()
      return
    }
    if (url === '/repos/Clatir/FinancialIntel/releases/latest') {
      if (site.status !== 200) {
        res.writeHead(site.status, { 'Content-Type': 'application/json' }).end('{"message":"x"}')
        return
      }
      const assets = Object.entries(site.files).map(([name, f], i) => ({
        name,
        size: f.body.length,
        browser_download_url: `${base}/download/${name}`,
        url: `${base}/repos/Clatir/FinancialIntel/releases/assets/${i}`,
        digest: f.digest ? `sha256:${sha(f.body)}` : null
      }))
      if (site.sums)
        assets.push({
          name: CHECKSUMS_ASSET,
          size: 1,
          browser_download_url: `${base}/download/${CHECKSUMS_ASSET}`,
          url: `${base}/repos/Clatir/FinancialIntel/releases/assets/${assets.length}`,
          digest: null
        })
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({
          tag_name: `v${site.version}`,
          name: `Financial Intel ${site.version}`,
          body: site.notes,
          published_at: '2026-10-01T10:00:00Z',
          html_url: `https://github.com/Clatir/FinancialIntel/releases/tag/v${site.version}`,
          assets
        })
      )
      return
    }
    const name = decodeURIComponent(url.replace(/^\/download\//, ''))
    // Browser downloads of a private repository need a signed-in browser: not for the app.
    if (site.token && url.startsWith('/download/')) return void res.writeHead(404).end()
    if (name === CHECKSUMS_ASSET && site.sums) {
      res.end(Object.entries(site.files).map(([n, f]) => `${sha(f.body)}  ${n}\n`).join(''))
      return
    }
    const f = site.files[name]
    if (!f) {
      res.writeHead(404).end()
      return
    }
    const half = f.body.subarray(0, Math.floor(f.body.length / 2))
    res.writeHead(200, { 'Content-Length': String(f.body.length), 'Content-Type': 'application/octet-stream' })
    switch (f.serve ?? 'ok') {
      case 'ok':
        res.end(f.body)
        break
      case 'corrupt': {
        const copy = Buffer.from(f.body)
        copy[copy.length - 1] = (copy[copy.length - 1]! + 1) % 256
        res.end(copy)
        break
      }
      case 'cut':
        res.write(half, () => setTimeout(() => res.socket?.destroy(), 20))
        break
      case 'stall':
        res.write(half) // and never finish
        break
    }
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const close = async () => {
    for (const s of [server, storage]) {
      s.closeAllConnections()
      await new Promise<void>((r) => s.close(() => r()))
    }
  }
  return { base, hits, agents, close, storageAuth, count: (name: string) => hits.get(`/download/${name}`) ?? 0 }
}

const cleanups: Array<() => Promise<void>> = []
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!()
})

async function setup(opts: { site?: Partial<Site>; deps?: Partial<UpdaterDeps>; cfg?: { prefs?: UpdatePrefs; pending?: PendingUpdate | null; lastRun?: string | null } } = {}) {
  const portableBody = randomBytes(300_000)
  const setupBody = randomBytes(200_000)
  const site: Site = {
    status: 200,
    version: '1.2.0',
    notes: '## Nowe\n- aktualizacje z GitHuba',
    files: { [PORTABLE_ASSET]: { body: portableBody, digest: true }, [SETUP_ASSET]: { body: setupBody } },
    sums: true,
    ...opts.site
  }
  const server = await releaseServer(site)
  cleanups.push(server.close)
  const dir = tempDir('fi-update-')
  const cfg = { prefs: { ...DEFAULT_UPDATE_PREFS }, pending: null as PendingUpdate | null, lastRun: '1.1.0' as string | null, ...opts.cfg }
  const states: UpdateState[] = []
  const applied: Array<{ kind: 'portable'; p: PortableSwapParams } | { kind: 'installer'; file: string; restart: boolean; watch?: RestartWatchParams }> = []
  const portableFile = join(dir, 'Programy', PORTABLE_ASSET)
  await fs.mkdir(join(dir, 'Programy'), { recursive: true })
  await fs.writeFile(portableFile, 'stara wersja')
  const deps: UpdaterDeps = {
    currentVersion: '1.1.0',
    mode: 'portable',
    modeNote: null,
    portableFile,
    userDataDir: join(dir, 'userData'),
    fetch: (url, init) => fetch(url, init),
    apiBase: server.base,
    allowInsecure: true,
    prefs: () => cfg.prefs,
    savePrefs: async (p) => {
      cfg.prefs = p
    },
    pending: () => cfg.pending,
    savePending: async (p) => {
      cfg.pending = p
    },
    lastRunVersion: () => cfg.lastRun,
    saveLastRunVersion: async (v) => {
      cfg.lastRun = v
    },
    applyPortable: (p) => applied.push({ kind: 'portable', p }),
    applyInstaller: (file, restart, watch) => applied.push({ kind: 'installer', file, restart, watch }),
    waitPids: [111, 222],
    appProcess: 'Financial Intel',
    log: () => undefined,
    onState: (s) => states.push(s),
    ...opts.deps
  }
  const updater = new Updater(deps)
  cleanups.push(async () => updater.stopAuto())
  return { updater, server, site, cfg, states, applied, dir, deps, portableFile, portableBody, setupBody }
}

/** check() starts the background download; download() waits for the one in progress. */
async function checkAndWait(u: Updater): Promise<UpdateState> {
  await u.check(true)
  return u.download()
}

describe('aktualizacje: wersja portable', () => {
  it('nowsza wersja jest pobierana obok exe, sprawdzana i podmieniana przy zamknięciu', async () => {
    const t = await setup()
    await t.updater.init()
    const s = await checkAndWait(t.updater)
    expect(s).toMatchObject({ phase: 'ready', error: null, release: { version: '1.2.0', notes: '## Nowe\n- aktualizacje z GitHuba' } })
    const staged = `${t.portableFile}.update`
    expect(sha(await fs.readFile(staged))).toBe(sha(t.portableBody))
    expect(await exists(`${staged}.part`)).toBe(false)
    expect(await fs.readFile(t.portableFile, 'utf8')).toBe('stara wersja') // swapped only after the app exits
    expect(t.cfg.pending).toEqual({ version: '1.2.0', notes: '## Nowe\n- aktualizacje z GitHuba', file: staged, sha256: sha(t.portableBody), mode: 'portable' })
    expect(t.states.some((x) => x.phase === 'downloading' && (x.progress?.received ?? 0) > 0)).toBe(true)
    expect(t.server.count(SETUP_ASSET)).toBe(0)
    // The API is asked as this app (GitHub requires a User-Agent).
    expect(t.server.agents.has('Financial-Intel/1.1.0')).toBe(true)

    expect(t.updater.applyOnQuit()).toBe(true)
    expect(t.applied).toEqual([
      {
        kind: 'portable',
        p: {
          target: t.portableFile,
          staged,
          waitPids: [111, 222],
          restart: false,
          logFile: join(t.deps.userDataDir, 'logs', 'update.log'),
          version: '1.2.0',
          appProcess: 'Financial Intel'
        }
      }
    ])
    t.updater.requestRestart()
    t.updater.applyOnQuit()
    t.updater.cancelRestart()
    t.updater.applyOnQuit()
    expect(t.applied.map((a) => a.kind === 'portable' && a.p.restart)).toEqual([false, true, false])
    // Windows shutting down: nothing is started, the update stays pending for the next close.
    t.updater.postponeInstall()
    expect(t.updater.applyOnQuit()).toBe(false)
    expect(t.applied).toHaveLength(3)
    expect(t.cfg.pending?.version).toBe('1.2.0')
  })

  it('plik już pobrany (poprzednia sesja) nie jest pobierany ponownie', async () => {
    const t = await setup()
    await fs.writeFile(`${t.portableFile}.update`, t.portableBody)
    const s = await checkAndWait(t.updater)
    expect(s.phase).toBe('ready')
    expect(t.server.count(PORTABLE_ASSET)).toBe(0)
  })

  it('zła suma kontrolna: plik odrzucony, nic nie zostaje na dysku', async () => {
    const t = await setup()
    t.site.files[PORTABLE_ASSET]!.serve = 'corrupt'
    const s = await checkAndWait(t.updater)
    expect(s.phase).toBe('error')
    expect(s.error).toMatch(/sumę kontrolną/)
    expect(await exists(`${t.portableFile}.update`)).toBe(false)
    expect(await exists(`${t.portableFile}.update.part`)).toBe(false)
    expect(t.cfg.pending).toBeNull()
    expect(t.updater.applyOnQuit()).toBe(false)
  })

  it('wydanie bez sumy kontrolnej nie jest pobierane', async () => {
    const t = await setup({ site: { sums: false } })
    t.site.files[PORTABLE_ASSET]!.digest = false
    const s = await checkAndWait(t.updater)
    expect(s).toMatchObject({ phase: 'error', error: expect.stringMatching(/sumy kontrolnej/) })
    expect(t.server.count(PORTABLE_ASSET)).toBe(0)
  })

  it('sama suma z GitHuba (digest) wystarcza', async () => {
    const t = await setup({ site: { sums: false } })
    expect((await checkAndWait(t.updater)).phase).toBe('ready')
  })

  it('zerwane połączenie w trakcie pobierania nie zostawia pliku', async () => {
    const t = await setup()
    t.site.files[PORTABLE_ASSET]!.serve = 'cut'
    const s = await checkAndWait(t.updater)
    expect(s).toMatchObject({ phase: 'error', error: expect.stringMatching(/Pobieranie przerwane/) })
    expect(await exists(`${t.portableFile}.update`)).toBe(false)
    expect(await exists(`${t.portableFile}.update.part`)).toBe(false)
  })

  it('adres pobierania bez HTTPS jest odrzucany poza serwerem testowym', async () => {
    const t = await setup({ deps: { allowInsecure: false } })
    const s = await checkAndWait(t.updater)
    expect(s).toMatchObject({ phase: 'error', error: expect.stringMatching(/HTTPS/) })
    expect(t.server.count(PORTABLE_ASSET)).toBe(0)
  })
})

describe('aktualizacje: wersja zainstalowana i ręczna', () => {
  it('instalator trafia do userData/updates i uruchamia się cicho przy zamknięciu', async () => {
    const t = await setup({ deps: { mode: 'installer', portableFile: null } })
    const s = await checkAndWait(t.updater)
    expect(s.phase).toBe('ready')
    const file = join(t.deps.userDataDir, 'updates', SETUP_ASSET)
    expect(sha(await fs.readFile(file))).toBe(sha(t.setupBody))
    expect(t.cfg.pending).toMatchObject({ mode: 'installer', file })
    t.updater.requestRestart()
    expect(t.updater.applyOnQuit()).toBe(true)
    // With a restart the status window waits for the new version's window.
    expect(t.applied).toEqual([
      { kind: 'installer', file, restart: true, watch: { version: '1.2.0', appProcess: 'Financial Intel', logFile: join(t.deps.userDataDir, 'logs', 'update.log') } }
    ])
  })

  it('tryb ręczny tylko informuje o nowej wersji', async () => {
    const t = await setup({ deps: { mode: 'manual', modeNote: 'Pobierz ręcznie.', portableFile: null } })
    expect((await t.updater.check(true)).phase).toBe('available')
    expect(t.server.count(PORTABLE_ASSET) + t.server.count(SETUP_ASSET)).toBe(0)
    expect(await t.updater.download()).toMatchObject({ phase: 'error', error: 'Pobierz ręcznie.' })
    expect(t.updater.applyOnQuit()).toBe(false)
  })

  it('bez automatycznego pobierania czeka na decyzję, a po włączeniu pobiera', async () => {
    const t = await setup({ cfg: { prefs: { autoCheck: true, autoDownload: false } } })
    expect((await t.updater.check(true)).phase).toBe('available')
    expect(t.server.count(PORTABLE_ASSET)).toBe(0)
    await t.updater.setPrefs({ autoDownload: true }, 60_000)
    expect(t.cfg.prefs).toEqual({ autoCheck: true, autoDownload: true })
    expect((await t.updater.download()).phase).toBe('ready')
  })
})

describe('aktualizacje: sprawdzanie', () => {
  it('ta sama wersja = aktualna, brak wydań (404) = podpowiedź o tokenie, limit API = komunikat', async () => {
    const t = await setup({ site: { version: '1.1.0' } })
    expect(await t.updater.check(true)).toMatchObject({ phase: 'up-to-date', release: { version: '1.1.0' } })
    expect(t.updater.getState().lastCheckAt).not.toBeNull()
    // A private repository answers 404 without a token – "masz najnowszą wersję" would be false.
    t.site.status = 404
    expect(await t.updater.check(true)).toMatchObject({ phase: 'error', error: NO_RELEASES_VISIBLE })
    t.site.status = 403
    expect(await t.updater.check(true)).toMatchObject({ phase: 'error', error: expect.stringMatching(/ogranicza/) })
  })

  it('brak sieci: czytelny komunikat', async () => {
    const t = await setup()
    await t.server.close()
    expect(await t.updater.check(true)).toMatchObject({ phase: 'error', error: expect.stringMatching(/Brak połączenia z GitHubem/) })
  })

  it('automatyczne sprawdzanie startuje z opóźnieniem i można je wyłączyć', async () => {
    const t = await setup({ cfg: { prefs: { autoCheck: true, autoDownload: false } } })
    t.updater.startAuto(20)
    await vi.waitFor(() => expect(t.updater.getState().phase).toBe('available'), { timeout: 5000 })
    await t.updater.setPrefs({ autoCheck: false }, 20)
    const before = t.server.hits.size
    await new Promise((r) => setTimeout(r, 80))
    expect(t.server.hits.size).toBe(before)

    const manual = await setup({ deps: { mode: 'manual', allowInsecure: false } })
    manual.updater.startAuto(5)
    await new Promise((r) => setTimeout(r, 60))
    expect(manual.server.hits.size).toBe(0) // nothing to install there: no background traffic
  })

  it('pobrana aktualizacja nie jest sprawdzana ponownie w tle', async () => {
    const t = await setup()
    await checkAndWait(t.updater)
    const hits = t.server.hits.get('/repos/Clatir/FinancialIntel/releases/latest')
    expect((await t.updater.check(false)).phase).toBe('ready')
    expect(t.server.hits.get('/repos/Clatir/FinancialIntel/releases/latest')).toBe(hits)
    // A manual check keeps the downloaded update when the release is the same.
    expect((await t.updater.check(true)).phase).toBe('ready')
  })

  it('nowsza wersja nie pobrała się: zostaje pobrana wcześniej – gotowa do instalacji z komunikatem (B122)', async () => {
    const t = await setup()
    expect((await checkAndWait(t.updater)).phase).toBe('ready')
    const staged = `${t.portableFile}.update`
    // 1.3.0 is out, its file comes damaged: 1.2.0 downloaded before is not lost.
    t.site.version = '1.3.0'
    t.site.files[PORTABLE_ASSET] = { body: randomBytes(300_000), digest: true, serve: 'corrupt' }
    const s = await checkAndWait(t.updater)
    expect(s).toMatchObject({ phase: 'ready', release: { version: '1.2.0' } })
    expect(s.error).toMatch(/Nie udało się pobrać wersji 1\.3\.0 .* zainstaluje się pobrana wcześniej 1\.2\.0/)
    expect(sha(await fs.readFile(staged))).toBe(sha(t.portableBody))
    expect(t.cfg.pending?.version).toBe('1.2.0')
    expect(t.updater.applyOnQuit()).toBe(true)
    expect(t.applied.at(-1)).toMatchObject({ kind: 'portable', p: { staged, version: '1.2.0' } })
  })
})

describe('aktualizacje: prywatne repozytorium (token)', () => {
  const TOKEN = 'github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz'
  /** Like Electron's net.fetch: a followed redirect keeps the request's headers (Node's fetch drops Authorization). */
  const electronLikeFetch: UpdaterDeps['fetch'] = async (url, init) => {
    const manual = (u: string) => fetch(u, { headers: init?.headers, signal: init?.signal, redirect: 'manual' })
    let res = await manual(url)
    if (init?.redirect === 'manual') return res
    for (let hop = 0; hop < 5 && res.status >= 300 && res.status < 400; hop++) res = await manual(new URL(res.headers.get('location')!, url).toString())
    return res
  }

  it('bez tokena podpowiedź; z tokenem sprawdza i pobiera przez API, a magazyn plików dostaje plik bez tokena', async () => {
    let token: string | null = null
    const t = await setup({ site: { token: TOKEN }, deps: { fetch: electronLikeFetch, token: () => token, tokenState: () => ({ present: !!token, hint: token ? `…${token.slice(-4)}` : null, encrypted: true }) } })
    expect(await t.updater.check(true)).toMatchObject({ phase: 'error', error: NO_RELEASES_VISIBLE, token: { present: false } })
    token = TOKEN
    await t.updater.tokenChanged()
    const s = await t.updater.download()
    expect(s).toMatchObject({ phase: 'ready', release: { version: '1.2.0' }, token: { present: true, hint: '…wxyz' } })
    expect(await fs.readFile(`${t.portableFile}.update`)).toEqual(t.portableBody)
    // The file and SHA256SUMS.txt came through the API (redirect to the storage), never the browser links.
    expect(t.server.count(PORTABLE_ASSET)).toBe(0)
    expect(t.server.count(CHECKSUMS_ASSET)).toBe(0)
    expect(t.server.storageAuth).toHaveLength(2)
    expect(t.server.storageAuth.every((a) => a === null)).toBe(true)
    expect(JSON.stringify(t.states)).not.toContain(TOKEN)
  })

  it('zły token = komunikat o wygasłym tokenie; token bez dostępu (404) = komunikat o dostępie', async () => {
    let token = 'github_pat_wrongwrongwrongwrong'
    const t = await setup({ site: { token: TOKEN }, deps: { token: () => token } })
    expect(await t.updater.check(true)).toMatchObject({ phase: 'error', error: TOKEN_INVALID })
    token = TOKEN
    t.site.status = 404
    expect(await t.updater.check(true)).toMatchObject({ phase: 'error', error: TOKEN_NO_ACCESS })
  })

  it('token idzie tylko do API: adres pliku spoza API jest odrzucany', async () => {
    const t = await setup({ deps: { token: () => TOKEN }, cfg: { prefs: { autoCheck: true, autoDownload: false } } })
    // The release lists asset URLs of another host (a forged answer): the token is not sent there.
    await t.updater.check(true)
    const latest = (t.updater as unknown as { latest: { assets: Array<{ apiUrl: string | null }> } }).latest
    for (const a of latest.assets) a.apiUrl = `https://evil.example/repos/Clatir/FinancialIntel/releases/assets/1`
    const s = await t.updater.download()
    expect(s).toMatchObject({ phase: 'error', error: expect.stringMatching(/adresu pliku w API/) })
  })
})

describe('aktualizacje: start aplikacji', () => {
  it('po aktualizacji pokazuje komunikat raz i sprząta pozostałości', async () => {
    const t = await setup({ cfg: { lastRun: '1.0.0' } })
    const staged = `${t.portableFile}.update`
    t.cfg.pending = { version: '1.1.0', notes: 'opis 1.1.0', file: staged, sha256: 'c'.repeat(64), mode: 'portable' }
    await fs.writeFile(`${t.portableFile}.old`, 'poprzedni exe')
    await fs.mkdir(join(t.deps.userDataDir, 'updates'), { recursive: true })
    await fs.writeFile(join(t.deps.userDataDir, 'updates', 'stary-Setup.exe'), 'x')
    await t.updater.init()
    expect(t.updater.getState()).toMatchObject({ phase: 'idle', justUpdated: { version: '1.1.0', notes: 'opis 1.1.0' } })
    expect(t.cfg.lastRun).toBe('1.1.0')
    expect(t.cfg.pending).toBeNull()
    expect(await exists(`${t.portableFile}.old`)).toBe(false)
    expect(await fs.readdir(join(t.deps.userDataDir, 'updates'))).toEqual([])
    expect(t.updater.dismissNotice().justUpdated).toBeNull()
  })

  it('poprawnie pobrana aktualizacja czeka dalej na zamknięcie, uszkodzona jest usuwana', async () => {
    const t = await setup()
    const staged = `${t.portableFile}.update`
    await fs.writeFile(staged, t.portableBody)
    t.cfg.pending = { version: '1.2.0', notes: 'n', file: staged, sha256: sha(t.portableBody), mode: 'portable' }
    await t.updater.init()
    expect(t.updater.getState()).toMatchObject({ phase: 'ready', release: { version: '1.2.0' }, justUpdated: null })
    expect(await exists(staged)).toBe(true)

    const bad = await setup()
    const badStaged = `${bad.portableFile}.update`
    await fs.writeFile(badStaged, 'uszkodzony')
    bad.cfg.pending = { version: '1.2.0', notes: 'n', file: badStaged, sha256: sha(bad.portableBody), mode: 'portable' }
    await bad.updater.init()
    expect(bad.updater.getState().phase).toBe('idle')
    expect(await exists(badStaged)).toBe(false)
    expect(bad.cfg.pending).toBeNull()
  })

  it('aktualizacja innej kopii aplikacji (zainstalowanej) zostaje nietknięta', async () => {
    const t = await setup()
    const setupFile = join(t.deps.userDataDir, 'updates', SETUP_ASSET)
    await fs.mkdir(join(t.deps.userDataDir, 'updates'), { recursive: true })
    await fs.writeFile(setupFile, t.setupBody)
    const pending: PendingUpdate = { version: '1.2.0', notes: 'n', file: setupFile, sha256: sha(t.setupBody), mode: 'installer' }
    t.cfg.pending = pending
    await fs.writeFile(`${t.portableFile}.update`, 'porzucony plik')
    await t.updater.init()
    expect(t.updater.getState().phase).toBe('idle')
    expect(t.cfg.pending).toEqual(pending)
    expect(await exists(setupFile)).toBe(true)
    expect(await exists(`${t.portableFile}.update`)).toBe(false)
    expect(t.updater.applyOnQuit()).toBe(false)
  })
})

describe('downloadVerified', () => {
  it('przerywa, gdy serwer przestaje wysyłać dane', async () => {
    const body = randomBytes(100_000)
    const server = await releaseServer({ status: 200, version: '1.2.0', notes: '', files: { 'a.exe': { body, serve: 'stall' } }, sums: false })
    cleanups.push(server.close)
    const dest = join(tempDir('fi-dl-'), 'a.exe')
    await expect(downloadVerified((u, i) => fetch(u, i), `${server.base}/download/a.exe`, dest, sha(body), { stallMs: 300 })).rejects.toThrow(/brak danych/)
    expect(await exists(dest)).toBe(false)
    expect(await exists(`${dest}.part`)).toBe(false)
  })
})
