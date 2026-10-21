// The phone's E2E (T305): the built app (`out/mobile`) and the fake OneDrive (`tests/mobile/fakeGraph.ts`) on one local
// server – the app's requests to Graph, the token endpoint and the files' links go to the same origin.
import { readFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, join, normalize, resolve } from 'node:path'
import { FakeDrive } from '../mobile/fakeGraph'
import { createDefaultSettings } from '../../src/shared/defaults'
import { recordRelPath, type Collection } from '../../src/shared/paths'
import { SCHEMAS, serializeRecord } from '../../src/shared/records'
import { SCHEMA_VERSION } from '../../src/shared/schema/common'
import type { Settings } from '../../src/shared/schema/settings'

const OUT = resolve(__dirname, '../../out/mobile')
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
}

/** The canonical names the fake reads (Node gives them in lower case). */
const CANON: Record<string, string> = { authorization: 'Authorization', 'if-match': 'If-Match', 'content-type': 'Content-Type' }

async function body(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  return new Uint8Array(Buffer.concat(chunks))
}

export interface PhoneServer {
  url: string
  drive: FakeDrive
  close(): Promise<void>
}

export async function startPhoneServer(): Promise<PhoneServer> {
  let drive: FakeDrive | null = null
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname.startsWith('/v1.0/')) {
        if (!drive || drive.offline) {
          // No connection: the socket closed without an answer (the app's `fetch` fails as offline).
          req.socket.destroy()
          return
        }
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers[CANON[k] ?? k] = v
        const raw = req.method === 'GET' || req.method === 'HEAD' ? undefined : await body(req)
        const answer = await drive.http({ method: req.method as 'GET', url: `${drive.base.replace(/\/v1\.0$/, '')}${url.pathname}${url.search}`, headers, body: raw })
        const out: Record<string, string> = { ...answer.headers }
        const payload = answer.bytes ? Buffer.from(answer.bytes) : answer.json !== undefined ? Buffer.from(JSON.stringify(answer.json)) : Buffer.alloc(0)
        res.writeHead(answer.status, out)
        res.end(payload)
        return
      }
      const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '') || 'index.html'
      const file = join(OUT, rel)
      if (!file.startsWith(OUT)) {
        res.writeHead(403).end()
        return
      }
      try {
        const data = await readFile(file)
        res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
        res.end(data)
      } catch {
        res.writeHead(404).end()
      }
    })().catch((e: unknown) => {
      res.writeHead(500).end(String(e))
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()))
  const port = (server.address() as AddressInfo).port
  const url = `http://127.0.0.1:${port}`
  drive = new FakeDrive(`${url}/v1.0`)
  return {
    url,
    drive,
    close: () => new Promise<void>((r) => server.close(() => r()))
  }
}

const AT = '2026-01-01T00:00:00.000Z'
let seq = 0
export const seedId = (): string => `01KPHNE${String(++seq).padStart(19, '0')}`
export const zl = (v: number): number => Math.round(v * 100)

/** A data folder on the fake OneDrive (as `tests/e2e/seed.ts` writes one on a disk). */
export function seedDrive(drive: FakeDrive, folder: string, data: { settings?: (s: Settings) => Settings; records?: Partial<Record<Collection, Array<Record<string, unknown>>>> }): void {
  const fi = createDefaultSettings(AT)
  const settings = data.settings ? data.settings(fi.settings) : fi.settings
  drive.put(`${folder}/fi.json`, serializeRecord('fi', { ...fi, settings }))
  for (const [collection, list] of Object.entries(data.records ?? {}) as Array<[Collection, Array<Record<string, unknown>>]>) {
    for (const raw of list) {
      const record = SCHEMAS[collection].parse({ schemaVersion: SCHEMA_VERSION, id: seedId(), createdAt: AT, updatedAt: AT, updatedBy: 'DOM-PC', ...raw }) as unknown as Record<string, unknown>
      drive.put(`${folder}/${recordRelPath(collection, record)}`, serializeRecord(collection, record as never))
    }
  }
}
