import { Columns } from '../../components/layout'
import { Panel } from '../../components/ui'
import { useData } from '../../store/data'
import type { DetachSpec } from '../../store/detach'
import type { PageDef } from './pages'

/** Panels of each screen as planned (docs/specyfikacja.md, „Ekrany”); E0 shows them empty. */
const PANELS: Record<PageDef['page'], string[][]> = {
  bridge: [['Odprawa', 'Stan okrętu'], ['Koperty', 'Rozliczenia z domownikami'], ['Ostatnie operacje']],
  operations: [['Lista operacji'], ['Szczegóły']],
  import: [['Plik z mBanku', 'Podgląd'], ['Dopasowania', 'Kategoryzacja']],
  month: [['Pensja', 'Podział pensji'], ['Dzienny przydział', 'Debriefing']],
  cargo: [['Kontenery', 'Odkładki'], ['Linia zanurzenia', 'Symulacja']],
  starmap: [['Cele z prognozy ICTTJ'], ['Cele własne', 'Priorytety i ETA']],
  radar: [['Radar 90 dni'], ['Przypomnienia', 'Należności']],
  command: [['Rozkazy', 'Stopień i klasa'], ['Seria i misje', 'Osiągnięcia'], ['Dziennik wachty']],
  intel: [['Krzywa majątku'], ['Killzones', 'FVG kopert'], ['Prognoza zasięgu']],
  reports: [['Raporty'], ['Eksport']]
}

const placeholderText = (def: PageDef) => `${def.label} – panel powstanie w etapie ${def.stage}.`

/**
 * A screen of a later stage: its planned panels, empty, with everything panels can do (collapse, maximize, height and
 * column width, hide, detach to its own window, saved layouts).
 */
export function PlaceholderPage({ def }: { def: PageDef }) {
  const shipName = useData((s) => s.fi?.settings.shipName ?? '')
  const columns = PANELS[def.page]
  const detach = (title: string): DetachSpec => ({ kind: 'placeholder', props: { text: `${title}: ${placeholderText(def)}` } })
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid={`page-${def.page}`}>
      <div className="flex shrink-0 items-baseline gap-3 border-b border-line px-4 py-2.5">
        <h1 className="text-[15px] font-medium text-fg-strong">{def.label}</h1>
        <span className="text-[12px] text-muted">{def.sub}</span>
        {def.page === 'bridge' && shipName && (
          <span className="text-[12px] text-muted" data-testid="ship-name">
            · okręt <span className="text-accent">{shipName}</span>
          </span>
        )}
        <span className="flex-1" />
        <span className="label" data-testid="page-stage">
          etap {def.stage}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Columns id="main" tracks={columns.map(() => '1fr')} className="grid min-h-full items-start">
          {columns.map((col, i) => (
            <div key={i} className="flex min-w-0 flex-col">
              {col.map((title) => (
                <Panel key={title} title={title} detach={detach(title)}>
                  <div className="flex min-h-[120px] items-center justify-center p-4 text-center text-[12px] text-dim">{placeholderText(def)}</div>
                </Panel>
              ))}
            </div>
          ))}
        </Columns>
      </div>
    </div>
  )
}
