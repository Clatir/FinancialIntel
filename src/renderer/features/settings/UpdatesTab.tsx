// adapted from ICTTJ src/renderer/features/settings/UpdatesTab.tsx @ 84a8339
import { useEffect, useState, type ReactNode } from 'react'
import { RELEASES_PAGE, type UpdateState } from '@shared/update'
import { api, errorMessage } from '../../lib/api'
import { fmtBytes } from '../../lib/format'
import { checkForUpdates, downloadUpdate, restartToUpdate, setUpdatePrefs, setUpdateToken, useUpdate } from '../../store/update'
import { toast } from '../../store/ui'
import { installWhen, useTray } from '../../store/tray'
import { IconExternal, IconSync } from '../../components/icons'
import { Badge, Field, Panel, Toggle, cx } from '../../components/ui'

/** GitHub's page for a new fine-grained token (only this repository, Contents: read-only). */
const NEW_TOKEN_PAGE = 'https://github.com/settings/personal-access-tokens/new'

/** Access to a private repository: the token of this computer, stored like the EODHD key. */
function TokenPanel({ s }: { s: UpdateState }) {
  const [token, setToken] = useState('')
  const save = async () => {
    if (await setUpdateToken(token.trim())) setToken('')
  }
  return (
    <Panel title="Dostęp do prywatnego repozytorium (ten komputer)" name="Token GitHub">
      <div className="flex flex-col gap-2" data-testid="update-token-panel">
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-muted">Token GitHub:</span>
          {s.token.present ? (
            <span className="num text-fg-strong" data-testid="update-token-hint">
              zapisany {s.token.hint}
            </span>
          ) : (
            <span className="text-muted" data-testid="update-token-hint">
              brak
            </span>
          )}
          {s.token.present && (s.token.encrypted ? <Badge tone="up">zaszyfrowany</Badge> : <Badge>bez szyfrowania systemu</Badge>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input w-[340px]"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            placeholder={s.token.present ? 'nowy token (zastąpi zapisany)' : 'github_pat_…'}
            onChange={(e) => setToken(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && token.trim() && void save()}
            aria-label="Token GitHub"
            data-testid="update-token-input"
          />
          <button className="btn" disabled={!token.trim()} onClick={() => void save()} data-testid="update-token-save">
            Zapisz i sprawdź
          </button>
          {s.token.present && (
            <button className="btn btn-ghost" onClick={() => void setUpdateToken(null)} data-testid="update-token-remove">
              Usuń token
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => openExternalSafe(NEW_TOKEN_PAGE)}>
            <IconExternal size={13} /> Utwórz token na GitHubie
          </button>
        </div>
        <p className="text-[11.5px] leading-relaxed text-muted">
          Repozytorium aplikacji jest publiczne, więc token nie jest potrzebny. Przyda się tylko wtedy, gdy repozytorium stanie
          się prywatne – bez niego GitHub nie pokazuje wydań. Token „fine-grained”: dostęp tylko do repozytorium FinancialIntel,
          uprawnienie Contents: tylko odczyt. Zostaje na tym komputerze (zaszyfrowany przez system), nie trafia do folderu danych
          ani do okna aplikacji; wysyłany jest wyłącznie do api.github.com.
        </p>
      </div>
    </Panel>
  )
}

const MODE_TEXT: Record<UpdateState['mode'], string> = {
  portable: 'wersja portable – nowy plik .exe zastępuje obecny po zamknięciu aplikacji, bez instalatora',
  installer: 'wersja zainstalowana – nowa wersja instaluje się w tle po zamknięciu aplikacji, bez okien instalatora',
  manual: 'aktualizacja ręczna'
}

export function openExternalSafe(url: string): void {
  api.openExternal(url).catch((e) => toast(errorMessage(e), 'error'))
}

/** Release notes written in simple markdown (headings, bullet lists, paragraphs). */
export function ReleaseNotes({ text }: { text: string }) {
  const lines = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .split('\n')
  const out: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (!list.length) return
    out.push(
      <ul key={`l${out.length}`} className="ml-4 list-disc space-y-0.5">
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
    list = []
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      list.push(bullet[1] as string)
      continue
    }
    flush()
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    if (heading) out.push(<div key={out.length} className="mt-1 font-medium text-fg-strong">{heading[1]}</div>)
    else if (line.trim()) out.push(<p key={out.length}>{line}</p>)
  }
  flush()
  return <div className="flex flex-col gap-1 text-[12px] leading-relaxed text-fg" data-testid="release-notes">{out.length ? out : <p className="text-muted">Brak opisu zmian.</p>}</div>
}

function StatusLine({ s }: { s: UpdateState }) {
  const v = s.release?.version
  const closeToTray = useTray((x) => x.prefs?.closeToTray)
  const pct = s.progress && s.progress.total ? Math.min(100, Math.round((s.progress.received / s.progress.total) * 100)) : null
  switch (s.phase) {
    case 'idle':
      return <span className="text-muted">Jeszcze nie sprawdzano w tej sesji.</span>
    case 'checking':
      return <span className="text-accent">Sprawdzanie GitHuba…</span>
    case 'up-to-date':
      return <span className="text-fg-strong">Masz najnowszą wersję.</span>
    case 'available':
      return <span className="text-accent">Dostępna wersja {v}.</span>
    case 'downloading':
      return (
        <div className="flex flex-col gap-1">
          <span className="text-accent">
            Pobieranie wersji {v}…{' '}
            {s.progress && (
              <span className="num">
                {pct != null ? `${pct}% · ` : ''}
                {fmtBytes(s.progress.received)}
                {s.progress.total ? ` / ${fmtBytes(s.progress.total)}` : ''}
              </span>
            )}
          </span>
          <div className="h-[4px] w-[320px] bg-line">
            <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${pct ?? 0}%` }} />
          </div>
        </div>
      )
    case 'ready':
      return (
        <span className="text-fg-strong">
          Wersja {v} pobrana i sprawdzona (SHA-256). Zainstaluje się sama {installWhen(closeToTray)}.
          {/* A newer version that would not download (B122): this one stays ready. */}
          {s.error && <span className="block text-accent">{s.error}</span>}
        </span>
      )
    case 'error':
      return <span className="text-down">{s.error}</span>
  }
}

export function UpdatesTab() {
  const s = useUpdate((x) => x.state)
  useEffect(() => {
    // Opening the tab checks right away (unless something is already in progress or downloaded).
    const st = useUpdate.getState().state
    if (st && (st.phase === 'idle' || st.phase === 'error')) void checkForUpdates()
  }, [])
  if (!s) return <Panel title="Aktualizacje">Wczytywanie…</Panel>
  const busy = s.phase === 'checking' || s.phase === 'downloading'
  const canInstall = s.mode !== 'manual'
  const notes = s.release
    ? { version: s.release.version, text: s.release.notes }
    : s.justUpdated?.notes
      ? { version: s.justUpdated.version, text: s.justUpdated.notes }
      : null
  return (
    <>
      <Panel title="Aktualizacje z GitHuba">
        <div className="flex flex-col gap-2.5" data-testid="updates">
          <Field label="Ta wersja">
            <span className="num text-fg-strong" data-testid="current-version">
              {s.currentVersion}
            </span>
            <span className="ml-2 text-[11.5px] text-muted">{MODE_TEXT[s.mode]}</span>
          </Field>
          {s.modeNote && (
            <Field label="">
              <span className="text-[11.5px] text-muted">{s.modeNote}</span>
            </Field>
          )}
          <Field label="Status">
            <div className="flex flex-col gap-1" data-testid="update-status">
              <StatusLine s={s} />
              {s.lastCheckAt && <span className="num text-[11px] text-dim">ostatnie sprawdzenie: {new Date(s.lastCheckAt).toLocaleString('pl-PL')}</span>}
            </div>
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" disabled={busy} onClick={() => void checkForUpdates()} data-testid="check-updates">
              <IconSync size={13} /> Sprawdź teraz
            </button>
            {s.phase === 'available' && canInstall && (
              <button className="btn btn-accent" onClick={() => void downloadUpdate()} data-testid="download-update">
                Pobierz wersję {s.release?.version}
              </button>
            )}
            {s.phase === 'ready' && (
              <button className="btn btn-accent" onClick={() => void restartToUpdate()} data-testid="restart-update">
                Uruchom ponownie i zaktualizuj
              </button>
            )}
            {s.release && (s.phase === 'available' || s.phase === 'up-to-date' || !canInstall) && (
              <button className={cx('btn', !canInstall && s.phase === 'available' && 'btn-accent')} onClick={() => openExternalSafe(s.release!.htmlUrl)} data-testid="open-release">
                <IconExternal size={13} /> {canInstall ? 'Strona wydania' : `Pobierz wersję ${s.release.version} ze strony`}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => openExternalSafe(RELEASES_PAGE)}>
              Wszystkie wydania
            </button>
          </div>
          <div className="mt-1 flex flex-col gap-1.5 border-t border-line pt-2.5">
            <Toggle
              checked={s.prefs.autoCheck}
              onChange={(autoCheck) => void setUpdatePrefs({ autoCheck })}
              label="Sprawdzaj automatycznie (przy starcie i co 6 godzin)"
              data-testid="toggle-auto-check"
            />
            {canInstall && (
              <Toggle
                checked={s.prefs.autoDownload}
                onChange={(autoDownload) => void setUpdatePrefs({ autoDownload })}
                label="Pobieraj w tle i instaluj przy zamknięciu aplikacji"
                data-testid="toggle-auto-download"
              />
            )}
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted">
            Aplikacja łączy się tylko z api.github.com i github.com (repozytorium Clatir/FinancialIntel) i nie wysyła żadnych twoich
            danych. Pobrany plik jest sprawdzany sumą SHA-256 z wydania, a dane w folderze zostają nietknięte – nowa wersja sama je
            zmigruje, gdy zmieni się format.
          </p>
        </div>
      </Panel>
      <TokenPanel s={s} />
      {notes && (
        <Panel title={`Co nowego w wersji ${notes.version}${notes.version === s.currentVersion ? ' (ta wersja)' : ''}`} name="Co nowego">
          <ReleaseNotes text={notes.text} />
        </Panel>
      )}
    </>
  )
}
