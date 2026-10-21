// Signing in to OneDrive (T306): PKCE, the sign-in page's address, the redirect's code, the token kept and renewed –
// a refused refresh token asks to sign in again, Microsoft's passing trouble and no network do not.
import { describe, expect, it } from 'vitest'
import { REDIRECT_URI, SCOPES, SignInError, TokenSource, authorizeUrl, codeFromRedirect, exchangeCode, pkce, type AuthStore, type SavedAuth } from '../../src/mobile/sync/auth'
import { NetworkError, type Http, type HttpRequest, type HttpResponse } from '../../src/mobile/sync/http'

const TOKEN_URL = 'https://login.example/token'

function memoryStore(initial: SavedAuth | null): AuthStore & { saved: SavedAuth | null } {
  const store = {
    saved: initial,
    get: async () => store.saved,
    set: async (a: SavedAuth | null) => {
      store.saved = a
    }
  }
  return store
}

/** The token endpoint answering from a list (and counting the calls). */
function endpoint(answers: Array<HttpResponse | Error>): Http & { calls: HttpRequest[] } {
  const calls: HttpRequest[] = []
  const http = (async (req: HttpRequest) => {
    calls.push(req)
    const a = answers.shift()
    if (!a) throw new Error('no answer')
    if (a instanceof Error) throw a
    return a
  }) as Http & { calls: HttpRequest[] }
  http.calls = calls
  return http
}

const ok = (access: string, refresh?: string): HttpResponse => ({ status: 200, headers: {}, json: { access_token: access, refresh_token: refresh, expires_in: 3600 } })

describe('logowanie do OneDrive', () => {
  it('PKCE: wyzwanie = SHA-256 weryfikatora (base64url bez dopełnienia)', async () => {
    const { verifier, challenge } = await pkce()
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/)
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    expect(challenge).toBe(Buffer.from(digest).toString('base64url'))
  })

  it('strona logowania: konto osobiste, kod z PKCE, przekierowanie do aplikacji, zakresy', () => {
    const url = new URL(authorizeUrl('client-1', 'chal', 'state-1'))
    expect(url.origin + url.pathname).toBe('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'client-1',
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state: 'state-1',
      code_challenge: 'chal',
      code_challenge_method: 'S256'
    })
  })

  it('kod z przekierowania; inna próba, odmowa i brak kodu – czytelny błąd', () => {
    expect(codeFromRedirect(`${REDIRECT_URI}?code=abc&state=s1`, 's1')).toBe('abc')
    expect(() => codeFromRedirect(`${REDIRECT_URI}?code=abc&state=other`, 's1')).toThrow(/nie pasuje do tej próby/)
    expect(() => codeFromRedirect(`${REDIRECT_URI}?error=access_denied&error_description=Anulowano&state=s1`, 's1')).toThrow('Anulowano')
    expect(() => codeFromRedirect(`${REDIRECT_URI}?state=s1`, 's1')).toThrow(SignInError)
  })

  it('wymiana kodu: formularz z weryfikatorem; odmowa Microsoft – SignInError z pierwszą linią opisu', async () => {
    const http = endpoint([ok('a1', 'r1'), { status: 400, headers: {}, json: { error: 'invalid_grant', error_description: 'AADSTS54005: code already redeemed.\r\nTrace ID: x' } }])
    const t = await exchangeCode(http, TOKEN_URL, 'client-1', 'code-1', 'ver-1', 1000)
    expect(t).toEqual({ accessToken: 'a1', refreshToken: 'r1', expiresAt: 1000 + 3600_000 })
    const form = new URLSearchParams(http.calls[0]?.body as string)
    expect(Object.fromEntries(form)).toMatchObject({ grant_type: 'authorization_code', code: 'code-1', code_verifier: 'ver-1', redirect_uri: REDIRECT_URI })
    await expect(exchangeCode(http, TOKEN_URL, 'client-1', 'code-1', 'ver-1')).rejects.toThrow('Microsoft odmówił: AADSTS54005: code already redeemed.')
  })

  it('token trzymany do 5 minut przed końcem, potem odnowiony; nowy token odświeżania zapisany', async () => {
    let now = 0
    const store = memoryStore({ clientId: 'client-1', refreshToken: 'r0', account: 'Kapitan' })
    const http = endpoint([ok('a1', 'r1'), ok('a2', 'r2')])
    const src = new TokenSource(http, TOKEN_URL, store, () => now)
    expect(await src.token()).toBe('a1')
    expect(store.saved?.refreshToken).toBe('r1')
    now = 3600_000 - 6 * 60_000
    expect(await src.token()).toBe('a1')
    expect(http.calls).toHaveLength(1)
    now = 3600_000 - 4 * 60_000
    expect(await src.token()).toBe('a2')
    expect(store.saved).toEqual({ clientId: 'client-1', refreshToken: 'r2', account: 'Kapitan' })
  })

  it('odnawianie raz naraz; token odświeżania odrzucony – false (zaloguj ponownie)', async () => {
    const store = memoryStore({ clientId: 'client-1', refreshToken: 'r0', account: null })
    const refused: HttpResponse = { status: 400, headers: {}, json: { error: 'invalid_grant' } }
    const http = endpoint([ok('a1'), refused, refused])
    const src = new TokenSource(http, TOKEN_URL, store)
    const [a, b] = await Promise.all([src.renew(), src.renew()])
    expect([a, b]).toEqual([true, true])
    expect(http.calls).toHaveLength(1)
    // The old refresh token kept when Microsoft gives none.
    expect(store.saved?.refreshToken).toBe('r0')
    expect(await src.renew()).toBe(false)
    src.forget()
    await expect(src.token()).rejects.toThrow(SignInError)
  })

  it('chwilowa awaria Microsoft i brak sieci nie wylogowują – błąd do ponowienia', async () => {
    const store = memoryStore({ clientId: 'client-1', refreshToken: 'r0', account: null })
    const http = endpoint([{ status: 503, headers: {}, json: undefined }, { status: 429, headers: {}, json: { error: 'too_many' } }, new NetworkError('offline'), ok('a1')])
    const src = new TokenSource(http, TOKEN_URL, store)
    await expect(src.renew()).rejects.toThrow(/chwilowo nie odpowiada/)
    await expect(src.renew()).rejects.toThrow(/błąd 429/)
    await expect(src.renew()).rejects.toThrow(NetworkError)
    expect(await src.renew()).toBe(true)
    expect(store.saved?.refreshToken).toBe('r0')
  })

  it('bez zapisanego konta – false bez pytania Microsoft', async () => {
    const http = endpoint([])
    expect(await new TokenSource(http, TOKEN_URL, memoryStore(null)).renew()).toBe(false)
    expect(http.calls).toHaveLength(0)
  })
})
