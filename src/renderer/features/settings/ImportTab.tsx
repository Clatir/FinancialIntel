import { useState } from 'react'
import type { BrandAlias } from '@shared/schema'
import { useData } from '../../store/data'
import { toast } from '../../store/ui'
import { countLabel } from '../../lib/format'
import { IconPlus } from '../../components/icons'
import { Panel, TextField, Toggle } from '../../components/ui'
import { setMachinePrefs, useMachine } from '../../store/machine'
import { KeywordRules } from '../import/KeywordRules'
import { RecentImports } from '../import/RecentImports'
import { MixedBrandsPanel, RulesPanel, useRuleAudit } from '../import/RulesAudit'
import { clearDismissedSimilar, clearNotDuplicates, inactiveAlias, isDuplicatePairKey, removeInactive, setOwnNames, unmergeAll, unmergeName } from '../import/rules'

const NO_NAMES: string[] = []
const NO_ALIASES: Record<string, BrandAlias> = {}
const NO_DISMISSED: Record<string, string> = {}

/** Names merged in the import (1.2.2, D78): one group and one rule; „rozłącz” = two again. */
function MergedNames() {
  const aliases = useData((s) => s.fi?.settings.import.aliases ?? NO_ALIASES)
  const dismissed = useData((s) => Object.keys(s.fi?.settings.import.notSimilar ?? NO_DISMISSED).length)
  const notDuplicates = useData((s) => Object.keys(s.fi?.settings.import.notDuplicates ?? NO_DISMISSED).filter(isDuplicatePairKey).length)
  const list = Object.entries(aliases).sort((a, b) => b[1].at.localeCompare(a[1].at) || a[0].localeCompare(b[0]))
  const inactive = list.filter(([, a]) => inactiveAlias(a)).length
  return (
    <Panel
      title="Połączone nazwy"
      actions={
        <div className="flex gap-1.5">
          {inactive > 0 && (
            <button
              type="button"
              className="btn h-[22px]"
              title="Połączenia z 1.2.2 zrobione na nazwach z datą transakcji – nic już nie łączą"
              onClick={() => {
                const undo = removeInactive()
                if (undo) toast(`Usunięto ${countLabel(inactive, 'nieaktywne połączenie', 'nieaktywne połączenia', 'nieaktywnych połączeń')}.`, 'success', 6000, { label: 'Cofnij', run: undo })
              }}
              data-testid="aliases-remove-inactive"
            >
              Usuń nieaktywne ({inactive})
            </button>
          )}
          {list.length > 1 && (
            <button
              type="button"
              className="btn h-[22px]"
              onClick={() => {
                const undo = unmergeAll()
                if (undo) toast(`Rozłączono ${countLabel(list.length, 'nazwę', 'nazwy', 'nazw')} – każda wraca do własnej grupy.`, 'success', 6000, { label: 'Cofnij', run: undo })
              }}
              data-testid="aliases-unmerge-all"
            >
              Rozłącz wszystkie
            </button>
          )}
        </div>
      }
    >
      <p className="mb-2 text-[11.5px] text-muted">
        Nazwy, które przy imporcie połączyłeś jako jedną firmę albo osobę („Podobne nazwy”, „Połącz nazwy”): jedna grupa i jedna reguła. Rozłączona nazwa
        wraca do własnej grupy (i do reguły, którą miała wcześniej).
      </p>
      {list.length === 0 && <span className="text-[11.5px] text-dim">Brak połączonych nazw.</span>}
      <div className="flex flex-col" data-testid="aliases">
        {list.map(([key, a]) => (
          <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-line/60 py-[3px] text-[12px] last:border-b-0" data-testid="alias">
            <span className="truncate" title={`klucz: ${key} → ${a.to}`}>
              <span className="text-fg-strong">{a.label || key}</span>
              <span className="text-muted"> = {a.toLabel || a.to}</span>
              {inactiveAlias(a) && <span className="text-dim"> · nieaktywne (nazwa z datą transakcji, 1.2.2)</span>}
            </span>
            <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" onClick={() => unmergeName(key)} data-testid="alias-unmerge">
              rozłącz
            </button>
          </div>
        ))}
      </div>
      {dismissed > 0 && (
        <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-dim">
          Pary oznaczone „To nie to samo”: {dismissed}
          <button type="button" className="text-muted hover:text-fg-strong hover:underline" onClick={clearDismissedSimilar} data-testid="similar-undismiss">
            pokazuj znowu
          </button>
        </div>
      )}
      {/* The duplicates panel's „to nie duplikat” (N74): taken back here, as the similar names' pairs. */}
      {notDuplicates > 0 && (
        <div className="mt-1 flex items-center gap-2 text-[11.5px] text-dim">
          Pary oznaczone „to nie duplikat”: {notDuplicates}
          <button type="button" className="text-muted hover:text-fg-strong hover:underline" onClick={clearNotDuplicates} data-testid="duplicates-undismiss">
            pokazuj znowu
          </button>
        </div>
      )}
    </Panel>
  )
}

/**
 * Ustawienia → Import (E2): the rules the import learned from the user's decisions (a wrong one is deleted here, the
 * next decision in the import or in Operacje writes it again), the user's keywords (1.2.1), the names merged (1.2.2)
 * and the account holder's names (own transfers).
 */
/** New files of mBank looked for in Pobrane (F14) – a setting of this computer. */
function BankFilesWatch() {
  const on = useMachine((s) => s.prefs.bankFiles)
  return (
    <Panel title="Pliki z mBanku w Pobranych">
      <div className="flex flex-col gap-1.5 text-[12px]">
        <Toggle checked={on} onChange={(bankFiles) => void setMachinePrefs({ bankFiles })} label="Szukaj nowych plików z mBanku w folderze Pobrane (na tym komputerze)" data-testid="settings-bank-files" />
        <p className="text-[11.5px] text-dim">
          Także w folderze, z którego ostatnio wybrano plik importu. Nowy plik CSV z mBanku daje powiadomienie i przycisk „Importuj” na ekranie Import; po imporcie FI proponuje
          przeniesienie pliku do Kosza (zawiera numer konta i operacje). Pliki są tylko czytane, nic nie wychodzi z komputera.
        </p>
      </div>
    </Panel>
  )
}

export function ImportTab() {
  const names = useData((s) => s.fi?.settings.import.ownNames ?? NO_NAMES)
  const [name, setName] = useState('')
  // The rules' audit (F22): counted once for both panels.
  const { audit, progress } = useRuleAudit()
  return (
    <>
      <BankFilesWatch />
      <RulesPanel audit={audit} progress={progress} />
      <MixedBrandsPanel audit={audit} />
      <Panel title="Słowa kluczowe">
        <KeywordRules />
      </Panel>
      <RecentImports />
      <MergedNames />
      <Panel title="Twoje nazwiska w banku">
        <p className="mb-2 text-[11.5px] text-muted">
          Przelew z albo na rachunek o takiej nazwie to przelew własny (nie koszt, nie przychód). Import dopisuje tu właściciela rachunku z pliku mBanku.
        </p>
        <div className="flex flex-col gap-1">
          {names.map((n) => (
            <div key={n} className="flex items-center gap-2 text-[12px]" data-testid="own-name">
              <span className="flex-1 text-fg-strong">{n}</span>
              <button type="button" className="btn btn-ghost h-[22px] px-1.5 text-[11px] hover:text-down" onClick={() => setOwnNames(names.filter((x) => x !== n))}>
                usuń
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <TextField className="w-[260px]" value={name} onChange={setName} placeholder="IMIĘ NAZWISKO jak w banku" maxLength={120} data-testid="own-name-input" />
            <button
              type="button"
              className="btn h-[24px]"
              disabled={!name.trim() || names.some((n) => n.toLowerCase() === name.trim().toLowerCase())}
              onClick={() => {
                setOwnNames([...names, name.trim()])
                setName('')
              }}
              data-testid="own-name-add"
            >
              <IconPlus size={12} /> Dodaj
            </button>
          </div>
        </div>
      </Panel>
    </>
  )
}
