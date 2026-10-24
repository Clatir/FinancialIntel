import { useMemo, useState } from 'react'
import { dm, formatPln } from '@shared/format'
import { TX_KIND_LABEL, type Transaction, type TxKind } from '@shared/schema'
import { useData } from '../../store/data'
import { Popover } from '../../components/Popover'
import { Field, Segmented, TextField, cx } from '../../components/ui'
import { CategorySelect, useAccounts } from './pickers'
import { FinancerSelect } from '../household/MemberPickers'
import { useMembers } from '../household/actions'
import { applyTitleRule, findMatchingByTitle, type TitleRuleInput } from './titleRules'

const TYPE_OPTIONS = [
  { value: 'refund', label: 'Zwrot / kategoria' },
  { value: 'expense', label: 'Wydatek' },
  { value: 'income', label: 'Wpływ' },
  { value: 'transfer', label: 'Przelew' },
  { value: 'other', label: 'Inne…' }
] as const

const OTHER_KINDS: Array<{ value: TxKind; label: string }> = [
  { value: 'trading', label: 'XTB' },
  { value: 'loan', label: 'Pożyczka' },
  { value: 'tax', label: 'Podatek' }
]

const INFLOW_KINDS = [
  { value: 'repay', label: 'spłata zakupów' },
  { value: 'income', label: 'niezależny przychód' },
  { value: 'advance', label: 'zaliczka' }
] as const

export function TitleRuleAction({
  t,
  patch
}: {
  t: Transaction
  patch: (p: Partial<Transaction>) => void
}) {
  const title = t.title?.trim() ?? ''
  if (title.length < 2) return null

  return <TitleRulePopover t={t} title={title} patch={patch} />
}

function TitleRulePopover({
  t,
  title,
  patch
}: {
  t: Transaction
  title: string
  patch: (p: Partial<Transaction>) => void
}) {
  const transactions = useData((s) => s.records.transactions)
  const members = useMembers()
  const accounts = useAccounts()

  const [keyword, setKeyword] = useState(title)
  const [onlyCounterparty, setOnlyCounterparty] = useState(!!t.counterparty?.trim())
  const initialType =
    t.kind === 'expense' && t.amount > 0
      ? 'refund'
      : t.amount > 0 && t.kind !== 'transfer' && t.kind !== 'trading'
        ? 'refund'
        : t.kind === 'expense' || t.kind === 'income' || t.kind === 'transfer'
          ? t.kind
          : 'other'

  const [selectedType, setSelectedType] = useState<string>(initialType)
  const [otherKind, setOtherKind] = useState<TxKind>(
    t.kind === 'trading' || t.kind === 'loan' || t.kind === 'tax' ? t.kind : 'trading'
  )
  const [categoryId, setCategoryId] = useState<string | null>(t.categoryId)
  const [refundable, setRefundable] = useState(t.refundable)
  const [memberId, setMemberId] = useState<string | null>(t.memberId)
  const [gift, setGift] = useState<boolean | undefined>(t.gift)
  const [inflowKind, setInflowKind] = useState<'repay' | 'income' | 'advance'>(t.inflowKind ?? 'repay')
  const [counterAccountId, setCounterAccountId] = useState<string | null>(t.counterAccountId)
  const [updateHistory, setUpdateHistory] = useState(true)

  const activeKind: TxKind =
    selectedType === 'refund' || selectedType === 'expense'
      ? 'expense'
      : selectedType === 'income'
        ? 'income'
        : selectedType === 'transfer'
          ? 'transfer'
          : otherKind

  const targetCounterparty = onlyCounterparty && t.counterparty?.trim() ? t.counterparty.trim() : null

  const matching = useMemo(
    () => findMatchingByTitle(transactions, keyword || title, t.id, targetCounterparty),
    [transactions, keyword, title, t.id, targetCounterparty]
  )

  const handleApply = (close: () => void) => {
    const input: TitleRuleInput = {
      keyword: keyword.trim() || title,
      kind: activeKind,
      direction: selectedType === 'refund' ? 'in' : activeKind === 'expense' ? 'out' : activeKind === 'income' ? 'in' : null,
      categoryId: activeKind === 'expense' ? categoryId : null,
      counterparty: targetCounterparty,
      refundable: activeKind === 'expense' && refundable,
      household: activeKind === 'income' && !!memberId,
      memberId: (activeKind === 'expense' && refundable) || (activeKind === 'income' && !!memberId) ? memberId : null,
      gift: activeKind === 'expense' && refundable && gift ? true : undefined,
      counterAccountId: activeKind === 'transfer' ? counterAccountId : null,
      inflowKind: activeKind === 'income' && !!memberId ? inflowKind : undefined,
      updateHistory
    }

    const res = applyTitleRule(input, t)
    if (res.ok) {
      // Also update currently open transaction in editor
      if (activeKind === 'expense') {
        const isRefund = selectedType === 'refund'
        patch({
          kind: 'expense',
          amount: isRefund ? Math.abs(t.amount) : -Math.abs(t.amount),
          categoryId,
          refundable,
          memberId: refundable ? memberId : null,
          gift: refundable && gift ? true : undefined,
          inflowKind: undefined,
          counterAccountId: null
        })
      } else if (activeKind === 'income') {
        patch({
          kind: 'income',
          amount: Math.abs(t.amount),
          categoryId: null,
          memberId,
          refundable: false,
          inflowKind: memberId ? inflowKind : undefined,
          advance: memberId ? inflowKind === 'advance' : false,
          counterAccountId: null
        })
      } else if (activeKind === 'transfer') {
        patch({
          kind: 'transfer',
          counterAccountId,
          categoryId: null,
          refundable: false,
          memberId: null
        })
      } else {
        patch({
          kind: activeKind,
          categoryId: null,
          refundable: false,
          memberId: null
        })
      }
      close()
    }
  }

  const shortTitle = title.length > 25 ? `${title.slice(0, 24)}…` : title

  return (
    <Popover
      buttonClassName="self-start text-[11px] text-accent hover:underline flex items-center gap-1.5"
      width={390}
      testId="operation-title-rule"
      panelTestId="operation-title-rule-panel"
      label={
        <>
          <span>⚡ Ustaw regułę dla tytułu „{shortTitle}”…</span>
          {matching.length > 0 && (
            <span className="rounded bg-accent/15 px-1 py-0.2 text-[10px] font-medium text-accent" data-testid="title-rule-count">
              w historii: {matching.length}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <div className="flex flex-col gap-2.5 text-[12px]">
          <div>
            <div className="font-medium text-fg-strong">Reguła dla tytułu operacji</div>
            <div className="text-[11px] text-muted">
              Ustaw typ operacji dla tego tytułu dla kolejnych importów oraz zaktualizuj pasujące operacje w historii (zarówno z przeszłości, jak i przyszłości).
            </div>
          </div>

          <Field label="Tytuł / fraza">
            <TextField
              commit
              value={keyword}
              onChange={setKeyword}
              placeholder="słowo kluczowe w tytule…"
              maxLength={200}
              data-testid="title-rule-keyword"
            />
          </Field>

          {t.counterparty?.trim() && (
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-fg select-none">
              <input
                type="checkbox"
                checked={onlyCounterparty}
                onChange={(e) => setOnlyCounterparty(e.currentTarget.checked)}
                className="rounded border-border text-accent focus:ring-accent"
                data-testid="title-rule-only-counterparty"
              />
              <span>Tylko dla operacji od/do: <strong className="text-fg-strong">{t.counterparty.trim()}</strong></span>
            </label>
          )}

          <Field label="Typ operacji">
            <div className="flex flex-col gap-1.5">
              <Segmented
                size="sm"
                value={selectedType}
                onChange={setSelectedType}
                options={[...TYPE_OPTIONS]}
                aria-label="Typ transakcji"
              />
              {selectedType === 'other' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted">Wybierz rodzaj:</span>
                  <select
                    className="input h-[22px] py-0 text-[11.5px]"
                    value={otherKind}
                    onChange={(e) => setOtherKind(e.currentTarget.value as TxKind)}
                    aria-label="Inny rodzaj"
                  >
                    {OTHER_KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </Field>

          {(selectedType === 'expense' || selectedType === 'refund') && (
            <Field label="Kategoria">
              <div className="flex flex-col gap-1.5">
                <CategorySelect
                  className="min-w-0 flex-1"
                  value={categoryId}
                  onChange={setCategoryId}
                  data-testid="title-rule-category"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted">Finansuje:</span>
                  <FinancerSelect
                    refundable={refundable}
                    memberId={memberId}
                    gift={gift}
                    onChange={(p) => {
                      setRefundable(p.refundable)
                      setMemberId(p.memberId)
                      setGift(p.gift)
                    }}
                    compact
                    testId="title-rule-financer"
                  />
                </div>
              </div>
            </Field>
          )}

          {selectedType === 'income' && (
            <Field label="Od kogo">
              <div className="flex flex-col gap-1.5">
                <select
                  className="input h-[24px] py-0 text-[11.5px]"
                  value={memberId ?? ''}
                  onChange={(e) => setMemberId(e.currentTarget.value || null)}
                  aria-label="Od domownika"
                  data-testid="title-rule-member"
                >
                  <option value="">— zwykły wpływ (mój przychód) —</option>
                  {members.filter((m) => !m.archived).map((m) => (
                    <option key={m.id} value={m.id}>
                      od domownika: {m.name}
                    </option>
                  ))}
                </select>
                {memberId && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">Cel:</span>
                    <Segmented
                      size="sm"
                      value={inflowKind}
                      onChange={setInflowKind}
                      options={[...INFLOW_KINDS]}
                      aria-label="Cel wpłaty"
                    />
                  </div>
                )}
                <div className="text-[10.5px] text-muted">
                  Chcesz przypisać kategorię do wpływu (np. zwrot kosztów / obiad / leki)? Wybierz typ <strong className="text-fg">„Zwrot / kategoria”</strong>.
                </div>
              </div>
            </Field>
          )}

          {selectedType === 'transfer' && (
            <Field label="Drugie konto">
              <select
                className="input h-[24px] py-0 text-[11.5px]"
                value={counterAccountId ?? ''}
                onChange={(e) => setCounterAccountId(e.currentTarget.value || null)}
                aria-label="Drugie konto"
              >
                <option value="">— konto spoza budżetu —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="rounded bg-hover/50 p-2 text-[11px] text-muted flex flex-col gap-1">
            <div>✓ Reguła słowa kluczowego będzie stosowana przy kolejnych importach.</div>
            {matching.length > 0 ? (
              <label className="flex items-center gap-1.5 text-fg-strong cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={updateHistory}
                  onChange={(e) => setUpdateHistory(e.currentTarget.checked)}
                  data-testid="title-rule-update-history"
                />
                <span>Zaktualizuj w historii {matching.length} {matching.length === 1 ? 'operację' : matching.length < 5 ? 'operacje' : 'operacji'} o tym tytule</span>
              </label>
            ) : (
              <div className="text-dim">W historii nie znaleziono innych operacji o tym tytule.</div>
            )}
            {matching.length > 0 && updateHistory && (
              <div className="max-h-[90px] overflow-y-auto border-t border-line/60 pt-1 flex flex-col gap-0.5">
                {matching.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-[10.5px] text-dim">
                    <span>{dm(m.date)} · {m.counterparty || m.title || TX_KIND_LABEL[m.kind]}</span>
                    <span className="num">{formatPln(m.amount)} zł</span>
                  </div>
                ))}
                {matching.length > 5 && <div className="text-[10px] text-dim italic">+ {matching.length - 5} więcej</div>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-line">
            <button type="button" className="btn h-[24px]" onClick={close}>
              Anuluj
            </button>
            <button
              type="button"
              className="btn btn-accent h-[24px]"
              onClick={() => handleApply(close)}
              data-testid="title-rule-apply-btn"
            >
              {updateHistory && matching.length > 0 ? `Zapisz i zaktualizuj (${matching.length})` : 'Zapisz regułę'}
            </button>
          </div>
        </div>
      )}
    </Popover>
  )
}
