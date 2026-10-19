// adapted from ICTTJ src/renderer/store/detach.ts @ 84a8339
import { useEffect, useMemo, useRef } from 'react'
import { create } from 'zustand'
import type { DetachEvent, DetachPayload } from '@shared/api'
import { api, errorMessage } from '../lib/api'
import { toast } from './ui'

/** What a detached window draws (`features/detach/DetachedApp.tsx`). */
export type DetachKind = 'placeholder' | 'bridge'

export interface DetachSpec {
  kind: DetachKind
  /** Plain JSON for the view; memoize it, a new object is sent to the window again. */
  props: unknown
  /** Window title (default: the panel's title). */
  title?: string
  /** Events from the window. */
  onEvent?: (e: DetachEvent) => void
  /**
   * Its data and events served by a host of the main window whatever page is shown (`useHostedDetach` – B27): the
   * panel only opens, focuses and closes its window.
   */
  hosted?: boolean
}

/** Panels of the main window open in their own window, by key (page + panel name). */
export const useDetach = create<{ open: Record<string, true> }>(() => ({ open: {} }))
const handlers = new Map<string, (e: DetachEvent) => void>()
let wired = false

function forget(key: string): void {
  useDetach.setState((s) => {
    if (!s.open[key]) return s
    const open = { ...s.open }
    delete open[key]
    return { open }
  })
}

function wire(): void {
  if (wired) return
  wired = true
  api.onDetachClosed(forget)
  api.onDetachEvent((key, e) => handlers.get(key)?.(e))
}

export function openDetached(key: string, payload: DetachPayload): void {
  wire()
  useDetach.setState((s) => ({ open: { ...s.open, [key]: true } }))
  api.detachOpen(key, payload).catch((e) => {
    forget(key)
    toast(`Nie udało się otworzyć okna: ${errorMessage(e)}`, 'error')
  })
}

export const closeDetached = (key: string) => void api.detachClose(key).catch(() => forget(key))
export const focusDetached = (key: string) => void api.detachFocus(key).catch(() => undefined)

/**
 * A panel that can live in its own window: while detached, its data goes to the window on every change and the
 * window's events come back to `spec.onEvent`.
 */
export function useDetachedPanel(key: string | null, spec: DetachSpec | undefined, title: string) {
  const detached = useDetach((s) => (key ? !!s.open[key] : false))
  const props = useShallowStable(spec?.props)
  const payload = useMemo<DetachPayload | null>(
    () => (spec ? { kind: spec.kind, title: spec.title ?? title, props } : null),
    [spec?.kind, spec?.title, props, title]
  )
  const hosted = !!spec?.hosted
  useEffect(() => {
    if (detached && key && payload && !hosted) void api.detachSend(key, payload).catch(() => undefined)
  }, [detached, key, payload, hosted])
  const onEvent = useRef(spec?.onEvent)
  onEvent.current = spec?.onEvent
  useEffect(() => {
    if (!detached || !key || hosted) return
    const handler = (e: DetachEvent) => onEvent.current?.(e)
    handlers.set(key, handler)
    return () => {
      if (handlers.get(key) === handler) handlers.delete(key)
    }
  }, [detached, key, hosted])
  return {
    available: !!key && !!payload,
    detached,
    open: () => key && payload && openDetached(key, payload),
    close: () => key && closeDetached(key),
    focus: () => key && focusDetached(key)
  }
}

/**
 * A detached window served from outside its page (B27): its data sent on every change and its events handled while
 * the window is open – the page it came from may be long left.
 */
export function useHostedDetach(key: string, payload: DetachPayload | null, onEvent: (e: DetachEvent) => void): void {
  const props = useShallowStable(payload?.props)
  // By the payload's parts: a new object of the same values is not sent again.
  const kind = payload?.kind
  const title = payload?.title
  useEffect(() => {
    if (kind) void api.detachSend(key, { kind, title: title ?? '', props }).catch(() => undefined)
  }, [key, kind, title, props])
  const handler = useRef(onEvent)
  handler.current = onEvent
  useEffect(() => {
    wire()
    const h = (e: DetachEvent) => handler.current(e)
    handlers.set(key, h)
    return () => {
      if (handlers.get(key) === h) handlers.delete(key)
    }
  }, [key])
}

/** The same object while its own values stay the same (props built inline on every render are sent once). */
function useShallowStable<T>(value: T): T {
  const ref = useRef(value)
  const prev = ref.current
  const same =
    prev === value ||
    (!!prev &&
      !!value &&
      typeof prev === 'object' &&
      typeof value === 'object' &&
      Object.keys(prev).length === Object.keys(value).length &&
      Object.keys(value).every((k) => (prev as Record<string, unknown>)[k] === (value as Record<string, unknown>)[k]))
  if (!same) ref.current = value
  return ref.current
}
