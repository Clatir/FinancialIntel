/**
 * The import's Web Worker (AP-35, T463): a bank's file read and planned outside the window's thread – the window keeps
 * answering while a big file is analyzed, and shows how far it is. Everything it does is `answer` (shared, tested).
 */
import { answer, type AnalyzeMessage, type AnalyzeRequest } from '@shared/import/analyze'

// The Worker's own scope (the window's types know no DedicatedWorkerGlobalScope – the renderer is built with DOM).
const scope = self as unknown as { onmessage: ((e: MessageEvent<AnalyzeRequest>) => void) | null; postMessage: (m: AnalyzeMessage) => void }

scope.onmessage = (e) => answer(e.data, (m) => scope.postMessage(m))
