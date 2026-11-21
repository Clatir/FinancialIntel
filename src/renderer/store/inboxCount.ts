/**
 * The count of „Meldunki do rozpatrzenia” computed once (U6, T555): the side menu's host (`useInboxCountHost`) or the
 * phone's watcher publishes it; Mostek and its detached windows only read it – no second pass of the whole inbox.
 */
import { create } from 'zustand'

export const useInboxCountStore = create<{ count: number }>(() => ({ count: 0 }))

/** Publishes the count; an equal one notifies nobody. */
export function publishInboxCount(count: number): void {
  if (useInboxCountStore.getState().count !== count) useInboxCountStore.setState({ count })
}

/** How many reports wait (a primitive – a subscriber renders only when it changes). */
export const useInboxCount = (): number => useInboxCountStore((s) => s.count)
