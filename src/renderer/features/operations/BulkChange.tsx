/**
 * Operacje: a change of the ticked operations at once (F11) – delete them, move them onto another account, another
 * kind, a shifted date –, the effect on today's energy, the envelopes, the balances and the shields shown before it is
 * applied; one „Cofnij”.
 */
import { useMemo, useState } from 'react'
import { confirmedChanges } from '@shared/calc/balances'
import type { Effect } from '@shared/calc/effect'
import { noEffect } from '@shared/calc/effect'
import { TX_KIND_LABEL, TX_KINDS, type Transaction, type TxKind } from '@shared/schema'
import { plnText, signedPln } from '../../components/fields'
import { Modal } from '../../components/Modal'
import { plDate, plural } from '../../lib/format'
import { useRecordList } from '../../store/records'
import { AccountSelect, useAccounts, useCategories } from './pickers'
import { applyBulk, bulkEffect, bulkPlan, type BulkChange, type BulkPlan } from './state'

type Action = '' | BulkChange['kind']

const ACTION_LABEL: Record<Exclude<Action, ''>, string> = { delete: 'Usuń', account: 'Przenieś na konto', kind: 'Zmień rodzaj', shift: 'Przesuń datę' }

/** The ticked operations shown, `readOnly` = a folder only to read (the bulk changes off – N2). */
export function BulkChangeBar({ shown, readOnly }: { shown: readonly Transaction[]; readOnly: boolean }) {
  const accounts = useAccounts()
  const [action, setAction] = useState<Action>('')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [kind, setKind] = useState<TxKind>('transfer')
  const [counter, setCounter] = useState<string | null>(null)
  const [days, setDays] = useState(1)
  const [preview, setPreview] = useState<{ plan: BulkPlan; effect: Effect | null; what: string } | null>(null)
  const change = (): BulkChange | null => {
    if (action === 'delete') return { kind: 'delete' }
    if (action === 'account') return accountId ? { kind: 'account', accountId } : null
    if (action === 'kind') return { kind: 'kind', to: kind, counterAccountId: kind === 'transfer' ? counter : null }
    if (action === 'shift') return days ? { kind: 'shift', days } : null
    return null
  }
  const name = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? 'konto spoza budżetu'
  const what = () =>
    action === 'account' ? `„${name(accountId)}”` : action === 'kind' ? `na „${TX_KIND_LABEL[kind]}${kind === 'transfer' && counter ? ` – ${name(counter)}` : ''}”` : action === 'shift' ? `o ${days > 0 ? '+' : ''}${days} ${plural(Math.abs(days), 'dzień', 'dni', 'dni')}` : ''
  const open = () => {
    const c = change()
    if (!c) return
    const plan = bulkPlan(
      shown.map((t) => t.id),
      c
    )
    setPreview({ plan, effect: bulkEffect(plan), what: what() })
  }
  return (
    <>
      <fieldset disabled={readOnly} className="contents">
        <span className="text-muted">zmień</span>
        <select className="input h-[24px] w-[150px] py-0" value={action} onChange={(e) => setAction(e.currentTarget.value as Action)} aria-label="Zmiana zaznaczonych" data-testid="operations-bulk-change">
          <option value="">— wybierz… —</option>
          {(Object.keys(ACTION_LABEL) as Array<keyof typeof ACTION_LABEL>).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </select>
        {action === 'account' && <AccountSelect className="h-[24px] w-[170px] py-0" value={accountId} onChange={setAccountId} data-testid="operations-bulk-account" />}
        {action === 'kind' && (
          <>
            <select className="input h-[24px] w-[140px] py-0" value={kind} onChange={(e) => setKind(e.currentTarget.value as TxKind)} aria-label="Nowy rodzaj" data-testid="operations-bulk-kind">
              {TX_KINDS.filter((k) => k !== 'correction').map((k) => (
                <option key={k} value={k}>
                  {TX_KIND_LABEL[k]}
                </option>
              ))}
            </select>
            {kind === 'transfer' && <AccountSelect className="h-[24px] w-[170px] py-0" value={counter} onChange={setCounter} none="konto spoza budżetu" data-testid="operations-bulk-counter" />}
          </>
        )}
        {action === 'shift' && (
          <input
            type="number"
            className="input num h-[24px] w-[64px] py-0"
            value={days}
            min={-366}
            max={366}
            onChange={(e) => setDays(Math.max(-366, Math.min(366, Math.trunc(Number(e.currentTarget.value) || 0))))}
            aria-label="Dni (minus – wcześniej)"
            title="Dni: na plus – później, na minus – wcześniej"
            data-testid="operations-bulk-days"
          />
        )}
        <button type="button" className="btn h-[24px]" disabled={!change()} onClick={open} data-testid="operations-bulk-preview">
          Podgląd…
        </button>
      </fieldset>
      {preview && <BulkPreview preview={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

function BulkPreview({ preview, onClose }: { preview: { plan: BulkPlan; effect: Effect | null; what: string }; onClose: () => void }) {
  const cats = useCategories()
  const accounts = useAccounts()
  const balances = useRecordList('balances')
  const { plan, effect, what } = preview
  const n = plan.before.length
  const kind = plan.change.kind
  // The confirmed balances it changes (F12) – a correction made at a confirmation stops agreeing with the bank.
  const confirmed = useMemo(() => confirmedChanges(plan.before.map((b, i) => [b, kind === 'delete' ? null : (plan.after[i] ?? null)] as const), balances), [plan, kind, balances])
  const zl = (g: number) => `${plnText(g)} zł`
  const line = (label: string, c: { before: number; after: number }, testId: string, key?: string) => (
    <div key={key} className="flex items-baseline justify-between gap-3" data-testid={testId}>
      <span className="text-muted">{label}</span>
      <span className="num">
        {zl(c.before)} → <span className="text-fg-strong">{zl(c.after)}</span>
      </span>
    </div>
  )
  return (
    <Modal
      title={`${ACTION_LABEL[kind]} ${what}`.trim()}
      width={520}
      onClose={onClose}
      testId="operations-bulk-dialog"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Anuluj
          </button>
          <button
            type="button"
            className={kind === 'delete' ? 'btn border-down/60 text-down' : 'btn btn-accent'}
            disabled={!n}
            onClick={() => {
              onClose()
              void applyBulk(plan, what)
            }}
            data-testid="operations-bulk-confirm"
          >
            {kind === 'delete' ? `Usuń ${n}` : `Zastosuj do ${n}`}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-[12px]" data-testid="operations-bulk-effect">
        <p>
          {n ? `${n} ${plural(n, 'operacja', 'operacje', 'operacji')}` : 'Żadna z zaznaczonych operacji się nie zmieni'}
          {plan.skipped ? ` · pominięte ${plan.skipped} (zmiana do nich nie pasuje: zadokowane, przelew na własne konto)` : ''}
          {plan.newer ? ` · zapisane przez nowszą wersję aplikacji: ${plan.newer} (bez zmian)` : ''}.
        </p>
        {effect && !noEffect(effect) ? (
          <div className="flex flex-col gap-1 border-t border-line pt-2">
            {effect.energy && line('Energia dziś', effect.energy, 'operations-bulk-energy')}
            {effect.shields && line('Osłony', effect.shields, 'operations-bulk-shields')}
            {effect.envelopes.map((e) => line(`Koperta: ${cats.label(e.categoryId) || 'codzienne'}`, e, 'operations-bulk-envelope', e.categoryId))}
            {effect.accounts.map((a) => line(`Saldo: ${a.name}`, a, 'operations-bulk-balance', a.id))}
          </div>
        ) : (
          n > 0 && <p className="text-muted">Energia, koperty, osłony i salda kont bez zmian.</p>
        )}
        {confirmed.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-line pt-2" data-testid="operations-bulk-confirmed">
            {confirmed.map((c) => (
              <p key={c.accountId}>
                Zmieni potwierdzone saldo konta {accounts.find((a) => a.id === c.accountId)?.name ?? '?'} z {plDate(c.date)} o <span className="num">{signedPln(c.delta)} zł</span>.
              </p>
            ))}
          </div>
        )}
        {kind === 'delete' && n > 0 && <p className="text-dim">Usunięte zostają w historii – „Cofnij” po usunięciu albo Synchronizacja → Usunięte wpisy.</p>}
      </div>
    </Modal>
  )
}
