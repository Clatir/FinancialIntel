/** The phone's host (`host/host.ts`) for its screens: set once at the start (`main.tsx`). */
import type { PhoneHost } from './host/host'

let host: PhoneHost | null = null

export function setPhoneHost(h: PhoneHost): void {
  host = h
}

export function phoneHost(): PhoneHost {
  if (!host) throw new Error('Telefon jeszcze się uruchamia.')
  return host
}
