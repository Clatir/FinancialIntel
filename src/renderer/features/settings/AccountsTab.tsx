import { useMemo, useState } from 'react'
import { lastConfirmation, openingOf } from '@shared/calc/balances'
import { warsawNow } from '@shared/calc/dates'
import { newId } from '@shared/ids'
import { ACCOUNT_KINDS, type Account, type AccountKind, type Balance } from '@shared/schema'
import { updateSettings, useData } from '../../store/data'
import { useFleet } from '../../store/fleet'
import { AmountField, DateField, plnText } from '../../components/fields'
import { IconPlus } from '../../components/icons'
import { NameInput, Panel, Toggle, cx } from '../../components/ui'
import { confirmBalance, setOpening } from '../balances/actions'
import { toast } from '../../store/ui'
import { useAccounts } from '../operations/pickers'

const KIND_LABEL: Record<AccountKind, string> = { bank: 'konto bankowe', wallet: 'portfel z kartą', cash: 'gotówka', other: 'inne' }

const NO_BALANCES: Record<string, { record: Balance }> = {}

function patchAccount(id: string, p: Partial<Account>): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, accounts: f.settings.accounts.map((a) => (a.id === id ? { ...a, ...p } : a)) } }))
}

/** Ustawienia → Konta (D9, D68): the budget's accounts, their opening balances and the confirmation of a balance. */
export function AccountsTab() {
  const accounts = useAccounts()
  const balancesMap = useData((s) => s.records.balances ?? NO_BALANCES)
  const balances = useMemo(() => Object.values(balancesMap).map((e) => e.record), [balancesMap])
  const fleet = useFleet()
  const names = new Set(accounts.map((a) => a.name.toLowerCase()))
  return (
    <>
      <Panel
        title="Konta budżetu"
        actions={
          <button
            className="btn h-[22px]"
            onClick={() => {
              let name = 'Nowe konto'
              for (let i = 2; names.has(name.toLowerCase()); i++) name = `Nowe konto ${i}`
              updateSettings((f) => ({ ...f, settings: { ...f.settings, accounts: [...f.settings.accounts, { id: newId(), name, kind: 'other', importFormat: null, archived: false }] } }))
            }}
            data-testid="account-add"
          >
            <IconPlus size={12} /> Konto
          </button>
        }
      >
        <p className="mb-2 text-[11.5px] text-muted">
          Pieniądze tych kont tworzą warstwy okrętu. Konto tradingowe XTB nie należy do budżetu (prowadzi je ICT Trade Journal); Portfel XTB z kartą – tak.
          Gotówka: pieniądze oddane gotówką (np. przez domowników) wpisz jako wpływ na konto „Gotówka”, a wydatki z nich – szybkim wpisem z tym kontem.
          Wypłata z bankomatu to nadal wydatek „Gotówka” (albo przelew własny na konto „Gotówka”, jeśli wolisz wpisywać każdy wydatek z portfela).
        </p>
        <div className="flex flex-col">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} opening={openingOf(a.id, balances)} confirmed={lastConfirmation(a.id, balances)} balance={fleet?.accounts.find((x) => x.id === a.id)?.balance ?? 0} taken={names} />
          ))}
        </div>
      </Panel>
    </>
  )
}

function AccountRow({ account: a, opening, confirmed, balance, taken }: { account: Account; opening: Balance | null; confirmed: Balance | null; balance: number; taken: Set<string> }) {
  const [bank, setBank] = useState<number | null>(null)
  const today = warsawNow().date
  return (
    <div className={cx('flex flex-col gap-1.5 border-b border-line/70 py-2 last:border-b-0', a.archived && 'opacity-60')} data-testid="account-row" data-name={a.name}>
      <div className="flex flex-wrap items-center gap-2">
        <NameInput
          className="w-[180px]"
          value={a.name}
          maxLength={40}
          emptyMessage="Konto musi mieć nazwę."
          validate={(name) => (name.toLowerCase() !== a.name.toLowerCase() && taken.has(name.toLowerCase()) ? 'Takie konto już jest.' : null)}
          onChange={(name) => patchAccount(a.id, { name })}
          aria-label="Nazwa konta"
          data-testid="account-name"
        />
        <select className="input w-[140px]" value={a.kind} onChange={(e) => patchAccount(a.id, { kind: e.currentTarget.value as AccountKind })} aria-label="Rodzaj konta">
          {ACCOUNT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
          {!(ACCOUNT_KINDS as readonly string[]).includes(a.kind) && <option value={a.kind}>{a.kind} (nowsza wersja)</option>}
        </select>
        <label className="flex items-center gap-1.5 text-[11.5px] text-muted" title="Import historii z pliku CSV mBanku (ekran Import)">
          <input type="checkbox" checked={a.importFormat === 'mbank'} onChange={(e) => patchAccount(a.id, { importFormat: e.currentTarget.checked ? 'mbank' : null })} />
          import CSV z mBanku
        </label>
        <span className="flex-1" />
        <span className="text-[11.5px] text-muted">
          saldo teraz{' '}
          <span className={cx('num text-[13px]', balance < 0 ? 'text-down' : 'text-fg-strong')} data-testid="account-balance">
            {plnText(balance)} zł
          </span>
        </span>
        <Toggle checked={a.archived} onChange={(archived) => patchAccount(a.id, { archived })} label={<span className="text-[11.5px] text-muted">archiwum</span>} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
        <span>Saldo otwarcia</span>
        <AmountField
          className="w-[120px]"
          value={opening?.amount ?? null}
          allowNegative
          allowEmpty
          placeholder="—"
          onChange={(v) => v != null && setOpening(a.id, v, opening?.date ?? today)}
          aria-label="Saldo otwarcia"
          data-testid="account-opening"
        />
        <span>zł na początek dnia</span>
        <DateField
          className="w-[100px]"
          value={opening?.date ?? today}
          onChange={(date) => {
            if (date > today) return toast('Saldo otwarcia nie może być z przyszłości.', 'error')
            setOpening(a.id, opening?.amount ?? 0, date)
          }}
          aria-label="Data salda otwarcia"
          data-testid="account-opening-date"
        />
        <span className="text-dim">– operacje od tego dnia są doliczane</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
        <span>Saldo w banku teraz</span>
        <AmountField className="w-[120px]" value={bank} allowNegative allowEmpty placeholder="z banku" onChange={setBank} aria-label="Saldo w banku" data-testid="account-confirm-amount" />
        <button
          type="button"
          className="btn h-[22px]"
          disabled={bank == null}
          onClick={() => {
            if (bank == null) return
            confirmBalance(a.id, bank, today, a.name)
            setBank(null)
          }}
          data-testid="account-confirm"
          title={opening ? 'Porównaj z operacjami: różnica = korekta do wyjaśnienia' : 'Brak salda otwarcia: zostanie wyliczone z tego salda i operacji'}
        >
          {opening ? 'Potwierdź saldo' : 'Ustaw z salda w banku'}
        </button>
        {confirmed && (
          <span className="text-dim">
            ostatnio potwierdzone {confirmed.date} ({plnText(confirmed.amount)} zł)
          </span>
        )}
      </div>
    </div>
  )
}
