/**
 * Microsoft Graph for the phone's sync (T306): the data folder on OneDrive – its item, its changes (delta), a file's
 * content, an upload with the version it replaces (If-Match), a removal. Throttling (429 / 503) waits as long as Graph
 * says, a server's hiccup is tried again, an expired token is renewed once.
 */
import { NetworkError, type Http, type HttpResponse } from './http'

export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export interface DriveItem {
  id: string
  name?: string
  eTag?: string
  cTag?: string
  size?: number
  lastModifiedDateTime?: string
  parentReference?: { id?: string; path?: string; driveId?: string }
  file?: Record<string, unknown>
  folder?: { childCount?: number }
  deleted?: Record<string, unknown>
  root?: Record<string, unknown>
  '@microsoft.graph.downloadUrl'?: string
}

export interface DeltaPage {
  value: DriveItem[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

/** Graph's answer to a request that is not a success. */
export class GraphError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'GraphError'
  }
}

/** The account must sign in again (the refresh token revoked or expired). */
export class AuthError extends Error {
  constructor(message = 'Zaloguj się ponownie do OneDrive (Ustawienia telefonu).') {
    super(message)
    this.name = 'AuthError'
  }
}

export interface GraphOptions {
  http: Http
  /** A valid access token (renewed by the caller when needed). */
  token: () => Promise<string>
  /** The token refused (401): renew it once; false = cannot (sign in again). */
  renew: () => Promise<boolean>
  base?: string
  /** Waiting (Retry-After, backoff) – tests make it instant. */
  sleep?: (ms: number) => Promise<void>
  /** Times a throttled or failed request is tried again. */
  retries?: number
}

const encodePath = (rel: string) =>
  rel
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/')

function errorOf(res: HttpResponse): GraphError {
  const body = res.json as { error?: { code?: string; message?: string } } | undefined
  const code = body?.error?.code ?? `http${res.status}`
  return new GraphError(res.status, code, body?.error?.message ?? `OneDrive odpowiedział błędem ${res.status}.`)
}

export class GraphClient {
  private readonly base: string
  private readonly sleep: (ms: number) => Promise<void>
  private readonly retries: number

  constructor(private readonly o: GraphOptions) {
    this.base = (o.base ?? GRAPH_BASE).replace(/\/$/, '')
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    this.retries = o.retries ?? 4
  }

  private url(pathOrUrl: string): string {
    return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${this.base}${pathOrUrl}`
  }

  /** One request with the token, the waits Graph asks for and one renewal of the token. */
  async request(method: 'GET' | 'PUT' | 'POST' | 'DELETE', pathOrUrl: string, opts: { body?: Uint8Array | string; headers?: Record<string, string>; bytes?: boolean; auth?: boolean } = {}): Promise<HttpResponse> {
    let renewed = false
    for (let attempt = 0; ; attempt++) {
      const headers: Record<string, string> = { ...(opts.headers ?? {}) }
      if (opts.auth !== false) headers.Authorization = `Bearer ${await this.o.token()}`
      const res = await this.o.http({ method, url: this.url(pathOrUrl), headers, body: opts.body, responseType: opts.bytes ? 'bytes' : 'json' })
      if (res.status === 401 && opts.auth !== false && !renewed) {
        renewed = true
        if (await this.o.renew()) continue
        throw new AuthError()
      }
      if (res.status === 401 && opts.auth !== false) throw new AuthError()
      const retryable = res.status === 429 || res.status === 503 || res.status === 502 || res.status === 504 || res.status === 500
      if (retryable && attempt < this.retries) {
        const after = Number(res.headers['retry-after'])
        await this.sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 120) * 1000 : Math.min(1000 * 2 ** attempt, 30_000))
        continue
      }
      return res
    }
  }

  private async json<T>(method: 'GET' | 'PUT' | 'POST' | 'DELETE', pathOrUrl: string, opts: { body?: Uint8Array | string; headers?: Record<string, string> } = {}): Promise<T> {
    const res = await this.request(method, pathOrUrl, opts)
    if (res.status < 200 || res.status >= 300) throw errorOf(res)
    return res.json as T
  }

  /** The signed-in account (its name for the screen). */
  me(): Promise<{ id?: string; displayName?: string; userPrincipalName?: string; mail?: string }> {
    return this.json('GET', '/me?$select=id,displayName,userPrincipalName,mail')
  }

  /** An item by its path from the drive's root (null = none there). */
  async itemByPath(path: string): Promise<DriveItem | null> {
    const clean = encodePath(path)
    const res = await this.request('GET', clean ? `/me/drive/root:/${clean}` : '/me/drive/root')
    if (res.status === 404) return null
    if (res.status < 200 || res.status >= 300) throw errorOf(res)
    return res.json as DriveItem
  }

  /** An item by its path under a folder (null = none there). */
  async itemUnder(folderId: string, rel: string): Promise<DriveItem | null> {
    const res = await this.request('GET', `/me/drive/items/${folderId}:/${encodePath(rel)}`)
    if (res.status === 404) return null
    if (res.status < 200 || res.status >= 300) throw errorOf(res)
    return res.json as DriveItem
  }

  /** The folder's direct children (the folder picker). */
  async children(folderId: string): Promise<DriveItem[]> {
    const out: DriveItem[] = []
    let next: string | undefined = `/me/drive/items/${folderId}/children?$top=200`
    while (next) {
      const page: { value: DriveItem[]; '@odata.nextLink'?: string } = await this.json('GET', next)
      out.push(...page.value)
      next = page['@odata.nextLink']
    }
    return out
  }

  /** One page of the folder's changes: from the start (no link) or since the last delta link. */
  delta(folderId: string, link?: string | null): Promise<DeltaPage> {
    return this.json('GET', link ?? `/me/drive/items/${folderId}/delta`)
  }

  /** A file's content: through its pre-authenticated link when known (no token, CORS of the browser allowed). */
  async download(item: DriveItem): Promise<Uint8Array> {
    let link = item['@microsoft.graph.downloadUrl']
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!link) {
        const fresh = await this.json<DriveItem>('GET', `/me/drive/items/${item.id}?$select=id,@microsoft.graph.downloadUrl`)
        link = fresh['@microsoft.graph.downloadUrl']
        if (!link) throw new GraphError(404, 'noDownloadUrl', 'OneDrive nie podał adresu pliku.')
      }
      const res = await this.request('GET', link, { bytes: true, auth: false })
      if (res.status >= 200 && res.status < 300 && res.bytes) return res.bytes
      // The link expired (it lives about an hour): a fresh one once.
      if ((res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410) && attempt === 0) {
        link = undefined
        continue
      }
      throw errorOf(res)
    }
    throw new GraphError(410, 'gone', 'Plik zniknął z OneDrive.')
  }

  /**
   * A file written under the folder: replacing the version `ifMatch` (412 = it changed there meanwhile), or new only
   * (`newOnly` – 409 = a file of the name is there already). Parent folders are made by OneDrive.
   */
  async upload(folderId: string, rel: string, data: Uint8Array, opts: { ifMatch?: string | null; newOnly?: boolean } = {}): Promise<{ ok: true; item: DriveItem } | { ok: false; status: 412 | 409 | 404 }> {
    const behavior = opts.newOnly ? 'fail' : 'replace'
    const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' }
    if (opts.ifMatch) headers['If-Match'] = opts.ifMatch
    const res = await this.request('PUT', `/me/drive/items/${folderId}:/${encodePath(rel)}:/content?@microsoft.graph.conflictBehavior=${behavior}`, { body: data, headers })
    if (res.status === 412 || res.status === 409 || res.status === 404) return { ok: false, status: res.status }
    if (res.status < 200 || res.status >= 300) throw errorOf(res)
    return { ok: true, item: res.json as DriveItem }
  }

  /** The folders of `rel` (a directory under the folder) made where missing; the last one's item. */
  async ensureFolders(folderId: string, rel: string): Promise<DriveItem | null> {
    let parent = folderId
    let item: DriveItem | null = null
    const parts = rel.split('/').filter(Boolean)
    for (let i = 0; i < parts.length; i++) {
      const sub = parts.slice(0, i + 1).join('/')
      item = await this.itemUnder(folderId, sub)
      if (!item) {
        const res = await this.request('POST', `/me/drive/items/${parent}/children`, {
          body: JSON.stringify({ name: parts[i], folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
          headers: { 'Content-Type': 'application/json' }
        })
        // Made meanwhile by someone else: take theirs.
        if (res.status === 409) item = await this.itemUnder(folderId, sub)
        else if (res.status < 200 || res.status >= 300) throw errorOf(res)
        else item = res.json as DriveItem
      }
      if (!item) throw new GraphError(404, 'itemNotFound', `Nie udało się utworzyć folderu ${sub} na OneDrive.`)
      parent = item.id
    }
    return item
  }

  /** A file removed (to OneDrive's recycle bin) – only the version `ifMatch`; 412 = it changed there meanwhile. */
  async remove(itemId: string, ifMatch: string | null): Promise<'ok' | 'changed' | 'gone'> {
    const res = await this.request('DELETE', `/me/drive/items/${itemId}`, { headers: ifMatch ? { 'If-Match': ifMatch } : {} })
    if (res.status === 204 || res.status === 200) return 'ok'
    if (res.status === 404) return 'gone'
    if (res.status === 412) return 'changed'
    throw errorOf(res)
  }
}

export { NetworkError }
