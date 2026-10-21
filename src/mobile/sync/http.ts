/**
 * The phone's HTTP (T304): on the device the native one of Capacitor (no CORS, no Origin header – the token endpoint of
 * Microsoft refuses a web page's request for an app's code); in the browser of the tests `fetch` to the fake OneDrive.
 */

export interface HttpRequest {
  method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH'
  url: string
  headers?: Record<string, string>
  body?: Uint8Array | string
  /** What the body of the answer is wanted as (JSON is parsed when it is JSON). */
  responseType?: 'json' | 'bytes'
}

export interface HttpResponse {
  status: number
  headers: Record<string, string>
  /** The parsed JSON of a JSON answer (also of an error). */
  json?: unknown
  bytes?: Uint8Array
}

export type Http = (req: HttpRequest) => Promise<HttpResponse>

/** No connection (airplane mode, no signal): the sync waits and tries again. */
export class NetworkError extends Error {
  constructor(message = 'Brak połączenia z internetem.') {
    super(message)
    this.name = 'NetworkError'
  }
}

function lowerHeaders(h: Headers | Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!h) return out
  if (typeof (h as Headers).forEach === 'function' && !(h as Record<string, string>).constructor?.name?.startsWith('Object')) {
    ;(h as Headers).forEach((v, k) => (out[k.toLowerCase()] = v))
    return out
  }
  for (const [k, v] of Object.entries(h as Record<string, string>)) out[k.toLowerCase()] = String(v)
  return out
}

const isJson = (headers: Record<string, string>) => /json/i.test(headers['content-type'] ?? '')

/** `fetch` (the tests' browser and Node). */
export const fetchHttp: Http = async (req) => {
  let res: Response
  try {
    res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body as BodyInit | undefined, redirect: 'follow' })
  } catch (e) {
    throw new NetworkError(e instanceof Error ? `Brak połączenia (${e.message}).` : undefined)
  }
  const headers = lowerHeaders(res.headers)
  const buf = new Uint8Array(await res.arrayBuffer())
  const out: HttpResponse = { status: res.status, headers }
  if (req.responseType === 'bytes' && res.ok) out.bytes = buf
  else if (buf.length && isJson(headers)) {
    try {
      out.json = JSON.parse(new TextDecoder().decode(buf))
    } catch {
      /* a broken answer: no JSON */
    }
  }
  return out
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

/**
 * The native HTTP of Capacitor (`CapacitorHttp`): bodies go as base64 (`dataType: 'file'` is not used – bytes stay
 * bytes), answers wanted as bytes come as base64 too.
 */
export function capacitorHttp(request: (opts: Record<string, unknown>) => Promise<{ status: number; headers: Record<string, string>; data: unknown }>): Http {
  return async (req) => {
    const headers = { ...(req.headers ?? {}) }
    const opts: Record<string, unknown> = { url: req.url, method: req.method, headers, responseType: req.responseType === 'bytes' ? 'arraybuffer' : 'text' }
    if (req.body != null) {
      if (typeof req.body === 'string') opts.data = req.body
      else {
        // A file's bytes: sent as they are (base64 over the bridge, decoded by the native side).
        opts.data = toBase64(req.body)
        opts.dataType = 'file'
      }
    }
    let res: { status: number; headers: Record<string, string>; data: unknown }
    try {
      res = await request(opts)
    } catch (e) {
      throw new NetworkError(e instanceof Error ? `Brak połączenia (${e.message}).` : undefined)
    }
    const h = lowerHeaders(res.headers)
    const out: HttpResponse = { status: res.status, headers: h }
    if (req.responseType === 'bytes' && res.status >= 200 && res.status < 300) out.bytes = typeof res.data === 'string' ? fromBase64(res.data) : new Uint8Array(res.data as ArrayBuffer)
    else if (typeof res.data === 'string' && res.data && isJson(h)) {
      try {
        out.json = JSON.parse(res.data)
      } catch {
        /* no JSON */
      }
    } else if (res.data && typeof res.data === 'object') out.json = res.data
    return out
  }
}
