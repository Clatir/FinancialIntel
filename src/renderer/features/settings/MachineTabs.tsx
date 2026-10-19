import { useEffect, useState } from 'react'
import { HIDE_IDLE_CHOICES, SOUND_KINDS, SOUND_LABEL, ZOOM_MAX, ZOOM_MIN, shortcutLabel, type NotifyPrefs } from '@shared/machine'
import { eveningAt } from '@shared/notify'
import type { Orders } from '@shared/schema'
import { api } from '../../lib/api'
import { playSound } from '../../lib/sounds'
import { updateSettings, useData, useFolderLocked } from '../../store/data'
import { setMachinePrefs, useMachine } from '../../store/machine'
import { AmountField, TimeField } from '../../components/fields'
import { ShortcutField } from '../../components/ShortcutField'
import { Field, NumberField, Panel, Toggle } from '../../components/ui'
import { toast } from '../../store/ui'

/** Ustawienia → Warstwy i rozkazy (fi.json – the same on every computer): the layers' targets and the orders. */
export function LayersTab() {
  const fi = useData((s) => s.fi)
  const readOnly = useFolderLocked()
  if (!fi) return null
  const { layers, orders } = fi.settings
  const setLayers = (p: Partial<typeof layers>) => updateSettings((f) => ({ ...f, settings: { ...f.settings, layers: { ...f.settings.layers, ...p } } }))
  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-3">
      <Panel title="Warstwy okrętu">
        <div className="flex flex-col gap-2 text-[12px]">
          <Field label="Osłony – cel" labelWidth={200} hint="Bufor na pensje: tyle pensji.">
            <NumberField
              className="w-[80px]"
              value={layers.shieldSalaries}
              decimals={0}
              step={1}
              commitOnBlur
              isValid={(v) => v != null && v >= 1 && v <= 24 && v >= orders.minShieldSalaries}
              onChange={(v) => v != null && setLayers({ shieldSalaries: v })}
              onReject={(v) => toast(v != null && v >= 1 && v < orders.minShieldSalaries ? `Cel osłon nie może być mniejszy niż minimalne osłony (${orders.minShieldSalaries} pensji) – najpierw zmniejsz minimum.` : 'Cel osłon to od 1 do 24 pensji – zostaje poprzedni.', 'error', 6000)}
              aria-label="Osłony w pensjach"
              data-testid="layers-shields"
            />
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
        <OrdersFields labelWidth={200} />
      </Panel>
    </fieldset>
  )
}

/**
 * The orders' fields (fi.json): in Ustawienia → Warstwy i rozkazy and in Dowództwo (spec: „do zmiany w Dowództwie” – N73).
 * Disabled by the fieldset around them in a folder only to read.
 */
export function OrdersFields({ labelWidth }: { labelWidth: number }) {
  const settings = useData((s) => s.fi?.settings ?? null)
  if (!settings) return null
  const { layers, orders } = settings
  const setOrders = (p: Partial<Orders>) => updateSettings((f) => ({ ...f, settings: { ...f.settings, orders: { ...f.settings.orders, ...p } } }))
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <Field
        label="Minimalne osłony (pensje)"
        labelWidth={labelWidth}
        hint={orders.minShieldSalaries > layers.shieldSalaries - 1 ? 'Minimum blisko celu osłon – po każdej pensji osłony mogą spaść poniżej minimum (alarm, Bearish).' : undefined}
      >
        <NumberField
          className="w-[80px]"
          value={orders.minShieldSalaries}
          decimals={1}
          step={0.5}
          commitOnBlur
          isValid={(v) => v != null && v >= 0 && v <= 24 && v <= layers.shieldSalaries}
          onChange={(v) => v != null && setOrders({ minShieldSalaries: v })}
          onReject={(v) => toast(v != null && v > layers.shieldSalaries ? `Minimalne osłony nie mogą przekraczać celu osłon (${layers.shieldSalaries} pensji) – zostaje poprzednie.` : 'Minimalne osłony to od 0 do 24 pensji – zostaje poprzednie.', 'error', 6000)}
          aria-label="Minimalne osłony"
          data-testid="orders-min-shields"
        />
      </Field>
      <Field label="Linia zanurzenia (% pensji)" labelWidth={labelWidth}>
        <NumberField className="w-[80px]" value={orders.cargoLimitPct} decimals={0} step={5} commitOnBlur isValid={(v) => v != null && v >= 1 && v <= 100} onChange={(v) => v != null && setOrders({ cargoLimitPct: v })} aria-label="Linia zanurzenia" data-testid="orders-cargo" />
      </Field>
      <Field label="Cisza nocna" labelWidth={labelWidth} hint="Zakup z godziną w tym oknie wymaga potwierdzenia i krótkiego wpisu (D40).">
        <div className="flex items-center gap-2">
          <TimeField className="w-[70px]" value={orders.quietHours.from} onChange={(from) => from && setOrders({ quietHours: { ...orders.quietHours, from } })} aria-label="Cisza od" />
          –
          <TimeField className="w-[70px]" value={orders.quietHours.to} onChange={(to) => to && setOrders({ quietHours: { ...orders.quietHours, to } })} aria-label="Cisza do" />
        </div>
      </Field>
      <Field label="Dziennik kapitański od kwoty" labelWidth={labelWidth} hint="„Plan czy impuls?” od tej kwoty (D41); 0 albo puste – dziennik nie pyta.">
        <AmountField className="w-[120px]" value={orders.impulseThreshold} onChange={(v) => setOrders({ impulseThreshold: v ?? 0 })} aria-label="Próg dziennika" />
      </Field>
      <Toggle checked={orders.firewall} onChange={(firewall) => setOrders({ firewall })} label="Firewall: dopłata do XTB tylko z „wolnego do decyzji”, gdy osłony i kadłub są pełne (D23)" />
    </div>
  )
}

/**
 * Ustawienia → Wygląd i prywatność (F30, F40): the size of the windows and the higher contrast, the hidden amounts by
 * hand, after idleness and at the start – all of this computer (config.json), never of the folder.
 */
export function ViewTab() {
  const prefs = useMachine((s) => s.prefs)
  return (
    <>
      <Panel title="Rozmiar i kontrast">
        <div className="flex flex-col gap-2 text-[12px]">
          <Field label="Rozmiar interfejsu" labelWidth={160} hint="Wszystkie okna aplikacji na tym komputerze – także szybki wpis i panele odłączone. Ctrl+Plus / Ctrl+Minus zmienia rozmiar, Ctrl+Shift+0 wraca do 100 %.">
            <ZoomSlider />
          </Field>
          <Toggle
            checked={prefs.highContrast}
            onChange={(highContrast) => void setMachinePrefs({ highContrast })}
            label="Wyższy kontrast – jaśniejsze przygaszone napisy, najmniejsze napisy 12 px"
            data-testid="settings-contrast"
          />
        </div>
      </Panel>
      <Panel title="Prywatność kwot">
        <div className="flex flex-col gap-2 text-[12px]">
          <Toggle checked={prefs.hideAmounts} onChange={(hideAmounts) => void setMachinePrefs({ hideAmounts })} label="Ukryj kwoty w oknach i w dymku zasobnika (Ctrl+$)" data-testid="settings-hide-amounts" />
          <Field label="Ukryj po bezczynności" labelWidth={160} hint="Bez ruchu myszy i klawiatury w systemie przez tyle minut albo po zablokowaniu ekranu kwoty chowają się same.">
            <select className="input h-[24px] w-[160px]" value={prefs.hideIdleMin} onChange={(e) => void setMachinePrefs({ hideIdleMin: Number(e.currentTarget.value) })} data-testid="settings-hide-idle">
              {/* A time set elsewhere (a hand-edited file, a later version) shown as it is, not as „nigdy”. */}
              {[...new Set<number>([...HIDE_IDLE_CHOICES, prefs.hideIdleMin])]
                .sort((a, b) => a - b)
                .map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? 'nigdy' : `po ${m} min`}
                  </option>
                ))}
            </select>
          </Field>
          <Toggle checked={prefs.hideOnStart} onChange={(hideOnStart) => void setMachinePrefs({ hideOnStart })} label="Startuj z ukrytymi kwotami (także przy starcie z Windows)" data-testid="settings-hide-start" />
          <p className="text-[11.5px] text-muted">
            To nie blokada: Ctrl+$ albo „Pokaż na 5 min” / „do końca sesji” na pasku u góry odsłania kwoty. Ukryte kwoty są też zamaskowane w dymku
            zasobnika, w powiadomieniach i w szybkim wpisie.
          </p>
        </div>
      </Panel>
    </>
  )
}

/** 90–150 % (F30): set on release – the window changes its size under the pointer. */
function ZoomSlider() {
  const zoom = useMachine((s) => Math.round(s.prefs.zoom * 100))
  const [draft, setDraft] = useState<number | null>(null)
  const commit = () => {
    if (draft == null) return
    setDraft(null)
    if (draft !== zoom) void setMachinePrefs({ zoom: draft / 100 })
  }
  const shown = draft ?? zoom
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={Math.round(ZOOM_MIN * 100)}
        max={Math.round(ZOOM_MAX * 100)}
        step={10}
        value={shown}
        onChange={(e) => setDraft(Number(e.currentTarget.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label="Rozmiar interfejsu"
        data-testid="settings-zoom"
      />
      <span className="num w-[44px] text-muted" data-testid="settings-zoom-value">
        {shown}%
      </span>
      <button className="btn h-[24px]" disabled={zoom === 100 && draft == null} onClick={() => void setMachinePrefs({ zoom: 1 })} data-testid="settings-zoom-reset">
        100 %
      </button>
    </div>
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
  ['cargo', 'Kontener niezaładowany – opłata stała 3 dni po terminie bez płatności'],
  ['importOverdue', 'Zaległy import z mBanku – po 3 dniach'],
  ['balances', 'Potwierdzenie sald – w niedzielę'],
  ['debriefing', 'Debriefing – 1. dnia miesiąca'],
  ['ictj', 'Nowa wypłata w ICTTJ do zadokowania'],
  ['loans', 'Rata pożyczki 3 dni po terminie (własna albo spłata od dłużnika)'],
  ['pit38', 'PIT-38 – 14 i 3 dni przed 30 kwietnia'],
  ['house', 'Domownik nie oddał za zakupy – po 30 dniach od najstarszego'],
  ['plans', 'Boje i terminy (dni przed, ustawione w boi), boja po terminie, koniec kontenera – 14 dni przed'],
  ['accounts', 'Za mało na koncie przed płatnością (salda kont za 90 dni)'],
  ['cargoWatch', 'Ładownia: kontener w nowej cenie, kontener bez płatności, nowa opłata w historii'],
  ['anomalies', 'Nieznany sygnał: nietypowa kwota, nowy kontrahent, możliwe podwójne obciążenie'],
  ['returns', 'Zwrot pieniędzy, który nie dotarł w terminie'],
  ['watch', 'Raport wachty – w niedzielę od 18:00']
]

/** Ustawienia → Powiadomienia i dźwięki (config.json – this computer only): the quick entry's shortcut too. */
export function NotifyTab() {
  const prefs = useMachine((s) => s.prefs)
  const [state, setState] = useState<{ accelerator: string; registered: boolean; replaced: string | null } | null>(null)
  useEffect(() => {
    let alive = true
    void api.quickShortcutState().then((s) => alive && setState(s), () => undefined)
    return () => {
      alive = false
    }
  }, [prefs.quickShortcut])
  const n = prefs.notify
  const s = prefs.sounds
  const quiet = useData((st) => st.fi?.settings.orders.quietHours)
  // The evening reminder's hour in the quiet hours (N104): it comes before them – said where it is set.
  const eveningShift = quiet && eveningAt(n.eveningTime, quiet) !== n.eveningTime ? eveningAt(n.eveningTime, quiet) : null
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
              {key === 'evening' && eveningShift && quiet && (
                <span className="text-[11px] text-accent" data-testid="notify-evening-quiet">
                  w ciszy nocnej ({quiet.from}–{quiet.to}) – przyjdzie o {eveningShift}
                </span>
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
