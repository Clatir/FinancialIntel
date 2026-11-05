/**
 * The import's analysis of a file (AP-35, T463): in the Web Worker (`worker.ts`) when the window has one – the window's
 * thread only sends the data and takes the plan back –, else in the window itself, as before 1.16.0 (a Worker that cannot
 * start: an old WebKit, a test without one). The same plan either way (`analyzeImport`; the plan's operations taken back
 * from the store's own list – `analysisFromWire`).
 */
import { analysisFromWire, analyzeImport, type Analysis, type AnalyzeInput, type AnalyzeMessage, type AnalyzePhase, type AnalyzeRequest } from '@shared/import/analyze'

/** Where a file was analyzed (the E2E reads it from `data-via`). */
export type AnalyzedVia = 'worker' | 'window'

/** An analysis given up: another file opened, the file closed, another folder. */
export class AnalysisCancelled extends Error {
  constructor() {
    super('analiza pliku przerwana')
    this.name = 'AnalysisCancelled'
  }
}

/** The Worker could not do it (it did not start, a message it could not read): the window does it. */
class WorkerFailed extends Error {}

let worker: Worker | null = null
/** The Worker does not start here (CSP, a protocol, an old WebKit): the window analyzes from now on. */
let broken = false
let seq = 0
let running: { cancel: () => void } | null = null

/** The E2E's switch (`window.__FI_IMPORT_NO_WORKER__`): the window analyzes – the times before and after the Worker compared. */
const noWorker = (): boolean => !!(globalThis as { __FI_IMPORT_NO_WORKER__?: boolean }).__FI_IMPORT_NO_WORKER__

function workerNow(): Worker | null {
  if (broken || noWorker() || typeof Worker === 'undefined') return null
  if (!worker)
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    } catch {
      broken = true
      return null
    }
  return worker
}

function dropWorker(): void {
  worker?.terminate()
  worker = null
}

/** The analysis running given up (its promise rejects with `AnalysisCancelled`): the Worker stops at once. */
export function cancelAnalysis(): void {
  running?.cancel()
  running = null
}

function inWorker(w: Worker, input: AnalyzeInput, onProgress: (phase: AnalyzePhase, done: number, total: number) => void): Promise<Analysis> {
  return new Promise<Analysis>((resolve, reject) => {
    const id = ++seq
    const done = () => {
      w.removeEventListener('message', onMessage)
      w.removeEventListener('error', onError)
      w.removeEventListener('messageerror', onMessageError)
      if (running === me) running = null
    }
    const onMessage = (e: MessageEvent<AnalyzeMessage>) => {
      const m = e.data
      if (m?.id !== id) return
      if (m.type === 'progress') return onProgress(m.phase, m.done, m.total)
      done()
      if (m.type === 'fail') return reject(new WorkerFailed(m.message))
      try {
        resolve(analysisFromWire(m.analysis, input.source.transactions))
      } catch (err) {
        reject(new WorkerFailed(err instanceof Error ? err.message : String(err)))
      }
    }
    // The Worker's script did not load or broke (a protocol, the CSP): never again – the window does it.
    const onError = (e: ErrorEvent) => {
      e.preventDefault()
      done()
      broken = true
      dropWorker()
      reject(new WorkerFailed(e.message || 'Worker nie wystartował'))
    }
    const onMessageError = () => {
      done()
      reject(new WorkerFailed('wiadomość Workera nieczytelna'))
    }
    const me = {
      cancel: () => {
        done()
        dropWorker()
        reject(new AnalysisCancelled())
      }
    }
    running = me
    w.addEventListener('message', onMessage)
    w.addEventListener('error', onError)
    w.addEventListener('messageerror', onMessageError)
    const req: AnalyzeRequest = { id, input }
    w.postMessage(req)
  })
}

/** A moment for the window to paint („Wczytywanie…”) before it analyzes on its own thread. */
const paint = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * Analyze a file (`analyzeImport`) – in the Worker, else in the window. One at a time: a new one gives the one running
 * up. `onProgress` – only from the Worker (the window's own analysis blocks it until done).
 */
export async function analyzeFile(input: AnalyzeInput, onProgress: (phase: AnalyzePhase, done: number, total: number) => void): Promise<{ analysis: Analysis; via: AnalyzedVia }> {
  cancelAnalysis()
  const w = workerNow()
  if (w)
    try {
      return { analysis: await inWorker(w, input, onProgress), via: 'worker' }
    } catch (e) {
      if (!(e instanceof WorkerFailed)) throw e
      // A failure of the Worker only: the window tries the same – a file it cannot read is said from there.
    }
  let cancelled = false
  const me = { cancel: () => (cancelled = true) }
  running = me
  await paint()
  if (cancelled) throw new AnalysisCancelled()
  if (running === me) running = null
  return { analysis: analyzeImport(input), via: 'window' }
}
