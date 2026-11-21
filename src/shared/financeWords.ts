/**
 * The words of a purchase a household member finances (Z7, T552): one wording for the import's lists and previews, the
 * keyword rules, the officer's hint, the toasts of the bulk bar and the context menu, the bridge's rows and the quick
 * entry's preview – „Kupione dla: Tata” (they lend the shields, it is to be paid back) or „Prezent dla: Tata” (nobody
 * owes it). The field's own label stays „Finansuje”.
 */
export const financeLabel = (gift: boolean, name: string): string => `${gift ? 'Prezent dla' : 'Kupione dla'}: ${name}`

/** The same inside a sentence or a list of parts: „kupione dla: Tata”, „prezent dla: Tata”. */
export const financeLabelInline = (gift: boolean, name: string): string => `${gift ? 'prezent dla' : 'kupione dla'}: ${name}`
