/**
 * Ustawienia → ICTTJ (E5, D72): the ICT Trade Journal folder of this computer (the path ICTTJ itself uses proposed, to
 * confirm), the scenario whose goals are the ship's (fi.json – every computer the same) and ICTTJ's program for
 * „Otwórz ICTTJ”. FI only reads the payouts and the forecast goals; in ICTTJ nothing changes.
 */
import { useEffect, useState } from 'react'
import type { IctjProgram } from '@shared/api'
import { chosenForecast } from '@shared/ictj'
import { api, errorMessage } from '../../lib/api'
import { countLabel } from '../../lib/format'
import { updateSettings, useData, useFolderLocked } from '../../store/data'
import { openIctj, setIctjDir, useIctj } from '../../store/ictj'
import { navigate, toast } from '../../store/ui'
import { Badge, Field, Panel } from '../../components/ui'

const STATUS: Record<string, { label: string; tone: 'up' | 'down' | 'warn' | 'default' }> = {
  ok: { label: 'czytany', tone: 'up' },
  off: { label: 'nie wybrano', tone: 'default' },
  missing: { label: 'niedostępny', tone: 'warn' },
  'not-ictj': { label: 'to nie folder ICTTJ', tone: 'down' },
  error: { label: 'błąd odczytu', tone: 'down' }
}

const chooseForecast = (id: string) => updateSettings((f) => ({ ...f, settings: { ...f.settings, ictj: { ...f.settings.ictj, forecastId: id } } }))

export function IctjTab() {
  const snap = useIctj((s) => s.snap)
  const forecastId = useData((s) => s.fi?.settings.ictj.forecastId ?? null)
  const readOnly = useFolderLocked()
  const [suggested, setSuggested] = useState<string | null>(null)
  const [program, setProgram] = useState<IctjProgram | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  useEffect(() => {
    void api.ictjSuggest().then(setSuggested, () => setSuggested(null))
    void api.ictjProgram().then(setProgram, () => setProgram(null))
  }, [])
  const pick = async () => {
    const dir = await api.ictjPickDir()
    if (dir) await setIctjDir(dir)
  }
  const pickExe = async (mode: 'pick' | 'clear') => {
    try {
      setProgram(await api.ictjPickExe(mode))
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }
  const st = STATUS[snap.status] ?? STATUS.error!
  const current = chosenForecast(snap.forecasts, forecastId)
  const latest = chosenForecast(snap.forecasts, null)
  const withdrawals = snap.entries.filter((e) => e.kind === 'withdrawal').length
  return (
    <>
      <Panel title="Folder ICT Trade Journal">
        <div className="flex flex-col gap-2 text-[12px]">
          <div className="flex items-baseline gap-2">
            <span className="num min-w-0 flex-1 truncate text-fg-strong" data-testid="ictj-dir" title={snap.dir ?? ''}>
              {snap.dir ?? '—'}
            </span>
            <Badge tone={st.tone} data-testid="ictj-status">
              {st.label}
            </Badge>
          </div>
          {snap.message && <p className="text-muted">{snap.message}</p>}
          {snap.status === 'ok' && (
            <p className="text-muted" data-testid="ictj-counts">
              Wypłaty: {withdrawals}, zwroty do masy: {snap.entries.length - withdrawals}, scenariusze prognozy: {snap.forecasts.length}.
            </p>
          )}
          {snap.warnings.map((w) => (
            <p key={w} className="text-accent">
              {w}
            </p>
          ))}
          {suggested && suggested !== snap.dir && (
            <div className="flex items-center gap-2 border border-accent/40 bg-accent-soft px-2 py-1.5">
              <span className="min-w-0 flex-1">
                ICTTJ na tym komputerze używa folderu <span className="num text-fg-strong">{suggested}</span>
              </span>
              <button className="btn btn-accent h-[24px]" onClick={() => void setIctjDir(suggested)} data-testid="ictj-use-suggested">
                Użyj tego folderu
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn h-[26px]" onClick={() => void pick()} data-testid="ictj-pick">
              Wskaż folder…
            </button>
            {snap.dir && (
              <button className="btn h-[26px]" onClick={() => void setIctjDir(null)} data-testid="ictj-off">
                Nie czytaj ICTTJ na tym komputerze
              </button>
            )}
          </div>
          <p className="text-[11.5px] text-dim">
            Ustawienie tego komputera. FI czyta tylko wypłaty (z pulą) i zwroty do masy oraz cele prognoz – nic tam nie zapisuje, a w ICTTJ nic się nie
            zmienia. Każda wypłata dokuje najwyżej raz, także z drugiego komputera.
          </p>
        </div>
      </Panel>
      <Panel title="Cele z prognozy ICTTJ">
        <div className="flex flex-col gap-2 text-[12px]">
          <Field label="Scenariusz" labelWidth={120} hint="Jego cele są układami gwiezdnymi okrętu (tylko do odczytu). Wspólne dla wszystkich komputerów.">
            <select
              className="input h-[26px] w-[320px]"
              value={pending ?? forecastId ?? ''}
              disabled={readOnly}
              onChange={(e) => {
                const id = e.currentTarget.value || null
                if (!id || id === forecastId) return setPending(null)
                // Another scenario archives the goals of this one (D84 C3): asked first, never by itself.
                if (forecastId && current) setPending(id)
                else chooseForecast(id)
              }}
              data-testid="ictj-forecast"
            >
              {!forecastId && <option value="">— wybierz{latest ? ` (zmieniony ostatnio: ${latest.name})` : ''} —</option>}
              {snap.forecasts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.currency} · {countLabel(f.goals.filter((g) => g.enabled).length, 'cel', 'cele', 'celów')}
                </option>
              ))}
              {forecastId && !snap.forecasts.some((f) => f.id === forecastId) && <option value={forecastId}>(scenariusza nie ma w ICTTJ)</option>}
            </select>
          </Field>
          {pending && current && (
            <div className="flex flex-col gap-2 border border-accent/40 bg-accent-soft px-2 py-1.5" data-testid="ictj-forecast-confirm">
              <span>
                Cele scenariusza „{current.name}” zostaną zarchiwizowane: ich środki zostają w nich (przeniesiesz je na Mapie gwiezdnej), a nowe pieniądze
                trafią do celów scenariusza „{snap.forecasts.find((f) => f.id === pending)?.name ?? '—'}”.
              </span>
              <span className="flex gap-2">
                <button
                  className="btn btn-accent h-[24px]"
                  onClick={() => {
                    chooseForecast(pending)
                    setPending(null)
                  }}
                  data-testid="ictj-forecast-confirm-ok"
                >
                  Zmień scenariusz
                </button>
                <button className="btn h-[24px]" onClick={() => setPending(null)}>
                  Anuluj
                </button>
              </span>
            </div>
          )}
          {forecastId && snap.status === 'ok' && !current && <p className="text-accent">Wybranego scenariusza nie ma w folderze ICTTJ – cele zostają, jakie były, dopóki nie wybierzesz innego.</p>}
          {current && current.currency !== 'PLN' && (
            <p className="text-accent" data-testid="ictj-currency">
              Scenariusz „{current.name}” jest w {current.currency}: FI liczy tylko w PLN, więc jego cele są na Mapie gwiezdnej bez kwoty. Wybierz scenariusz w PLN
              albo dodaj własne cele.
            </p>
          )}
        </div>
      </Panel>
      <Panel title="Program ICT Trade Journal">
        <div className="flex flex-col gap-2 text-[12px]">
          <p className="text-muted" data-testid="ictj-program">
            {program?.exe ? (
              <>
                {program.source === 'chosen' ? 'Wybrany' : 'Zainstalowany'}: <span className="num text-fg-strong">{program.exe}</span>
              </>
            ) : (
              'Nie znaleziono zainstalowanego ICTTJ – przy wersji portable wskaż jej plik .exe.'
            )}
          </p>
          <div className="flex gap-2">
            <button className="btn h-[26px]" onClick={() => void pickExe('pick')} data-testid="ictj-pick-exe">
              Wskaż plik .exe…
            </button>
            {program?.source === 'chosen' && (
              <button className="btn h-[26px]" onClick={() => void pickExe('clear')}>
                Zapomnij wybór
              </button>
            )}
            <button className="btn h-[26px]" onClick={() => void openIctj(() => navigate({ page: 'settings', tab: 'ictj' }))} disabled={!program?.exe} data-testid="ictj-open">
              Otwórz ICTTJ
            </button>
          </div>
          <p className="text-[11.5px] text-dim">Przycisk „Otwórz ICTTJ” jest też w menu bocznym. Ustawienie tego komputera.</p>
        </div>
      </Panel>
    </>
  )
}
