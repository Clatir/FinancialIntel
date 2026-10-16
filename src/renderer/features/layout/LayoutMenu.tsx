// adapted from ICTTJ src/renderer/features/layout/LayoutMenu.tsx @ 84a8339
import { useState } from 'react'
import { PAGE_LABELS, hiddenPanels, isEmptyPageLayout, pageLayoutOf, samePageLayout } from '@shared/panels'
import type { LayoutPreset } from '@shared/schema'
import { Popover } from '../../components/Popover'
import { pageDef } from '../screens/pages'
import { IconCheck, IconClose, IconLayout } from '../../components/icons'
import { cx } from '../../components/ui'
import { useColumns } from '../../store/columns'
import { useData } from '../../store/data'
import {
  applyPageLayout,
  deletePreset,
  overwritePreset,
  renamePreset,
  resetAllLayouts,
  savePreset,
  showAllPanels,
  showPanel,
  useLayoutPresets
} from '../../store/layout'
import { usePanels } from '../../store/panels'
import { useUi } from '../../store/ui'

/**
 * Panels of the page in the order they stand (hidden ones keep an empty placeholder with the same `data-panel`), then
 * hidden panels that are not on the screen now (e.g. "Missed trade" while a closed trade is open).
 */
function panelsOnPage(page: string, hidden: readonly string[]): Array<{ name: string; present: boolean }> {
  const names: string[] = []
  for (const el of document.querySelectorAll<HTMLElement>('[data-panel]')) {
    const key = el.dataset.panel ?? ''
    if (!key.startsWith(`${page}:`)) continue
    const name = key.slice(page.length + 1)
    if (!names.includes(name)) names.push(name)
  }
  return [...names.map((name) => ({ name, present: true })), ...hidden.filter((n) => !names.includes(n)).map((name) => ({ name, present: false }))]
}

/**
 * Top bar → Układ: show or hide each panel of the page, saved layouts of the page (fi.json, every
 * computers) and the default layout of the page or of every page; applying and resetting can be undone.
 */
export function LayoutMenu() {
  const page = useUi((s) => s.route.page)
  const panels = usePanels((s) => s)
  const columns = useColumns((s) => s)
  const readOnly = useData((s) => s.status?.readOnly ?? true)
  const presets = useLayoutPresets()
  const hidden = hiddenPanels(page, panels)
  const label = pageDef(page)?.label ?? PAGE_LABELS[page] ?? page
  return (
    <Popover
      label={
        <span className="flex items-center gap-1.5 text-[11.5px]">
          <IconLayout size={13} /> Układ
          {hidden.length > 0 && <span className="num text-accent">· {hidden.length} ukr.</span>}
        </span>
      }
      title={`Układ strony „${label}”: panele do pokazania lub ukrycia, zapisane układy, układ domyślny`}
      active={hidden.length > 0}
      align="right"
      width={360}
      testId="layout-menu"
      panelTestId="layout-menu-panel"
    >
      {() => (
        <LayoutMenuBody
          page={page}
          label={label}
          hidden={hidden}
          presets={presets.filter((p) => p.page === page)}
          current={pageLayoutOf(page, panels, columns)}
          readOnly={readOnly}
        />
      )}
    </Popover>
  )
}

function LayoutMenuBody({
  page,
  label,
  hidden,
  presets,
  current,
  readOnly
}: {
  page: string
  label: string
  hidden: readonly string[]
  presets: readonly LayoutPreset[]
  current: ReturnType<typeof pageLayoutOf>
  readOnly: boolean
}) {
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null)
  const list = panelsOnPage(page, hidden)
  const isDefault = isEmptyPageLayout(current)
  return (
    <div className="flex flex-col gap-2" data-testid="layout-menu-body">
      <div className="flex items-baseline justify-between">
        <span className="label">Panele – {label}</span>
        {hidden.length > 0 && (
          <button className="text-[11.5px] text-accent hover:underline" onClick={() => showAllPanels(page)} data-testid="layout-show-all">
            Pokaż wszystkie
          </button>
        )}
      </div>
      {list.length ? (
        <div className="flex max-h-[260px] flex-col overflow-y-auto border border-line">
          {list.map(({ name: n, present }) => {
            const shown = !hidden.includes(n)
            return (
              <label key={n} className="flex cursor-pointer items-center gap-2 border-b border-line/60 px-2 py-[3px] last:border-b-0 hover:bg-hover">
                <input type="checkbox" checked={shown} onChange={() => showPanel(`${page}:${n}`, !shown)} data-testid="layout-panel" data-name={n} />
                <span className={cx('min-w-0 flex-1 truncate', !shown && 'text-muted')}>{n}</span>
                {!present && <span className="shrink-0 text-[10.5px] text-dim">nie na tym ekranie</span>}
              </label>
            )
          })}
        </div>
      ) : (
        <span className="text-muted">Na tej stronie nie ma paneli do ukrycia.</span>
      )}
      <span className="text-[11px] text-dim">Ukryty panel znika, a pozostałe zajmują jego miejsce. Zwinięcie, wysokość i szerokość ustawisz na samym panelu.</span>

      <div className="mt-1 border-t border-line pt-2">
        <span className="label">Zapisane układy tej strony</span>
        <span className="ml-1 text-[11px] text-dim">(w folderze danych – na obu komputerach)</span>
      </div>
      {presets.length > 0 && (
        <div className="flex flex-col border border-line" data-testid="layout-presets">
          {presets.map((p) => {
            const active = samePageLayout(p, current)
            return (
              <div key={p.id} className="flex items-center gap-1 border-b border-line/60 px-1.5 py-[3px] last:border-b-0" data-testid="layout-preset">
                {renaming?.id === p.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      renamePreset(p, renaming.draft)
                      setRenaming(null)
                    }}
                  >
                    <input
                      className="input h-[22px] min-w-0 flex-1 text-[12px]"
                      value={renaming.draft}
                      maxLength={40}
                      autoFocus
                      onChange={(e) => setRenaming({ id: p.id, draft: e.currentTarget.value })}
                      onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setRenaming(null))}
                      aria-label="Nowa nazwa układu"
                    />
                    <button type="submit" className="btn h-[22px] px-1.5" title="Zapisz nazwę">
                      <IconCheck size={12} />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      className={cx('min-w-0 flex-1 truncate text-left hover:text-fg-strong', active && 'text-accent')}
                      title={active ? 'Ten układ jest teraz używany' : 'Użyj tego układu'}
                      onClick={() => applyPageLayout(page, p, `Układ „${p.name}”.`)}
                      data-testid="layout-preset-apply"
                    >
                      {active && '✓ '}
                      {p.name}
                    </button>
                    {!readOnly && (
                      <>
                        <button className="btn btn-ghost h-[20px] px-1 text-[11px]" title="Zapisz w nim bieżący układ" onClick={() => overwritePreset(p)} disabled={active}>
                          Nadpisz
                        </button>
                        <button className="btn btn-ghost h-[20px] px-1 text-[11px]" title="Zmień nazwę" onClick={() => setRenaming({ id: p.id, draft: p.name })}>
                          Nazwa
                        </button>
                        <button className="btn btn-ghost h-[20px] px-1 hover:text-down" title="Usuń układ" onClick={() => deletePreset(p)} data-testid="layout-preset-delete">
                          <IconClose size={11} />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
      {readOnly ? (
        <span className="text-[11px] text-dim">Folder tylko do odczytu – nowych układów nie zapiszesz.</span>
      ) : (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (savePreset(page, name)) setName('')
          }}
        >
          <input
            className="input h-[24px] min-w-0 flex-1 text-[12px]"
            placeholder="Nazwa, np. Duży wykres"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.currentTarget.value)}
            data-testid="layout-preset-name"
          />
          <button type="submit" className="btn h-[24px]" disabled={!name.trim()} data-testid="layout-preset-save">
            Zapisz bieżący
          </button>
        </form>
      )}

      <div className="mt-1 flex flex-wrap gap-1.5 border-t border-line pt-2">
        <button
          className="btn h-[24px]"
          disabled={isDefault}
          title={isDefault ? 'Ta strona ma już układ domyślny' : 'Pokaż wszystkie panele, rozwiń je, naturalne wysokości i szerokości'}
          onClick={() => applyPageLayout(page, null, `Przywrócono domyślny układ strony „${label}”.`)}
          data-testid="layout-reset-page"
        >
          Domyślny układ tej strony
        </button>
        <button className="btn h-[24px]" onClick={resetAllLayouts} data-testid="layout-reset-all">
          … wszystkich stron
        </button>
      </div>
    </div>
  )
}
