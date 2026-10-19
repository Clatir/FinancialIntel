// adapted from ICTTJ src/renderer/features/setup/FolderSetup.tsx @ 84a8339
import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../lib/api'
import { toast } from '../../store/ui'
import { openResult, useData } from '../../store/data'
import { IconFolder, IconPlus } from '../../components/icons'
import { OpenProgressPanel, openLogs, useOpenProgress } from './OpenProgress'

/** The same folder whatever the case and the trailing separator (Windows paths). */
const samePath = (a: string, b: string) => {
  const n = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
  return n(a) === n(b)
}

/**
 * First run (or a missing folder): where the data lives. The proposal is `OneDrive\FinancialIntel` (decision E0-2) –
 * one click creates it there; another folder (new or existing) through the system dialog. The buttons follow why the
 * folder did not open (B53), never the message's words.
 */
export function FolderSetup() {
  const message = useData((s) => s.setupMessage)
  const dir = useData((s) => s.setupDir)
  const why = useData((s) => s.setupProblem)
  const [busy, setBusy] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const [proposal, setProposal] = useState<{ dir: string; oneDrive: boolean } | null>(null)
  const [progress, resetProgress] = useOpenProgress()
  useEffect(() => {
    void api.defaultDataDir().then(setProposal, () => undefined)
  }, [])
  const run = async (fn: () => ReturnType<typeof api.pickDataDir>) => {
    resetProgress()
    setConfirmNew(false)
    setBusy(true)
    try {
      await openResult(await fn())
    } catch (e) {
      toast(errorMessage(e), 'error', 7000)
    } finally {
      setBusy(false)
    }
  }
  const p = why?.problem
  const remembered = !!why?.remembered
  // Stopped, failed, unavailable, FI data without fi.json yet (OneDrive still syncing) or the remembered folder found
  // empty: a retry. New data never goes to the remembered folder unasked – it would split the budget once OneDrive
  // brings the old one (B53): only „Utwórz tu nowe dane…” with a confirmation.
  const canRetry = why?.reason === 'aborted' || why?.reason === 'error' || p === 'missing' || p === 'unavailable' || p === 'partial' || (p === 'empty' && remembered)
  const canCreate = p === 'empty' && !remembered
  const canStartOver = remembered && (p === 'empty' || p === 'missing')
  const subfolder = p === 'other' ? why?.subfolder : undefined
  // The proposal is that very folder: one click must not create data in it.
  const proposalBlocked = !!proposal && !!dir && samePath(proposal.dir, dir) && (p === 'missing' || p === 'unavailable' || p === 'empty' || p === 'partial')
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
          {busy && progress && <OpenProgressPanel progress={progress} />}
          {message && (
            <div className="border border-accent/40 bg-accent-soft px-3 py-2 text-fg-strong" data-testid="setup-message">
              {message}
              {dir && <div className="num mt-1 truncate text-[11px] text-muted">{dir}</div>}
              {dir && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {canRetry && (
                    <button className="btn btn-accent" disabled={busy} onClick={() => run(() => api.openDataDir(dir, false))} data-testid="retry-folder">
                      Spróbuj ponownie
                    </button>
                  )}
                  {canCreate && (
                    <button className="btn btn-accent" disabled={busy} onClick={() => run(() => api.openDataDir(dir, true))} data-testid="create-here">
                      <IconPlus size={13} /> Utwórz dane tutaj
                    </button>
                  )}
                  {subfolder && (
                    <button className="btn btn-accent" disabled={busy} onClick={() => run(() => api.openDataDir(subfolder, true))} data-testid="create-subfolder">
                      <IconPlus size={13} /> Utwórz podfolder FinancialIntel
                    </button>
                  )}
                  {canStartOver &&
                    (confirmNew ? (
                      <button className="btn border-down/60 text-down" disabled={busy} onClick={() => run(() => api.openDataDir(dir, true, true))} data-testid="start-over-confirm">
                        Na pewno – nowy budżet w tym folderze
                      </button>
                    ) : (
                      <button className="btn" disabled={busy} onClick={() => setConfirmNew(true)} title="Tylko gdy budżet ma zacząć się od nowa – stare dane, które OneDrive jeszcze pobierze, trafią obok jako konflikt" data-testid="start-over">
                        Utwórz tu nowe dane…
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
          {proposal && !proposalBlocked && (
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
          <div className="flex justify-end">
            <button className="text-[11px] text-muted hover:text-fg" onClick={openLogs} data-testid="setup-logs">
              Folder logów (diagnostyka)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
