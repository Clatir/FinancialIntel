/**
 * „Ostatnie importy” and „Cofnij import” (1.5.1, F4): the last ten imports of the bank's files; the latest one that
 * stands can be taken back, with what it does said before.
 */
import { useState } from 'react'
import type { ImportBatch } from '@shared/schema'
import { Modal } from '../../components/Modal'
import { Panel } from '../../components/ui'
import { useFolderLocked } from '../../store/data'
import { plDate } from '../../lib/format'
import { useAccounts } from '../operations/pickers'
import { undoImport, undoPreview, useImportBatches, useLatestImport } from './batches'

const when = (iso: string) => new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })

/** „Cofnij import”: a dialog with what taking it back does now, then the undo (its toast has „Cofnij”). */
export function UndoImportButton({ batch, testId = 'import-undo' }: { batch: ImportBatch; testId?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const readOnly = useFolderLocked()
  // Counted when the dialog opens (the operations may change while it is closed).
  const plan = open ? undoPreview(batch) : null
  const confirm = async () => {
    setBusy(true)
    const ok = await undoImport(batch.id)
    setBusy(false)
    if (ok) setOpen(false)
  }
  return (
    <>
      <button className="btn h-[24px]" disabled={readOnly} onClick={() => setOpen(true)} title="Usuwa operacje z tego importu i cofa jego zmiany – z „Cofnij” po wszystkim" data-testid={testId}>
        Cofnij import
      </button>
      {open && plan && (
        <Modal
          title="Cofnij import"
          width={540}
          onClose={busy ? undefined : () => setOpen(false)}
          testId="import-undo-dialog"
          footer={
            <>
              <span className="flex-1 text-[11px] text-dim">Po cofnięciu toast ma „Cofnij” – import wraca w całości.</span>
              <button className="btn h-[26px]" disabled={busy} onClick={() => setOpen(false)}>
                Anuluj
              </button>
              <button className="btn h-[26px] border-down/60 text-down" disabled={busy} onClick={() => void confirm()} data-testid="import-undo-confirm">
                {busy ? 'Cofam…' : 'Cofnij import'}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-1.5 px-3 py-2 text-[12px]">
            <span className="text-muted">
              Import z {when(batch.at)}
              {batch.fileName ? ` · ${batch.fileName}` : ''}
              {batch.period ? ` · ${plDate(batch.period.from)} – ${plDate(batch.period.to)}` : ''}
            </span>
            <ul className="flex list-disc flex-col gap-1 pl-5" data-testid="import-undo-plan">
              <li>
                usunie operacje, które utworzył: <b className="num">{plan.remove.length}</b>
                {plan.changed > 0 && (
                  <span className="text-accent" data-testid="import-undo-changed">
                    {' '}
                    – w tym zmienione później przez Ciebie: {plan.changed} (te zmiany też znikną)
                  </span>
                )}
                {plan.docked > 0 && <span className="text-accent"> – zadokowane z ICTTJ: {plan.docked} (dostawa znów poczeka na operację)</span>}
              </li>
              {plan.restore.length > 0 && (
                <li>
                  cofnie zmiany we wpisach, które połączył z bankiem albo rozliczył: <b className="num">{plan.restore.length}</b> (Twoje późniejsze zmiany zostają)
                </li>
              )}
              {plan.readd.length > 0 && (
                <li>
                  odzyska nierozliczone operacje, które usunął: <b className="num">{plan.readd.length}</b>
                </li>
              )}
              {plan.rulesBack > 0 && (
                <li>
                  cofnie reguły, których się nauczył albo które zmienił: <b className="num">{plan.rulesBack}</b>
                </li>
              )}
              {plan.rulesKept > 0 && <li className="text-muted">reguły zmienione albo usunięte po imporcie zostają, jak są: {plan.rulesKept}</li>}
              {plan.confirmations.length > 0 && <li>usunie potwierdzenie salda z pliku banku</li>}
              {plan.missing > 0 && <li className="text-muted">operacji tego importu już nie ma (usunięte albo jeszcze się synchronizują): {plan.missing}</li>}
            </ul>
            <span className="text-[11px] text-dim">Kolejny import tego pliku wczyta te operacje od nowa.</span>
          </div>
        </Modal>
      )}
    </>
  )
}

/** The counts of an import, as one line. */
function countsText(b: ImportBatch): string {
  const c = b.counts
  const parts = [`nowe ${c.created ?? 0}`, ...(c.merged ? [`połączone ${c.merged}`] : []), ...(c.sides ? [`drugie strony przelewów ${c.sides}`] : []), ...(c.settled ? [`rozliczone ${c.settled}`] : []), ...(c.removed ? [`usunięte ${c.removed}`] : []), ...(c.moved ? [`przeniesione ${c.moved}`] : [])]
  return parts.join(' · ')
}

/** Ustawienia → Import z banku: the last ten imports, „Cofnij import” at the latest one that stands. */
export function RecentImports() {
  const batches = useImportBatches()
  const latest = useLatestImport()
  const accounts = useAccounts()
  return (
    <Panel title="Ostatnie importy">
      <p className="mb-2 text-[11.5px] text-muted">
        Ostatnie dziesięć importów z banku. Cofnąć można ostatni, który stoi – cały plik naraz: utworzone operacje znikają, połączone i rozliczone wpisy są jak przed
        importem, reguły też.
      </p>
      {batches.length === 0 && <span className="text-[11.5px] text-dim">Brak – pojawią się po pierwszym imporcie.</span>}
      <div className="flex flex-col" data-testid="recent-imports">
        {batches.map((b) => (
          <div key={b.id} className="grid grid-cols-[136px_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-2 border-b border-line/60 py-[3px] text-[12px] last:border-b-0" data-testid="recent-import">
            <span className="num text-fg-strong">{when(b.at)}</span>
            <span className="truncate text-muted" title={b.fileName}>
              {accounts.find((a) => a.id === b.accountId)?.name ?? 'konto'}
              {b.fileName ? ` · ${b.fileName}` : ''}
            </span>
            <span className="truncate text-muted">{countsText(b)}</span>
            {b.undoneAt ? (
              <span className="text-[11px] text-dim" data-testid="recent-import-undone">
                cofnięty {when(b.undoneAt)}
              </span>
            ) : latest?.id === b.id ? (
              <UndoImportButton batch={b} testId="recent-import-undo" />
            ) : (
              <span className="text-[11px] text-dim" title="Importy cofa się od ostatniego">
                —
              </span>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}
