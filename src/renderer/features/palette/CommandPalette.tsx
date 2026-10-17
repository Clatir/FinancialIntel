// adapted from ICTTJ src/renderer/features/palette/CommandPalette.tsx @ 84a8339
import { useMemo } from 'react'
import { Command } from 'cmdk'
import type { LayoutPreset } from '@shared/schema'
import { api, errorMessage } from '../../lib/api'
import { flushSaves, useData } from '../../store/data'
import { navigate, setPalette, toast, useUi } from '../../store/ui'
import { checkForUpdates } from '../../store/update'
import { applyPageLayout } from '../../store/layout'
import { Kbd } from '../../components/ui'
import { PAGES } from '../screens/pages'
import { SETTINGS_TABS } from '../settings/SettingsPage'
import { startWizard } from '../wizard/state'
import { toggleHideAmounts } from '../../store/machine'
import { newOperation } from '../operations/state'
import { openIctj } from '../../store/ictj'
import { openFirstDocking } from '../dock/state'

const GROUP =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted'

const NO_PRESETS: LayoutPreset[] = []

interface Action {
  id: string
  label: string
  keys?: string
  run: () => void
}

/** Ctrl+K: every screen, the settings tabs and the commands of the app (later stages add their records to search). */
export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const layoutPresets = useData((s) => s.fi?.settings.layoutPresets ?? NO_PRESETS)
  const page = useUi((s) => s.route.page)

  const actions: Action[] = useMemo(
    () => [
      { id: 'new-operation', label: 'Nowa operacja', keys: 'Ctrl N', run: () => void newOperation() },
      { id: 'wizard', label: 'Kreator startu budżetu', run: () => startWizard() },
      { id: 'quick', label: 'Szybki wpis (okno nad wszystkimi)', run: () => void api.quickOpen() },
      { id: 'hide-amounts', label: 'Ukryj / pokaż kwoty', keys: 'Ctrl $', run: () => toggleHideAmounts() },
      { id: 'open-ictj', label: 'Otwórz ICT Trade Journal', run: () => void openIctj(() => navigate({ page: 'settings', tab: 'ictj' })) },
      { id: 'dock', label: 'Dokowanie: następna dostawa z XTB', run: () => (openFirstDocking() ? navigate({ page: 'bridge' }) : toast('Brak dostaw do zadokowania.')) },
      ...PAGES.map((p) => ({ id: `page-${p.page}`, label: `${p.label} – ${p.sub}`, keys: `Ctrl ${p.key}`, run: () => navigate({ page: p.page }) })),
      { id: 'sync', label: 'Synchronizacja i problemy', keys: 'Ctrl Shift Y', run: () => navigate({ page: 'sync' }) },
      ...SETTINGS_TABS.map((t) => ({ id: `settings-${t.id}`, label: `Ustawienia: ${t.label}`, run: () => navigate({ page: 'settings', tab: t.id }) })),
      ...layoutPresets
        .filter((p) => p.page === page)
        .map((p) => ({ id: `layout-${p.id}`, label: `Układ tej strony: „${p.name}”`, run: () => applyPageLayout(page, p, `Układ „${p.name}”.`) })),
      {
        id: 'save',
        label: 'Zapisz teraz',
        keys: 'Ctrl S',
        run: () => void flushSaves().then((ok) => toast(ok ? 'Zapisano.' : 'Nie udało się zapisać – aplikacja ponowi zapis.', ok ? 'success' : 'error'))
      },
      {
        id: 'backup',
        label: 'Kopia zapasowa teraz',
        run: () =>
          void flushSaves()
            .then((saved) => {
              if (!saved) throw new Error('Nie udało się zapisać bieżących zmian – kopia wstrzymana. Spróbuj ponownie za chwilę.')
              return api.backupNow()
            })
            .then(
              (path) => toast(`Utworzono kopię: ${path}`, 'success', 6000),
              (e) => toast(errorMessage(e), 'error')
            )
      },
      { id: 'folder', label: 'Pokaż folder danych w Eksploratorze', run: () => void api.showInFolder(null) },
      { id: 'logs', label: 'Otwórz folder logów', run: () => void api.openLogs().catch((e) => toast(errorMessage(e), 'error')) },
      { id: 'updates', label: 'Sprawdź aktualizacje', run: () => void checkForUpdates().then(() => navigate({ page: 'settings', tab: 'updates' })) },
      { id: 'help', label: 'Skróty klawiszowe', keys: '?', run: () => window.dispatchEvent(new Event('fi:shortcuts')) }
    ],
    [layoutPresets, page]
  )

  if (!open) return null
  const run = (fn: () => void) => {
    setPalette(false)
    fn()
  }
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-black/55 pt-[12vh]" onMouseDown={() => setPalette(false)}>
      <div className="w-[640px] animate-pop-in border border-line-strong bg-panel" onMouseDown={(e) => e.stopPropagation()} data-testid="palette">
        <Command
          label="Paleta komend"
          loop
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              setPalette(false)
            }
          }}
        >
          <Command.Input
            autoFocus
            placeholder="Wpisz komendę albo nazwę ekranu…"
            className="h-[40px] w-full border-b border-line bg-transparent px-3 text-[13px] text-fg-strong outline-none placeholder:text-dim"
            data-testid="palette-input"
          />
          <Command.List className="max-h-[52vh] overflow-y-auto p-1">
            <Command.Empty className="px-3 py-4 text-muted">Nic nie znaleziono.</Command.Empty>
            <Command.Group heading="Akcje" className={GROUP}>
              {actions.map((a) => (
                <Command.Item
                  key={a.id}
                  value={a.label}
                  onSelect={() => run(a.run)}
                  className="flex h-[30px] items-center gap-2 px-2 text-[12.5px] data-[selected=true]:bg-accent-soft data-[selected=true]:text-fg-strong"
                >
                  <span className="flex-1">{a.label}</span>
                  {a.keys && <Kbd>{a.keys}</Kbd>}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
