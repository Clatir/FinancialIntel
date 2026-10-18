import { api } from './api'

/**
 * A long computation of the window, named for the log (1.4.1): the main process learns when it starts – a window that
 * stops answering then names it in the log and its message – and how long it took (logged from 500 ms).
 */
export function timed<T>(name: string, fn: () => T): T {
  api.rendererStep?.(name)
  const t0 = performance.now()
  try {
    return fn()
  } finally {
    api.rendererStep?.(name, performance.now() - t0)
  }
}
