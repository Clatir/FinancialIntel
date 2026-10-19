// adapted from ICTTJ src/renderer/main.tsx @ 84a8339
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-ext-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-ext-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-ext-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import './styles/index.css'
import { App } from './app/App'
import { DetachedApp } from './features/detach/DetachedApp'
import { QuickApp } from './features/quick/QuickApp'
import { installActivityReport } from './store/presence'
import { installLook, installZoomKeys, loadMachinePrefs } from './store/machine'

// A panel opened in its own window runs only that panel, without the data store and saves; so does the quick entry.
const params = new URLSearchParams(location.search)
const root = params.has('quick') ? <QuickApp /> : params.has('detached') ? <DetachedApp /> : <App />
// A move in any of the windows counts the computer in use (D86).
installActivityReport()
// This computer's look in every window (F30): the quick entry and the detached panels too.
installLook()
installZoomKeys()
void loadMachinePrefs()

createRoot(document.getElementById('root') as HTMLElement).render(<StrictMode>{root}</StrictMode>)
