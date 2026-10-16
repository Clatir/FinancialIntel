// adapted from ICTTJ tests/unit/update.test.ts @ 84a8339
import { describe, expect, it } from 'vitest'
import {
  APP_TITLE,
  PORTABLE_ASSET,
  RELEASES_PAGE,
  SETUP_ASSET,
  UPDATE_REPO,
  compareVersions,
  detectInstallMode,
  expectedSha256,
  isNewerVersion,
  parseChecksums,
  parseRelease,
  parseVersion,
  pickAsset,
  validUpdateToken
} from '@shared/update'
import { encodePowerShell, helperBootstrap, installerArgs, portableSwapScript, psLiteral, restartWatchScript } from '../../src/main/update/apply'

const HASH_A = 'a'.repeat(64)
const HASH_B = 'b'.repeat(64)

function githubRelease(over: Record<string, unknown> = {}) {
  return {
    tag_name: 'v1.2.0',
    name: 'Financial Intel 1.2.0',
    body: '## Nowe\r\n- duplikowanie wpisów\r\n',
    published_at: '2026-10-01T10:00:00Z',
    html_url: 'https://github.com/Clatir/FinancialIntel/releases/tag/v1.2.0',
    draft: false,
    prerelease: false,
    extra: { kept: true },
    assets: [
      { name: PORTABLE_ASSET, size: 100, browser_download_url: 'https://example.test/p.exe', url: 'https://api.github.com/repos/Clatir/FinancialIntel/releases/assets/7', digest: `sha256:${HASH_A.toUpperCase()}` },
      { name: 'Financial-Intel-Setup-1.2.0.exe', size: 120, browser_download_url: 'https://example.test/s.exe', digest: null },
      { name: 'Financial-Intel-Setup-1.2.0.exe.blockmap', size: 5, browser_download_url: 'https://example.test/s.blockmap' },
      { name: 'SHA256SUMS.txt', size: 200, browser_download_url: 'https://example.test/sums' }
    ],
    ...over
  }
}

describe('versions', () => {
  it('parses semver with optional v, pre-release and build metadata', () => {
    expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, pre: [] })
    expect(parseVersion('1.2.3-beta.2+build.7')).toEqual({ major: 1, minor: 2, patch: 3, pre: ['beta', '2'] })
    expect(parseVersion('1.2')).toBeNull()
    expect(parseVersion('latest')).toBeNull()
  })

  it('orders versions by semver precedence', () => {
    const sorted = ['1.0.0', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '0.9.9', '1.10.0', '1.2.0']
      .slice()
      .sort(compareVersions)
    expect(sorted).toEqual(['0.9.9', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0', '1.2.0', '1.10.0'])
    expect(isNewerVersion('1.1.0', '1.0.9')).toBe(true)
    expect(isNewerVersion('v1.1.0', '1.1.0')).toBe(false)
    expect(isNewerVersion('1.1.0-beta.1', '1.1.0')).toBe(false)
    expect(() => compareVersions('x', '1.0.0')).toThrow(/wersji/)
  })
})

describe('GitHub release', () => {
  it('reads the latest release answer', () => {
    const r = parseRelease(githubRelease())
    expect(r.version).toBe('1.2.0')
    expect(r.tag).toBe('v1.2.0')
    expect(r.notes).toBe('## Nowe\n- duplikowanie wpisów')
    expect(r.assets[0]?.sha256).toBe(HASH_A)
    expect(r.assets[1]?.sha256).toBeNull()
    // 1.17.1: the API address of a file (a private repository is downloaded through it, with the token).
    expect(r.assets[0]?.apiUrl).toBe('https://api.github.com/repos/Clatir/FinancialIntel/releases/assets/7')
    expect(r.assets[1]?.apiUrl).toBeNull()
  })

  it('a GitHub token: letters, digits and underscores (fine-grained and classic)', () => {
    expect(validUpdateToken('github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz')).toBe(true)
    expect(validUpdateToken(`ghp_${'a'.repeat(36)}`)).toBe(true)
    expect(validUpdateToken('short')).toBe(false)
    expect(validUpdateToken('github_pat_ with space 0123456789')).toBe(false)
    expect(validUpdateToken('token"; rm -rf /')).toBe(false)
  })

  it('rejects answers without a release or a version tag', () => {
    expect(() => parseRelease({ message: 'Not Found' })).toThrow(/GitHub/)
    expect(() => parseRelease(githubRelease({ tag_name: 'nightly' }))).toThrow(/1\.2\.3/)
  })

  it('picks the file matching the installation', () => {
    const r = parseRelease(githubRelease())
    expect(pickAsset(r, 'portable')?.name).toBe(PORTABLE_ASSET)
    expect(pickAsset(r, 'installer')?.name).toBe('Financial-Intel-Setup-1.2.0.exe')
    expect(pickAsset(r, 'manual')).toBeNull()
    // Older naming (version in the portable name) is still recognised.
    const old = parseRelease(
      githubRelease({ assets: [{ name: 'Financial-Intel-1.2.0-portable.exe', size: 1, browser_download_url: 'https://example.test/x.exe' }] })
    )
    expect(pickAsset(old, 'portable')?.name).toBe('Financial-Intel-1.2.0-portable.exe')
    expect(pickAsset(old, 'installer')).toBeNull()
  })

  it('verifies against SHA256SUMS.txt and the GitHub digest', () => {
    const sums = parseChecksums(`${HASH_A}  ${PORTABLE_ASSET}\r\n${HASH_B.toUpperCase()} *Financial-Intel-Setup-1.2.0.exe\n\nnot a line\n`)
    expect(sums.get('Financial-Intel-Setup-1.2.0.exe')).toBe(HASH_B)
    const r = parseRelease(githubRelease())
    const portable = pickAsset(r, 'portable')!
    const setup = pickAsset(r, 'installer')!
    expect(expectedSha256(portable, sums)).toBe(HASH_A)
    expect(expectedSha256(portable, null)).toBe(HASH_A) // digest only
    expect(expectedSha256(setup, sums)).toBe(HASH_B) // sums only
    expect(() => expectedSha256(portable, new Map([[PORTABLE_ASSET, HASH_B]]))).toThrow(/nie zgadzają/)
    expect(() => expectedSha256(setup, null)).toThrow(/sumy kontrolnej/)
  })
})

describe('installation mode', () => {
  const base = { platform: 'win32', isPackaged: true, portableFile: undefined, uninstallerExists: false }
  it('recognises portable, installed and manual copies', () => {
    expect(detectInstallMode({ ...base, portableFile: 'D:\\FI.exe' }).mode).toBe('portable')
    expect(detectInstallMode({ ...base, uninstallerExists: true }).mode).toBe('installer')
    expect(detectInstallMode(base)).toMatchObject({ mode: 'manual', note: expect.stringMatching(/ręcznie/) })
    expect(detectInstallMode({ ...base, isPackaged: false, portableFile: 'x' })).toMatchObject({ mode: 'manual', note: expect.stringMatching(/deweloperska/) })
    expect(detectInstallMode({ ...base, platform: 'linux', uninstallerExists: true }).mode).toBe('manual')
  })
})

describe('applying updates', () => {
  it('quotes PowerShell literals and encodes the script as UTF-16LE base64', () => {
    expect(psLiteral("C:\\Users\\O'Brien\\FI $x.exe")).toBe("'C:\\Users\\O''Brien\\FI $x.exe'")
    const script = "Write-Output 'zażółć'"
    expect(Buffer.from(encodePowerShell(script), 'base64').toString('utf16le')).toBe(script)
  })

  it('builds the portable swap script', () => {
    const script = portableSwapScript({
      target: "C:\\Finanse\\O'Neil\\Financial-Intel-portable.exe",
      staged: "C:\\Finanse\\O'Neil\\Financial-Intel-portable.exe.update",
      waitPids: [4242, 0, -1, 1.5, 77],
      restart: true,
      logFile: 'C:\\Users\\x\\AppData\\Roaming\\Financial Intel\\logs\\update.log'
    })
    expect(script).toContain("$target = 'C:\\Finanse\\O''Neil\\Financial-Intel-portable.exe'")
    expect(script).toContain('foreach ($id in @(4242, 77))')
    expect(script).toContain('Start-Process -FilePath $target')
    // The old exe is restored when the new one cannot be moved in.
    expect(script).toMatch(/Move-Item -LiteralPath \$backup -Destination \$target/)
    expect(portableSwapScript({ target: 'a', staged: 'b', waitPids: [1], restart: false, logFile: 'l' })).not.toContain('Start-Process')
    // A briefly locked log file (antivirus, a reader) must not drop lines: errors stop Add-Content and are retried (up to 10 s).
    const helper = portableSwapScript({ target: 'a', staged: 'b', waitPids: [1], restart: false, logFile: 'l' })
    expect(helper).toContain('Add-Content -LiteralPath $log -Value $line -Encoding UTF8 -ErrorAction Stop')
    expect(helper).toMatch(/for \(\$t = 0; \$t -lt 100; \$t\+\+\)/)
  })

  it('shows the status until the new window appears and logs every step', () => {
    const p = { target: 'C:\\a.exe', staged: 'C:\\a.exe.update', waitPids: [7], restart: true, logFile: 'l', version: '1.6.2', appProcess: 'Financial Intel' }
    const script = portableSwapScript(p)
    expect(script).toContain('Aktualizacja do wersji 1.6.2')
    expect(script).toContain('System.Windows.Forms')
    expect(script).toContain("$appName = 'Financial Intel'")
    expect(script).toContain("$form.Text = 'Financial Intel'")
    expect(script).toContain('$q.MainWindowHandle -ne 0 -and $q.StartTime -gt $started')
    expect(script).toContain("Start-Process -FilePath $target -WorkingDirectory (Split-Path -Parent $target) -PassThru")
    expect(script).toContain('uruchom aplikację ręcznie')
    expect(script).toContain('Close-Status')
    // Without a restart: no window at all, nothing started.
    const quiet = portableSwapScript({ ...p, restart: false })
    expect(quiet).not.toContain('New-Object System.Windows.Forms.Form')
    expect(quiet).not.toContain('Start-Process')
    const watch = restartWatchScript({ version: '1.6.2', appProcess: 'Financial Intel', logFile: 'l' })
    expect(watch).toContain('Instaluję wersję 1.6.2')
    expect(watch).toContain('$q.MainWindowHandle -ne 0')
    expect(watch).not.toContain('Start-Process')
  })

  it('starts a helper with a short loader of its script file (the command line has a 32k limit)', () => {
    const boot = helperBootstrap("C:\\Users\\O'Brien\\AppData\\Local\\Temp\\fi-update-1.ps1")
    expect(boot).toContain("$f = 'C:\\Users\\O''Brien\\AppData\\Local\\Temp\\fi-update-1.ps1'")
    expect(boot).toContain('[scriptblock]::Create($s)')
    expect(boot).toContain('Remove-Item -LiteralPath $f')
    // The starter encodes the helper's command once more: still far below the limit.
    const helper = encodePowerShell(boot)
    const starter = encodePowerShell(`Start-Process -FilePath 'powershell.exe' -ArgumentList '-EncodedCommand','${helper}'`)
    expect(starter.length).toBeLessThan(8000)
  })

  it('runs the installer silently into the existing installation', () => {
    expect(installerArgs(false)).toEqual(['--updated', '/S'])
    expect(installerArgs(true)).toEqual(['--updated', '/S', '--force-run'])
  })
})

describe('electron-builder configuration', () => {
  it('the release files keep the names the updater looks for', async () => {
    const { createRequire } = await import('node:module')
    const req = createRequire(import.meta.url)
    const cfg = req('../../electron-builder.cjs') as {
      appId: string
      productName: string
      executableName: string
      extraMetadata: { productName: string }
      win: { icon: string }
      portable: { artifactName: string }
      nsis: { artifactName: string; shortcutName: string }
    }
    expect(cfg.win.icon).toBe('resources/icon.png')
    expect([cfg.productName, cfg.executableName, cfg.extraMetadata.productName, cfg.nsis.shortcutName]).toEqual([APP_TITLE, APP_TITLE, APP_TITLE, APP_TITLE])
    expect(cfg.appId).toBe('app.financialintel.desktop')
    expect(cfg.portable.artifactName.replace('${ext}', 'exe')).toBe(PORTABLE_ASSET)
    expect(cfg.nsis.artifactName.replace('${ext}', 'exe')).toBe(SETUP_ASSET)
  })

  it('the updater takes the stable names first', () => {
    const asset = (name: string) => ({ name, size: 1, url: `https://x/${name}`, apiUrl: null, sha256: null })
    const release = { version: '1.2.0', assets: ['Financial-Intel-Setup-old.exe', 'Financial-Intel-x-portable.exe', PORTABLE_ASSET, SETUP_ASSET, 'Financial-Intel-Setup.exe.blockmap'].map(asset) } as unknown as Parameters<typeof pickAsset>[0]
    expect(pickAsset(release, 'portable')?.name).toBe(PORTABLE_ASSET)
    expect(pickAsset(release, 'installer')?.name).toBe(SETUP_ASSET)
    expect(pickAsset({ ...release, assets: release.assets.filter((a) => !/\.exe$/.test(a.name)) }, 'installer')).toBeNull()
    expect(APP_TITLE).toBe('Financial Intel')
    expect(UPDATE_REPO).toEqual({ owner: 'Clatir', repo: 'FinancialIntel' })
    expect(RELEASES_PAGE).toBe('https://github.com/Clatir/FinancialIntel/releases')
  })
})
