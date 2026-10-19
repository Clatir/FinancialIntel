// adapted from ICTTJ src/renderer/app/ShortcutsHelp.tsx @ 84a8339
import { useEffect, useState } from 'react'
import { IconClose } from '../components/icons'
import { Kbd } from '../components/ui'
import { PAGES } from '../features/screens/pages'

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Ogólne',
    items: [
      ['Ctrl K', 'paleta komend'],
      ['Ctrl S', 'zapisz teraz (zapis i tak jest automatyczny)'],
      ['Ctrl N', 'nowa operacja'],
      ['Ctrl Alt B', 'szybki wpis – w całym systemie (zmiana: Ustawienia → Powiadomienia i dźwięki)'],
      ['Ctrl $', 'ukryj / pokaż kwoty'],
      ['Esc / mysz „wstecz”', 'poprzednia strona (Ustawienia, Synchronizacja, Meldunki)'],
      ['? lub F1', 'ta ściąga']
    ]
  },
  {
    title: 'Ekrany',
    items: [
      ...PAGES.map((p): [string, string] => [`Ctrl ${p.key}`, p.label.toLowerCase()]),
      ['Ctrl Shift Y', 'synchronizacja i problemy'],
      ['Ctrl Shift M', 'meldunki do rozpatrzenia'],
      ['Ctrl ,', 'ustawienia']
    ]
  },
  {
    title: 'Panele i osobne okna',
    items: [
      ['dwuklik tytułu', 'zwiń / rozwiń panel'],
      ['↑ ↓ na uchwycie (Shift: × 5)', 'wysokość panelu'],
      ['Home / Esc na uchwycie, dwuklik', 'naturalna wysokość'],
      ['Esc', 'zamknij powiększenie panelu'],
      ['F11', 'pełny ekran osobnego okna (Esc – wyjście)']
    ]
  }
]

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
      if (e.key === 'F1' || (e.key === '?' && !typing && !e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('fi:shortcuts', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('fi:shortcuts', onOpen)
    }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60" onMouseDown={() => setOpen(false)} data-testid="shortcuts">
      <div className="w-[860px] animate-pop-in border border-line-strong bg-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex h-[34px] items-center border-b border-line px-3">
          <span className="label flex-1">Skróty klawiszowe</span>
          <button className="btn btn-ghost h-[24px] px-1.5" onClick={() => setOpen(false)} aria-label="Zamknij">
            <IconClose />
          </button>
        </div>
        <div className="grid max-h-[calc(100vh-120px)] grid-cols-3 gap-x-6 gap-y-4 overflow-y-auto p-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-1">
              <span className="label mb-1 text-accent">{g.title}</span>
              {g.items.map(([keys, what]) => (
                <div key={keys} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="text-fg">{what}</span>
                  <Kbd>{keys}</Kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
