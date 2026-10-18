import { useMemo, useState, type ReactNode } from 'react'
import { newId } from '@shared/ids'
import { asksImpulse, isNight, sum } from '@shared/calc/operations'
import { TX_KIND_LABEL, type Split, type Transaction, type TxKind } from '@shared/schema'
import { updateRecord, useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { useRecordList } from '../../store/records'
import { AmountField, DateField, plnText, TimeField } from '../../components/fields'
import { Badge, Empty, Field, Segmented, TextArea, TextField, cx } from '../../components/ui'
import { IconClose, IconPlus } from '../../components/icons'
import { HistoryButton } from '../history/HistoryDialog'
import { DeleteButton } from '../history/DeleteButton'
import { AccountSelect, CategorySelect, useAccounts } from './pickers'
import { deleteOperation, rememberAccount } from './state'
import { rememberCategory, ruleFor } from '../import/rules'
import { useCategories } from './pickers'
import { FinancedNote, FinancerSelect, MemberIncome } from '../household/MemberPickers'

/** The kinds on the first row of the editor; the rest under „inne”. */
const MAIN_KINDS: TxKind[] = ['expense', 'income', 'transfer', 'trading']
const OTHER_KINDS: TxKind[] = ['tax', 'loan', 'correction']

/** Money out / in of a kind, as the editor names it (income is always in). */
const DIRECTIONS: Partial<Record<TxKind, [string, string]>> = {
  expense: ['zakup', 'zwrot towaru'],
  transfer: ['wychodzący', 'przychodzący'],
  trading: ['dopłata do XTB', 'wypłata z XTB'],
  tax: ['zapłata', 'zwrot'],
  loan: ['pożyczam / spłacam', 'otrzymuję'],
  correction: ['minus', 'plus']
}

const DEFAULT_SIGN: Record<TxKind, 1 | -1> = { expense: -1, income: 1, transfer: -1, trading: -1, tax: -1, loan: -1, correction: -1 }

export function operationLabel(t: Pick<Transaction, 'counterparty' | 'kind' | 'amount' | 'date'>): string {
  return `${t.counterparty.trim() || TX_KIND_LABEL[t.kind]} ${plnText(t.amount)} zł (${t.date.slice(8, 10)}.${t.date.slice(5, 7)}.${t.date.slice(0, 4)})`
}

/** A kind change keeps the amount and the fields that still mean something; the sign follows the new kind. */
export function withKind(t: Transaction, kind: TxKind): Transaction {
  const abs = Math.abs(t.amount)
  const sign = kind === 'income' ? 1 : t.kind === kind || kind === 'correction' ? Math.sign(t.amount) || DEFAULT_SIGN[kind] : DEFAULT_SIGN[kind]
  return {
    ...t,
    kind,
    amount: sign * abs,
    refundable: kind === 'expense' ? t.refundable : false,
    // Who finances a purchase and whose money an income is are other things (D80): the member stays with the same kind.
    memberId: kind === t.kind ? t.memberId : null,
    advance: kind === 'income' ? t.advance : false,
    covers: kind === 'income' ? t.covers : [],
    splits: kind === 'expense' ? t.splits : [],
    repaid: kind === 'income' ? t.repaid : 0,
    counterAccountId: kind === 'transfer' ? t.counterAccountId : null,
    impulse: kind === 'expense' ? t.impulse : null,
    // The loan's link only on a loan's operation (an installment of a taken loan is its container's payment).
    loanId: kind === 'loan' ? t.loanId : null
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-2">
      <span className="label">{title}</span>
      {children}
    </div>
  )
}

export function OperationEditor({ id }: { id: string }) {
  const entry = useData((s) => s.records.transactions[id])
  const isDraft = useData((s) => !!s.drafts[id])
  const folderReadOnly = useData((s) => !!s.status?.readOnly)
  const orders = useData((s) => s.fi?.settings.orders)
  const fleet = useFleet()
  const accounts = useAccounts()
  const cats = useCategories()
  const rules = useData((s) => s.fi?.settings.import.rules)
  const loans = useRecordList('loans')
  // A direction chosen while the amount is still 0 (the sign lives in the amount): kept here until one is typed.
  const [zeroSign, setZeroSign] = useState<1 | -1 | null>(null)
  if (!entry || !orders) return <Empty>Wybierz operację z listy albo dodaj nową (Ctrl+N).</Empty>
  const t = entry.record
  const readOnly = folderReadOnly || entry.readOnly
  const update = (fn: (r: Transaction) => Transaction) => updateRecord('transactions', id, fn)
  const patch = (p: Partial<Transaction>) => update((r) => ({ ...r, ...p }))
  const abs = Math.abs(t.amount)
  const sign: 1 | -1 = t.amount < 0 ? -1 : t.amount > 0 ? 1 : t.kind === 'income' ? 1 : (zeroSign ?? DEFAULT_SIGN[t.kind])
  const setDirection = (s: 1 | -1) => {
    setZeroSign(s)
    if (abs === 0 && t.splits.every((x) => x.amount === 0)) return
    // The lines of a split receipt turn with it; a product return of a member's purchase is theirs (D80).
    update((r) => ({
      ...r,
      amount: s * Math.abs(r.amount),
      splits: r.splits.map((x) => ({ ...x, amount: s * Math.abs(x.amount) }))
    }))
  }
  const directions = DIRECTIONS[t.kind]
  const outgoing = sign < 0
  const night = isNight(t, orders)
  const showLog = asksImpulse(t, orders) || t.impulse != null || night || !!t.logNote
  const account = accounts.find((a) => a.id === t.accountId)

  return (
    <fieldset className="flex min-h-0 flex-col gap-2.5 p-3 text-[12px]" disabled={readOnly} data-testid="operation-editor">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-fg-strong" data-testid="operation-editor-title">
          {isDraft ? 'Nowa operacja' : TX_KIND_LABEL[t.kind]}
        </span>
        {t.bank && <Badge tone={t.bank.pending ? 'warn' : 'default'}>{t.bank.pending ? 'nierozliczona' : 'z banku'}</Badge>}
        <span className="flex-1" />
        {!isDraft && <HistoryButton kind="transactions" id={t.id} current={t} small />}
        {!isDraft && !readOnly && <DeleteButton title="Usuń operację" onConfirm={() => void deleteOperation(t, operationLabel(t))} testId="operation-delete" />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Segmented
          size="sm"
          value={MAIN_KINDS.includes(t.kind) ? t.kind : null}
          onChange={(k) => {
            setZeroSign(null)
            update((r) => withKind(r, k))
          }}
          options={MAIN_KINDS.map((k) => ({ value: k, label: k === 'trading' ? 'XTB' : TX_KIND_LABEL[k] }))}
          aria-label="Rodzaj operacji"
        />
        <select
          className={cx('input h-[22px] w-auto py-0 text-[11.5px]', OTHER_KINDS.includes(t.kind) && 'border-accent/60 text-accent')}
          value={OTHER_KINDS.includes(t.kind) ? t.kind : ''}
          onChange={(e) => {
            const k = e.currentTarget.value as TxKind | ''
            if (!k) return
            setZeroSign(null)
            update((r) => withKind(r, k))
          }}
          aria-label="Inny rodzaj"
          data-testid="operation-kind-other"
        >
          <option value="">inne…</option>
          {OTHER_KINDS.map((k) => (
            <option key={k} value={k}>
              {TX_KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      {directions && (
        <Segmented
          size="sm"
          value={outgoing ? 'out' : 'in'}
          onChange={(d) => setDirection(d === 'out' ? -1 : 1)}
          options={[
            { value: 'out', label: directions[0] },
            { value: 'in', label: directions[1] }
          ]}
          aria-label="Kierunek"
        />
      )}

      <Field label="Kwota" hint={t.kind === 'expense' && t.amount > 0 ? 'Zwrot towaru: ujemny wydatek tej samej kategorii.' : undefined}>
        <div className="flex items-center gap-2">
          <AmountField
            className={cx('w-[140px]', t.amount > 0 && 'text-up')}
            value={abs}
            onChange={(v) =>
              update((r) => ({
                ...r,
                amount: sign * (v ?? 0),
                // The lines follow the sign chosen before the total was typed.
                splits: r.splits.map((x) => ({ ...x, amount: sign * Math.abs(x.amount) }))
              }))
            }
            autoFocus={isDraft}
            aria-label="Kwota"
            data-testid="operation-amount"
          />
          <span className="text-muted">zł</span>
        </div>
      </Field>
      <Field label="Data i godzina" hint={t.bank ? 'Bank nie podaje godzin – wpisz, jeśli pamiętasz.' : undefined}>
        <div className="flex items-center gap-2">
          <DateField className="w-[110px]" value={t.date} onChange={(date) => patch({ date })} aria-label="Data" data-testid="operation-date" />
          <TimeField className="w-[70px]" value={t.time} allowEmpty onChange={(time) => patch({ time })} aria-label="Godzina" data-testid="operation-time" />
          {night && (
            <Badge tone="warn" title={`Cisza nocna ${orders.quietHours.from}–${orders.quietHours.to}`} data-testid="operation-night">
              noc
            </Badge>
          )}
        </div>
      </Field>
      <Field label="Konto">
        <AccountSelect
          className="w-[200px]"
          value={t.accountId}
          onChange={(accountId) => {
            if (!accountId) return
            rememberAccount(accountId)
            patch({ accountId, counterAccountId: t.counterAccountId === accountId ? null : t.counterAccountId })
          }}
          data-testid="operation-account"
        />
      </Field>
      <Field label={t.kind === 'income' ? 'Od kogo' : 'Kontrahent'}>
        <TextField value={t.counterparty} onChange={(counterparty) => patch({ counterparty })} placeholder={t.kind === 'expense' ? 'sklep, usługa…' : 'kto'} maxLength={300} data-testid="operation-counterparty" />
      </Field>
      {(t.title || t.kind === 'transfer' || t.kind === 'income') && (
        <Field label="Tytuł">
          <TextField value={t.title} onChange={(title) => patch({ title })} maxLength={1000} data-testid="operation-title" />
        </Field>
      )}

      {t.kind === 'expense' && (
        <Section title="Kategoria">
          {t.splits.length === 0 ? (
            <>
              <div className="flex items-center gap-2">
                <CategorySelect className="min-w-0 flex-1" value={t.categoryId} onChange={(categoryId) => patch({ categoryId })} data-testid="operation-category" />
                <button
                  type="button"
                  className="btn h-[24px] shrink-0"
                  onClick={() =>
                    patch({
                      splits: [
                        { id: newId(), amount: t.amount, categoryId: t.categoryId, refundable: t.refundable, memberId: t.refundable ? t.memberId : null, advance: false, note: '' },
                        { id: newId(), amount: 0, categoryId: null, refundable: false, memberId: null, advance: false, note: '' }
                      ]
                    })
                  }
                  title="Kilka kategorii albo część swoja i część domownika"
                  data-testid="operation-split"
                >
                  Podziel paragon
                </button>
              </div>
              {t.bank && t.counterparty && t.categoryId && rules && ruleFor(t)?.categoryId !== t.categoryId && (
                <button
                  type="button"
                  className="self-start text-[11.5px] text-accent hover:underline"
                  onClick={() => rememberCategory(t, cats.label(t.categoryId))}
                  title="Kolejne importy z banku dadzą temu kontrahentowi tę kategorię"
                  data-testid="operation-remember"
                >
                  Zapamiętaj: „{t.counterparty}” → {cats.label(t.categoryId)}
                </button>
              )}
              {outgoing && <CargoSelect value={t.containerId} onChange={(containerId) => patch({ containerId })} />}
              <div className="flex items-center gap-2">
                <span className="w-[64px] shrink-0 text-[11.5px] text-muted">{outgoing ? 'Finansuje' : 'Zwrot dla'}</span>
                <FinancerSelect refundable={t.refundable} memberId={t.memberId} onChange={(p) => patch(p)} testId="operation-financer" />
              </div>
              <FinancedNote t={t} />
            </>
          ) : (
            <SplitEditor t={t} sign={sign} update={update} />
          )}
        </Section>
      )}

      {t.kind === 'income' && t.amount >= 0 && <MemberIncome t={t} patch={patch} />}

      {t.kind === 'transfer' && (
        <Field label={outgoing ? 'Na konto' : 'Z konta'}>
          <AccountSelect
            className="w-[200px]"
            value={t.counterAccountId}
            onChange={(counterAccountId) => patch({ counterAccountId })}
            none="konto spoza budżetu"
            exclude={t.accountId}
            data-testid="operation-counter-account"
          />
        </Field>
      )}
      {t.kind === 'trading' && (
        <p className="text-[11.5px] text-muted">
          {outgoing
            ? 'Dopłata do konta tradingowego XTB – tylko z „wolnego do decyzji”, gdy osłony i kadłub są pełne (rozkaz „firewall”).'
            : 'Wypłata z konta tradingowego dokuje jak każda dostawa; FI łączy ją z wpisem w ICTTJ (pula Cele, Podatek…) – Mostek → Dokowanie.'}
        </p>
      )}
      {t.kind === 'loan' && (
        <Field label="Pożyczka">
          <select className="input w-[240px]" value={t.loanId ?? ''} disabled={readOnly} onChange={(e) => patch({ loanId: e.currentTarget.value || null })} data-testid="operation-loan">
            <option value="">— bez pożyczki z radaru —</option>
            {loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.direction === 'given' ? 'udzielona' : 'wzięta'})
              </option>
            ))}
          </select>
        </Field>
      )}

      {showLog && (
        <Section title="Dziennik kapitański">
          <div className="flex items-center gap-2">
            <Segmented
              size="sm"
              value={t.impulse}
              onChange={(impulse) => patch({ impulse })}
              options={[
                { value: 'plan', label: 'plan' },
                { value: 'impulse', label: 'impuls' }
              ]}
              aria-label="Plan czy impuls"
            />
            {t.impulse && (
              <button type="button" className="text-[11px] text-dim hover:text-fg-strong" onClick={() => patch({ impulse: null })}>
                wyczyść
              </button>
            )}
            {asksImpulse(t, orders) && !t.impulse && <span className="text-[11.5px] text-accent">od {plnText(orders.impulseThreshold)} zł: plan czy impuls?</span>}
          </div>
          <TextArea
            value={t.logNote}
            onChange={(logNote) => patch({ logNote })}
            rows={2}
            placeholder={night ? 'Zakup w ciszy nocnej – krótko: dlaczego teraz?' : 'Krótko: skąd ten zakup?'}
            data-testid="operation-log"
          />
        </Section>
      )}

      <Field label="Notatka">
        <TextArea value={t.note} onChange={(note) => patch({ note })} rows={2} data-testid="operation-note" />
      </Field>

      {t.bank && (
        <Section title={`Z banku${account ? ` (${account.name})` : ''}`}>
          <div className="text-[11.5px] break-words text-muted" data-testid="operation-bank">
            {t.bank.description}
          </div>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-dim">
            {t.bank.operation && <span>{t.bank.operation}</span>}
            {t.bank.category && <span>kategoria mBanku: {t.bank.category}</span>}
          </div>
        </Section>
      )}
      {!isDraft && (
        <div className="text-[10.5px] text-dim">
          zapisano {new Date(t.updatedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
          {t.updatedBy ? ` · ${t.updatedBy}` : ''}
        </div>
      )}
    </fieldset>
  )
}

/** A payment of a container of the cargo: a fixed cost (not an envelope's spending) or a periodic fee from its tank. */
function CargoSelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const containers = useRecordList('containers')
  const shown = containers.filter((c) => !c.archived || c.id === value)
  if (!shown.length && !value) return null
  return (
    <div className="flex items-center gap-2">
      <span className="w-[64px] shrink-0 text-[11.5px] text-muted">Ładownia</span>
      <select className="input min-w-0 flex-1" value={value ?? ''} onChange={(e) => onChange(e.currentTarget.value || null)} aria-label="Kontener ładowni" data-testid="operation-container">
        <option value="">— nie z ładowni —</option>
        {shown.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.cycleMonths > 1 ? ' (ze zbiornika)' : ''}
          </option>
        ))}
        {value && !containers.some((c) => c.id === value) && <option value={value}>(usunięty kontener)</option>}
      </select>
    </div>
  )
}

/** A split receipt: lines with their own category, a household member's part (D80); the lines sum to the amount. */
function SplitEditor({ t, sign, update }: { t: Transaction; sign: 1 | -1; update: (fn: (r: Transaction) => Transaction) => void }) {
  const rest = useMemo(() => t.amount - sum(t.splits.map((s) => s.amount)), [t])
  const setLine = (id: string, p: Partial<Split>) => update((r) => ({ ...r, splits: r.splits.map((s) => (s.id === id ? { ...s, ...p } : s)) }))
  return (
    <div className="flex flex-col gap-1.5" data-testid="operation-splits">
      {t.splits.map((s, i) => (
        <div key={s.id} className="grid grid-cols-[96px_minmax(0,1fr)_auto_auto] items-center gap-1.5" data-testid="split-line">
          <AmountField value={Math.abs(s.amount)} onChange={(v) => setLine(s.id, { amount: sign * (v ?? 0) })} aria-label={`Kwota części ${i + 1}`} data-testid="split-amount" />
          <CategorySelect value={s.categoryId} onChange={(categoryId) => setLine(s.id, { categoryId })} data-testid="split-category" />
          <FinancerSelect refundable={s.refundable} memberId={s.memberId} onChange={(p) => setLine(s.id, p)} compact testId="split-financer" />
          <button
            type="button"
            className="btn btn-ghost h-[22px] px-1"
            title="Usuń część"
            onClick={() =>
              update((r) => {
                const splits = r.splits.filter((x) => x.id !== s.id)
                // One line left: back to a plain operation of that line's category.
                if (splits.length > 1) return { ...r, splits }
                const only = splits[0]
                return { ...r, splits: [], categoryId: only?.categoryId ?? r.categoryId, refundable: only?.refundable ?? false, memberId: only?.refundable ? only.memberId : null }
              })
            }
          >
            <IconClose size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 text-[11.5px]">
        <button type="button" className="btn h-[22px]" onClick={() => update((r) => ({ ...r, splits: [...r.splits, { id: newId(), amount: Math.sign(rest) === sign ? rest : 0, categoryId: null, refundable: false, memberId: null, advance: false, note: '' }] }))} data-testid="split-add">
          <IconPlus size={12} /> część
        </button>
        {rest !== 0 ? (
          <>
            <span className="text-accent" data-testid="split-rest">
              nierozdzielone: {plnText(Math.abs(rest))} zł
            </span>
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => update((r) => ({ ...r, splits: r.splits.map((s, i) => (i === r.splits.length - 1 ? { ...s, amount: s.amount + rest } : s)) }))}
            >
              do ostatniej części
            </button>
          </>
        ) : (
          <span className="text-dim">części sumują się do kwoty</span>
        )}
      </div>
    </div>
  )
}
