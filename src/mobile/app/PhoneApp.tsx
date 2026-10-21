/** The phone's app (T307): the connecting screens until the folder is on the phone, then the window. */
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-ext-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-ext-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '../styles.css'
import '../phone.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installActivityReport } from '@renderer/store/presence'
import { installLook, loadMachinePrefs } from '@renderer/store/machine'
import { ErrorBoundary } from '@renderer/app/ErrorBoundary'
import { usePhone } from '../phone'
import { FirstSyncScreen, FolderScreen, SignInScreen, Splash } from './Connect'
import { Shell, goBridge } from './Shell'

function PhoneApp() {
  const phase = usePhone((s) => s.phase)
  if (phase === 'starting') return <Splash text="Uruchamianie…" />
  if (phase === 'signin') return <SignInScreen />
  if (phase === 'folder') return <FolderScreen />
  if (phase === 'first-sync') return <FirstSyncScreen />
  return (
    <ErrorBoundary onReset={goBridge}>
      <Shell />
    </ErrorBoundary>
  )
}

export function mount(): void {
  // A touch counts the phone in use (D86); the look of this phone (contrast).
  installActivityReport()
  installLook()
  void loadMachinePrefs()
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <PhoneApp />
    </StrictMode>
  )
  // The simulator's smoke test of the build (CI) waits for this line in the system log.
  console.info('FI_PHONE_BOOT_OK')
}
