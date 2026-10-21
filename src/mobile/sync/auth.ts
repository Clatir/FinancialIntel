/**
 * Signing in to OneDrive (T304): the Microsoft identity platform's authorization code with PKCE for a public client –
 * no secret, the app registered by the user (Entra, „Tylko osobiste konta Microsoft”, redirect `financialintel://auth`).
 * The refresh token stays on the phone (Preferences – the app's own storage); the access token only in memory.
 */
import type { Http } from './http'

export const AUTHORITY = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'
export const REDIRECT_URI = 'financialintel://auth'
export const SCOPES = 'Files.ReadWrite offline_access User.Read'

export interface SavedAuth {
  clientId: string
  refreshToken: string
  /** The account's name for the screen. */
  account: string | null
}

export interface AuthStore {
  get(): Promise<SavedAuth | null>
  set(auth: SavedAuth | null): Promise<void>
}

export interface Tokens {
  accessToken: string
  refreshToken: string
  /** ms since the epoch. */
  expiresAt: number
}

/** The sign-in was refused or the account must sign in again. */
export class SignInError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignInError'
  }
}

function base64Url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function randomString(bytes = 32): string {
  const b = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(b)
  return base64Url(b)
}

/** The PKCE pair: the verifier kept here, its SHA-256 sent with the sign-in. */
export async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(48)
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  return { verifier, challenge: base64Url(digest) }
}

export function authorizeUrl(clientId: string, challenge: string, state: string, authority = AUTHORITY): string {
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  })
  return `${authority}/authorize?${q.toString()}`
}

/** The code (or the refusal) from the redirect `financialintel://auth?code=…&state=…`. */
export function codeFromRedirect(url: string, state: string): string {
  const q = new URL(url.replace(/^financialintel:\/\//, 'https://redirect/')).searchParams
  if (q.get('error')) throw new SignInError(q.get('error_description') ?? `Logowanie przerwane (${q.get('error')}).`)
  if (q.get('state') !== state) throw new SignInError('Odpowiedź logowania nie pasuje do tej próby – spróbuj jeszcze raz.')
  const code = q.get('code')
  if (!code) throw new SignInError('Logowanie nie zwróciło kodu – spróbuj jeszcze raz.')
  return code
}

async function tokenRequest(http: Http, tokenUrl: string, form: Record<string, string>, now: number): Promise<Tokens> {
  const res = await http({
    method: 'POST',
    url: tokenUrl,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString()
  })
  const body = (res.json ?? {}) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string }
  // Microsoft's passing trouble (busy, down): tried again later – the account stays signed in.
  if (res.status === 429 || res.status >= 500) throw new Error(`Logowanie Microsoft chwilowo nie odpowiada (błąd ${res.status}) – spróbuję za chwilę.`)
  if (res.status !== 200 || !body.access_token) {
    const why = body.error_description?.split(/\r?\n/)[0] ?? body.error ?? `błąd ${res.status}`
    throw new SignInError(`Microsoft odmówił: ${why}`)
  }
  return { accessToken: body.access_token, refreshToken: body.refresh_token ?? form.refresh_token ?? '', expiresAt: now + (body.expires_in ?? 3600) * 1000 }
}

export function exchangeCode(http: Http, tokenUrl: string, clientId: string, code: string, verifier: string, now = Date.now()): Promise<Tokens> {
  return tokenRequest(http, tokenUrl, { client_id: clientId, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier, scope: SCOPES }, now)
}

export function refreshTokens(http: Http, tokenUrl: string, clientId: string, refreshToken: string, now = Date.now()): Promise<Tokens> {
  return tokenRequest(http, tokenUrl, { client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken, scope: SCOPES }, now)
}

/** Renew this long before the access token expires. */
const MARGIN_MS = 5 * 60_000

/** The access token for Graph: kept while valid, renewed with the refresh token (the new refresh token kept). */
export class TokenSource {
  private tokens: Tokens | null = null
  private renewing: Promise<boolean> | null = null

  constructor(
    private readonly http: Http,
    private readonly tokenUrl: string,
    private readonly store: AuthStore,
    private readonly now: () => number = Date.now
  ) {}

  /** Signed in now (a code exchanged): kept. */
  async adopt(clientId: string, tokens: Tokens, account: string | null): Promise<void> {
    this.tokens = tokens
    await this.store.set({ clientId, refreshToken: tokens.refreshToken, account })
  }

  async token(): Promise<string> {
    if (this.tokens && this.tokens.expiresAt - MARGIN_MS > this.now()) return this.tokens.accessToken
    if (!(await this.renew())) throw new SignInError('Zaloguj się ponownie do OneDrive (Ustawienia telefonu).')
    return this.tokens!.accessToken
  }

  /** A new access token; false = the refresh token no longer works (sign in again). Network and server errors are thrown. */
  renew(): Promise<boolean> {
    this.renewing ??= (async () => {
      try {
        const saved = await this.store.get()
        if (!saved) return false
        try {
          this.tokens = await refreshTokens(this.http, this.tokenUrl, saved.clientId, saved.refreshToken, this.now())
        } catch (e) {
          if (e instanceof SignInError) return false
          throw e
        }
        if (this.tokens.refreshToken !== saved.refreshToken) await this.store.set({ ...saved, refreshToken: this.tokens.refreshToken })
        return true
      } finally {
        this.renewing = null
      }
    })()
    return this.renewing
  }

  forget(): void {
    this.tokens = null
  }
}
