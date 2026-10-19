/**
 * The pairs of transfers of before 1.7.0 shown before they are joined (F10): each move's two operations, those whose
 * sides name no account marked to check – matched by the amount and the days only (an import before 1.7.0 named none).
 * An unticked pair stays reported; „zostaw tak” stops reporting it (two moves).
 */
import { useMemo, useState } from 'react'
import { dm } from '@shared/calc/briefing'
import type { Transaction } from '@shared/schema'
import { plnText } from '../../components/fields'
import { Modal } from '../../components/Modal'
import { ShowMore } from '../../components/ui'
import { plDate, plural } from '../../lib/format'
import { listOf, useData, useFolderLocked } from '../../store/data'
import { useAccounts } from '../operations/pickers'
import { dismissTransfer, joinTransfers, transferIssuesOf, transferKey, type JoinIssue } from '../operations/transfers'

type Pair = Extract<JoinIssue, { kind: 'pair' }>
const PAGE = 100

/** Neither side names the other account: a pair by the amount and the days only. */
const unnamed = (p: Pair): boolean => !p.keep.counterAccountId && !p.drop.counterAccountId

export function TransferPairs({ onClose }: { onClose: () => void }) {
  const transactions = useData((s) => s.records.transactions)
  const balances = useData((s) => s.records.balances)
  const fi = useData((s) => s.fi)
  const readOnly = useFolderLocked()
  const accounts = useAccounts()
  // The pairs as they are now: a pair said „zostaw tak” goes from the list.
  const pairs = useMemo(() => (fi ? transferIssuesOf(listOf(transactions), useData.getState()).filter((i): i is Pair => i.kind === 'pair') : []), [transactions, balances, fi])
  const [off, setOff] = useState<ReadonlySet<string>>(new Set())
  const [limit, setLimit] = useState(PAGE)
  const chosen = pairs.filter((p) => !off.has(transferKey(p)))
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'konto spoza listy'
  const who = (t: Transaction) => t.counterparty || t.title || '—'
  const tick = (key: string, on: boolean) =>
    setOff((s) => {
      const next = new Set(s)
      if (on) next.delete(key)
      else next.add(key)
      return next
    })
  return (
    <Modal
      title="Przelewy zapisane jako dwie operacje"
      width={720}
      onClose={onClose}
      testId="inbox-pairs"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Anuluj
          </button>
          <button
            type="button"
            className="btn btn-accent"
            disabled={readOnly || !chosen.length}
            onClick={() => {
              onClose()
              void joinTransfers(chosen)
            }}
            data-testid="inbox-pairs-join"
          >
            Połącz zaznaczone ({chosen.length})
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-[12px]">
        <p className="text-muted">
          Każda para to jeden przelew między kontami budżetu zapisany przed 1.7.0 jako dwie operacje – po połączeniu jedna operacja obejmie oba konta. Salda i
          warstwy się nie zmienią; „Cofnij” po połączeniu.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost h-[22px]" onClick={() => setOff(new Set())} data-testid="inbox-pairs-all">
            zaznacz wszystkie
          </button>
          <button type="button" className="btn btn-ghost h-[22px]" onClick={() => setOff(new Set(pairs.map(transferKey)))} data-testid="inbox-pairs-none">
            odznacz wszystkie
          </button>
          <span className="text-muted">
            {chosen.length} z {pairs.length} {plural(pairs.length, 'pary', 'par', 'par')}
          </span>
        </div>
        {!pairs.length && <p className="text-muted">Nic do połączenia.</p>}
        <div className="flex flex-col">
          {pairs.slice(0, limit).map((p) => {
            const key = transferKey(p)
            return (
              <div key={key} className="flex items-start gap-2 border-b border-line/60 py-1.5 last:border-b-0" data-testid="inbox-pair" data-unnamed={unnamed(p) ? '1' : undefined}>
                <input type="checkbox" className="mt-0.5" checked={!off.has(key)} onChange={(e) => tick(key, e.currentTarget.checked)} aria-label="Połącz tę parę" data-testid="inbox-pair-tick" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span>
                    <span className="num">{plDate(p.keep.date)}</span> {name(p.keep.accountId)} → {name(p.drop.accountId)}
                    {p.drop.date !== p.keep.date && <span className="text-muted"> (wpływ {dm(p.drop.date)})</span>} ·{' '}
                    <span className="num text-fg-strong">{plnText(Math.abs(p.keep.amount))} zł</span>
                  </span>
                  <span className="truncate text-[11px] text-muted">
                    {who(p.keep)} / {who(p.drop)}
                  </span>
                  {unnamed(p) && (
                    <span className="text-[11px] text-accent" data-testid="inbox-pair-check">
                      Żadna strona nie wskazuje konta – para po kwocie i dniu; sprawdź, czy to jeden przelew.
                    </span>
                  )}
                </div>
                {!readOnly && (
                  <button type="button" className="btn btn-ghost h-[22px] shrink-0" onClick={() => dismissTransfer(p)} title="To dwa osobne przelewy – nie zgłaszaj tej pary" data-testid="inbox-pair-dismiss">
                    zostaw tak
                  </button>
                )}
              </div>
            )
          })}
          <ShowMore shown={Math.min(limit, pairs.length)} total={pairs.length} page={PAGE} onMore={() => setLimit((n) => n + PAGE)} testId="inbox-pairs-more" />
        </div>
      </div>
    </Modal>
  )
}
