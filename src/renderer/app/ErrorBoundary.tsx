// adapted from ICTTJ src/renderer/app/ErrorBoundary.tsx @ 84a8339
import { Component, type ReactNode } from 'react'
import { plainError } from '@shared/plainError'
import { api, errorMessage } from '../lib/api'
import { toast } from '../store/ui'

interface State {
  error: Error | null
}

/**
 * Keeps a rendering bug in one screen from blanking the whole window. „Spróbuj ponownie” draws the screen again; „Wróć
 * na mostek” only where the bridge is not the screen that failed (`onBridge` – it would fail again at once, UX-20).
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void; onBridge?: boolean }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error): void {
    console.error('Błąd widoku:', error)
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full items-center justify-center p-6" data-testid="error-boundary">
        <div className="max-w-[620px] border border-down/50 bg-panel p-4">
          <div className="mb-1 text-[13px] font-medium text-fg-strong">Ten widok napotkał błąd</div>
          <div className="num mb-3 text-[12px] break-words text-down" data-testid="error-boundary-message">
            {plainError(this.state.error.message)}
          </div>
          <div className="mb-3 text-[12px] text-muted">
            Dane na dysku nie zostały naruszone.{this.props.onBridge ? ' Spróbuj ponownie; gdy błąd wraca, zajrzyj do folderu logów.' : ' Możesz spróbować ponownie albo wrócić na mostek.'}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => this.setState({ error: null })} data-testid="error-boundary-retry">
              Spróbuj ponownie
            </button>
            {!this.props.onBridge && (
              <button
                className="btn"
                onClick={() => {
                  this.setState({ error: null })
                  this.props.onReset?.()
                }}
                data-testid="error-boundary-bridge"
              >
                Wróć na mostek
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => void api.openLogs().catch((e) => toast(errorMessage(e), 'error'))} data-testid="error-boundary-logs">
              Folder logów
            </button>
          </div>
        </div>
      </div>
    )
  }
}
