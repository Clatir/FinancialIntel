import { useState } from 'react'
import { altGrConflict, shortcutLabel } from '@shared/machine'
import { toast } from '../store/ui'
import { cx } from './ui'

/** An Electron accelerator from a key press: modifiers + the key ('Control+Alt+B'); null = not a full shortcut. */
export function acceleratorOf(e: { ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean; code: string; key: string }): string | null {
  const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean) as string[]
  let key: string | null = null
  const c = e.code
  if (/^Key[A-Z]$/.test(c)) key = c.slice(3)
  else if (/^Digit\d$/.test(c)) key = c.slice(5)
  else if (/^F([1-9]|1\d|2[0-4])$/.test(c)) key = c
  else if (c === 'Space') key = 'Space'
  // A global shortcut needs a modifier (a plain letter would be taken from every program); Shift alone is not one.
  if (!key || !mods.some((m) => m !== 'Shift')) return null
  return [...mods, key].join('+')
}

/** Why a shortcut is not taken: it is AltGr+letter on the Polish keyboard (B29); null = it can be set. */
export function shortcutProblem(accelerator: string): string | null {
  const char = altGrConflict(accelerator)
  if (!char) return null
  const key = accelerator.split('+').pop() ?? ''
  const shift = /(^|\+)shift(\+|$)/i.test(accelerator) ? 'Shift+' : ''
  return `${shortcutLabel(accelerator)} to w polskim układzie AltGr+${shift}${key} („${char}”) – skrót zabrałby ten znak wszystkim programom. Wybierz inną literę albo cyfrę, np. Ctrl+Alt+B.`
}

/** Press the new shortcut (Esc keeps the old one, Backspace clears it; AltGr+letter is refused – B29). */
export function ShortcutField({ value, onChange, className, ...rest }: { value: string; onChange: (accelerator: string) => void; className?: string; 'data-testid'?: string }) {
  const [listening, setListening] = useState(false)
  return (
    <button
      type="button"
      className={cx('input num min-w-[150px] text-left', listening && 'border-accent text-accent', className)}
      onClick={() => setListening(true)}
      onBlur={() => setListening(false)}
      onKeyDown={(e) => {
        if (!listening) return
        e.preventDefault()
        e.stopPropagation()
        if (e.key === 'Escape') return setListening(false)
        if (e.key === 'Backspace' || e.key === 'Delete') {
          onChange('')
          return setListening(false)
        }
        const acc = acceleratorOf(e)
        const problem = acc && shortcutProblem(acc)
        if (problem) toast(problem, 'error', 8000)
        else if (acc) {
          onChange(acc)
          setListening(false)
        }
      }}
      data-testid={rest['data-testid']}
    >
      {listening ? 'Naciśnij skrót…' : value ? shortcutLabel(value) : 'brak'}
    </button>
  )
}
