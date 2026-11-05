/**
 * The cash account in the import (D100 (1), AP-33, T422): the cash is kept on the account „Gotówka” – an ATM withdrawal
 * is an own transfer onto it, the purchases paid with the cash are expenses from it. A file with ATM withdrawals and no
 * cash account: the account is offered (made, brought back from the archive, or an account named „Gotówka” made the cash)
 * – never made silently; „Cofnij” takes it back while no operation is on it.
 */
import { newId } from '@shared/ids'
import { isAtmOperation } from '@shared/import/classify'
import { cashAccountOffer, type Account } from '@shared/schema'
import { canWrite, updateSettings, useData, useFolderLocked } from '../../store/data'
import { toast } from '../../store/ui'
import { countLabel } from '../../lib/format'
import { useImport } from './state'

/** The ATM withdrawals of the open file the import brings in (its new rows). */
function useAtmRows(): number {
  return useImport((s) => (s.plan ? s.plan.rows.filter((p) => p.status === 'new' && isAtmOperation(p.row.operation)).length : 0))
}

/** Make the cash account as offered now; „Cofnij” – the accounts as they were, while no operation is on it. */
export function addCashAccount(): boolean {
  const before = useData.getState().fi?.settings.accounts
  if (!before || !canWrite()) return false
  const offer = cashAccountOffer(before, newId)
  if (!offer) return false
  const { account } = offer
  const ok = updateSettings((f) => ({
    ...f,
    settings: {
      ...f.settings,
      accounts: offer.kind === 'create' ? [...f.settings.accounts, account] : f.settings.accounts.map((a) => (a.id === account.id ? { ...a, kind: account.kind, archived: false } : a))
    }
  }))
  if (!ok) return false
  const prev: Account | undefined = before.find((a) => a.id === account.id)
  toast(`Konto „${account.name}” ${offer.kind === 'create' ? 'założone' : 'gotowe'} – wypłaty z bankomatu to przelewy własne na nie (bez kosztu).`, 'success', 8000, {
    label: 'Cofnij',
    run: () => {
      const used = Object.values(useData.getState().records.transactions).some((e) => e.record.accountId === account.id || e.record.counterAccountId === account.id)
      if (used) return toast(`Konto „${account.name}” ma już operacje – zostaje (archiwum w Ustawieniach → Konta).`, 'info', 6000)
      updateSettings((f) => ({
        ...f,
        settings: {
          ...f.settings,
          accounts: prev ? f.settings.accounts.map((a) => (a.id === prev.id ? { ...a, kind: prev.kind, archived: prev.archived } : a)) : f.settings.accounts.filter((a) => a.id !== account.id)
        }
      }))
    }
  })
  return true
}

/** The offer at the open file: its ATM withdrawals while the budget has no cash account. */
export function CashOffer({ accountName }: { accountName: string }) {
  const atm = useAtmRows()
  const accounts = useData((s) => s.fi?.settings.accounts)
  const readOnly = useFolderLocked()
  const busy = useImport((s) => s.busy)
  if (!atm || !accounts) return null
  const offer = cashAccountOffer(accounts, () => '')
  if (!offer) return null
  const label = offer.kind === 'create' ? 'Załóż konto Gotówka' : offer.kind === 'restore' ? `Przywróć konto „${offer.account.name}”` : `Ustaw „${offer.account.name}” jako konto gotówki`
  return (
    <div className="flex flex-wrap items-center gap-2 border border-accent/50 px-2 py-1.5 text-[11.5px]" data-testid="import-cash-offer" data-state={offer.kind}>
      <span className="min-w-0 flex-1 text-muted">
        {countLabel(atm, 'wypłata', 'wypłaty', 'wypłat')} z bankomatu w pliku. Bez konta gotówki to wydatki „Gotówka”. Z kontem „Gotówka” wypłata jest przelewem własnym {accountName} → Gotówka
        (bez kosztu), a zakupy gotówką dopisujesz z tego konta.
      </span>
      <button className="btn h-[22px]" disabled={readOnly || busy} onClick={() => addCashAccount()} data-testid="import-cash-add">
        {label}
      </button>
    </div>
  )
}
