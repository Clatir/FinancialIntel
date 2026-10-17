import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { QuickData, QuickResult } from '@shared/api'
import { inClockWindow, warsawNow } from '@shared/calc/dates'
import { counterpartyKey } from '@shared/import/classify'
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
}

const blank = (data: QuickData | null): QuickDraft => {
  const { date, time } = warsawNow()
  return { kind: 'expense', amount: 0, categoryId: null, accountId: data?.accountId ?? '', date, time, counterparty: '', note: '', impulse: null, logNote: '', household: false, splits: [] }
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
 * The quick entry window (spec, „Szybki wpis”): an expense, an income or a purchase for the house in a few keys –
 * the amount, the officer's category, the account, the time; today's energy after it before saving; a split receipt;
 * the captain's log from the threshold and the quiet hours' confirmation. Enter saves, Esc closes.
 */
export function QuickApp() {
  const [data, setData] = useState<QuickData | null>(null)
  const [d, setD] = useState<QuickDraft>(() => blank(null))
  const [lines, setLines] = useState<Line[]>([])
  const [nightOk, setNightOk] = useState(false)
  const [busy, setBusy] = useState(false)
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
      setNightOk(false)
      setMsg(null)
      setOfficer(null)
      setBusy(false)
      // Focus after the reset has rendered (an earlier focus would take the previous amount as its draft).
      setOpened((n) => n + 1)
    })
    const offResult = api.onQuickResult((r: QuickResult) => {
      setBusy(false)
      setMsg({ ok: r.ok, text: r.message })
      if (r.ok) setTimeout(() => void api.quickClose(), 450)
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
    if (d.kind === 'income') return <span>Wpływ – dokuje w warstwach okrętu{d.household ? ' (najpierw spłaca należność domu)' : ''}.</span>
    const parts: Line[] = lines.length > 1 ? lines : [{ amount: d.amount, categoryId: d.categoryId, refundable: d.kind === 'refundable' }]
    let daily = 0
    const planned = new Map<string, number>()
    let house = 0
    for (const p of parts) {
      if (p.refundable) {
        house += p.amount
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
    if (house) out.push(<div key="house">Do zwrotu {money(house)} – nie zjada energii, dom odda.</div>)
    return out
  }, [data, d, lines, cats, money])

  const save = useCallback(() => {
    if (busy || !data) return
    if (data.readOnly) return setMsg({ ok: false, text: 'Folder jest tylko do odczytu.' })
    if (d.amount <= 0) return setMsg({ ok: false, text: 'Wpisz kwotę.' })
    if (lines.length > 1 && lines.reduce((a, l) => a + l.amount, 0) !== d.amount) return setMsg({ ok: false, text: 'Części paragonu nie sumują się do kwoty.' })
    if (night && (!nightOk || !d.logNote.trim())) return setMsg({ ok: false, text: 'Cisza nocna: potwierdź zakup i wpisz krótko, dlaczego teraz.' })
    setBusy(true)
    setMsg(null)
    void api.quickAdd({ ...d, splits: lines.length > 1 ? lines : [] } satisfies QuickDraft)
  }, [busy, data, d, lines, night, nightOk])

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
            onChange={(kind: Kind) => set({ kind, household: false })}
            options={[
              { value: 'expense', label: 'Wydatek' },
              { value: 'income', label: 'Wpływ' },
              { value: 'refundable', label: 'Do zwrotu' }
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
                  title="Podziel paragon: kilka kategorii albo część domowa"
                  onClick={() => setLines([{ amount: d.amount, categoryId: d.categoryId, refundable: d.kind === 'refundable' }, { amount: 0, categoryId: null, refundable: false }])}
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
          {d.kind !== 'income' && lines.length > 1 && (
            <div className="flex flex-col gap-1 border-l-2 border-line-strong pl-2" data-testid="quick-lines">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-1.5">
                  <AmountField value={l.amount} onChange={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: v ?? 0 } : x)))} aria-label={`Część ${i + 1}`} />
                  <CategoryPick data={data} value={l.categoryId} onChange={(categoryId) => setLines(lines.map((x, j) => (j === i ? { ...x, categoryId } : x)))} />
                  <label className="flex items-center gap-1 text-[11px] text-muted">
                    <input type="checkbox" checked={l.refundable} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, refundable: e.currentTarget.checked } : x)))} />
                    dom
                  </label>
                </div>
              ))}
              <div className="flex items-center gap-2 text-[11px]">
                <button className="text-accent hover:underline" onClick={() => setLines([...lines, { amount: Math.max(0, d.amount - lines.reduce((a, l) => a + l.amount, 0)), categoryId: null, refundable: false }])}>
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
          {d.kind === 'income' && data.house > 0 && (
            <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <input type="checkbox" checked={d.household} onChange={(e) => set({ household: e.currentTarget.checked })} data-testid="quick-household" />
              Od domownika – najpierw spłaca należność domu ({money(data.house)})
            </label>
          )}
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
