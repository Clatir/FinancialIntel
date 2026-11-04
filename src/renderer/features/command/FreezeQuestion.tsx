/**
 * The question before freezing days without the bank's data (AP-14, D99 pkt 5): an import late more than 3 days and days
 * due to freeze after what the bank's files cover – „Zaimportuj najpierw” (the days wait, a week at most) or „Zamroź bez
 * danych”. Asked on the computer in use (it freezes), once while the window lives; Dowództwo keeps the answer at hand.
 */
import { useFolderLocked } from '../../store/data'
import { dismissFreezeAsk, freezeWithoutImport, useFreezeAsk, type FreezeAsk } from '../../store/game'
import { navigate } from '../../store/ui'
import { Modal } from '../../components/Modal'
import { countLabel, plDate } from '../../lib/format'

/** The days waiting: „dzień 02.11.2026” or „dni od 20.10.2026 do 02.11.2026”. */
export const freezeRange = (ask: Pick<FreezeAsk, 'first' | 'last'>): string => (ask.first === ask.last ? `dzień ${plDate(ask.first)}` : `dni od ${plDate(ask.first)} do ${plDate(ask.last)}`)

export function FreezeQuestion() {
  const ask = useFreezeAsk((s) => s.ask)
  const dismissed = useFreezeAsk((s) => s.dismissed)
  // A folder only to read (or another one opening) freezes nothing: no question then.
  const locked = useFolderLocked()
  if (!ask || ask.key === dismissed || locked) return null
  const late = ask.late.map((a) => `${a.name}: ostatni import ${countLabel(a.days, 'dzień', 'dni', 'dni')} temu`).join('; ')
  return (
    <Modal
      title="Dni bez danych z banku"
      width={480}
      onClose={dismissFreezeAsk}
      testId="freeze-ask"
      footer={
        <>
          <span className="flex-1" />
          <button
            className="btn btn-accent h-[26px]"
            onClick={() => {
              dismissFreezeAsk()
              navigate({ page: 'import' })
            }}
            data-testid="freeze-ask-import"
          >
            Zaimportuj najpierw
          </button>
          <button className="btn h-[26px]" onClick={freezeWithoutImport} data-testid="freeze-ask-freeze">
            Zamroź bez danych
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-[12px]">
        <span className="text-fg-strong" data-testid="freeze-ask-text">
          {late}. Gra zamrozi {freezeRange(ask)} bez operacji z banku.
        </span>
        <span className="text-muted">Zamrożona ocena dnia zostaje: późniejszy import zmieni budżet, ale nie ocenę, serię ani stopień.</span>
        <span className="text-[11.5px] text-dim">
          „Zaimportuj najpierw” – dni czekają na import, najwyżej do {plDate(ask.until)}; potem zamrożą się tak, jak są.
        </span>
      </div>
    </Modal>
  )
}
