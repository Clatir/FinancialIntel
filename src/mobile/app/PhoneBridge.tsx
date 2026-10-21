/**
 * Mostek on the phone (IP2): the computers' panels in one column – the briefing with Daily Bias, the ship's state with
 * „skąd ta liczba?”, the envelopes, the latest operations, the household, the income and the wealth curve. The
 * docking stays on a computer (ICTTJ is read there).
 */
import { SHIP_CLASS_LABEL } from '@shared/calc/fleet'
import { rangeText } from '@shared/format'
import { useData } from '@renderer/store/data'
import { useFleet } from '@renderer/store/fleet'
import { Badge, Empty } from '@renderer/components/ui'
import { BridgePanels } from '@renderer/features/bridge/BridgePage'

export function PhoneBridge() {
  const fleet = useFleet()
  const fi = useData((s) => s.fi)
  if (!fleet || !fi) return <Empty>Wczytywanie…</Empty>
  return (
    <div className="flex min-h-full flex-col" data-testid="page-bridge">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Mostek</h1>
        {fleet.shipClass && (
          <Badge tone="accent" title={`Klasa według zasięgu: ${rangeText(fleet.range)}`} data-testid="ship-class">
            {SHIP_CLASS_LABEL[fleet.shipClass]}
          </Badge>
        )}
      </div>
      <BridgePanels single />
    </div>
  )
}
