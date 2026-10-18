import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { QuickData, QuickResult } from '@shared/api'
import { inClockWindow, warsawNow } from '@shared/calc/dates'
import { counterpartyKey } from '@shared/import/classify'
import { newId } from '@shared/ids'
import { HOUSE_MEMBER_ID } from '@shared/schema'
import { AmountField, DateField, plnText, setAmountsHidden, TimeField } from '../../components/fields'
import { Segmented, cx } from '../../components/ui'
import { IconClose, IconPlus } from '../../components/icons'
import { api } from '../../lib/api'
import type { QuickDraft } from '../../store/quickHost'

type Kind = QuickDraft['kind']
interface Line {
  amount: number
  categoryId: string | null
  refundable: boolean
  /** Who finances the line (D80); null with `refundable` = the first member. */
  memberId: string | null
}

const blank = (data: QuickData | null): QuickDraft => {
  const { date, time } = warsawNow()
  return { id: newId(), kind: 'expense', amount: 0, categoryId: null, accountId: data?.accountId ?? '', date, time, counterparty: '', note: '', impulse: null, logNote: '', household: false, memberId: null, advance: false, splits: [] }
}

/** A household member to pick (D80): „ja” = my own purchase. */
function MemberPick({ data, value, onChange, none, testId, compact }: { data: QuickData; value: string | null; onChange: (id: string | null) => void; none: string; testId?: string; compact?: boolean }) {
  return (
    <select className={cx('input', compact ? 'h-[22px] w-[92px] py-0 text-[11px]' : 'min-w-0 flex-1')} value={value ?? ''} onChange={(e) => onChange(e.currentTarget.value || null)} aria-label="Domownik" data-testid={testId}>
      <option value="">{none}</option>
      {data.members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-2">
      <span className="text-[11.5px] text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/**
 * The quick entry window (spec, „Szybki wpis”): an expense, an income or a purchase a household member finances in a few keys –
 * the amount, the officer's category, the account, the time; today's energy after it before saving; a split receipt;
 * the captain's log from the threshold and the quiet hours' confirmation. Enter saves, Esc closes.
 */
export function QuickApp() {
  const [data, setData] = useState<QuickData | null>(null)
  const [d, setD] = useState<QuickDraft>(() => blank(null))
  const [lines, setLines] = useState<Line[]>([])
  // Others' money in a member's transfer (D81, „w tym za …”), by member.
  const [shares, setShares] = useState<Record<string, number>>({})
  const [nightOk, setNightOk] = useState(false)
  // Sending, or saved and closing (B51): no second save until the window opens again.
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [officer, setOfficer] = useState<string | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const [opened, setOpened] = useState(0)
  useEffect(() => {
    if (opened) amountRef.current?.focus()
  }, [opened])

  useEffect(() => {
    document.title = 'Szybki wpis – Financial Intel'
    const offData = api.onQuickData((next) => {
      setData(next)
      setAmountsHidden(!!next?.hideAmounts)
      setD(blank(next))
      setLines([])
      setShares({})
      setNightOk(false)
      setMsg(null)
      setOfficer(null)
      setBusy(false)
      sending.current = false
      // Focus after the reset has rendered (an earlier focus would take the previous amount as its draft).
      setOpened((n) => n + 1)
    })
    const offResult = api.onQuickResult((r: QuickResult) => {
      setMsg({ ok: r.ok, text: r.message })
      if (r.ok) {
        // Saved: a fresh draft (a new id) right away, the window stays locked until it opens again.
        setD((x) => ({ ...blank(null), accountId: x.accountId }))
        setLines([])
        setShares({})
        setTimeout(() => void api.quickClose(), 450)
      } else {
        sending.current = false
        setBusy(false)
      }
    })
    const offPrefs = api.onMachinePrefs((p) => setAmountsHidden(p.hideAmounts))
    void api.quickRefresh()
    return () => {
      offData()
      offResult()
      offPrefs()
    }
  }, [])

  const set = (p: Partial<QuickDraft>) => setD((x) => ({ ...x, ...p }))
  const cats = useMemo(() => new Map((data?.categories ?? []).map((c) => [c.id, c])), [data])
  const night = d.kind !== 'income' && !!d.time && !!data && inClockWindow(d.time, data.quietHours.from, data.quietHours.to)
  const asks = d.kind !== 'income' && !!data && d.amount >= data.impulseThreshold && data.impulseThreshold > 0
  const hide = !!data?.hideAmounts
  const money = useCallback((g: number) => (hide ? '•••' : `${plnText(g)} zł`), [hide])

  // Today's energy (or the envelope) after this operation, before saving.
  const preview = useMemo((): ReactNode => {
    if (!data || d.amount <= 0) return null
    if (d.kind === 'income') {
      const m = d.household ? data.members.find((x) => x.id === d.memberId) : undefined
      if (!m) return <span>Wpływ – dokuje w warstwach okrętu.</span>
      // Others' money in it first (D81), then the sender's: what each owes first, the rest their advance or income.
      const others = data.members.filter((x) => x.via === m.id && (shares[x.id] ?? 0) > 0)
      const own = d.amount - others.reduce((a, x) => a + shares[x.id]!, 0)
      const line = (who: { name: string; owed: number; inflow: string }, amount: number, advance: boolean) => {
        const back = Math.min(amount, who.owed)
        const rest = amount - back
        return `${who.name}${back ? ` – wyrównuje ${money(back)} (ma oddać ${money(who.owed)})` : ''}${rest ? `${back ? ', reszta' : ' –'} ${money(rest)} ${advance ? 'jako zaliczka (depozyt)' : 'jako przychód (dokuje)'}` : ''}.`
      }
      return (
        <div className="flex flex-col">
          {own < 0 ? <span className="text-down">Części innych osób przekraczają kwotę.</span> : <span data-testid="quick-preview-member">Od: {line(m, own, d.advance)}</span>}
          {others.map((x) => (
            <span key={x.id} data-testid="quick-preview-share">
              W tym za: {line(x, shares[x.id]!, x.inflow === 'advance')}
            </span>
          ))}
        </div>
      )
    }
    const parts: Line[] = lines.length > 1 ? lines : [{ amount: d.amount, categoryId: d.categoryId, refundable: d.kind === 'refundable', memberId: d.kind === 'refundable' ? d.memberId : null }]
    let daily = 0
    const planned = new Map<string, number>()
    const financed = new Map<string, number>()
    for (const p of parts) {
      if (p.refundable) {
        // As the ledger reads it (`financerOf`): no member = the first one, „Dom”.
        const id = p.memberId ?? HOUSE_MEMBER_ID
        financed.set(id, (financed.get(id) ?? 0) + p.amount)
        continue
      }
      const c = p.categoryId ? cats.get(p.categoryId) : undefined
      if (!c || c.envelope !== 'planned') daily += p.amount
      else planned.set(c.mainId, (planned.get(c.mainId) ?? 0) + p.amount)
    }
    const out: ReactNode[] = []
    if (daily && data.energyLeft != null)
      out.push(
        <div key="daily" data-testid="quick-preview-energy">
          Energia dziś: <span className="num">{money(data.energyLeft)}</span> → <span className={cx('num', data.energyLeft - daily < 0 ? 'text-down' : 'text-fg-strong')}>{money(data.energyLeft - daily)}</span>
        </div>
      )
    if (daily && data.energyLeft == null) out.push(<div key="daily">Bez planu miesiąca – wydatek idzie z osłon.</div>)
    for (const [mainId, v] of planned) {
      const left = data.envelopesLeft[mainId]
      const name = (data.categories.find((c) => c.id === mainId)?.label ?? 'koperta').split(' · ')[0]
      out.push(
        <div key={mainId}>
          Koperta {name}: {left == null ? 'bez limitu w tym miesiącu' : <><span className="num">{money(left)}</span> → <span className={cx('num', left - v < 0 ? 'text-down' : 'text-fg-strong')}>{money(left - v)}</span></>}
        </div>
      )
    }
    // Financed by household members (D80): not my energy – their advance first, the rest the shields lend.
    for (const [id, v] of financed) {
      const m = data.members.find((x) => x.id === id)
      const fromDeposit = Math.min(v, m?.deposit ?? 0)
      out.push(
        <div key={`member:${id}`} data-testid="quick-preview-financed">
          Finansuje {m?.name ?? 'domownik'}: {money(v)} – nie zjada energii
          {fromDeposit ? `; z zaliczki ${money(fromDeposit)}` : ''}
          {v > fromDeposit ? `; pożyczają osłony ${money(v - fromDeposit)}, ma oddać` : ''}.
        </div>
      )
    }
    return out
  }, [data, d, lines, cats, money, shares])

  const save = useCallback(() => {
    if (busy || sending.current || !data) return
    if (data.readOnly) return setMsg({ ok: false, text: 'Folder jest tylko do odczytu.' })
    if (d.amount <= 0) return setMsg({ ok: false, text: 'Wpisz kwotę.' })
    if (lines.length > 1 && lines.reduce((a, l) => a + l.amount, 0) !== d.amount) return setMsg({ ok: false, text: 'Części paragonu nie sumują się do kwoty.' })
    if (d.kind === 'refundable' && lines.length <= 1 && !d.memberId) return setMsg({ ok: false, text: 'Wybierz domownika, który finansuje zakup.' })
    if (night && (!nightOk || !d.logNote.trim())) return setMsg({ ok: false, text: 'Cisza nocna: potwierdź zakup i wpisz krótko, dlaczego teraz.' })
    sending.current = true
    setBusy(true)
    setMsg(null)
    // Others' money in a member's transfer (D81): their parts, as each one's setting says of the rest.
    const parts = d.kind === 'income' && d.household ? data.members.filter((m) => m.via === d.memberId && (shares[m.id] ?? 0) > 0).map((m) => ({ memberId: m.id, amount: shares[m.id]!, advance: m.inflow === 'advance' })) : []
    void api.quickAdd({ ...d, splits: lines.length > 1 ? lines : [], shares: parts } satisfies QuickDraft)
  }, [busy, data, d, lines, night, nightOk, shares])

  // Enter blurs the field first (its value goes into the draft), then saves the draft as rendered after that.
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        void api.quickClose()
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && !e.shiftKey) {
        e.preventDefault()
        // The field being typed in applies its value first (amounts are drafts until left).
        ;(document.activeElement as HTMLElement | null)?.blur()
        setTimeout(() => saveRef.current(), 0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onCounterparty = (counterparty: string) => {
    set({ counterparty })
    const hint = data?.lastCategory[counterpartyKey(counterparty)]
    setOfficer(hint && cats.has(hint) ? hint : null)
    if (hint && cats.has(hint) && !d.categoryId) set({ counterparty, categoryId: hint })
  }

  return (
    <div className="flex h-full flex-col border border-line-strong bg-panel text-[12px]" data-testid="quick-entry">
      <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-line px-3 [-webkit-app-region:drag]">
        <span className="text-[12.5px] font-medium text-fg-strong">Szybki wpis</span>
        {data?.energyLeft != null && (
          <span className="text-[11.5px] text-muted">
            · energia dziś <span className="num text-fg">{money(data.energyLeft)}</span>
          </span>
        )}
        <span className="flex-1" />
        <button className="btn btn-ghost h-[22px] px-1 [-webkit-app-region:no-drag]" title="Zamknij (Esc)" onClick={() => void api.quickClose()} data-testid="quick-close">
          <IconClose size={12} />
        </button>
      </div>
      {!data ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-muted">Otwórz Financial Intel z folderem danych – szybki wpis zapisuje do niego.</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
          <Segmented
            size="sm"
            value={d.kind}
            onChange={(kind: Kind) => set({ kind, household: false, memberId: kind === 'refundable' ? (data.members[0]?.id ?? null) : null, advance: false })}
            options={[
              { value: 'expense', label: 'Wydatek' },
              { value: 'income', label: 'Wpływ' },
              { value: 'refundable', label: 'Za domownika' }
            ]}
            aria-label="Rodzaj"
          />
          <Row label="Kwota">
            <div className="flex items-center gap-2">
              <AmountField ref={amountRef} className="w-[130px] text-[14px]" value={d.amount || null} allowEmpty onChange={(v) => set({ amount: v ?? 0 })} aria-label="Kwota" data-testid="quick-amount" />
              <span className="text-muted">zł</span>
            </div>
          </Row>
          <Row label={d.kind === 'income' ? 'Od kogo' : 'Gdzie'}>
            <input className="input" list="quick-counterparties" value={d.counterparty} onChange={(e) => onCounterparty(e.currentTarget.value)} maxLength={300} placeholder="sklep, usługa, osoba" data-testid="quick-counterparty" />
            <datalist id="quick-counterparties">
              {data.counterparties.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Row>
          {d.kind !== 'income' && lines.length <= 1 && (
            <Row label="Kategoria">
              <div className="flex items-center gap-1.5">
                <CategoryPick data={data} value={d.categoryId} onChange={(categoryId) => set({ categoryId })} testId="quick-category" />
                <button
                  type="button"
                  className="btn h-[24px] shrink-0 px-1.5"
                  title="Podziel paragon: kilka kategorii albo część domownika"
                  onClick={() =>
                    setLines([
                      { amount: d.amount, categoryId: d.categoryId, refundable: d.kind === 'refundable' && !!d.memberId, memberId: d.kind === 'refundable' ? d.memberId : null },
                      { amount: 0, categoryId: null, refundable: false, memberId: null }
                    ])
                  }
                  data-testid="quick-split"
                >
                  <IconPlus size={11} />
                </button>
              </div>
              {officer && officer !== d.categoryId && (
                <button className="mt-0.5 text-[11px] text-accent hover:underline" onClick={() => set({ categoryId: officer })}>
                  oficer: {cats.get(officer)?.label}
                </button>
              )}
            </Row>
          )}
          {d.kind === 'refundable' && lines.length <= 1 && (
            <Row label="Finansuje">
              <MemberPick data={data} value={d.memberId} onChange={(memberId) => set({ memberId })} none="— wybierz domownika —" testId="quick-financer" />
            </Row>
          )}
          {d.kind !== 'income' && lines.length > 1 && (
            <div className="flex flex-col gap-1 border-l-2 border-line-strong pl-2" data-testid="quick-lines">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-1.5">
                  <AmountField value={l.amount} onChange={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: v ?? 0 } : x)))} aria-label={`Część ${i + 1}`} />
                  <CategoryPick data={data} value={l.categoryId} onChange={(categoryId) => setLines(lines.map((x, j) => (j === i ? { ...x, categoryId } : x)))} />
                  <MemberPick
                    data={data}
                    compact
                    none="ja"
                    value={l.refundable ? l.memberId : null}
                    onChange={(memberId) => setLines(lines.map((x, j) => (j === i ? { ...x, refundable: !!memberId, memberId } : x)))}
                    testId="quick-line-financer"
                  />
                </div>
              ))}
              <div className="flex items-center gap-2 text-[11px]">
                <button className="text-accent hover:underline" onClick={() => setLines([...lines, { amount: Math.max(0, d.amount - lines.reduce((a, l) => a + l.amount, 0)), categoryId: null, refundable: false, memberId: null }])}>
                  + część
                </button>
                <button className="text-dim hover:text-fg-strong" onClick={() => setLines([])}>
                  bez podziału
                </button>
                {lines.reduce((a, l) => a + l.amount, 0) !== d.amount && <span className="text-accent">nierozdzielone: {money(d.amount - lines.reduce((a, l) => a + l.amount, 0))}</span>}
              </div>
            </div>
          )}
          <Row label="Konto">
            <select className="input" value={d.accountId} onChange={(e) => set({ accountId: e.currentTarget.value })} aria-label="Konto" data-testid="quick-account">
              {data.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Kiedy">
            <div className="flex items-center gap-2">
              <DateField className="w-[104px]" value={d.date} onChange={(date) => date && set({ date })} aria-label="Data" data-testid="quick-date" />
              <TimeField className="w-[64px]" value={d.time} allowEmpty onChange={(time) => set({ time })} aria-label="Godzina" data-testid="quick-time" />
              {night && <span className="text-[11px] text-accent">cisza nocna</span>}
            </div>
          </Row>
          {d.kind === 'income' && data.members.length > 0 && (
            <Row label="Od domownika">
              <div className="flex items-center gap-1.5">
                <MemberPick
                  data={data}
                  value={d.household ? d.memberId : null}
                  onChange={(memberId) => set({ household: !!memberId, memberId, advance: data.members.find((m) => m.id === memberId)?.inflow === 'advance' })}
                  none="— nie —"
                  testId="quick-payer"
                />
                {d.household && d.memberId && (
                  <Segmented
                    size="sm"
                    value={d.advance ? 'advance' : 'income'}
                    onChange={(v) => set({ advance: v === 'advance' })}
                    options={[
                      { value: 'income', label: 'przychód' },
                      { value: 'advance', label: 'zaliczka' }
                    ]}
                    aria-label="Reszta wpłaty domownika"
                  />
                )}
              </div>
            </Row>
          )}
          {/* Who passes money through this member (D81): their part of this transfer, typed or left empty. */}
          {d.kind === 'income' &&
            d.household &&
            data.members
              .filter((m) => m.via === d.memberId)
              .map((m) => (
                <Row key={m.id} label={`W tym za ${m.name}`}>
                  <div className="flex items-center gap-2">
                    <AmountField className="w-[110px]" value={shares[m.id] || null} allowEmpty onChange={(v) => setShares((x) => ({ ...x, [m.id]: v ?? 0 }))} aria-label={`W tym za ${m.name}`} data-testid="quick-share" />
                    <span className="text-[11px] text-muted">{m.owed ? `ma oddać ${money(m.owed)}` : 'nic do oddania'}</span>
                  </div>
                </Row>
              ))}
          <Row label="Notatka">
            <input className="input" value={d.note} onChange={(e) => set({ note: e.currentTarget.value })} maxLength={500} data-testid="quick-note" />
          </Row>
          {(asks || night) && (
            <div className={cx('flex flex-col gap-1 border-l-2 pl-2', night ? 'border-accent' : 'border-line-strong')} data-testid="quick-log">
              <span className="label">Dziennik kapitański</span>
              {asks && (
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-accent">Plan czy impuls?</span>
                  <Segmented
                    size="sm"
                    value={d.impulse}
                    onChange={(impulse) => set({ impulse })}
                    options={[
                      { value: 'plan', label: 'plan' },
                      { value: 'impulse', label: 'impuls' }
                    ]}
                    aria-label="Plan czy impuls"
                  />
                </div>
              )}
              <input className="input" value={d.logNote} onChange={(e) => set({ logNote: e.currentTarget.value })} maxLength={500} placeholder={night ? 'Zakup w ciszy nocnej – dlaczego teraz?' : 'Krótko: skąd ten zakup?'} data-testid="quick-log-note" />
              {night && (
                <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <input type="checkbox" checked={nightOk} onChange={(e) => setNightOk(e.currentTarget.checked)} data-testid="quick-night-ok" />
                  Potwierdzam zakup w ciszy nocnej ({data.quietHours.from}–{data.quietHours.to})
                </label>
              )}
            </div>
          )}
          {preview && <div className="flex flex-col gap-0.5 border border-line bg-raised px-2 py-1.5 text-[12px] text-muted" data-testid="quick-preview">{preview}</div>}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 border-t border-line px-3 py-2">
        {msg && <span className={cx('min-w-0 flex-1 truncate text-[11.5px]', msg.ok ? 'text-fg-strong' : 'text-accent')} data-testid="quick-message">{msg.text}</span>}
        {!msg && <span className="flex-1 text-[11px] text-dim">Enter – zapisz · Esc – zamknij</span>}
        <button className="btn btn-accent h-[26px]" disabled={!data || busy} onClick={save} data-testid="quick-save">
          Zapisz
        </button>
      </div>
    </div>
  )
}

function CategoryPick({ data, value, onChange, testId }: { data: QuickData; value: string | null; onChange: (id: string | null) => void; testId?: string }) {
  const mains = data.categories.filter((c) => c.mainId === c.id)
  return (
    <select className="input min-w-0 flex-1" value={value ?? ''} onChange={(e) => onChange(e.currentTarget.value || null)} aria-label="Kategoria" data-testid={testId}>
      <option value="">— bez kategorii —</option>
      {mains.map((m) => (
        <optgroup key={m.id} label={m.label}>
          <option value={m.id}>{m.label}</option>
          {data.categories
            .filter((c) => c.mainId === m.id && c.id !== m.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}
