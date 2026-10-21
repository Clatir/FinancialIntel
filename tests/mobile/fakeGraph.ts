// A fake OneDrive behind Microsoft Graph for the phone's tests (T304): a drive in memory with the endpoints the sync
// uses – items by path, children, delta with pages and links, downloads through links, uploads with If-Match and
// conflict behaviour, removals, folders; throttling, failures and expired links on demand. The tests write the
// computer's side straight into the drive (`put`, `remove`, `rename`).
import type { Http, HttpRequest, HttpResponse } from '../../src/mobile/sync/http'

interface FakeItem {
  id: string
  name: string
  parentId: string | null
  folder: boolean
  data: Uint8Array | null
  version: number
  content: number
  deleted: boolean
  changed: number
}

const enc = new TextEncoder()
const dec = new TextDecoder()

export class FakeDrive {
  readonly base: string
  readonly items = new Map<string, FakeItem>()
  readonly rootId = 'DRIVE-ROOT'
  private seq = 0
  private nextId = 1
  /** Items per delta page. */
  pageSize = 1000
  /** Make the parent folders of a path upload (OneDrive does); false – 404 like a stricter server. */
  autoFolders = true
  /** Delta links issued before this change number are refused (410 resyncRequired). */
  expireBefore = 0
  /** The incremental delta's order reversed (a child before its new parent – the sync must not care). */
  reverseDelta = false
  /** The requests seen (method and path), for assertions. */
  readonly log: string[] = []
  private throttle: { count: number; status: number; retryAfter: number } | null = null
  private fail: Array<{ match: RegExp; status: number; times: number }> = []
  /** No connection at all. */
  offline = false
  /** The access token the API accepts (401 for others). */
  token = 'token-1'
  /** The refresh tokens the token endpoint accepts → the access token it gives. */
  readonly refresh = new Map<string, string>([['refresh-1', 'token-1']])
  /** Downloads through a link of an older version are refused (an expired link). */
  strictLinks = true

  constructor(base = 'https://graph.fake/v1.0') {
    this.base = base
    this.items.set(this.rootId, { id: this.rootId, name: 'root', parentId: null, folder: true, data: null, version: 1, content: 1, deleted: false, changed: 0 })
  }

  // ------------------------------------------------------------------ the computer's side

  private id(): string {
    return `ITEM-${String(this.nextId++).padStart(5, '0')}`
  }

  private touch(it: FakeItem, content: boolean): void {
    it.version++
    if (content) it.content++
    it.changed = ++this.seq
  }

  private childOf(parentId: string, name: string): FakeItem | undefined {
    for (const it of this.items.values()) if (!it.deleted && it.parentId === parentId && it.name.toLowerCase() === name.toLowerCase()) return it
    return undefined
  }

  /** An item by its path from the drive's root ('' = the root). */
  find(path: string): FakeItem | undefined {
    let cur = this.items.get(this.rootId)!
    for (const part of path.split('/').filter(Boolean)) {
      const next = this.childOf(cur.id, part)
      if (!next) return undefined
      cur = next
    }
    return cur
  }

  mkdirp(path: string): FakeItem {
    let cur = this.items.get(this.rootId)!
    for (const part of path.split('/').filter(Boolean)) {
      let next = this.childOf(cur.id, part)
      if (!next) {
        next = { id: this.id(), name: part, parentId: cur.id, folder: true, data: null, version: 1, content: 1, deleted: false, changed: ++this.seq }
        this.items.set(next.id, next)
      }
      cur = next
    }
    return cur
  }

  /** A file written (made or changed) – by a computer. */
  put(path: string, data: string | Uint8Array): FakeItem {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    const name = path.slice(path.lastIndexOf('/') + 1)
    const parent = this.mkdirp(dir)
    const bytes = typeof data === 'string' ? enc.encode(data) : new Uint8Array(data)
    let it = this.childOf(parent.id, name)
    if (it) {
      it.data = bytes
      this.touch(it, true)
    } else {
      it = { id: this.id(), name, parentId: parent.id, folder: false, data: bytes, version: 1, content: 1, deleted: false, changed: ++this.seq }
      this.items.set(it.id, it)
    }
    return it
  }

  read(path: string): string | null {
    const it = this.find(path)
    return it && !it.folder && it.data ? dec.decode(it.data) : null
  }

  /** A file or folder removed (a folder with everything under it – delta reports only the folder). */
  remove(path: string): void {
    const it = this.find(path)
    if (!it) throw new Error(`no ${path}`)
    this.removeItem(it)
  }

  private removeItem(it: FakeItem): void {
    const stack = [it]
    while (stack.length) {
      const cur = stack.pop()!
      cur.deleted = true
      for (const child of this.items.values()) if (!child.deleted && child.parentId === cur.id) stack.push(child)
    }
    it.changed = ++this.seq
  }

  /** Renamed or moved (children keep their ids – delta reports only the item itself). */
  rename(path: string, newPath: string): void {
    const it = this.find(path)
    if (!it) throw new Error(`no ${path}`)
    const dir = newPath.includes('/') ? newPath.slice(0, newPath.lastIndexOf('/')) : ''
    it.parentId = this.mkdirp(dir).id
    it.name = newPath.slice(newPath.lastIndexOf('/') + 1)
    this.touch(it, false)
  }

  /** Every file's path under a folder (relative to it). */
  files(folder: string): string[] {
    const base = this.find(folder)
    if (!base) return []
    const out: string[] = []
    const walk = (id: string, prefix: string) => {
      for (const it of this.items.values()) {
        if (it.deleted || it.parentId !== id) continue
        const p = prefix ? `${prefix}/${it.name}` : it.name
        if (it.folder) walk(it.id, p)
        else out.push(p)
      }
    }
    walk(base.id, '')
    return out.sort()
  }

  throttleNext(count: number, retryAfter = 1, status = 429): void {
    this.throttle = { count, status, retryAfter }
  }

  failWhen(match: RegExp, status: number, times = 1): void {
    this.fail.push({ match, status, times })
  }

  // ------------------------------------------------------------------ Graph

  private json(it: FakeItem): Record<string, unknown> {
    const out: Record<string, unknown> = { id: it.id, name: it.name, eTag: `"{${it.id}},${it.version}"`, cTag: `"c:{${it.id}},${it.content}"`, parentReference: it.parentId ? { id: it.parentId, driveId: 'drive' } : undefined }
    if (it.folder) out.folder = { childCount: [...this.items.values()].filter((c) => !c.deleted && c.parentId === it.id).length }
    else {
      out.file = { mimeType: 'application/json' }
      out.size = it.data?.length ?? 0
      out['@microsoft.graph.downloadUrl'] = `${this.base}/__download/${it.id}?c=${it.content}`
    }
    return out
  }

  private under(it: FakeItem, folderId: string): boolean {
    for (let p: string | null = it.id; p; p = this.items.get(p)?.parentId ?? null) if (p === folderId) return true
    return false
  }

  private depth(it: FakeItem): number {
    let n = 0
    for (let p = it.parentId; p; p = this.items.get(p)?.parentId ?? null) n++
    return n
  }

  private resolve(baseId: string, rel: string): FakeItem | undefined {
    let cur = this.items.get(baseId)
    if (!cur || cur.deleted) return undefined
    for (const part of rel.split('/').filter(Boolean)) {
      const next = this.childOf(cur.id, decodeURIComponent(part))
      if (!next) return undefined
      cur = next
    }
    return cur
  }

  private ok(status: number, body?: unknown, headers: Record<string, string> = {}): HttpResponse {
    return { status, headers: { 'content-type': 'application/json', ...headers }, json: body }
  }

  private error(status: number, code: string, headers: Record<string, string> = {}): HttpResponse {
    return this.ok(status, { error: { code, message: code } }, headers)
  }

  readonly http: Http = async (req: HttpRequest) => {
    if (this.offline) throw new (await import('../../src/mobile/sync/http')).NetworkError()
    const url = new URL(req.url)
    const path = decodeURIComponent(url.pathname.replace(/^\/v1\.0/, ''))
    this.log.push(`${req.method} ${path}`)
    if (path === '/__token' || path === '/token') return this.tokenEndpoint(req)
    for (const f of this.fail)
      if (f.times > 0 && f.match.test(`${req.method} ${path}`)) {
        f.times--
        return this.error(f.status, `fail${f.status}`)
      }
    if (this.throttle && this.throttle.count > 0 && !path.startsWith('/__download')) {
      this.throttle.count--
      return this.error(this.throttle.status, 'activityLimitReached', { 'retry-after': String(this.throttle.retryAfter) })
    }
    if (path.startsWith('/__download/')) {
      const it = this.items.get(path.slice('/__download/'.length))
      if (!it || it.deleted || !it.data) return this.error(404, 'itemNotFound')
      if (this.strictLinks && Number(url.searchParams.get('c')) !== it.content) return this.error(410, 'gone')
      return { status: 200, headers: { 'content-type': 'application/octet-stream' }, bytes: new Uint8Array(it.data) }
    }
    if (req.headers?.Authorization !== `Bearer ${this.token}`) return this.error(401, 'InvalidAuthenticationToken')
    let m: RegExpExecArray | null
    if (path === '/me') return this.ok(200, { displayName: 'Kapitan Testowy', userPrincipalName: 'kapitan@example.com' })
    if (path === '/me/drive/root') return this.ok(200, this.json(this.items.get(this.rootId)!))
    if ((m = /^\/me\/drive\/root:\/(.+?):?$/.exec(path))) {
      const it = this.resolve(this.rootId, m[1]!)
      return it ? this.ok(200, this.json(it)) : this.error(404, 'itemNotFound')
    }
    if ((m = /^\/me\/drive\/items\/([^/:]+):\/(.+?):\/content$/.exec(path)) && req.method === 'PUT') return this.upload(m[1]!, m[2]!, url, req)
    if ((m = /^\/me\/drive\/items\/([^/:]+):\/(.+?):?$/.exec(path))) {
      const it = this.resolve(m[1]!, m[2]!)
      return it ? this.ok(200, this.json(it)) : this.error(404, 'itemNotFound')
    }
    if ((m = /^\/me\/drive\/items\/([^/:]+)\/children$/.exec(path))) {
      const parent = this.items.get(m[1]!)
      if (!parent || parent.deleted) return this.error(404, 'itemNotFound')
      if (req.method === 'POST') {
        const body = JSON.parse(typeof req.body === 'string' ? req.body : dec.decode(req.body!)) as { name: string }
        if (this.childOf(parent.id, body.name)) return this.error(409, 'nameAlreadyExists')
        const it: FakeItem = { id: this.id(), name: body.name, parentId: parent.id, folder: true, data: null, version: 1, content: 1, deleted: false, changed: ++this.seq }
        this.items.set(it.id, it)
        return this.ok(201, this.json(it))
      }
      return this.ok(200, { value: [...this.items.values()].filter((c) => !c.deleted && c.parentId === parent.id).map((c) => this.json(c)) })
    }
    if ((m = /^\/me\/drive\/items\/([^/:]+)\/delta$/.exec(path))) return this.delta(m[1]!, url)
    if ((m = /^\/me\/drive\/items\/([^/:]+)$/.exec(path))) {
      const it = this.items.get(m[1]!)
      if (!it || it.deleted) return this.error(404, 'itemNotFound')
      if (req.method === 'DELETE') {
        const match = req.headers?.['If-Match']
        if (match && match !== this.json(it).eTag) return this.error(412, 'preconditionFailed')
        this.removeItem(it)
        return { status: 204, headers: {} }
      }
      return this.ok(200, this.json(it))
    }
    return this.error(400, `unknown ${req.method} ${path}`)
  }

  private upload(baseId: string, rel: string, url: URL, req: HttpRequest): HttpResponse {
    const base = this.items.get(baseId)
    if (!base || base.deleted) return this.error(404, 'itemNotFound')
    const parts = rel.split('/').map((p) => decodeURIComponent(p))
    const name = parts.pop()!
    let parent = base
    for (const part of parts) {
      let next = this.childOf(parent.id, part)
      if (!next) {
        if (!this.autoFolders) return this.error(404, 'itemNotFound')
        next = { id: this.id(), name: part, parentId: parent.id, folder: true, data: null, version: 1, content: 1, deleted: false, changed: ++this.seq }
        this.items.set(next.id, next)
      }
      parent = next
    }
    const existing = this.childOf(parent.id, name)
    const match = req.headers?.['If-Match']
    const behavior = url.searchParams.get('@microsoft.graph.conflictBehavior') ?? 'replace'
    const bytes = typeof req.body === 'string' ? enc.encode(req.body) : new Uint8Array(req.body ?? new Uint8Array())
    if (!existing) {
      if (match) return this.error(412, 'preconditionFailed')
      const it: FakeItem = { id: this.id(), name, parentId: parent.id, folder: false, data: bytes, version: 1, content: 1, deleted: false, changed: ++this.seq }
      this.items.set(it.id, it)
      return this.ok(201, this.json(it))
    }
    if (match && match !== this.json(existing).eTag) return this.error(412, 'preconditionFailed')
    if (!match && behavior === 'fail') return this.error(409, 'nameAlreadyExists')
    existing.data = bytes
    this.touch(existing, true)
    return this.ok(200, this.json(existing))
  }

  private delta(folderId: string, url: URL): HttpResponse {
    const folder = this.items.get(folderId)
    if (!folder || folder.deleted) return this.error(404, 'itemNotFound')
    const token = url.searchParams.get('token')
    const skip = Number(url.searchParams.get('skip') ?? 0)
    let list: FakeItem[]
    if (token == null || token === 'latest-full') {
      list = [...this.items.values()].filter((it) => !it.deleted && this.under(it, folderId)).sort((a, b) => this.depth(a) - this.depth(b) || (a.id < b.id ? -1 : 1))
    } else {
      const since = Number(token)
      if (since < this.expireBefore) return this.error(410, 'resyncRequired')
      list = [...this.items.values()]
        .filter((it) => it.changed > since && (this.under(it, folderId) || (it.deleted && this.wasUnder(it, folderId))))
        // A removed folder's children are not reported (as OneDrive does).
        .filter((it) => !(it.deleted && it.parentId && this.items.get(it.parentId)?.deleted && this.items.get(it.parentId)!.changed === it.changed))
        .sort((a, b) => a.changed - b.changed)
      if (this.reverseDelta) list.reverse()
    }
    const page = list.slice(skip, skip + this.pageSize)
    const value = page.map((it) => (it.deleted ? { id: it.id, deleted: { state: 'deleted' }, parentReference: { id: it.parentId } } : this.json(it)))
    const more = skip + this.pageSize < list.length
    const own = `${this.base}/me/drive/items/${folderId}/delta`
    return this.ok(200, more ? { value, '@odata.nextLink': `${own}?token=${token ?? 'latest-full'}&skip=${skip + this.pageSize}` } : { value, '@odata.deltaLink': `${own}?token=${this.seq}` })
  }

  private wasUnder(it: FakeItem, folderId: string): boolean {
    for (let p: string | null = it.parentId; p; p = this.items.get(p)?.parentId ?? null) if (p === folderId) return true
    return false
  }

  private tokenEndpoint(req: HttpRequest): HttpResponse {
    const form = new URLSearchParams(typeof req.body === 'string' ? req.body : dec.decode(req.body ?? new Uint8Array()))
    if (form.get('grant_type') === 'refresh_token') {
      const access = this.refresh.get(form.get('refresh_token') ?? '')
      if (!access) return this.ok(400, { error: 'invalid_grant', error_description: 'AADSTS70000: refresh token revoked' })
      return this.ok(200, { access_token: access, refresh_token: form.get('refresh_token'), expires_in: 3600, token_type: 'Bearer' })
    }
    if (form.get('grant_type') === 'authorization_code' && form.get('code') === 'code-1' && form.get('code_verifier')) {
      return this.ok(200, { access_token: this.token, refresh_token: 'refresh-1', expires_in: 3600, token_type: 'Bearer' })
    }
    return this.ok(400, { error: 'invalid_request' })
  }
}
