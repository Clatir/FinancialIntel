// adapted from ICTTJ src/renderer/app/Banners.tsx @ 84a8339
import { useState, type ReactNode } from 'react'
import { warsawNow } from '@shared/calc/dates'
import { useData } from '../store/data'
import { navigate, useUi } from '../store/ui'
import { startWizard } from '../features/wizard/state'
import { dismissUpdateNotice, downloadUpdate, restartToUpdate, useUpdate } from '../store/update'
import { openExternalSafe } from '../features/settings/UpdatesTab'
import { IconCheck, IconSync, IconWarn } from '../components/icons'
import { cx } from '../components/ui'

interface BannerItem {
  key: string
  text: string
  icon?: ReactNode
  actions?: Array<{ label: string; onClick: () => void; accent?: boolean; testId?: string }>
  onClose?: () => void
}

const showUpdates = () => navigate({ page: 'settings', tab: 'updates' })

function useUpdateBanners(): BannerItem[] {
  const s = useUpdate((x) => x.state)
  // Hidden for this session only ("later"); key = phase + version.
  const [hidden, setHidden] = useState<string | null>(null)
  if (!s) return []
  const items: BannerItem[] = []
  if (s.justUpdated)
    items.push({
      key: 'updated',
      icon: <IconCheck size={14} className="shrink-0 text-accent" />,
      text: `Zaktualizowano do wersji ${s.justUpdated.version}.`,
      actions: [{ label: 'Co nowego', onClick: showUpdates }],
      onClose: () => void dismissUpdateNotice()
    })
  const v = s.release?.version ?? ''
  const key = `${s.phase}:${v}`
  if (hidden === key) return items
  const close = () => setHidden(key)
  if (s.phase === 'ready')
    items.push({
      key: 'update-ready',
      icon: <IconSync size={14} className="shrink-0 text-accent" />,
      text: `Wersja ${v} jest pobrana – zainstaluje się po zamknięciu aplikacji.`,
      actions: [
        { label: 'Uruchom ponownie teraz', onClick: () => void restartToUpdate(), accent: true, testId: 'banner-restart-update' },
        { label: 'Szczegóły', onClick: showUpdates }
      ],
      onClose: close
    })
  else if (s.phase === 'available' && (s.mode === 'manual' || !s.prefs.autoDownload))
    items.push({
      key: 'update-available',
      icon: <IconSync size={14} className="shrink-0 text-accent" />,
      text: `Dostępna nowa wersja ${v}.`,
      actions: [
        s.mode === 'manual'
          ? { label: 'Pobierz ze strony', onClick: () => s.release && openExternalSafe(s.release.htmlUrl), accent: true }
          : { label: 'Pobierz', onClick: () => void downloadUpdate(), accent: true, testId: 'banner-download-update' },
        { label: 'Szczegóły', onClick: showUpdates }
      ],
      onClose: close
    })
  else if (s.phase === 'downloading' && !s.prefs.autoDownload) {
    const pct = s.progress?.total ? Math.round((s.progress.received / s.progress.total) * 100) : null
    items.push({
      key: 'update-downloading',
      icon: <IconSync size={14} className="shrink-0 text-accent" />,
      text: `Pobieranie wersji ${v}…${pct != null ? ` ${pct}%` : ''}`
    })
  }
  return items
}

export function Banners() {
  const status = useData((s) => s.status)
  const conflicts = useData((s) => s.conflicts.length)
  const problems = useData((s) => s.problems.filter((p) => p.kind !== 'unknown-file').length)
  const updates = useUpdateBanners()
  const budgetStart = useData((s) => (s.fi ? s.fi.settings.budget.start : undefined))
  // The engine already counts from an opening balance (N23, T25 – `budgetStartOf`: one dated today or before): the wizard
  // is still to run, the banner says what it adds. Looked at only before the start.
  const fromOpening = useData((s) => {
    if (!s.fi || s.fi.settings.budget.start) return false
    const today = warsawNow().date
    return Object.values(s.records.balances ?? {}).some((e) => e.record.kind === 'opening' && e.record.date <= today)
  })
  const page = useUi((s) => s.route.page)
  const items: BannerItem[] = []
  if (status?.readOnlyReason) items.push({ key: 'ro', text: status.readOnlyReason })
  // Only a computer in use (a move in its window within 10 min – D86): one in the tray writes nothing in the background.
  const others = (status?.otherMachines ?? []).filter((m) => m.inUse !== false)
  if (others.length)
    items.push({
      key: 'other',
      text: `Ten folder jest też w użyciu na: ${others.map((m) => m.machine).join(', ')} (ruch w oknie w ostatnich 10 min). Skończ tam pracę albo zakończ tam aplikację (ikona w zasobniku → „Zakończ”), żeby uniknąć konfliktów.`
    })
  if (status?.migratedFrom != null)
    items.push({ key: 'mig', text: `Dane zaktualizowano z formatu v${status.migratedFrom} do v${status.appSchemaVersion}. Kopia sprzed migracji: ${status.backupPath}` })
  if (conflicts || problems)
    items.push({
      key: 'sync',
      text: `${conflicts ? `Konflikty synchronizacji: ${conflicts}. ` : ''}${problems ? `Pliki z błędami: ${problems}.` : ''}`,
      actions: [{ label: 'Rozstrzygnij', onClick: () => navigate({ page: 'sync' }), accent: true }]
    })
  // A folder without a running budget: the start wizard (spec, „Kreator startu”) – not while it runs.
  if (budgetStart === null && page !== 'wizard' && !status?.readOnly)
    items.push({
      key: 'wizard',
      icon: <IconWarn size={14} className="shrink-0 text-accent" />,
      text: fromOpening
        ? 'Budżet liczy się na razie od salda otwarcia, bez planu: kreator startu ustawi od dziś salda, pensję, warstwy okrętu i koperty. Dowództwo zacznie się po kreatorze.'
        : 'Budżet jeszcze nie wystartował: kreator startu ustawi salda, pensję, warstwy okrętu i koperty.',
      actions: [{ label: 'Kreator startu', onClick: startWizard, accent: true, testId: 'banner-wizard-start' }]
    })
  items.push(...updates)
  if (!items.length) return null
  return (
    <div className="flex flex-col">
      {items.map((b) => (
        <div
          key={b.key}
          className="flex min-h-[28px] items-center gap-2 border-b border-accent/30 bg-accent-soft px-3 text-[12px] text-fg-strong"
          data-testid={`banner-${b.key}`}
        >
          {b.icon ?? <IconWarn size={14} className="shrink-0 text-accent" />}
          <span className="truncate" title={b.text}>
            {b.text}
          </span>
          {(b.actions?.length || b.onClose) && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {b.actions?.map((a) => (
                <button key={a.label} className={cx('btn h-[22px]', a.accent && 'btn-accent')} onClick={a.onClick} data-testid={a.testId}>
                  {a.label}
                </button>
              ))}
              {b.onClose && (
                <button className="btn btn-ghost h-[22px] w-[22px] justify-center px-0" title="Ukryj" onClick={b.onClose}>
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
