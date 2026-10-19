// adapted from ICTTJ src/renderer/features/palette/CommandPalette.tsx @ 84a8339
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { fold } from '@shared/fold'
import { searchRecords, type SearchHits, type SettingsItem } from '@shared/search'
import type { LayoutPreset } from '@shared/schema'
import { plnText } from '../../components/fields'
import { plDate } from '../../lib/format'
import { useAccounts, useCategories } from '../operations/pickers'
import { api, errorMessage } from '../../lib/api'
import { listOf, saveFirst, saveNow, useData } from '../../store/data'
import { focusRecord, navigate, setPalette, toast, useUi, type SettingsTab } from '../../store/ui'
import { checkForUpdates } from '../../store/update'
import { applyPageLayout } from '../../store/layout'
import { Kbd } from '../../components/ui'
import { PAGES } from '../screens/pages'
import { SETTINGS_TABS } from '../settings/SettingsPage'
import { startWizard } from '../wizard/state'
import { revealAmounts, toggleHideAmounts, useMachine } from '../../store/machine'
import { newOperation, openOperation } from '../operations/state'
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

/** The settings found by what they set (F19: „cisza nocna” → Warstwy i rozkazy). */
export const SETTINGS_ITEMS: readonly SettingsItem[] = [
  { id: 'ship-name', label: 'Nazwa okrętu', tab: 'general' },
  { id: 'opening', label: 'Saldo otwarcia konta', tab: 'accounts', words: 'konta saldo potwierdzenie salda korekta' },
  { id: 'accounts', label: 'Konta budżetu', tab: 'accounts', words: 'konto dodaj archiwum' },
  { id: 'categories', label: 'Kategorie i koperty', tab: 'categories', words: 'podkategoria koperta archiwizacja' },
  { id: 'shields', label: 'Osłony – cel (pensje)', tab: 'layers', words: 'bufor warstwy' },
  { id: 'hull', label: 'Kadłub – cel (miesiące)', tab: 'layers', words: 'fundusz awaryjny warstwy' },
  { id: 'min-shields', label: 'Minimalne osłony', tab: 'layers', words: 'rozkazy' },
  { id: 'cargo-line', label: 'Linia zanurzenia (% pensji)', tab: 'layers', words: 'ładownia rozkazy' },
  { id: 'quiet', label: 'Cisza nocna', tab: 'layers', words: 'noc rozkazy zakupy w nocy' },
  { id: 'impulse', label: 'Dziennik kapitański od kwoty (plan / impuls)', tab: 'layers', words: 'próg dziennika impuls' },
  { id: 'firewall', label: 'Firewall dopłat do XTB', tab: 'layers', words: 'rozkazy xtb' },
  { id: 'members', label: 'Domownicy i rozliczenia', tab: 'household', words: 'data rozliczeń saldo na start depozyt' },
  { id: 'import-rules', label: 'Reguły importu z banku', tab: 'import', words: 'słowa kluczowe połączone nazwy nazwiska duplikaty mbank' },
  { id: 'ictj', label: 'Folder ICTTJ i scenariusz prognozy', tab: 'ictj', words: 'ict trade journal cele' },
  { id: 'shortcut', label: 'Skrót szybkiego wpisu', tab: 'notify', words: 'globalny skrót klawisz' },
  { id: 'notifications', label: 'Powiadomienia', tab: 'notify', words: 'wieczorny raport przypomnienie' },
  { id: 'sounds', label: 'Dźwięki i głośność', tab: 'notify' },
  { id: 'zoom', label: 'Rozmiar interfejsu', tab: 'view', words: 'skala powiększenie zoom' },
  { id: 'contrast', label: 'Wyższy kontrast', tab: 'view', words: 'wygląd' },
  { id: 'hide', label: 'Ukrywanie kwot', tab: 'view', words: 'prywatność bezczynność blokada ekranu' },
  { id: 'folder', label: 'Folder danych', tab: 'folder', words: 'onedrive zmiana folderu' },
  { id: 'backups', label: 'Kopie zapasowe i odzyskanie z kopii', tab: 'folder', words: 'backup kopia zip' },
  { id: 'tray', label: 'Zasobnik i autostart', tab: 'system', words: 'start z windows zamykanie' },
  { id: 'updates', label: 'Aktualizacje i token GitHub', tab: 'updates', words: 'wersja' }
]

const ITEM = 'flex h-[30px] items-center gap-2 px-2 text-[12.5px] data-[selected=true]:bg-accent-soft data-[selected=true]:text-fg-strong'
const NO_HITS: SearchHits = { operations: [], containers: [], goals: [], loans: [], members: [], settings: [] }

/**
 * Ctrl+K: every screen, the settings tabs, the commands of the app – and the records (F19): operations (the search of
 * Operacje, the amount too), containers, goals, loans, members and the settings' items; Enter opens one on its screen.
 */
export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const layoutPresets = useData((s) => s.fi?.settings.layoutPresets ?? NO_PRESETS)
  const page = useUi((s) => s.route.page)
  // „Pokaż na 5 minut” / „do końca sesji” only with the amounts hidden (F40): nothing to hide again otherwise.
  const hidden = useMachine((s) => s.prefs.hideAmounts)

  const actions: Action[] = useMemo(
    () => [
      { id: 'new-operation', label: 'Nowa operacja', keys: 'Ctrl N', run: () => void newOperation() },
      { id: 'wizard', label: 'Kreator startu budżetu', run: () => startWizard() },
      { id: 'quick', label: 'Szybki wpis (okno nad wszystkimi)', run: () => void api.quickOpen() },
      { id: 'hide-amounts', label: 'Ukryj / pokaż kwoty', keys: 'Ctrl $', run: () => toggleHideAmounts() },
      ...(hidden
        ? [
            { id: 'reveal-5', label: 'Pokaż ukryte kwoty na 5 minut', run: () => void revealAmounts(5) },
            { id: 'reveal-session', label: 'Pokaż ukryte kwoty do końca sesji', run: () => void revealAmounts(null) }
          ]
        : []),
      { id: 'open-ictj', label: 'Otwórz ICT Trade Journal', run: () => void openIctj(() => navigate({ page: 'settings', tab: 'ictj' })) },
      { id: 'dock', label: 'Dokowanie: następna dostawa z XTB', run: () => (openFirstDocking() ? navigate({ page: 'bridge' }) : toast('Brak dostaw do zadokowania.')) },
      ...PAGES.map((p) => ({ id: `page-${p.page}`, label: `${p.label} – ${p.sub}`, keys: `Ctrl ${p.key}`, run: () => navigate({ page: p.page }) })),
      { id: 'sync', label: 'Synchronizacja i problemy', keys: 'Ctrl Shift Y', run: () => navigate({ page: 'sync' }) },
      { id: 'inbox', label: 'Meldunki do rozpatrzenia', keys: 'Ctrl Shift M', run: () => navigate({ page: 'inbox' }) },
      ...SETTINGS_TABS.map((t) => ({ id: `settings-${t.id}`, label: `Ustawienia: ${t.label}`, run: () => navigate({ page: 'settings', tab: t.id }) })),
      ...layoutPresets
        .filter((p) => p.page === page)
        .map((p) => ({ id: `layout-${p.id}`, label: `Układ tej strony: „${p.name}”`, run: () => applyPageLayout(page, p, `Układ „${p.name}”.`) })),
      {
        id: 'save',
        label: 'Zapisz teraz',
        keys: 'Ctrl S',
        run: () => void saveNow()
      },
      {
        id: 'backup',
        label: 'Kopia zapasowa teraz',
        run: () =>
          void saveFirst('kopia')
            .then(() => api.backupNow())
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
    [layoutPresets, page, hidden]
  )

  const [query, setQuery] = useState('')
  // Each opening starts empty.
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])
  const deferred = useDeferredValue(query)
  const hits = useRecordHits(open ? deferred : '')
  // The commands by the words typed (no Polish letters), in their order.
  const shownActions = useMemo(() => {
    const ws = fold(query).split(/\s+/).filter(Boolean)
    return ws.length ? actions.filter((a) => ws.every((w) => fold(a.label).includes(w))) : actions
  }, [actions, query])

  if (!open) return null
  const run = (fn: () => void) => {
    setPalette(false)
    setQuery('')
    fn()
  }
  const any = shownActions.length + hits.operations.length + hits.containers.length + hits.goals.length + hits.loans.length + hits.members.length + hits.settings.length > 0
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-black/55 pt-[12vh]" onMouseDown={() => setPalette(false)}>
      <div className="w-[640px] animate-pop-in border border-line-strong bg-panel" onMouseDown={(e) => e.stopPropagation()} data-testid="palette">
        <Command
          label="Paleta komend"
          loop
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              setPalette(false)
            }
          }}
        >
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Komenda, ekran albo wpis: kontrahent, kwota, kontener, cel…"
            className="h-[40px] w-full border-b border-line bg-transparent px-3 text-[13px] text-fg-strong outline-none placeholder:text-dim"
            data-testid="palette-input"
          />
          <Command.List className="max-h-[52vh] overflow-y-auto p-1">
            {!any && <div className="px-3 py-4 text-muted">Nic nie znaleziono.</div>}
            {shownActions.length > 0 && (
              <Command.Group heading="Akcje" className={GROUP}>
                {shownActions.map((a) => (
                  <Command.Item key={a.id} value={`action:${a.id}`} onSelect={() => run(a.run)} className={ITEM}>
                    <span className="flex-1">{a.label}</span>
                    {a.keys && <Kbd>{a.keys}</Kbd>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <RecordGroups hits={hits} run={run} />
          </Command.List>
        </Command>
      </div>
    </div>
  )
}

/** The records a query names (F19) – the search of the window's records, once per query. */
function useRecordHits(query: string): SearchHits {
  const transactions = useData((s) => s.records.transactions)
  const containers = useData((s) => s.records.containers)
  const goals = useData((s) => s.records.goals)
  const loans = useData((s) => s.records.loans)
  const fi = useData((s) => s.fi)
  const categories = useCategories()
  const accounts = useAccounts()
  return useMemo(() => {
    if (!fi || !query.trim()) return NO_HITS
    return searchRecords(query, {
      transactions: listOf(transactions),
      containers: listOf(containers),
      goals: listOf(goals),
      loans: listOf(loans),
      members: fi.settings.household.members,
      settings: SETTINGS_ITEMS,
      ctx: { categories, accounts, orders: fi.settings.orders }
    })
  }, [query, transactions, containers, goals, loans, fi, categories, accounts])
}

function RecordGroups({ hits, run }: { hits: SearchHits; run: (fn: () => void) => void }) {
  const accounts = useAccounts()
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''
  const zl = (g: number) => `${plnText(g)} zł`
  return (
    <>
      {hits.operations.length > 0 && (
        <Command.Group heading="Operacje" className={GROUP}>
          {hits.operations.map((t) => (
            <Command.Item key={t.id} value={`operation:${t.id}`} onSelect={() => run(() => openOperation(t))} className={ITEM} data-testid="palette-operation">
              <span className="num w-[78px] shrink-0 text-muted">{plDate(t.date)}</span>
              <span className="min-w-0 flex-1 truncate">{t.counterparty || t.title || '—'}</span>
              <span className="w-[90px] shrink-0 truncate text-right text-[11px] text-dim">{name(t.accountId)}</span>
              <span className="num w-[100px] shrink-0 text-right text-fg-strong">{zl(t.amount)}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {hits.containers.length > 0 && (
        <Command.Group heading="Ładownia" className={GROUP}>
          {hits.containers.map((c) => (
            <Command.Item key={c.id} value={`container:${c.id}`} onSelect={() => run(() => focusRecord('container', c.id, { page: 'cargo' }))} className={ITEM} data-testid="palette-container">
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {c.archived && <span className="text-[11px] text-dim">archiwum</span>}
              <span className="num w-[100px] shrink-0 text-right">{zl(c.amount)}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {hits.goals.length > 0 && (
        <Command.Group heading="Cele" className={GROUP}>
          {hits.goals.map((g) => (
            <Command.Item key={g.id} value={`goal:${g.id}`} onSelect={() => run(() => focusRecord('goal', g.id, { page: 'starmap' }))} className={ITEM} data-testid="palette-goal">
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              {g.archived && <span className="text-[11px] text-dim">archiwum</span>}
              {g.target > 0 && <span className="num w-[100px] shrink-0 text-right">{zl(g.target)}</span>}
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {hits.loans.length > 0 && (
        <Command.Group heading="Pożyczki" className={GROUP}>
          {hits.loans.map((l) => (
            <Command.Item key={l.id} value={`loan:${l.id}`} onSelect={() => run(() => focusRecord('loan', l.id, { page: 'radar' }))} className={ITEM} data-testid="palette-loan">
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
              {l.closedAt && <span className="text-[11px] text-dim">zamknięta</span>}
              <span className="num w-[100px] shrink-0 text-right">{zl(l.amount)}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {hits.members.length > 0 && (
        <Command.Group heading="Domownicy" className={GROUP}>
          {hits.members.map((m) => (
            <Command.Item key={m.id} value={`member:${m.id}`} onSelect={() => run(() => focusRecord('member', m.id, { page: 'settings', tab: 'household' }))} className={ITEM} data-testid="palette-member">
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              {m.archived && <span className="text-[11px] text-dim">archiwum</span>}
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {hits.settings.length > 0 && (
        <Command.Group heading="Ustawienia" className={GROUP}>
          {hits.settings.map((x) => (
            <Command.Item key={x.id} value={`setting:${x.id}`} onSelect={() => run(() => navigate({ page: 'settings', tab: x.tab as SettingsTab }))} className={ITEM} data-testid="palette-setting">
              <span className="min-w-0 flex-1 truncate">{x.label}</span>
              <span className="text-[11px] text-dim">{SETTINGS_TABS.find((t) => t.id === x.tab)?.label}</span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
    </>
  )
}
