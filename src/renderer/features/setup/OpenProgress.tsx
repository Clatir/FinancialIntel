import { useEffect, useState } from 'react'
import type { OpenProgress, OpenStep } from '@shared/api'
import { api, errorMessage } from '../../lib/api'
import { toast } from '../../store/ui'

/**
 * Opening a data folder, live (1.4.1): the step, the files read, the file waiting longest, how long it takes. On a new
 * computer OneDrive fetches every online-only file on its first read – then the screen says so and how to avoid it;
 * „Przerwij” goes back to choosing a folder without changing anything in it.
 */

/** The progress of the open in flight (null until the main process reports; `reset` before a new open). */
export function useOpenProgress(): [OpenProgress | null, () => void] {
  const [p, setP] = useState<OpenProgress | null>(null)
  useEffect(() => api.onOpenProgress(setP), [])
  return [p, () => setP(null)]
}

const seconds = (ms: number) => `${Math.floor(ms / 1000)} s`

function stepLabel(p: OpenProgress): string {
  const labels: Record<OpenStep, string> = {
    inspect: 'Sprawdzanie folderu',
    list: `Szukanie plików – znaleziono ${p.total}`,
    read: `Wczytywanie plików: ${p.done} z ${p.total}`,
    migrate: 'Aktualizacja formatu danych',
    prepare: 'Przygotowanie danych',
    machines: 'Sprawdzanie innych komputerów'
  }
  return labels[p.step]
}

export const openLogs = () => void api.openLogs().catch((e) => toast(errorMessage(e), 'error'))

export function OpenProgressPanel({ progress: p }: { progress: OpenProgress }) {
  const [stopping, setStopping] = useState(false)
  const share = p.step === 'read' && p.total ? p.done / p.total : p.step === 'list' || p.step === 'inspect' ? 0 : 1
  const waitingLong = p.waiting && p.waiting.ms >= p.slowMs
  const cloud = p.slow > 0 || waitingLong
  // Once the folder is read (migration, the other computers) the open no longer stops: it only finishes.
  const canStop = p.step === 'inspect' || p.step === 'list' || p.step === 'read'
  const stop = () => {
    setStopping(true)
    void api.cancelOpen().catch((e) => toast(errorMessage(e), 'error'))
  }
  return (
    <div className="flex flex-col gap-2 border border-line bg-raised px-3 py-2.5 text-[12px]" data-testid="open-progress" data-step={p.step}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-fg-strong" data-testid="open-progress-step">
          {stepLabel(p)}
        </span>
        <span className="num text-[11px] text-muted" data-testid="open-progress-time">
          {seconds(p.elapsedMs)}
        </span>
      </div>
      <div className="h-1 w-full bg-line" aria-hidden>
        <div className="h-1 bg-accent transition-[width] duration-150" style={{ width: `${Math.round(share * 100)}%` }} data-testid="open-progress-bar" />
      </div>
      <div className="num truncate text-[11px] text-muted" title={p.dir}>
        {p.dir}
      </div>
      {p.waiting && p.waiting.ms >= 1000 && (
        <div className="num truncate text-[11px] text-muted" title={p.waiting.relPath} data-testid="open-progress-waiting">
          Czeka {seconds(p.waiting.ms)}: {p.waiting.relPath}
        </div>
      )}
      {cloud && (
        <div className="border border-accent/40 bg-accent-soft px-2.5 py-2 text-fg-strong" data-testid="open-progress-cloud">
          Pliki czytają się wolno{p.slow > 0 ? ` (${p.slow} czekało dłużej niż ${seconds(p.slowMs)})` : ''} – zwykle to OneDrive pobiera je z chmury,
          bo na tym komputerze są dostępne tylko online. Przy pierwszym otwarciu to normalne, ale może potrwać kilka minut. Szybciej: w Eksploratorze
          kliknij folder danych prawym przyciskiem → „Zawsze zachowuj na tym urządzeniu”, poczekaj na zielone ptaszki i otwórz go ponownie.
        </div>
      )}
      <div className="flex gap-2">
        <button
          className="btn"
          disabled={stopping || !canStop}
          onClick={stop}
          title={canStop ? 'Wróć do wyboru folderu – nic w nim nie zmieniam' : 'Folder jest już wczytany – kończę otwieranie'}
          data-testid="open-cancel"
        >
          {stopping ? 'Przerywanie…' : 'Przerwij'}
        </button>
        <button className="btn" onClick={openLogs} data-testid="open-logs">
          Otwórz folder logów
        </button>
      </div>
    </div>
  )
}
