import { useEffect, useId, useRef, useState } from 'react'
import { AnchoredList } from '../../components/AnchoredList'

export interface SplitItem {
  label: string
  hint: string
  testId: string
  run: () => void
}

/**
 * „Podziel…” (Z7, UX-37): one button for the two ways to split a purchase – into categories (a receipt's lines) or between
 * people (a shared purchase). Each item does what its own button did before (the caller gives them; no household
 * member – no second item). The menu's first item has the focus once it is open; arrows move, Esc closes and gives the
 * focus back to the button.
 */
export function SplitMenu({ items, testId }: { items: SplitItem[]; testId: string }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const close = (back: boolean) => {
    setOpen(false)
    if (back) button.current?.focus()
  }
  useEffect(() => {
    if (!open) return
    const list = document.getElementById(listId)
    list?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const away = (e: MouseEvent) => {
      if (e.target instanceof Node && (list?.contains(e.target) || button.current?.contains(e.target))) return
      setOpen(false)
    }
    window.addEventListener('mousedown', away)
    return () => window.removeEventListener('mousedown', away)
  }, [open, listId])
  return (
    <>
      <button
        ref={button}
        type="button"
        className="btn h-[24px] shrink-0"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        title="Podziel zakup: na kategorie (paragon) albo na osoby (wspólny zakup)"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        data-testid={testId}
      >
        Podziel…
      </button>
      {open && (
        <AnchoredList
          anchor={button}
          id={listId}
          role="menu"
          minWidth={190}
          label="Podziel"
          testId={`${testId}-list`}
        >
          <div
            onKeyDown={(e) => {
              const row = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
              const i = row.indexOf(document.activeElement as HTMLElement)
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                // The list of operations behind keeps its arrows for itself.
                e.preventDefault()
                e.stopPropagation()
                row[(i + (e.key === 'ArrowDown' ? 1 : -1) + row.length) % row.length]?.focus()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                close(true)
              } else if (e.key === 'Tab') close(false)
            }}
          >
            {items.map((it) => (
              <button
                key={it.testId}
                type="button"
                role="menuitem"
                title={it.hint}
                className="flex h-[26px] w-full items-center px-2 text-left text-fg outline-none hover:bg-hover focus:bg-hover"
                onClick={() => {
                  close(false)
                  it.run()
                }}
                data-testid={it.testId}
              >
                {it.label}
              </button>
            ))}
          </div>
        </AnchoredList>
      )}
    </>
  )
}
