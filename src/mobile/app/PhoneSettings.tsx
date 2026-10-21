/**
 * The phone's own settings (T307): the account and the folder, the sync (what waits, when it last went, a run now), this
 * phone's name for the computers, the hidden amounts and the notifications planned ahead (IP0.4).
 */
import { useState, type ReactNode } from 'react'
import { useData } from '@renderer/store/data'
import { setMachinePrefs, useMachine } from '@renderer/store/machine'
import { toast } from '@renderer/store/ui'
import { Panel, cx } from '@renderer/components/ui'
import { plural } from '@shared/format'
import type { NotifyPrefs } from '@shared/machine'
import { changeFolder, pendingChanges, phoneVersion, signIn, signOut, syncNow, usePhone } from '../phone'
import { phoneHost } from '../hostRef'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[40px] items-center gap-3 border-b border-line/60 py-1.5 last:border-b-0">
      <span className="flex-1 text-[13px] text-fg">{label}</span>
      <span className="flex shrink-0 items-center gap-2 text-[13px] text-muted">{children}</span>
    </div>
  )
}

function Toggle({ on, onChange, testId }: { on: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      className={cx('relative h-[26px] w-[46px] border transition-colors duration-150', on ? 'border-accent bg-accent-soft' : 'border-line-strong bg-raised')}
      onClick={() => onChange(!on)}
      data-testid={testId}
    >
      <span className={cx('absolute top-[3px] h-[18px] w-[18px] transition-[left] duration-150', on ? 'left-[23px] bg-accent' : 'left-[3px] bg-muted')} />
    </button>
  )
}

function syncText(state: string, pending: number): string {
  if (state === 'syncing') return 'trwa'
  if (state === 'offline') return 'brak sieci'
  if (state === 'auth') return 'zaloguj się ponownie'
  if (state === 'error') return 'błąd'
  return pending ? 'czeka na wysłanie' : 'aktualna'
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')

export function PhoneSettings() {
  const account = usePhone((s) => s.account)
  const folder = usePhone((s) => s.folder)
  const sync = usePhone((s) => s.sync)
  const clientId = usePhone((s) => s.clientId)
  const busy = usePhone((s) => s.busy)
  // This attempt's problem only (the phone's message is shared with the connecting screens).
  const [loginError, setLoginError] = useState<string | null>(null)
  const conflicts = useData((s) => s.conflicts.length)
  const prefs = useMachine((s) => s.prefs)
  const [name, setName] = useState(() => phoneHost().machineName)
  const notify = (patch: Partial<NotifyPrefs>) => void setMachinePrefs({ notify: { ...prefs.notify, ...patch } })
  const out = async () => {
    const waiting = pendingChanges()
    const ask = waiting
      ? `Na telefonie ${waiting} ${plural(waiting, 'zmiana czeka', 'zmiany czekają', 'zmian czeka')} na wysłanie – po wylogowaniu przepadną. Wylogować mimo to?`
      : 'Wylogować? Kopia folderu zniknie z telefonu (dane zostają na OneDrive).'
    if (window.confirm(ask)) await signOut()
  }
  return (
    <div className="flex flex-col" data-testid="phone-settings">
      <Panel title="Synchronizacja z OneDrive">
        <Row label="Stan">
          <span className={cx(sync.state === 'error' || sync.state === 'auth' ? 'text-down' : 'text-fg')} data-testid="phone-sync-state">
            {syncText(sync.state, sync.pending)}
          </span>
        </Row>
        <Row label="Czeka na wysłanie">
          <span className="num text-fg" data-testid="phone-sync-pending">
            {sync.pending}
          </span>
        </Row>
        <Row label="Ostatnio">
          <span className="num">{when(sync.lastSync)}</span>
        </Row>
        {sync.message && <p className="py-2 text-[12px] leading-snug text-down">{sync.message}</p>}
        {sync.state === 'auth' && (
          <>
            {/* Signed in again with the same account: the copy on the phone and what waits stay. */}
            <button
              className="btn btn-accent mt-2 h-[40px] w-full text-[13px]"
              disabled={busy}
              onClick={() => {
                setLoginError(null)
                void signIn(clientId).then((ok) => setLoginError(ok ? null : usePhone.getState().message))
              }}
              data-testid="phone-signin-again"
            >
              {busy ? 'Logowanie…' : 'Zaloguj ponownie'}
            </button>
            {loginError && (
              <p className="py-2 text-[12px] leading-snug text-down" data-testid="phone-message">
                {loginError}
              </p>
            )}
          </>
        )}
        {sync.copies.length > 0 && (
          <p className="py-2 text-[12px] leading-snug text-accent" data-testid="phone-sync-copies">
            Ta sama rzecz zmieniła się w tym czasie na komputerze – wersja z telefonu jest obok jako kopia. Wybierz w Synchronizacji na komputerze.
          </p>
        )}
        {conflicts > 0 && (
          <p className="py-2 text-[12px] leading-snug text-down" data-testid="phone-conflicts">
            Konflikty w folderze: {conflicts} – rozstrzygnij je w Synchronizacji na komputerze.
          </p>
        )}
        <button className="btn mt-2 h-[40px] w-full text-[13px]" onClick={() => void syncNow().then(() => toast('Synchronizacja zakończona.', 'success'))} data-testid="phone-sync-now">
          Synchronizuj teraz
        </button>
      </Panel>
      <Panel title="Konto i folder">
        <Row label="Konto Microsoft">
          <span className="max-w-[180px] truncate text-fg">{account ?? '—'}</span>
        </Row>
        <Row label="Folder na OneDrive">
          <span className="text-fg">{folder?.path ?? '—'}</span>
        </Row>
        <div className="flex gap-2 pt-2">
          <button className="btn h-[40px] flex-1 text-[13px]" onClick={changeFolder}>
            Inny folder
          </button>
          <button className="btn h-[40px] flex-1 text-[13px]" onClick={() => void out()} data-testid="phone-signout">
            Wyloguj
          </button>
        </div>
      </Panel>
      <Panel title="Ten telefon">
        <label className="label mb-1 block" htmlFor="phone-machine">
          Nazwa dla komputerów (obecność, „zmienione przez”)
        </label>
        <input
          id="phone-machine"
          className="input h-[38px] w-full text-[13px]"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void phoneHost().setMachineName(name).then(() => setName(phoneHost().machineName))}
          data-testid="phone-machine"
        />
        <Row label="Ukryj kwoty">
          <Toggle on={prefs.hideAmounts} onChange={(v) => void setMachinePrefs({ hideAmounts: v })} testId="phone-pref-hide" />
        </Row>
        <Row label="Ukrywaj kwoty przy starcie">
          <Toggle on={prefs.hideOnStart} onChange={(v) => void setMachinePrefs({ hideOnStart: v })} testId="phone-pref-hide-start" />
        </Row>
      </Panel>
      <Panel title="Powiadomienia">
        <Row label="Odprawa poranna (po ciszy nocnej, nie przed 7:00)">
          <Toggle on={prefs.notify.briefing} onChange={(v) => notify({ briefing: v })} testId="phone-notify-briefing" />
        </Row>
        <Row label="Raport wachty wieczorem">
          <input type="time" className="input h-[32px] w-[96px] text-[13px]" value={prefs.notify.eveningTime} onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && notify({ eveningTime: e.target.value })} data-testid="phone-notify-evening-time" />
          <Toggle on={prefs.notify.evening} onChange={(v) => notify({ evening: v })} testId="phone-notify-evening" />
        </Row>
        <Row label="Płatności i opłaty z Radaru">
          <Toggle on={prefs.notify.asteroid} onChange={(v) => notify({ asteroid: v, cargo: v })} testId="phone-notify-radar" />
        </Row>
        <Row label="Raty pożyczek">
          <Toggle on={prefs.notify.loans} onChange={(v) => notify({ loans: v })} testId="phone-notify-loans" />
        </Row>
        <Row label="Boje (zaplanowane wydatki i terminy)">
          <Toggle on={prefs.notify.plans} onChange={(v) => notify({ plans: v })} testId="phone-notify-plans" />
        </Row>
        <Row label="Przekroczenia i koniec energii">
          <Toggle on={prefs.notify.overrun} onChange={(v) => notify({ overrun: v, low: v })} testId="phone-notify-overrun" />
        </Row>
        <p className="pt-2 text-[12px] leading-snug text-muted">
          iPhone nie uruchamia aplikacji w tle: powiadomienia na najbliższy tydzień są planowane przy każdym otwarciu (dni z Radaru o 9:00), reszta przychodzi, gdy aplikacja jest otwarta. W ciszy nocnej nic.
        </p>
      </Panel>
      <div className="px-3 py-4 text-[12px] text-muted" data-testid="phone-version">
        Financial Intel {phoneVersion()} na telefonie · nowe wersje instaluje AltStore
      </div>
    </div>
  )
}
