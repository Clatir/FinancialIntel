// adapted from ICTTJ src/renderer/features/settings/SettingsPage.tsx and TransferTab.tsx @ 84a8339
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { BackupInfo, TrayPrefs } from '@shared/api'
import { DEFAULT_SHIP_NAME } from '@shared/schema'
import { api, errorMessage } from '../../lib/api'
import { fmtBytes } from '../../lib/format'
import { flushSaves, openResult, updateSettings, useData } from '../../store/data'
import { navigate, toast, useUi, type SettingsTab } from '../../store/ui'
import { UpdatesTab } from './UpdatesTab'
import { IconFolder, IconPlus, IconSync } from '../../components/icons'
import { Field, NameInput, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { PaneEdge, usePaneWidth } from '../../components/layout'

/**
 * Tabs of the settings. E0 has the foundation's; the budget's (accounts, categories, layers, orders, notifications,
 * sounds, shortcuts, ICTTJ, import) come with their stages.
 */
export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'Okręt' },
  { id: 'folder', label: 'Folder i kopie' },
  { id: 'system', label: 'Zasobnik i start' },
  { id: 'updates', label: 'Aktualizacje' }
]

export function SettingsPage() {
  const nav = usePaneWidth('menu', 190, 150, 320)
  const route = useUi((s) => s.route)
  const tab = (route.page === 'settings' && route.tab) || 'general'
  const fi = useData((s) => s.fi)
  if (!fi) return null
  return (
    <div className="flex h-full min-h-0">
      <nav className="flex shrink-0 flex-col border-r border-line bg-panel py-1" style={{ width: nav.width }}>
        <div className="label px-3 py-2">Ustawienia</div>
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => navigate({ page: 'settings', tab: t.id })}
            className={cx(
              'h-[28px] border-l-2 px-3 text-left transition-colors duration-100',
              tab === t.id ? 'border-accent bg-accent-soft text-fg-strong' : 'border-transparent text-muted hover:bg-hover hover:text-fg-strong'
            )}
            data-testid={`settings-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <PaneEdge pane={nav} side="left" />
      <div className="min-w-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto flex max-w-[980px] flex-col gap-3">
          {tab === 'general' && <GeneralTab />}
          {tab === 'folder' && <FolderTab />}
          {tab === 'system' && <SystemTab />}
          {tab === 'updates' && <UpdatesTab />}
        </div>
      </div>
    </div>
  )
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('grid items-center gap-2 border-b border-line/70 py-1', className)}>{children}</div>
}

// ---------------------------------------------------------------- general

function GeneralTab() {
  const shipName = useData((s) => s.fi?.settings.shipName ?? DEFAULT_SHIP_NAME)
  return (
    <>
      <Panel title="Okręt">
        <div className="flex flex-col gap-2">
          <Field label="Nazwa okrętu">
            <NameInput
              className="w-[260px]"
              value={shipName}
              maxLength={40}
              emptyMessage="Okręt musi mieć nazwę."
              onChange={(name) => updateSettings((f) => ({ ...f, settings: { ...f.settings, shipName: name } }))}
              aria-label="Nazwa okrętu"
              data-testid="ship-name-input"
            />
          </Field>
          <p className="text-[11.5px] text-muted">Widać ją w menu bocznym i na mostku. Wspólna dla wszystkich Twoich komputerów (zapisana w fi.json).</p>
        </div>
      </Panel>
      <TwoComputersPanel />
    </>
  )
}

/** What happens when the folder changes on another computer while it is open here (settings.sync.remoteChanges). */
function TwoComputersPanel() {
  const mode = useData((s) => s.fi?.settings.sync.remoteChanges ?? 'merge')
  const others = useData((s) => s.status?.otherMachines ?? [])
  return (
    <Panel title="Praca na kilku komputerach">
      <div className="flex flex-col gap-2 text-[12px]">
        <Segmented
          size="sm"
          value={mode}
          onChange={(remoteChanges) => updateSettings((f) => ({ ...f, settings: { ...f.settings, sync: { ...f.settings.sync, remoteChanges } } }))}
          options={[
            { value: 'merge', label: 'Scalaj zmiany, pytaj tylko przy konflikcie' },
            { value: 'ask', label: 'Zawsze pytaj przed przyjęciem zmian' }
          ]}
          aria-label="Zmiany z drugiego komputera"
        />
        <p className="text-[11.5px] text-muted">
          Gdy na jednym komputerze zmienisz wpis, drugi dostaje tę zmianę przez OneDrive. „Scalaj”: zmiana jest przyjmowana od razu, a gdy ten sam wpis
          edytujesz właśnie tutaj, zmiany z obu komputerów łączą się pole po polu – pytanie pojawia się tylko o pola zmienione po obu stronach. „Zawsze
          pytaj”: każdą zmianę z drugiego komputera najpierw widzisz i wybierasz scal / zachowaj moją / weź z drugiego. Odrzucona wersja zostaje w
          historii wpisu.
        </p>
        {others.length > 0 && <div className="text-[11.5px] text-accent">Teraz pracuje też: {others.map((m) => m.machine).join(', ')}.</div>}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- folder

const BACKUP_KIND: Record<BackupInfo['kind'], string> = { daily: 'dzienna', manual: 'ręczna', 'pre-migration': 'przed migracją' }

function FolderTab() {
  const status = useData((s) => s.status)
  const info = useData((s) => s.appInfo)
  const loadMs = useData((s) => s.loadMs)
  const count = useData((s) => Object.values(s.records).reduce((n, m) => n + Object.keys(m).length, 0))
  const [recent, setRecent] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [backups, setBackups] = useState<{ dir: string; files: BackupInfo[] } | null>(null)
  const loadBackups = useCallback(async () => {
    try {
      setBackups(await api.listBackups())
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }, [])
  useEffect(() => {
    void api.getConfig().then((c) => setRecent(c.recentDirs))
    void loadBackups()
  }, [status?.dataDir, loadBackups])
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast(errorMessage(e), 'error', 7000)
    } finally {
      setBusy(false)
    }
  }
  const switchTo = async (fn: () => ReturnType<typeof api.pickDataDir>) => {
    if (!(await flushSaves())) {
      toast('Nie udało się zapisać bieżących zmian – folder nie został zmieniony. Spróbuj ponownie za chwilę.', 'error', 7000)
      return
    }
    const res = await fn()
    if (await openResult(res)) toast('Otwarto folder danych.', 'success')
    else if (!res.ok && res.reason !== 'cancelled') toast(res.message, 'error', 6000)
  }
  return (
    <>
      <Panel title="Bieżący folder danych">
        <div className="flex flex-col gap-2">
          <div className="num text-[13px] break-all text-fg-strong" data-testid="settings-data-dir">
            {status?.dataDir}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => api.showInFolder(null)}>
              <IconFolder size={13} /> Pokaż w Eksploratorze
            </button>
            <button className="btn" onClick={() => switchTo(() => api.pickDataDir('open'))}>
              Otwórz inny folder…
            </button>
            <button className="btn" onClick={() => switchTo(() => api.pickDataDir('create'))}>
              <IconPlus size={13} /> Nowe dane w innym folderze…
            </button>
            <button className="btn" onClick={() => api.rescan().then(() => toast('Przeskanowano folder.', 'success'), (e) => toast(errorMessage(e), 'error'))}>
              <IconSync size={13} /> Przeskanuj
            </button>
          </div>
          <p className="text-[11.5px] text-muted">
            Żeby przenieść dane, zamknij aplikację, przenieś cały folder w Eksploratorze i wskaż go tutaj. Wszystkie ścieżki w plikach są względne, więc
            folder działa w nowym miejscu bez zmian.
          </p>
        </div>
      </Panel>
      <Panel title="Informacje">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          <Field label="Format danych">
            <span className="num">
              v{status?.folderSchemaVersion} (aplikacja obsługuje v{status?.appSchemaVersion})
            </span>
          </Field>
          <Field label="Wersja aplikacji">
            <span className="num" data-testid="app-version">
              {info?.version}
            </span>
          </Field>
          <Field label="Ten komputer">
            <span className="num">{info?.machineName}</span>
          </Field>
          <Field label="Wczytanie">
            <span className="num">
              {count} wpisów · {loadMs} ms
            </span>
          </Field>
          <Field label="Ustawienia lokalne">
            <span className="flex min-w-0 items-center gap-2">
              <span className="num truncate text-[11px] text-muted" title={info?.userDataDir}>
                {info?.userDataDir}
              </span>
              <button
                type="button"
                className="btn h-[22px] shrink-0 text-[11px]"
                title="Folder logs z plikiem main.log (do zgłaszania problemów)"
                onClick={() => api.openLogs().catch((e) => toast(errorMessage(e), 'error'))}
                data-testid="open-logs"
              >
                Otwórz folder logów
              </button>
            </span>
          </Field>
        </div>
      </Panel>
      <Panel
        title="Kopie zapasowe"
        actions={
          <div className="flex gap-1">
            <button
              className="btn h-[22px]"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (!(await flushSaves())) throw new Error('Nie udało się zapisać bieżących zmian – kopia wstrzymana, żeby ich nie pominąć. Spróbuj ponownie za chwilę.')
                  const path = await api.backupNow()
                  toast(`Utworzono kopię: ${path}`, 'success', 6000)
                  await loadBackups()
                })
              }
              data-testid="backup-now"
            >
              Kopia teraz
            </button>
            {backups && (
              <button className="btn h-[22px]" title="Pokaż folder kopii" onClick={() => api.showPath(backups.dir)}>
                <IconFolder size={12} />
              </button>
            )}
          </div>
        }
      >
        <p className="mb-2 text-[11.5px] text-muted">
          Przy każdym starcie raz dziennie ZIP całego folderu danych (zostaje 30 ostatnich); przed migracją formatu zawsze. Folder:{' '}
          <span className="num">{backups?.dir}</span>
        </p>
        {backups && backups.files.length === 0 && <span className="text-[11.5px] text-dim">Brak kopii.</span>}
        {backups?.files.map((b) => (
          <div key={b.path} className="grid grid-cols-[120px_minmax(0,1fr)_90px_150px] items-center gap-2 border-b border-line/60 py-[3px] text-[12px] last:border-b-0" data-testid="backup-row">
            <span className="text-muted">{BACKUP_KIND[b.kind]}</span>
            <button className="num truncate text-left hover:text-fg-strong" onClick={() => api.showPath(b.path)} title={b.path}>
              {b.name}
            </button>
            <span className="num text-right text-muted">{fmtBytes(b.bytes)}</span>
            <span className="num text-right text-dim">{new Date(b.mtimeMs).toLocaleString('pl-PL')}</span>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button className="btn h-[22px]" disabled={busy} onClick={() => run(async () => void (await api.setBackupDir('pick'), await loadBackups()))}>
            Zmień folder kopii…
          </button>
          <button className="btn h-[22px]" disabled={busy} onClick={() => run(async () => void (await api.setBackupDir('default'), await loadBackups()))}>
            Domyślny (backups/ w folderze danych)
          </button>
          <span className="text-[11px] text-dim">ustawienie tego komputera – np. dysk lokalny zamiast OneDrive</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            className="btn h-[22px]"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (!(await flushSaves())) throw new Error('Nie udało się zapisać bieżących zmian – eksport wstrzymany. Spróbuj ponownie za chwilę.')
                const path = await api.exportZip()
                if (path) toast(`Zapisano ZIP: ${path}`, 'success', 6000)
              })
            }
            data-testid="export-zip"
          >
            Eksport: ZIP całego folderu…
          </button>
          <span className="text-[11px] text-dim">Przywracanie: rozpakuj ZIP do pustego folderu i wskaż go wyżej („Otwórz inny folder…”).</span>
        </div>
      </Panel>
      {recent.length > 1 && (
        <Panel title="Ostatnio używane foldery">
          {recent
            .filter((d) => d !== status?.dataDir)
            .map((d) => (
              <Row key={d} className="grid-cols-[1fr_auto]">
                <span className="num truncate text-[12px]">{d}</span>
                <button className="btn h-[22px]" onClick={() => switchTo(() => api.openDataDir(d, false))}>
                  Otwórz
                </button>
              </Row>
            ))}
        </Panel>
      )}
    </>
  )
}

// ---------------------------------------------------------------- system

/** Tray and start with Windows (decision D46): settings of this computer. */
function SystemTab() {
  const [prefs, setPrefs] = useState<(TrayPrefs & { loginSupported: boolean }) | null>(null)
  useEffect(() => {
    api.trayPrefs().then(setPrefs, () => undefined)
  }, [])
  const change = (patch: Partial<Pick<TrayPrefs, 'closeToTray' | 'launchAtLogin'>>) =>
    api.setTrayPrefs(patch).then(setPrefs, (e: unknown) => toast(`Nie udało się zapisać: ${errorMessage(e)}`, 'error'))
  if (!prefs) return <Panel title="Zasobnik i start z Windows">Wczytywanie…</Panel>
  return (
    <Panel title="Zasobnik i start z Windows (ten komputer)">
      <div className="flex flex-col gap-2.5 text-[12px]">
        <Toggle
          checked={prefs.closeToTray}
          onChange={(closeToTray) => void change({ closeToTray })}
          label="Zamykaj do zasobnika – przypomnienia i powiadomienia działają dalej; „Zakończ” w menu ikony przy zegarze"
          data-testid="tray-close"
        />
        <Toggle
          checked={prefs.launchAtLogin}
          disabled={!prefs.loginSupported}
          onChange={(launchAtLogin) => void change({ launchAtLogin })}
          label="Uruchamiaj z Windows (ukryta w zasobniku)"
          data-testid="tray-login"
        />
        {!prefs.loginSupported && <p className="text-[11.5px] text-dim">Start z systemem działa w zainstalowanej albo przenośnej wersji dla Windows.</p>}
        <p className="text-[11.5px] text-muted">
          Te ustawienia są zapisane na tym komputerze (nie w folderze danych). Start z Windows włączysz też w kreatorze startu; w późniejszych etapach ikona
          pokaże w dymku „energię dziś”, a jej menu – szybki wpis.
        </p>
      </div>
    </Panel>
  )
}
