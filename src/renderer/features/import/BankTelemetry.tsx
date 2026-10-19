/**
 * „Telemetria z banku” (1.5.1, F5): the balances of an imported account history against the budget – the same at the
 * end of the file = the balance confirmed by itself; another = where the difference comes from, the earliest day first,
 * and the confirmation with a correction as the last resort.
 */
import { useMemo, type ReactNode } from 'react'
import { planConfirmation } from '@shared/calc/balances'
import { statementCheck, type Statement } from '@shared/import/statement'
import { listOf, useData } from '../../store/data'
import { plnText, signedPln } from '../../components/fields'
import { Panel } from '../../components/ui'
import { plDate } from '../../lib/format'
import { confirmBalance } from '../balances/actions'
import { openOperation } from '../operations/state'
import { useAccounts } from '../operations/pickers'

const SHOWN = 8

function Group({ title, children, count, testId }: { title: string; children: ReactNode; count: number; testId: string }) {
  return (
    <div className="flex flex-col gap-0.5" data-testid={testId}>
      <span className="text-muted">
        {title} <span className="num text-dim">({count})</span>
      </span>
      <div className="flex flex-col pl-2">{children}</div>
      {count > SHOWN && <span className="pl-2 text-[11px] text-dim">i {count - SHOWN} więcej</span>}
    </div>
  )
}

export function BankTelemetry({ statement, confirmed }: { statement: Statement; confirmed: string | null }) {
  const transactions = useData((s) => s.records.transactions)
  const balances = useData((s) => s.records.balances)
  const readOnly = useData((s) => !!s.status?.readOnly)
  const accounts = useAccounts()
  const name = accounts.find((a) => a.id === statement.accountId)?.name ?? 'konto'
  const check = useMemo(() => statementCheck(statement, { transactions: listOf(transactions), balances: listOf(balances), tx: (id) => transactions[id]?.record }), [statement, transactions, balances])
  const plan = useMemo(() => planConfirmation(statement.accountId, check.bank.balance, check.bank.date, listOf(transactions), listOf(balances)), [statement, check, transactions, balances])
  const confirmedNow = listOf(balances).some((b) => b.kind === 'confirmation' && b.accountId === statement.accountId && b.date === check.bank.date && b.amount === check.bank.balance)
  const confirm = () => confirmBalance(statement.accountId, check.bank.balance, check.bank.date, name)
  const day = (d: string) => plDate(d)
  return (
    <Panel title="Telemetria z banku">
      <div className="flex flex-col gap-1.5 text-[12px]" data-testid="bank-telemetry" data-diff={check.diff}>
        <span>
          {name}: saldo w banku na koniec {day(check.bank.date)} – <b className="num">{plnText(check.bank.balance)} zł</b>, w FI – <b className="num">{plnText(check.fi)} zł</b>.
        </span>
        {check.diff === 0 ? (
          <span className="text-up" data-testid="bank-telemetry-match">
            Kadłub zgodny z odczytem banku.
            {confirmed === check.bank.date || confirmedNow ? ' Saldo potwierdzone.' : ''}
          </span>
        ) : (
          <>
            <span className="text-accent" data-testid="bank-telemetry-diff">
              Różnica {signedPln(check.diff)} zł (FI − bank) – {check.firstDay === '' ? `już przed ${day(check.from)}` : check.firstDay ? `od ${day(check.firstDay)}` : 'skąd – niżej'}.
            </span>
            {check.before !== 0 && (
              <span data-testid="bank-telemetry-before">
                Przed {day(check.from)}: {signedPln(check.before)} zł – saldo otwarcia albo operacje sprzed pliku.
              </span>
            )}
            {check.missing.length > 0 && (
              <Group title="W banku, a nie w FI (pominięte, usunięte, na innym koncie)" count={check.missing.length} testId="bank-telemetry-missing">
                {check.missing.slice(0, SHOWN).map((m) => (
                  <span key={m.key} className="flex gap-2">
                    <span className="num w-[78px] text-dim">{day(m.date)}</span>
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="num">{signedPln(m.amount)}</span>
                  </span>
                ))}
              </Group>
            )}
            {check.extra.length > 0 && (
              <Group title="W FI, a nie w banku (wpisane ręcznie, podwójne, jeszcze niezaksięgowane, korekty)" count={check.extra.length} testId="bank-telemetry-extra">
                {check.extra.slice(0, SHOWN).map((e) => (
                  <button key={e.id} type="button" className="flex gap-2 text-left hover:bg-hover" onClick={() => openOperation(e)} title="Otwórz w Operacjach" data-testid="bank-telemetry-extra-row">
                    <span className="num w-[78px] text-dim">{day(e.date)}</span>
                    <span className="min-w-0 flex-1 truncate">{e.name || '(bez nazwy)'}</span>
                    <span className="num">{signedPln(e.amount)}</span>
                  </button>
                ))}
              </Group>
            )}
            {check.amounts.length > 0 && (
              <Group title="Inna kwota w FI niż w banku" count={check.amounts.length} testId="bank-telemetry-amounts">
                {check.amounts.slice(0, SHOWN).map((a) => (
                  <button key={a.id} type="button" className="flex gap-2 text-left hover:bg-hover" onClick={() => openOperation(a)} title="Otwórz w Operacjach">
                    <span className="num w-[78px] text-dim">{day(a.date)}</span>
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="num">
                      FI {signedPln(a.fi)} · bank {signedPln(a.bank)}
                    </span>
                  </button>
                ))}
              </Group>
            )}
            {check.gaps.length > 0 && (
              <Group title="Luki w saldach pliku (lista przefiltrowana albo niepełna)" count={check.gaps.length} testId="bank-telemetry-gaps">
                {check.gaps.slice(0, SHOWN).map((g) => (
                  <span key={`${g.from}-${g.to}-${g.amount}`} className="flex gap-2">
                    <span className="num w-[160px] text-dim">{g.from === g.to ? day(g.from) : `${day(g.from)} – ${day(g.to)}`}</span>
                    <span className="num">{signedPln(g.amount)}</span>
                  </span>
                ))}
              </Group>
            )}
            {check.other !== 0 && <span className="text-muted">Inne różnice (np. operacja z inną datą): {signedPln(check.other)} zł.</span>}
          </>
        )}
        {!(check.diff === 0 && (confirmed === check.bank.date || confirmedNow)) && (
          <div className="flex flex-wrap items-center gap-2">
            {plan.kind === 'before-opening' ? (
              <span className="text-[11px] text-dim">Saldo otwarcia konta jest z {day(plan.opening)} – później niż koniec pliku; potwierdzenie z pliku nie ma czego porównać.</span>
            ) : (
              <button type="button" className="btn h-[24px]" disabled={readOnly} onClick={confirm} data-testid="bank-telemetry-confirm">
                {plan.kind === 'opening' ? 'Ustaw saldo otwarcia z pliku' : plan.kind === 'match' ? 'Potwierdź saldo' : `Potwierdź z korektą ${signedPln(plan.diff)} zł`}
              </button>
            )}
            {plan.kind === 'correction' && <span className="text-[11px] text-dim">Korekta to ostatnia opcja – najpierw sprawdź operacje wyżej.</span>}
          </div>
        )}
      </div>
    </Panel>
  )
}
