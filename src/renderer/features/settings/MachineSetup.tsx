import { useEffect, type ReactNode } from 'react'
import { create } from 'zustand'
import { shortcutLabel, type NotifyPrefs } from '@shared/machine'
import { useIctj } from '../../store/ictj'
import { useMachine } from '../../store/machine'
import { loadTrayPrefs, setTrayPrefs, useTray } from '../../store/tray'
import { useUpdate } from '../../store/update'
import { navigate, toast, type SettingsTab } from '../../store/ui'
import { errorMessage } from '../../lib/api'
import { Modal } from '../../components/Modal'
import { Badge } from '../../components/ui'

/**
 * „Ustaw na tym komputerze” (AP-28, US.1, SW sp. 8): a budget opened on a new computer brings fi.json, never this
 * computer's settings – ICTTJ's folder, the quick entry's shortcut, the start with Windows, the notifications, the token.
 * After the first opening of an existing budget here a banner offers the list; it is in Ustawienia → Folder i kopie too.
 * Pending in this computer's window storage (localStorage – the user data, never the folder) until „Gotowe” or ×.
 */
const KEY = 'fi.machineSetup'

const stored = (): boolean => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'pending'
  } catch {
    return false
  }
}

export const useMachineSetup = create<{ pending: boolean; open: boolean }>(() => ({ pending: stored(), open: false }))

/** The first opening of an existing budget on this computer (the start screen of a computer without a folder). */
export function markNewComputer(): void {
  try {
    localStorage.setItem(KEY, 'pending')
  } catch {
    /* the banner for this session only */
  }
  useMachineSetup.setState({ pending: true })
}

export const openMachineSetup = (): void => useMachineSetup.setState({ open: true })

export function dismissMachineSetup(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing kept */
  }
  useMachineSetup.setState({ pending: false, open: false })
}

const NOTIFY_KEYS = (n: NotifyPrefs) => Object.entries(n).filter(([, v]) => typeof v === 'boolean') as Array<[string, boolean]>

function Row({ label, state, ok, children, testId }: { label: string; state: string; ok: boolean; children: ReactNode; testId: string }) {
  return (
    <div className="grid grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-2 border-b border-line/60 py-1.5 text-[12px] last:border-b-0" data-testid={testId} data-state={ok ? 'set' : 'todo'}>
      <span className="text-fg-strong">{label}</span>
      <span className="truncate text-muted" title={state}>
        {state}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  )
}

export function MachineSetupDialog() {
  const open = useMachineSetup((s) => s.open)
  const ictj = useIctj((s) => s.snap.status)
  const ictjDir = useIctj((s) => s.snap.dir)
  const shortcut = useMachine((s) => s.prefs.quickShortcut)
  const notify = useMachine((s) => s.prefs.notify)
  const tray = useTray((s) => s.prefs)
  const token = useUpdate((s) => s.state?.token.present ?? false)
  useEffect(() => {
    if (open) void loadTrayPrefs()
  }, [open])
  if (!open) return null
  const close = () => useMachineSetup.setState({ open: false })
  const go = (tab: SettingsTab) => {
    close()
    navigate({ page: 'settings', tab })
  }
  const set = (tab: SettingsTab) => (
    <button className="btn h-[22px]" onClick={() => go(tab)} data-testid={`machine-setup-go-${tab}`}>
      Ustaw…
    </button>
  )
  const on = NOTIFY_KEYS(notify).filter(([, v]) => v).length
  const all = NOTIFY_KEYS(notify).length
  return (
    <Modal
      title="Ustaw na tym komputerze"
      width={720}
      onClose={close}
      testId="machine-setup"
      footer={
        <>
          <button className="btn" onClick={close}>
            Później
          </button>
          <button className="btn btn-accent" onClick={dismissMachineSetup} data-testid="machine-setup-done">
            Gotowe
          </button>
        </>
      }
    >
      <p className="mb-2 text-[12px] text-muted">
        Budżet przyszedł z folderu danych. Te ustawienia są zapisane na każdym komputerze osobno – sprawdź je tutaj. Każde ma w Ustawieniach znak{' '}
        <Badge>tylko ten komputer</Badge>.
      </p>
      <Row label="Folder ICT Trade Journal" state={ictj === 'ok' && ictjDir ? `czytany: ${ictjDir}` : ictj === 'off' ? 'nie wybrano' : 'niedostępny – wskaż folder'} ok={ictj === 'ok'} testId="machine-setup-ictj">
        {set('ictj')}
      </Row>
      <Row label="Skrót szybkiego wpisu" state={shortcut ? shortcutLabel(shortcut) : 'bez skrótu'} ok={!!shortcut} testId="machine-setup-shortcut">
        {set('notify')}
      </Row>
      <Row
        label="Start z Windows"
        state={!tray ? '…' : !tray.loginSupported ? 'tylko w zainstalowanej albo przenośnej wersji dla Windows' : tray.launchAtLogin ? 'włączony (ukryty w zasobniku)' : 'wyłączony'}
        ok={!!tray?.launchAtLogin}
        testId="machine-setup-autostart"
      >
        {tray?.loginSupported && (
          <button
            className="btn h-[22px]"
            onClick={() => void setTrayPrefs({ launchAtLogin: !tray.launchAtLogin }).catch((e: unknown) => toast(`Nie udało się zapisać: ${errorMessage(e)}`, 'error'))}
            data-testid="machine-setup-autostart-toggle"
          >
            {tray.launchAtLogin ? 'Wyłącz' : 'Włącz'}
          </button>
        )}
        {set('system')}
      </Row>
      <Row label="Powiadomienia" state={`włączone ${on} z ${all}`} ok={on > 0} testId="machine-setup-notify">
        {set('notify')}
      </Row>
      <Row label="Token GitHub" state={token ? 'zapisany' : 'brak – potrzebny tylko, gdy repozytorium aktualizacji jest prywatne'} ok={token} testId="machine-setup-token">
        {set('updates')}
      </Row>
    </Modal>
  )
}
