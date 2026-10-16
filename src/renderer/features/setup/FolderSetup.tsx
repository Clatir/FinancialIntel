// adapted from ICTTJ src/renderer/features/setup/FolderSetup.tsx @ 84a8339
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { openResult, useData } from '../../store/data'
import { IconFolder, IconPlus } from '../../components/icons'

/**
 * First run (or a missing folder): where the data lives. The proposal is `OneDrive\FinancialIntel` (decision E0-2) –
 * one click creates it there; another folder (new or existing) through the system dialog. The full start wizard
 * (accounts, history, salary, layers) comes in stage E3.
 */
export function FolderSetup() {
  const message = useData((s) => s.setupMessage)
  const dir = useData((s) => s.setupDir)
  const [busy, setBusy] = useState(false)
  const [proposal, setProposal] = useState<{ dir: string; oneDrive: boolean } | null>(null)
  useEffect(() => {
    void api.defaultDataDir().then(setProposal, () => undefined)
  }, [])
  const run = async (fn: () => ReturnType<typeof api.pickDataDir>) => {
    setBusy(true)
    try {
      await openResult(await fn())
    } finally {
      setBusy(false)
    }
  }
  const unavailable = !!message && /niedostępny/.test(message)
  return (
    <div className="flex h-full items-center justify-center bg-bg">
      <div className="w-[600px] animate-pop-in border border-line bg-panel" data-testid="folder-setup">
        <div className="border-b border-line px-4 py-3">
          <div className="text-[15px] font-semibold text-fg-strong">
            Financial<span className="text-accent">·</span>Intel
          </div>
          <div className="mt-0.5 text-muted">Kapitanie, gdzie trzymamy dziennik pokładowy?</div>
        </div>
        <div className="flex flex-col gap-3 p-4 text-[12.5px]">
          <p className="text-fg">
            Dane to zwykłe pliki JSON w jednym folderze. Najlepiej w OneDrive – wtedy każdy Twój komputer widzi ten sam budżet. Ten wybór
            jest zapamiętywany na tym komputerze; na innym komputerze wskażesz ten sam folder.
          </p>
          {message && (
            <div className="border border-accent/40 bg-accent-soft px-3 py-2 text-fg-strong" data-testid="setup-message">
              {message}
              {dir && <div className="num mt-1 truncate text-[11px] text-muted">{dir}</div>}
              {dir && (
                <div className="mt-2 flex gap-2">
                  {unavailable && (
                    <button className="btn btn-accent" disabled={busy} onClick={() => run(() => api.openDataDir(dir, false))} data-testid="retry-folder">
                      Spróbuj ponownie
                    </button>
                  )}
                  <button className={unavailable ? 'btn' : 'btn btn-accent'} disabled={busy} onClick={() => run(() => api.openDataDir(dir, true))} data-testid="create-here">
                    <IconPlus size={13} /> Utwórz dane tutaj
                  </button>
                </div>
              )}
            </div>
          )}
          {proposal && (
            <button
              className="btn btn-accent h-[62px] flex-col items-start justify-center gap-0.5 px-3"
              disabled={busy}
              onClick={() => run(() => api.openDataDir(proposal.dir, true))}
              data-testid="setup-default"
            >
              <span className="flex items-center gap-2 text-[13px]">
                <IconPlus size={14} /> {proposal.oneDrive ? 'Utwórz w OneDrive (zalecane)' : 'Utwórz w Dokumentach'}
              </span>
              <span className="num max-w-full truncate text-[11px] text-muted" data-testid="setup-default-dir">
                {proposal.dir}
                {!proposal.oneDrive && ' – OneDrive nie jest skonfigurowany na tym komputerze'}
              </span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn h-[58px] flex-col items-start justify-center gap-0.5 px-3" disabled={busy} onClick={() => run(() => api.pickDataDir('create'))} data-testid="setup-create">
              <span className="flex items-center gap-2 text-[13px]">
                <IconPlus size={14} /> Nowe dane gdzie indziej
              </span>
              <span className="text-[11px] text-muted">wybierz pusty folder</span>
            </button>
            <button className="btn h-[58px] flex-col items-start justify-center gap-0.5 px-3" disabled={busy} onClick={() => run(() => api.pickDataDir('open'))} data-testid="setup-open">
              <span className="flex items-center gap-2 text-[13px]">
                <IconFolder size={14} /> Otwórz istniejące
              </span>
              <span className="text-[11px] text-muted">folder z plikiem fi.json (np. z drugiego komputera)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
