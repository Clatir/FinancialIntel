/**
 * A purchase financed by several people (D83): who – me and household members, a gift of one of them – and how much:
 * equally, by percents or by amounts (mine – the rest). One editor for the operation, the quick entry, the import's
 * decisions and the bulk decisions; it knows the members only from its props (the quick window has no store).
 */
import { changeMode, equalPercents, line, percentSum, restIndex, SHARE_MODE_LABEL, shareAmounts, shareComplete } from '@shared/calc/share'
import { SHARE_MODES, type Share, type ShareLine, type ShareMode } from '@shared/schema'
import { AmountField, plnText } from '../../components/fields'
import { IconClose, IconPlus } from '../../components/icons'
import { NumberField, Segmented, cx } from '../../components/ui'

export interface ShareMember {
  id: string
  name: string
  archived?: boolean
}

/** Percents with two decimals: what the field keeps of a typed one. */
const percent = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 100) / 100

/** The lines' percents spread equally (`calc/share.ts`: the last one takes the rest of 100). */
function spreadEqually(lines: readonly ShareLine[]): ShareLine[] {
  const pct = equalPercents(lines.length)
  return lines.map((l, i) => ({ ...l, value: pct[i]! }))
}

/** „ja, Mama (prezent), Tata” – for the lists and the toasts. */
export function shareNames(share: Share, members: readonly ShareMember[]): string {
  return share.lines.map((l) => (l.memberId ? `${members.find((m) => m.id === l.memberId)?.name ?? 'domownik'}${l.gift ? ' (prezent)' : ''}` : 'ja')).join(', ')
}

export function ShareEditor({
  share,
  total,
  members,
  onChange,
  onClear,
  modes = SHARE_MODES,
  testId
}: {
  share: Share
  /** Grosze ≥ 0 (the amounts shown); null = the amount of each operation (rules, groups, bulk). */
  total: number | null
  members: readonly ShareMember[]
  onChange: (s: Share) => void
  /** „bez podziału”: back to one financer. */
  onClear?: () => void
  modes?: readonly ShareMode[]
  testId: string
}) {
  const amounts = total != null ? shareAmounts(total, share) : null
  const used = new Set(share.lines.map((l) => l.memberId ?? ''))
  const free = [...(used.has('') ? [] : [null]), ...members.filter((m) => !m.archived && !used.has(m.id)).map((m) => m.id)]
  const setLine = (i: number, p: Partial<ShareLine>) => onChange({ ...share, lines: share.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) })
  const add = () => {
    if (!free.length) return
    const lines = [...share.lines, line(free[0] ?? null, false, 0)]
    onChange({ ...share, lines: share.mode === 'percent' ? spreadEqually(lines) : lines })
  }
  const remove = (i: number) => {
    const gone = share.lines[i]!
    let lines = share.lines.filter((_, j) => j !== i)
    // Its percent to my line (else the last one): the rest still sums to 100.
    if (share.mode === 'percent') {
      const mine = lines.findIndex((l) => l.memberId == null)
      const to = mine >= 0 ? mine : lines.length - 1
      lines = lines.map((l, j) => (j === to ? { ...l, value: percent(l.value + gone.value) } : l))
    }
    onChange({ ...share, lines })
  }
  // The line taking the rest of the amounts (`calc/share.ts`).
  const rest = share.mode === 'amounts' ? restIndex(share) : -1
  const sumPct = percentSum(share)
  const complete = shareComplete(share, total)
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          value={share.mode}
          onChange={(mode: ShareMode) => onChange(changeMode(share, mode, total && total > 0 ? total : 10000))}
          options={modes.map((m) => ({ value: m, label: SHARE_MODE_LABEL[m] }))}
          aria-label="Jak podzielić"
        />
        {onClear && (
          <button type="button" className="text-[11px] text-dim hover:text-fg-strong" onClick={onClear} data-testid={`${testId}-clear`}>
            bez podziału
          </button>
        )}
      </div>
      {share.lines.map((l, i) => {
        const offered = [l.memberId, ...free.filter((x) => x !== l.memberId)]
        return (
          <div key={i} className="flex flex-wrap items-center gap-1.5" data-testid={`${testId}-line`}>
            <select
              className="input h-[22px] w-[104px] py-0 text-[11.5px]"
              value={l.memberId ?? ''}
              onChange={(e) => setLine(i, { memberId: e.currentTarget.value || null, gift: e.currentTarget.value ? l.gift : false })}
              aria-label={`Osoba ${i + 1}`}
              data-testid={`${testId}-person`}
            >
              {offered.map((id) => (
                <option key={id ?? 'me'} value={id ?? ''}>
                  {id ? (members.find((m) => m.id === id)?.name ?? 'domownik spoza listy') : 'ja'}
                </option>
              ))}
            </select>
            {share.mode === 'percent' && (
              <span className="flex items-center gap-1">
                <NumberField
                  className="h-[22px] w-[64px] text-[11.5px]"
                  value={l.value}
                  decimals={l.value % 1 ? 2 : 0}
                  step={5}
                  commitOnBlur
                  isValid={(v) => v != null && v >= 0 && v <= 100}
                  onChange={(v) => setLine(i, { value: percent(v ?? 0) })}
                  aria-label={`Procent osoby ${i + 1}`}
                  data-testid={`${testId}-percent`}
                />
                <span className="text-[11px] text-muted">%</span>
              </span>
            )}
            {share.mode === 'amounts' &&
              (i === rest ? (
                <span className="w-[86px] text-[11px] text-muted">reszta</span>
              ) : (
                <AmountField className="h-[22px] w-[86px] text-[11.5px]" value={l.value} onChange={(v) => setLine(i, { value: Math.max(0, v ?? 0) })} aria-label={`Kwota osoby ${i + 1}`} data-testid={`${testId}-amount`} />
              ))}
            {amounts && <span className="num min-w-[64px] text-right text-[11.5px] text-fg-strong" data-testid={`${testId}-part`}>{plnText(amounts[i] ?? 0)} zł</span>}
            {l.memberId && (
              <label className="flex items-center gap-1 text-[11px] text-muted" title="Prezent: nic nie jest winna / winien – najpierw z jej / jego zaliczki, resztę pokrywają osłony">
                <input type="checkbox" checked={l.gift} onChange={(e) => setLine(i, { gift: e.currentTarget.checked })} data-testid={`${testId}-gift`} />
                prezent
              </label>
            )}
            {share.lines.length > 2 && (
              <button type="button" className="btn btn-ghost h-[22px] px-1" title="Usuń osobę" onClick={() => remove(i)} data-testid={`${testId}-remove`}>
                <IconClose size={12} />
              </button>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {free.length > 0 && (
          <button type="button" className="flex items-center gap-1 text-dim hover:text-fg-strong" onClick={add} data-testid={`${testId}-add`}>
            <IconPlus size={11} /> osoba
          </button>
        )}
        {share.mode === 'percent' && (
          <span className={cx(complete ? 'text-dim' : 'text-accent')} data-testid={`${testId}-sum`}>
            razem {String(sumPct).replace('.', ',')} %{complete ? '' : ' – ostatnia osoba bierze resztę do 100 %'}
          </span>
        )}
        {share.mode === 'amounts' && !complete && <span className="text-accent">kwoty innych przekraczają całość – reszta 0 zł</span>}
        <span className="text-dim">moja część – mój wydatek; części domowników – do ich rozliczeń</span>
      </div>
    </div>
  )
}
