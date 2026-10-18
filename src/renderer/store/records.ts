import { useMemo } from 'react'
import type { Collection } from '@shared/paths'
import type { RecordTypes } from '@shared/records'
import { listOf, useData } from './data'

/** The records of a collection as a list (a new array only when the collection changes; one array for every screen). */
export function useRecordList<C extends Collection>(collection: C): RecordTypes[C][] {
  const map = useData((s) => s.records[collection])
  return useMemo(() => listOf(map) as RecordTypes[C][], [map])
}
