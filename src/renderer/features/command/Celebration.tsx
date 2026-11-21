/**
 * The game's events on this computer (spec: „Ekran awansu … z krótką animacją i dźwiękiem”, D73): a promotion and a
 * higher class get their screen with the fanfare; a demotion, an achievement and a judged mission come as a toast with
 * one sound – several at once as one toast (the watch log has them all).
 */
import { useEffect, useRef } from 'react'
import { ACHIEVEMENT_INFO, ACHIEVEMENTS, missionTitle, RANK_LABEL, RANKS, type AchievementId, type Rank } from '@shared/calc/game'
import { SHIP_CLASS_LABEL, SHIP_CLASSES, type ShipClass } from '@shared/calc/fleet'
import { useCelebrations, type Celebration } from '../../store/game'
import { navigate, toast } from '../../store/ui'
import { useFocusTrap } from '../../components/trap'
import { playSound } from '../../lib/sounds'
import { countLabel, plDate } from '../../lib/format'
import { Insignia } from './CommandPage'

const isRank = (x: string): x is Rank => (RANKS as readonly string[]).includes(x)
const isClass = (x: string): x is ShipClass => (SHIP_CLASSES as readonly string[]).includes(x)
const classUp = (c: Extract<Celebration, { kind: 'class' }>) => isClass(c.cls) && isClass(c.from) && SHIP_CLASSES.indexOf(c.cls) > SHIP_CLASSES.indexOf(c.from)
/** On its own screen: a promotion, a higher class. */
const isBig = (c: Celebration) => (c.kind === 'rank' && c.change === 'up') || (c.kind === 'class' && classUp(c))

const shift = (n = 1) => useCelebrations.setState((s) => ({ queue: s.queue.slice(n) }))

function smallText(c: Celebration): string {
  if (c.kind === 'rank') return `Degradacja: ${isRank(c.rank) ? RANK_LABEL[c.rank] : c.rank} – limit poważnych naruszeń w miesiącu.`
  if (c.kind === 'achievement') {
    const a = (ACHIEVEMENTS as readonly string[]).includes(c.id) ? ACHIEVEMENT_INFO[c.id as AchievementId] : null
    return a ? `Osiągnięcie: ${a.name} – ${a.text}` : `Osiągnięcie: ${c.id}`
  }
  if (c.kind === 'mission') return c.done ? `Misja wykonana: ${missionTitle(c.template)} – bliżej awansu.` : `Misja niewykonana: ${missionTitle(c.template)}.`
  return ''
}

export function GameCelebrations() {
  const head = useCelebrations((s) => s.queue[0] ?? null)
  // The small ones in a row go at once: one or two as their toasts, more as one, with one sound.
  useEffect(() => {
    if (!head || isBig(head)) return
    const queue = useCelebrations.getState().queue
    const end = queue.findIndex(isBig)
    const small = end < 0 ? queue : queue.slice(0, end)
    if (small.length <= 2) for (const c of small) toast(smallText(c), c.kind === 'achievement' || (c.kind === 'mission' && c.done) ? 'success' : 'info', 8000)
    else toast(`Dowództwo: ${countLabel(small.length, 'nowy wpis', 'nowe wpisy', 'nowych wpisów')} – szczegóły w dzienniku wachty.`, 'info', 8000, { label: 'Dowództwo', run: () => navigate({ page: 'command' }) })
    if (small.some((c) => c.kind === 'rank')) playSound('alarm')
    else if (small.some((c) => c.kind === 'achievement' || (c.kind === 'mission' && c.done))) playSound('plus')
    shift(small.length)
  }, [head])
  useEffect(() => {
    if (head && isBig(head)) playSound('promotion')
  }, [head])
  if (!head || !isBig(head)) return null
  return <BigCelebration head={head} />
}

/**
 * The screen of a promotion (UX-21): a dialog with the focus trap – its Enter and Esc are heard only with the focus in
 * it, never taken from a form under it (the trap moves the focus in when it opens, `Tab` goes round its buttons).
 */
function BigCelebration({ head }: { head: Celebration }) {
  const box = useRef<HTMLDivElement>(null)
  useFocusTrap(box)
  const rank = head.kind === 'rank' && isRank(head.rank) ? head.rank : null
  const title = rank ? `Awans: ${RANK_LABEL[rank]}` : head.kind === 'class' && isClass(head.cls) ? `Nowa klasa: ${SHIP_CLASS_LABEL[head.cls]}` : ''
  const day = head.kind === 'rank' || head.kind === 'class' ? head.day : ''
  const note = rank ? `Stopień od ${plDate(day)} – dni zgodne z rozkazami i wykonane misje.` : `Zasięg okrętu wzrósł (${plDate(day)}).`
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70" onMouseDown={() => shift()} data-testid="celebration" data-kind={head.kind}>
      <div
        ref={box}
        tabIndex={-1}
        className="relative flex w-[min(420px,92vw)] animate-pop-in flex-col items-center gap-3 overflow-hidden border border-accent/50 bg-panel px-6 py-6 outline-none"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Enter on one of its buttons is that button's click; on the dialog itself – „Do dzieła”.
          if (e.key === 'Escape' || (e.key === 'Enter' && e.target === e.currentTarget)) {
            e.preventDefault()
            e.stopPropagation()
            shift()
          }
        }}
        role="dialog"
        aria-modal
        aria-label="Awans"
      >
        {rank && <Insignia rank={rank} size={56} />}
        <span className="animate-event-in text-[18px] font-medium text-accent" data-testid="celebration-title">
          {title}
        </span>
        <span className="animate-event-in text-[12px] text-muted">{note}</span>
        <div className="flex gap-2 pt-1">
          <button className="btn btn-accent h-[26px]" onClick={() => shift()} data-testid="celebration-close">
            Do dzieła
          </button>
          <button
            className="btn h-[26px]"
            onClick={() => {
              shift()
              navigate({ page: 'command' })
            }}
          >
            Dowództwo
          </button>
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full origin-left animate-sweep bg-accent" />
      </div>
    </div>
  )
}
