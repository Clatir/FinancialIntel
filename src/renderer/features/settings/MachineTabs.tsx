import { useEffect, useState } from 'react'
import { SOUND_KINDS, SOUND_LABEL, shortcutLabel, type NotifyPrefs } from '@shared/machine'
import type { Orders } from '@shared/schema'
import { api } from '../../lib/api'
import { playSound } from '../../lib/sounds'
import { updateSettings, useData } from '../../store/data'
import { setMachinePrefs, useMachine } from '../../store/machine'
import { AmountField, TimeField } from '../../components/fields'
import { ShortcutField } from '../../components/ShortcutField'
import { Field, NumberField, Panel, Toggle } from '../../components/ui'

/** Ustawienia → Warstwy i rozkazy (fi.json – the same on every computer): the layers' targets and the orders. */
export function LayersTab() {
  const fi = useData((s) => s.fi)
  const readOnly = useData((s) => !!s.status?.readOnly)
  if (!fi) return null
  const { layers, orders } = fi.settings
  const setLayers = (p: Partial<typeof layers>) => updateSettings((f) => ({ ...f, settings: { ...f.settings, layers: { ...f.settings.layers, ...p } } }))
  const setOrders = (p: Partial<Orders>) => updateSettings((f) => ({ ...f, settings: { ...f.settings, orders: { ...f.settings.orders, ...p } } }))
  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-3">
      <Panel title="Warstwy okrętu">
        <div className="flex flex-col gap-2 text-[12px]">
          <Field label="Osłony – cel" labelWidth={200} hint="Bufor na pensje: tyle pensji.">
            <NumberField className="w-[80px]" value={layers.shieldSalaries} decimals={0} step={1} commitOnBlur isValid={(v) => v != null && v >= 1 && v <= 24} onChange={(v) => v != null && setLayers({ shieldSalaries: v })} aria-label="Osłony w pensjach" data-testid="layers-shields" />
          </Field>
          <Field label="Kadłub – cel" labelWidth={200} hint="Fundusz awaryjny: tyle miesięcy średnich kosztów netto (D12).">
            <NumberField className="w-[80px]" value={layers.hullMonths} decimals={0} step={1} commitOnBlur isValid={(v) => v != null && v >= 1 && v <= 36} onChange={(v) => v != null && setLayers({ hullMonths: v })} aria-label="Kadłub w miesiącach" data-testid="layers-hull" />
          </Field>
          <Field label="Przyjęte średnie koszty" labelWidth={200} hint="Dopóki historia ma mniej niż 3 pełne miesiące (puste = tylko z historii).">
            <AmountField className="w-[120px]" value={layers.assumedCosts} allowEmpty onChange={(assumedCosts) => setLayers({ assumedCosts })} aria-label="Przyjęte koszty" />
          </Field>
        </div>
      </Panel>
      <Panel title="Rozkazy">
        <div className="flex flex-col gap-2 text-[12px]">
          <Field label="Minimalne osłony (pensje)" labelWidth={200}>
            <NumberField className="w-[80px]" value={orders.minShieldSalaries} decimals={1} step={0.5} commitOnBlur isValid={(v) => v != null && v >= 0 && v <= 24} onChange={(v) => v != null && setOrders({ minShieldSalaries: v })} aria-label="Minimalne osłony" />
          </Field>
          <Field label="Linia zanurzenia (% pensji)" labelWidth={200}>
            <NumberField className="w-[80px]" value={orders.cargoLimitPct} decimals={0} step={5} commitOnBlur isValid={(v) => v != null && v >= 1 && v <= 100} onChange={(v) => v != null && setOrders({ cargoLimitPct: v })} aria-label="Linia zanurzenia" data-testid="orders-cargo" />
          </Field>
          <Field label="Cisza nocna" labelWidth={200} hint="Zakup z godziną w tym oknie wymaga potwierdzenia i krótkiego wpisu (D40).">
            <div className="flex items-center gap-2">
              <TimeField className="w-[70px]" value={orders.quietHours.from} onChange={(from) => from && setOrders({ quietHours: { ...orders.quietHours, from } })} aria-label="Cisza od" />
              –
              <TimeField className="w-[70px]" value={orders.quietHours.to} onChange={(to) => to && setOrders({ quietHours: { ...orders.quietHours, to } })} aria-label="Cisza do" />
            </div>
          </Field>
          <Field label="Dziennik kapitański od kwoty" labelWidth={200} hint="„Plan czy impuls?” od tej kwoty (D41).">
            <AmountField className="w-[120px]" value={orders.impulseThreshold} onChange={(v) => setOrders({ impulseThreshold: v ?? 0 })} aria-label="Próg dziennika" />
          </Field>
          <Toggle checked={orders.firewall} onChange={(firewall) => setOrders({ firewall })} label="Firewall: dopłata do XTB tylko z „wolnego do decyzji”, gdy osłony i kadłub są pełne (D23)" />
        </div>
      </Panel>
    </fieldset>
  )
}

/** The volume: moved freely, saved (config.json, every window) and heard once on letting go. */
function VolumeSlider() {
  const volume = useMachine((s) => Math.round(s.prefs.sounds.volume * 100))
  const [draft, setDraft] = useState<number | null>(null)
  const commit = () => {
    if (draft == null) return
    setDraft(null)
    if (draft === volume) return
    void setMachinePrefs({ sounds: { ...useMachine.getState().prefs.sounds, volume: draft / 100 } }).then(() => playSound('entry', true))
  }
  const shown = draft ?? volume
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={100}
        value={shown}
        onChange={(e) => setDraft(Number(e.currentTarget.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label="Głośność"
        data-testid="sounds-volume"
      />
      <span className="num w-[40px] text-muted">{shown}%</span>
    </div>
  )
}

const NOTIFY_ROWS: Array<[keyof NotifyPrefs, string]> = [
  ['briefing', 'Odprawa poranna – przy pierwszym otwarciu okna po ciszy nocnej'],
  ['evening', 'Wieczorne dopisanie wydatków'],
  ['low', 'Energia dziś poniżej 20% albo koperta powyżej 80%'],
  ['overrun', 'Przekroczenie przydziału albo koperty'],
  ['asteroid', 'Asteroida (opłata okresowa) – 14 i 3 dni przed terminem'],
  ['importOverdue', 'Zaległy import z mBanku – po 3 dniach'],
  ['balances', 'Potwierdzenie sald – w niedzielę'],
  ['debriefing', 'Debriefing – 1. dnia miesiąca']
]

/** Ustawienia → Powiadomienia i dźwięki (config.json – this computer only): the quick entry's shortcut too. */
export function NotifyTab() {
  const prefs = useMachine((s) => s.prefs)
  const [state, setState] = useState<{ accelerator: string; registered: boolean } | null>(null)
  useEffect(() => {
    let alive = true
    void api.quickShortcutState().then((s) => alive && setState(s), () => undefined)
    return () => {
      alive = false
    }
  }, [prefs.quickShortcut])
  const n = prefs.notify
  const s = prefs.sounds
  return (
    <>
      <Panel title="Szybki wpis">
        <div className="flex flex-col gap-2 text-[12px]">
          <Field label="Skrót globalny" labelWidth={200} hint="Działa w całym systemie. Zmień, jeśli koliduje z platformą tradingową (kliknij i naciśnij nowy skrót; Backspace – bez skrótu).">
            <div className="flex items-center gap-2">
              <ShortcutField
                value={prefs.quickShortcut}
                onChange={(quickShortcut) => void setMachinePrefs({ quickShortcut }).then(() => api.quickShortcutState().then(setState, () => undefined))}
                data-testid="settings-shortcut"
              />
              {state && state.accelerator === prefs.quickShortcut && prefs.quickShortcut && (
                <span className={state.registered ? 'text-[11.5px] text-muted' : 'text-[11.5px] text-accent'} data-testid="settings-shortcut-state">
                  {state.registered ? 'działa' : `zajęty przez inny program – wybierz inny niż ${shortcutLabel(prefs.quickShortcut)}`}
                </span>
              )}
              <button className="btn h-[24px]" onClick={() => void api.quickOpen()}>
                Otwórz szybki wpis
              </button>
            </div>
          </Field>
          <Toggle checked={prefs.hideAmounts} onChange={(hideAmounts) => void setMachinePrefs({ hideAmounts })} label="Ukryj kwoty w oknie i w dymku zasobnika (Ctrl+$)" data-testid="settings-hide-amounts" />
        </div>
      </Panel>
      <Panel title="Powiadomienia">
        <div className="flex flex-col gap-1.5 text-[12px]">
          <p className="text-[11.5px] text-muted">Tylko na tym komputerze; działają w tle, gdy aplikacja jest w zasobniku. Nic w ciszy nocnej.</p>
          {NOTIFY_ROWS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-3">
              <Toggle checked={n[key] as boolean} onChange={(on) => void setMachinePrefs({ notify: { ...n, [key]: on } })} label={label} data-testid={`notify-${key}`} />
              {key === 'evening' && (
                <TimeField className="w-[70px]" value={n.eveningTime} onChange={(eveningTime) => eveningTime && void setMachinePrefs({ notify: { ...n, eveningTime } })} aria-label="Godzina wieczornego dopisania" data-testid="notify-evening-time" />
              )}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Dźwięki">
        <div className="flex flex-col gap-1.5 text-[12px]">
          <Toggle checked={s.enabled} onChange={(enabled) => void setMachinePrefs({ sounds: { ...s, enabled } })} label="Dźwięki zdarzeń (syntezowane w aplikacji)" data-testid="sounds-enabled" />
          <Field label="Głośność" labelWidth={120}>
            <VolumeSlider />
          </Field>
          {SOUND_KINDS.map((k) => (
            <div key={k} className="flex items-center gap-2">
              <Toggle checked={s.events[k]} onChange={(on) => void setMachinePrefs({ sounds: { ...s, events: { ...s.events, [k]: on } } })} label={SOUND_LABEL[k]} />
              <button className="btn btn-ghost h-[22px] px-1.5 text-[11px]" onClick={() => playSound(k, true)} title="Odsłuchaj">
                ▶
              </button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
