// adapted from ICTTJ src/renderer/features/settings/SettingsPage.tsx and TransferTab.tsx @ 84a8339
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { BackupInfo, TrayPrefs } from '@shared/api'
import { DEFAULT_SHIP_NAME } from '@shared/schema'
import { daysBetween, warsawNow } from '@shared/calc/dates'
import { api, errorMessage } from '../../lib/api'
import { fmtBytes } from '../../lib/format'
import { flushSaves, switchFolder, updateSettings, useData, useFolderLocked } from '../../store/data'
import { OpenProgressPanel, useOpenProgress } from '../setup/OpenProgress'
import { navigate, toast, useUi, type SettingsTab } from '../../store/ui'
import { UpdatesTab } from './UpdatesTab'
import { AccountsTab } from './AccountsTab'
import { CategoriesTab } from './CategoriesTab'
import { ImportTab } from './ImportTab'
import { LayersTab, NotifyTab } from './MachineTabs'
import { IctjTab } from './IctjTab'
import { HouseholdTab } from './HouseholdTab'
import { RecoverDialog } from './RecoverDialog'
import { IconFolder, IconPlus, IconSync } from '../../components/icons'
import { Field, NameInput, Panel, Segmented, Toggle, cx } from '../../components/ui'
import { PaneEdge, usePaneWidth } from '../../components/layout'

/**
 * Tabs of the settings: the foundation's and the budget's (accounts, categories, layers and orders, the import's rules)
 * and this computer's (notifications, sounds, the quick entry's shortcut, the ICTTJ folder and program – E5).
 */
export const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'Okręt' },
  { id: 'accounts', label: 'Konta' },
  { id: 'categories', label: 'Kategorie' },
  { id: 'layers', label: 'Warstwy i rozkazy' },
  { id: 'household', label: 'Domownicy' },
  { id: 'import', label: 'Import z banku' },
  { id: 'ictj', label: 'ICTTJ' },
  { id: 'notify', label: 'Powiadomienia i dźwięki' },
  { id: 'folder', label: 'Folder i kopie' },
  { id: 'system', label: 'Zasobnik i start' },
  { id: 'updates', label: 'Aktualizacje' }
]

export function SettingsPage() {
  const nav = usePaneWidth('menu', 190, 150, 320)
  const route = useUi((s) => s.route)
  const tab = (route.page === 'settings' && route.tab) || 'general'
  const fi = useData((s) => s.fi)
  const readOnly = useFolderLocked()
  const switching = useData((s) => s.switching)
  if (!fi) return null
  // The budget's settings (fi.json) in a read-only folder: to look at only (N2); this computer's ones stay at hand.
  const locked = readOnly && (tab === 'general' || tab === 'accounts' || tab === 'categories' || tab === 'layers' || tab === 'household')
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
          {locked && (
            <p className="text-[11.5px] text-accent" data-testid="settings-read-only">
              {switching ? 'Trwa otwieranie innego folderu – ustawień budżetu nie można teraz zmieniać.' : 'Folder jest tylko do odczytu – ustawienia budżetu można tylko oglądać.'}
            </p>
          )}
          <fieldset disabled={locked} className="contents">
            {tab === 'general' && <GeneralTab />}
            {tab === 'accounts' && <AccountsTab />}
            {tab === 'categories' && <CategoriesTab />}
            {tab === 'layers' && <LayersTab />}
            {tab === 'household' && <HouseholdTab />}
            {tab === 'import' && <ImportTab />}
            {tab === 'ictj' && <IctjTab />}
            {tab === 'notify' && <NotifyTab />}
            {tab === 'folder' && <FolderTab />}
            {tab === 'system' && <SystemTab />}
            {tab === 'updates' && <UpdatesTab />}
          </fieldset>
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
        {others.length > 0 && (
          <div className="text-[11.5px] text-accent" data-testid="settings-other-machines">
            Folder otwarty też na: {others.map((m) => `${m.machine} (${m.inUse !== false ? 'w użyciu' : 'w zasobniku'})`).join(', ')}. Komputer w zasobniku nie zapisuje
            nic w tle (dni gry, cele z ICTTJ) i zostawia powiadomienia komputerowi w użyciu.
          </div>
        )}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- folder

const BACKUP_KIND: Record<BackupInfo['kind'], string> = {
  daily: 'dzienna',
  weekly: 'tygodniowa',
  manual: 'ręczna',
  'pre-import': 'przed importem',
  'pre-migration': 'przed migracją'
}

/** A backup this old or older is a warning (F2): the daily one is made every day the app runs. */
const BACKUP_STALE_DAYS = 3

/** How old the newest backup is, in whole days of Warsaw ('dziś', 'wczoraj', 'N dni temu'); null = none. */
function backupAge(files: readonly BackupInfo[], now = new Date()): { text: string; days: number } | null {
  if (!files.length) return null
  const newest = Math.max(...files.map((f) => f.mtimeMs))
  const days = daysBetween(warsawNow(new Date(newest)).date, warsawNow(now).date)
  return { text: days <= 0 ? 'dziś' : days === 1 ? 'wczoraj' : `${days} dni temu`, days }
}

/** The newest backup's age; a warning when it is older than 3 days (F2). */
function BackupAge({ files }: { files: readonly BackupInfo[] }) {
  const age = backupAge(files.filter((f) => f.kind !== 'pre-migration'))
  if (!age) return null
  const stale = age.days > BACKUP_STALE_DAYS
  return (
    <p className={cx('mb-2 text-[11.5px]', stale ? 'text-accent' : 'text-muted')} data-testid="backup-age" data-stale={stale ? '1' : '0'}>
      Ostatnia kopia: {age.text}
      {stale && ' – starsza niż 3 dni: sprawdź folder kopii albo zrób kopię teraz.'}
    </p>
  )
}

function FolderTab() {
  const status = useData((s) => s.status)
  const info = useData((s) => s.appInfo)
  const loadMs = useData((s) => s.loadMs)
  const count = useData((s) => Object.values(s.records).reduce((n, m) => n + Object.keys(m).length, 0))
  const [recent, setRecent] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [backups, setBackups] = useState<{ dir: string; files: BackupInfo[] } | null>(null)
  // The backup whose recovery window is open (F3).
  const [recovering, setRecovering] = useState<BackupInfo | null>(null)
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
  // While another folder opens (B31): its progress and „Przerwij” here, the buttons off, no edits anywhere.
  const switching = useData((s) => s.switching)
  const [progress, resetProgress] = useOpenProgress()
  const switchTo = async (fn: () => ReturnType<typeof api.pickDataDir>): Promise<void> => {
    resetProgress()
    const res = await switchFolder(fn)
    if (res === 'unsaved') toast('Nie udało się zapisać bieżących zmian – folder nie został zmieniony. Spróbuj ponownie za chwilę.', 'error', 7000)
    else if (res.ok) toast('Otwarto folder danych.', 'success')
    else if (res.reason !== 'cancelled') {
      // As on the setup screen (B53): new data in a remembered folder found empty or missing only on purpose; a folder
      // of other files – its FinancialIntel subfolder.
      const dir = res.dir
      const startOver = res.remembered && (res.problem === 'empty' || res.problem === 'missing') && dir
      const action = startOver
        ? { label: 'Utwórz tu nowe dane', run: () => void switchTo(() => api.openDataDir(dir, true, true)) }
        : res.problem === 'other' && res.subfolder
          ? { label: 'Utwórz podfolder FinancialIntel', run: () => void switchTo(() => api.openDataDir(res.subfolder!, true)) }
          : undefined
      toast(res.message, 'error', action ? 12000 : 6000, action)
    }
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
            <button className="btn" disabled={switching} onClick={() => switchTo(() => api.pickDataDir('open'))}>
              Otwórz inny folder…
            </button>
            <button className="btn" disabled={switching} onClick={() => switchTo(() => api.pickDataDir('create'))}>
              <IconPlus size={13} /> Nowe dane w innym folderze…
            </button>
            <button className="btn" onClick={() => api.rescan().then(() => toast('Przeskanowano folder.', 'success'), (e) => toast(errorMessage(e), 'error'))}>
              <IconSync size={13} /> Przeskanuj
            </button>
          </div>
          {switching && progress && <OpenProgressPanel progress={progress} />}
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
          Raz dziennie – przy starcie i w tle, gdy aplikacja działa w zasobniku – ZIP danych bez historii zmian (zostaje 14 dziennych i 8
          tygodniowych); przed każdym importem z banku (10 ostatnich) i przed migracją formatu zawsze. Folder:{' '}
          <span className="num">{backups?.dir}</span>
        </p>
        {backups && <BackupAge files={backups.files} />}
        {backups && backups.files.length === 0 && <span className="text-[11.5px] text-dim">Brak kopii.</span>}
        {backups?.files.map((b) => (
          <div key={b.path} className="grid grid-cols-[120px_minmax(0,1fr)_90px_150px_auto] items-center gap-2 border-b border-line/60 py-[3px] text-[12px] last:border-b-0" data-testid="backup-row">
            <span className="text-muted">{BACKUP_KIND[b.kind]}</span>
            <button className="num truncate text-left hover:text-fg-strong" onClick={() => api.showPath(b.path)} title={b.path}>
              {b.name}
            </button>
            <span className="num text-right text-muted">{fmtBytes(b.bytes)}</span>
            <span className="num text-right text-dim">{new Date(b.mtimeMs).toLocaleString('pl-PL')}</span>
            <button className="btn h-[20px] px-1.5 text-[11px]" disabled={switching} title="Porównaj z bieżącym folderem i odzyskaj wybrane wpisy albo cały folder (F3)" onClick={() => setRecovering(b)} data-testid="backup-recover">
              Odzyskaj…
            </button>
          </div>
        ))}
        {recovering && (
          <RecoverDialog
            backup={recovering}
            label={BACKUP_KIND[recovering.kind]}
            onClose={() => setRecovering(null)}
            onFolder={() => {
              const path = recovering.path
              setRecovering(null)
              // A large folder's backup takes a while to unpack before the new folder opens.
              toast('Rozpakowywanie kopii do nowego folderu…', 'info', 4000)
              void switchTo(() => api.backupToFolder(path))
            }}
          />
        )}
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
          <span className="text-[11px] text-dim">Odzyskanie: „Odzyskaj…” przy kopii – wybrane wpisy albo cały folder do nowego folderu obok.</span>
        </div>
      </Panel>
      {recent.length > 1 && (
        <Panel title="Ostatnio używane foldery">
          {recent
            .filter((d) => d !== status?.dataDir)
            .map((d) => (
              <Row key={d} className="grid-cols-[1fr_auto]">
                <span className="num truncate text-[12px]">{d}</span>
                <button className="btn h-[22px]" disabled={switching} onClick={() => switchTo(() => api.openDataDir(d, false))} data-testid="recent-folder-open">
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
