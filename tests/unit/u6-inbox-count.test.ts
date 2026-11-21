// U6 (T555): the inbox's count is computed once and only read elsewhere; the settlement rows are memoized.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { publishInboxCount, useInboxCountStore } from '../../src/renderer/store/inboxCount'

const src = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8')

describe('inbox count store', () => {
  it('notifies a subscriber only when the count changes', () => {
    publishInboxCount(0)
    let calls = 0
    const off = useInboxCountStore.subscribe(() => calls++)
    publishInboxCount(3)
    publishInboxCount(3)
    publishInboxCount(3)
    expect(calls).toBe(1)
    publishInboxCount(0)
    expect(calls).toBe(2)
    off()
  })
})

describe('where the inbox is computed', () => {
  it('only the host computes it: Mostek and the side menu badge read the stored count', () => {
    const bridge = src('renderer/features/bridge/BridgePage.tsx')
    expect(bridge).not.toMatch(/useInbox\(|useInboxCountHost\(/)
    expect(bridge).toMatch(/store\/inboxCount'/)
    const state = src('renderer/features/inbox/state.ts')
    // The hook computing the whole list for the count exists once, called once (the side menu).
    expect(state.match(/export function useInboxCountHost\(/g)).toHaveLength(1)
    expect(src('renderer/app/App.tsx').match(/useInboxCountHost\(/g)).toHaveLength(1)
    expect(src('renderer/app/App.tsx')).not.toMatch(/useInboxCount\(/)
  })

  it('the phone watcher publishes the count it already has', () => {
    expect(src('mobile/app/PhoneInbox.tsx')).toMatch(/publishInboxCount\(all\.length\)/)
  })
})

describe('settlement rows', () => {
  it('the purchase row is memoized', () => {
    expect(src('renderer/features/radar/SettlementsPanel.tsx')).toMatch(/const PurchaseRow = memo\(/)
  })
})
