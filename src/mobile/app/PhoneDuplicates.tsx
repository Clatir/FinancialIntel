/**
 * Duplicates on the phone (IP12): the computers' panel of the import screen – the same operation typed by hand and come
 * from the bank, or written on two computers – merged with one „Cofnij”; the import from mBank itself stays on a computer.
 * The phone's route of the import (T311): this screen when it opens with duplicates (Meldunki), otherwise the import's
 * „only on a computer” (the briefing's „import”, a bank file).
 */
import { useState, type ReactNode } from 'react'
import { Empty } from '@renderer/components/ui'
import { DuplicatesPanel, useDuplicates } from '@renderer/features/import/DuplicatesPanel'

export function PhoneDuplicates({ fallback }: { fallback: ReactNode }) {
  const { groups } = useDuplicates()
  // Decided once: the last group merged keeps the screen (with its „Cofnij”).
  const [had] = useState(groups.length > 0)
  if (!had) return <>{fallback}</>
  return (
    <div className="flex min-h-full flex-col" data-testid="page-duplicates">
      <div className="border-b border-line px-3 py-2">
        <h1 className="text-[15px] font-medium text-fg-strong">Duplikaty operacji</h1>
        <p className="text-[11.5px] text-muted">Import z mBanku robisz na komputerze – tu scalasz to, co się powtórzyło.</p>
      </div>
      {groups.length ? <DuplicatesPanel /> : <Empty>Brak duplikatów.</Empty>}
    </div>
  )
}
