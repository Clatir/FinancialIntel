import { describe, expect, it } from 'vitest'
import type { BankFile } from '@shared/api'
import { briefing } from '@shared/calc/briefing'
import { computeFleet } from '@shared/calc/fleet'
import { accountOfFile, bankFileText, newBankFiles, type BankFilesContext } from '@shared/import/bankFiles'
import { createDefaultSettings } from '@shared/defaults'
import { DEFAULT_MACHINE_PREFS } from '@shared/machine'
import { dueNotices } from '@shared/notify'
import { balanceSchema, MBANK_ACCOUNT_ID, SCHEMA_VERSION, XTB_WALLET_ACCOUNT_ID } from '@shared/schema'

const AT = '2026-01-01T00:00:00.000Z'
const file = (over: Partial<BankFile> = {}): BankFile => ({
  id: 'f1',
  name: 'lista_operacji.csv',
  where: 'Pobrane',
  mtime: Date.parse('2026-10-19T08:00:00Z'),
  size: 1000,
  format: 'lista',
  period: { from: '2026-10-12', to: '2026-10-18' },
  account: '12 3456 7890',
  rows: 12,
  ...over
})
const ctx = (over: Partial<BankFilesContext> = {}): BankFilesContext => ({ batches: [], accountNumbers: {}, coveredTo: {}, lastImport: {}, fallbackAccount: MBANK_ACCOUNT_ID, ...over })

describe('nowy plik z mBanku w Pobranych (1.9.0, F14)', () => {
  it('nowy: nie ma importu tego pliku (nazwa i okres); import cofnięty – znów nowy', () => {
    const f = file()
    expect(newBankFiles([f], ctx())).toEqual([f])
    const batch = { fileName: 'lista_operacji.csv', period: { from: '2026-10-12', to: '2026-10-18' }, undoneAt: null, accountId: MBANK_ACCOUNT_ID }
    expect(newBankFiles([f], ctx({ batches: [batch] }))).toEqual([])
    expect(newBankFiles([f], ctx({ batches: [{ ...batch, undoneAt: '2026-10-19T09:00:00.000Z' }] }))).toEqual([f])
    // Another period under the same name: another file.
    expect(newBankFiles([f], ctx({ batches: [{ ...batch, period: { from: '2026-10-05', to: '2026-10-11' } }] }))).toEqual([f])
  })

  it('stary plik, którego okres pokrył późniejszy import konta – nie nowy; nowszy od importu – nowy', () => {
    const f = file()
    const covered = { coveredTo: { [MBANK_ACCOUNT_ID]: '2026-10-18' }, lastImport: { [MBANK_ACCOUNT_ID]: '2026-10-19T10:00:00.000Z' } }
    expect(newBankFiles([f], ctx(covered))).toEqual([])
    expect(newBankFiles([file({ mtime: Date.parse('2026-10-19T11:00:00Z') })], ctx(covered))).toHaveLength(1)
    expect(newBankFiles([file({ period: { from: '2026-10-12', to: '2026-10-19' } })], ctx(covered))).toHaveLength(1)
  })

  it('konto pliku po numerze rachunku (cyfry), inaczej konto z importem mBanku; najnowsze pierwsze', () => {
    expect(accountOfFile(file(), ctx({ accountNumbers: { [XTB_WALLET_ACCOUNT_ID]: '12-3456-7890' } }))).toBe(XTB_WALLET_ACCOUNT_ID)
    expect(accountOfFile(file({ account: null }), ctx({ accountNumbers: { [XTB_WALLET_ACCOUNT_ID]: '12-3456-7890' } }))).toBe(MBANK_ACCOUNT_ID)
    const older = file({ id: 'f0', name: 'starszy.csv', mtime: Date.parse('2026-10-10T08:00:00Z') })
    expect(newBankFiles([older, file()], ctx()).map((f) => f.id)).toEqual(['f1', 'f0'])
    expect(bankFileText(file())).toBe('Nowy meldunek z mBanku (12.10–18.10): lista_operacji.csv w folderze Pobrane')
    expect(bankFileText(file({ period: null, where: 'Wyciągi' }))).toBe('Nowy meldunek z mBanku: lista_operacji.csv w folderze Wyciągi')
  })

  it('odprawa: pozycja z kluczem pliku; powiadomienie otwiera plik (bez przełącznika zaległego importu)', () => {
    const settings = createDefaultSettings(AT).settings
    const fleet = computeFleet({
      settings: { ...settings, budget: { ...settings.budget, start: '2026-10-01' } },
      balances: [balanceSchema.parse({ schemaVersion: SCHEMA_VERSION, id: '01K9F000000000000000000001', createdAt: AT, updatedAt: AT, date: '2026-10-01', accountId: MBANK_ACCOUNT_ID, kind: 'opening', amount: 100000 })],
      transactions: [],
      now: '2026-10-19T12:00:00+02:00'
    })
    const input = { fleet, containers: [], imports: [], label: () => '', bankFiles: [file()] }
    const items = briefing(input).filter((i) => i.kind === 'import')
    expect(items.map((i) => [i.key, i.text])).toEqual([[`bankfile:f1:${file().mtime}`, 'Nowy meldunek z mBanku (12.10–18.10): lista_operacji.csv w folderze Pobrane – importuj.']])
    const notices = dueNotices({ ...input, prefs: { ...DEFAULT_MACHINE_PREFS.notify, importOverdue: false }, quietHours: { from: '23:00', to: '05:00' }, time: '12:00', opened: false, money: (g) => String(g) })
    expect(notices.filter((n) => n.tag === 'import').map((n) => [n.title, n.target])).toEqual([['Nowy meldunek z mBanku', 'bankfile:f1']])
  })
})
