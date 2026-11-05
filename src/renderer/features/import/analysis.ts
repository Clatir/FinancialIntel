/**
 * The import's analysis of a file (AP-35, T463): in the Web Worker (`worker.ts`) when the window has one – the window's
 * thread only sends the data and takes the plan back –, else in the window itself, as before 1.16.0 (a Worker that cannot
 * start: an old WebKit, a test without one). The same plan either way (`analyzeImport`; the plan's operations taken back
 * from the store's own list – `analysisFromWire`). A plan again of the open file goes there too (`replanInWorker`,
 * przegląd R1 15).
 */
import {
  analysisFromWire,
  analyzeImport,
  operationsDelta,
  planFromWire,
  type Analysis,
  type AnalyzeInput,
  type AnalyzeMessage,
  type AnalyzePhase,
  type AnalyzeRequest,
  type PlanInput,
  type ReplanInput
} from '@shared/import/analyze'
import type { MbankFile } from '@shared/import/mbank'
import type { Transaction } from '@shared/schema'
import type { ImportPlan } from '@shared/import/reconcile'

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

type Pending = { resolve: (m: AnalyzeMessage) => void; reject: (e: Error) => void; onProgress?: (phase: AnalyzePhase, done: number, total: number) => void }

let worker: Worker | null = null
/** The Worker does not start here (CSP, a protocol, an old WebKit): the window analyzes from now on. */
let broken = false
let seq = 0
/** The requests the Worker has not answered yet (a file's analysis, plans again). */
const pending = new Map<number, Pending>()
/** The window's own analysis running (no Worker): given up by a newer one. */
let inWindow: { cancelled: boolean } | null = null
/**
 * What the Worker keeps of the open file (drugi przegląd R1, 10): the file of its analysis (`id` – that request's), and
 * the operations sent to it last (`sent`, by object) – a plan again sends only what changed. null – nothing kept.
 */
let session: { id: number; file: MbankFile; sent: Map<string, Transaction> } | null = null

/** The E2E's switch (`window.__FI_IMPORT_NO_WORKER__`): the window analyzes – the times before and after the Worker compared. */
const noWorker = (): boolean => !!(globalThis as { __FI_IMPORT_NO_WORKER__?: boolean }).__FI_IMPORT_NO_WORKER__

/** Is there a Worker to analyze in (as far as known – one that never started is found out at its first request)? */
export const hasWorker = (): boolean => !broken && !noWorker() && typeof Worker !== 'undefined'

/** Every request waiting for the Worker given up with `e`. */
function rejectAll(e: Error): void {
  const all = [...pending.values()]
  pending.clear()
  for (const p of all) p.reject(e)
}

function dropWorker(): void {
  worker?.terminate()
  worker = null
  session = null
}

function workerNow(): Worker | null {
  if (!hasWorker()) return null
  if (!worker)
    try {
      const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      w.addEventListener('message', (e: MessageEvent<AnalyzeMessage>) => {
        const m = e.data
        const p = m ? pending.get(m.id) : undefined
        if (!p) return
        if (m.type === 'progress') return p.onProgress?.(m.phase, m.done, m.total)
        pending.delete(m.id)
        if (m.type === 'fail') p.reject(new WorkerFailed(m.message))
        else p.resolve(m)
      })
      // The Worker's script did not load or broke (a protocol, the CSP): never again – the window does it.
      w.addEventListener('error', (e: ErrorEvent) => {
        e.preventDefault()
        broken = true
        dropWorker()
        rejectAll(new WorkerFailed(e.message || 'Worker nie wystartował'))
      })
      w.addEventListener('messageerror', () => rejectAll(new WorkerFailed('wiadomość Workera nieczytelna')))
      worker = w
    } catch {
      broken = true
      return null
    }
  return worker
}

/** Everything the Worker and the window are analyzing given up (their promises reject with `AnalysisCancelled`). */
export function cancelAnalysis(): void {
  if (inWindow) inWindow.cancelled = true
  inWindow = null
  if (!pending.size) return
  dropWorker()
  rejectAll(new AnalysisCancelled())
}

function ask(w: Worker, req: { input: AnalyzeInput } | { replan: ReplanInput }, onProgress?: Pending['onProgress']): Promise<AnalyzeMessage> {
  session = 'input' in req ? null : session
  return new Promise<AnalyzeMessage>((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject, onProgress })
    const message: AnalyzeRequest = { ...req, id }
    w.postMessage(message)
  })
}

/** A moment for the window to paint („Wczytywanie…”) before it analyzes on its own thread. */
const paint = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * Analyze a file (`analyzeImport`) – in the Worker, else in the window. One at a time: a new one gives up what runs
 * (a plan again too). `onProgress` – only from the Worker (the window's own analysis blocks it until done). Anything
 * the Worker's way did not give – a failure, an answer that does not fit the window's data – the window does it
 * (drugi przegląd R1, 5): never an import's error of the Worker's.
 */
export async function analyzeFile(input: AnalyzeInput, onProgress: (phase: AnalyzePhase, done: number, total: number) => void): Promise<{ analysis: Analysis; via: AnalyzedVia }> {
  cancelAnalysis()
  const w = workerNow()
  if (w)
    try {
      const m = await ask(w, { input }, onProgress)
      if (m.type !== 'done') throw new WorkerFailed('odpowiedź nie na analizę')
      const analysis = analysisFromWire(m.analysis, input.source.transactions)
      session = analysis.kind === 'plan' ? { id: m.id, file: analysis.file, sent: new Map(input.source.transactions.map((t) => [t.id, t])) } : null
      return { analysis, via: 'worker' }
    } catch (e) {
      if (e instanceof AnalysisCancelled) throw e
      session = null
    }
  const me = { cancelled: false }
  inWindow = me
  await paint()
  if (me.cancelled) throw new AnalysisCancelled()
  if (inWindow === me) inWindow = null
  return { analysis: analyzeImport(input), via: 'window' }
}

/**
 * The open file planned again in the Worker (przegląd R1 15) – of the file it keeps and only the operations changed since
 * (drugi przegląd R1, 10); the rows the window's own (`planFromWire`). null – the window plans it itself: no Worker, the
 * Worker keeps another file (`input.file` – not its analysis's), it failed or its answer does not fit (5). Rejects with
 * `AnalysisCancelled` when given up (another file).
 */
export async function replanInWorker(input: PlanInput): Promise<ImportPlan | null> {
  const w = workerNow()
  const kept = session
  if (!w || !kept || kept.file !== input.file) return null
  try {
    const { transactions, ...rest } = input.source
    const req: ReplanInput = { session: kept.id, accountId: input.accountId, source: rest, operations: operationsDelta(transactions, kept.sent), deletedKeys: input.deletedKeys, deletedRows: input.deletedRows }
    const m = await ask(w, { replan: req })
    if (m.type !== 'planned') throw new WorkerFailed('odpowiedź nie na plan')
    return planFromWire(m.plan, transactions, input.file.rows)
  } catch (e) {
    if (e instanceof AnalysisCancelled) throw e
    if (session === kept) session = null
    return null
  }
}
