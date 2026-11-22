/**
 * The words of a purchase a household member finances (Z7, T552): one wording for the import's lists and previews, the
 * keyword rules, the officer's hint, the toasts of the bulk bar and the context menu, the bridge's rows and the quick
 * entry's preview – „Kupione dla: Tata” (they lend the shields, it is to be paid back) or „Prezent dla: Tata” (nobody
 * owes it). The field's own label stays „Finansuje”.
 */
export const financeLabel = (gift: boolean, name: string): string => `${gift ? 'Prezent dla' : 'Kupione dla'}: ${name}`

/** The same inside a sentence or a list of parts: „kupione dla: Tata”, „prezent dla: Tata”. */
export const financeLabelInline = (gift: boolean, name: string): string => `${gift ? 'prezent dla' : 'kupione dla'}: ${name}`

/** The option of `FinancerSelect` in the operation's editor (an expense, a product return `back`, or a compact split line). */
export function financerOptionLabel(name: string, opts: { gift: boolean; compact?: boolean; back?: boolean }): string {
  if (opts.compact) return opts.gift ? `${name} – prezent` : name
  if (opts.back) return opts.gift ? `prezent dla: ${name} (zwrot do osłon)` : `zakup: ${name}`
  return opts.gift ? `prezent dla: ${name}` : `kupione dla: ${name} (odda)`
}
