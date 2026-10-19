/**
 * This computer in use (D86, N20): a move in one of its windows within the last 10 minutes, as main counts it. A
 * computer not in use (only in the tray) writes nothing in the background and leaves the notifications to the one
 * in use.
 */
import { create } from 'zustand'
import { api } from '../lib/api'

export const usePresence = create<{ inUse: boolean }>(() => ({ inUse: false }))

let started = false

export function initPresence(): void {
  if (started) return
  started = true
  api.onInUse((inUse) => usePresence.setState({ inUse }))
  void api.inUseNow().then(
    (inUse) => usePresence.setState({ inUse }),
    () => undefined
  )
}

/** A move reported at most this often – main needs only the minute. */
const REPORT_MS = 30_000
let reportedAt = 0

/** Every window (the main one, the quick entry, a detached panel) says when it is moved in or typed in. */
export function installActivityReport(): void {
  const report = () => {
    const now = Date.now()
    if (now - reportedAt < REPORT_MS) return
    reportedAt = now
    void api.reportActivity().catch(() => undefined)
  }
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel'] as const) window.addEventListener(ev, report, { capture: true, passive: true })
}
