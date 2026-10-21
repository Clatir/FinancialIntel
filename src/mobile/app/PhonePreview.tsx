/**
 * Plan miesiąca and Radar on the phone (IP6, IP7): the computers' screens read only, their columns one under another –
 * the months and the plan of the year can be looked through; the plan, loans, buoys and transfers are changed on a
 * computer (on the phone from the next version, IP13–IP14).
 */
import type { ReactNode } from 'react'
import { MonthPage } from '@renderer/features/month/MonthPage'
import { RadarPage } from '@renderer/features/radar/RadarPage'

function Preview({ what, children }: { what: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col" data-testid="phone-preview">
      <p className="border-b border-line bg-panel px-3 py-1.5 text-[11.5px] text-muted" data-testid="phone-preview-note">
        Podgląd – {what} zmieniasz na komputerze.
      </p>
      {children}
    </div>
  )
}

export function PhoneMonth() {
  return (
    <Preview what="pensję, koperty i łupy">
      <MonthPage preview />
    </Preview>
  )
}

export function PhoneRadar() {
  return (
    <Preview what="pożyczki, boje i przelewy">
      <RadarPage preview />
    </Preview>
  )
}
