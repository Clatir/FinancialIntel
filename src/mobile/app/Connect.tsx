/**
 * The phone's connecting screens (T307): the Microsoft account (the app registration's client id), the OneDrive folder
 * of the data and its first copy.
 */
import { useState, type ReactNode } from 'react'
import { DEFAULT_FOLDER, changeFolder, chooseFolder, retryFirstSync, signIn, signOut, usePhone } from '../phone'

function Frame({ step, title, children }: { step?: string; title: string; children: ReactNode }) {
  return (
    <div className="phone-safe flex h-full flex-col overflow-auto bg-bg px-5 py-8" data-testid="phone-connect">
      <div className="mb-6">
        <div className="text-[18px] font-semibold tracking-wide text-fg-strong">Financial Intel</div>
        <div className="text-[13px] text-muted">na telefonie · ten sam okręt co na komputerze</div>
      </div>
      <div className="border border-line bg-panel p-4">
        {step && <div className="label mb-1">{step}</div>}
        <h1 className="mb-3 text-[15px] font-medium text-fg-strong">{title}</h1>
        {children}
      </div>
    </div>
  )
}

function Message() {
  const message = usePhone((s) => s.message)
  return message ? (
    <p className="mt-3 text-[13px] leading-snug text-down" data-testid="phone-message">
      {message}
    </p>
  ) : null
}

export function Splash({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-bg text-[13px] text-muted" data-testid="phone-splash">
      {text}
    </div>
  )
}

export function SignInScreen() {
  const stored = usePhone((s) => s.clientId)
  const busy = usePhone((s) => s.busy)
  const [clientId, setClientId] = useState(stored)
  return (
    <Frame step="Krok 1 z 2" title="Konto Microsoft z OneDrive">
      <p className="mb-3 text-[13px] leading-snug text-fg">
        Zaloguj się kontem, na którego OneDrive jest folder danych Financial Intel. Telefon czyta i zapisuje ten sam folder co komputer.
      </p>
      <label className="label mb-1 block" htmlFor="phone-client-id">
        Identyfikator aplikacji (klienta) z Microsoft Entra
      </label>
      <input
        id="phone-client-id"
        className="input mb-3 h-[40px] w-full text-[13px]"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        placeholder="0a1b2c3d-…"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        data-testid="phone-client-id"
      />
      <button className="btn btn-accent h-[44px] w-full text-[14px]" disabled={busy} onClick={() => void signIn(clientId)} data-testid="phone-signin">
        {busy ? 'Logowanie…' : 'Zaloguj w Microsoft'}
      </button>
      <Message />
      <p className="mt-4 text-[12px] leading-snug text-muted">
        Identyfikator dostajesz przy rejestracji aplikacji w portalu Azure (raz, na swoim koncie) – kroki w instrukcji „Financial Intel na iPhonie”. Nie jest tajny; hasło wpisujesz tylko na stronie Microsoft.
      </p>
    </Frame>
  )
}

export function FolderScreen() {
  const account = usePhone((s) => s.account)
  const current = usePhone((s) => s.folder)
  const busy = usePhone((s) => s.busy)
  const [path, setPath] = useState(current?.path ?? DEFAULT_FOLDER)
  return (
    <Frame step="Krok 2 z 2" title="Folder danych na OneDrive">
      <p className="mb-3 text-[13px] leading-snug text-fg">
        Nazwa folderu od głównego folderu OneDrive – ta sama, którą wybrałeś w aplikacji na komputerze (Ustawienia → Folder i kopie).
      </p>
      <input
        className="input mb-3 h-[40px] w-full text-[13px]"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        data-testid="phone-folder"
      />
      <button className="btn btn-accent h-[44px] w-full text-[14px]" disabled={busy} onClick={() => void chooseFolder(path)} data-testid="phone-folder-connect">
        {busy ? 'Sprawdzanie…' : 'Połącz z folderem'}
      </button>
      <Message />
      {account && (
        <p className="mt-4 text-[12px] text-muted">
          Konto: <span className="text-fg">{account}</span> ·{' '}
          <button className="text-accent underline" onClick={() => void signOut()} data-testid="phone-signout">
            wyloguj
          </button>
        </p>
      )}
    </Frame>
  )
}

export function FirstSyncScreen() {
  const sync = usePhone((s) => s.sync)
  const folder = usePhone((s) => s.folder)
  const failed = sync.state === 'error' || sync.state === 'offline' || sync.state === 'auth'
  const p = sync.progress
  const pct = p && p.total ? Math.round((p.done / p.total) * 100) : 0
  return (
    <Frame title={failed ? 'Pobieranie przerwane' : 'Pierwsza kopia folderu'}>
      <p className="mb-3 text-[13px] leading-snug text-fg">
        {failed
          ? 'Pobrane pliki zostają na telefonie – kolejna próba dokończy resztę.'
          : `Telefon pobiera folder „${folder?.path ?? ''}” z OneDrive. Przy dużej historii trwa to kilka minut; potem działa także bez sieci.`}
      </p>
      {!failed && (
        <div data-testid="phone-first-sync">
          <div className="mb-1 h-[6px] w-full bg-raised">
            <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
          </div>
          <div className="num text-[12px] text-muted" data-testid="phone-first-sync-count">
            {p && p.total ? `${p.done} z ${p.total} plików` : 'Lista plików…'}
          </div>
        </div>
      )}
      {failed && (
        <>
          <p className="mb-3 text-[13px] text-down" data-testid="phone-message">
            {sync.message}
          </p>
          <div className="flex gap-2">
            <button className="btn btn-accent h-[44px] flex-1 text-[14px]" onClick={() => void retryFirstSync()} data-testid="phone-retry">
              Spróbuj ponownie
            </button>
            <button className="btn h-[44px] flex-1 text-[14px]" onClick={changeFolder}>
              Inny folder
            </button>
          </div>
        </>
      )}
    </Frame>
  )
}
