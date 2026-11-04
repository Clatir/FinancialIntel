import { describe, expect, it } from 'vitest'
import { fillLastPercent, line, shareComplete } from '@shared/calc/share'
import type { Share } from '@shared/schema'

// AP-37 (N5, T156): one rule for the percents of a shared purchase – refused below or above 100 %, „dopełnij ostatniej do
// 100 %” gives the last person what the others leave.
const percents = (...values: number[]): Share => ({ mode: 'percent', lines: values.map((v, i) => line(i ? `01KMEM${String(i).padStart(20, '0')}` : null, false, v)) })

describe('AP-37: procenty wspólnego zakupu – jedna reguła', () => {
  it('dopełnij ostatniej: 50 / 30 / 10 → 50 / 30 / 20, z groszami procentów', () => {
    expect(fillLastPercent(percents(50, 30, 10))?.lines.map((l) => l.value)).toEqual([50, 30, 20])
    expect(fillLastPercent(percents(33.33, 33.33, 10))?.lines.map((l) => l.value)).toEqual([33.33, 33.33, 33.34])
    // Above 100 % too: the last one takes less.
    expect(fillLastPercent(percents(20, 50, 33.34))?.lines.map((l) => l.value)).toEqual([20, 50, 30])
    expect(shareComplete(fillLastPercent(percents(50, 30, 10))!, null)).toBe(true)
  })

  it('nic do dopełnienia: już 100 %, inni ponad 100 %, nie procenty', () => {
    expect(fillLastPercent(percents(50, 50))).toBeNull()
    expect(fillLastPercent(percents(70, 40, 0))).toBeNull()
    expect(fillLastPercent({ mode: 'equal', lines: [line(null), line('01KMEM00000000000000000001')] })).toBeNull()
  })
})
