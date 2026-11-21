/**
 * The words of a purchase a household member finances (Z7, T552): one wording for the import's lists, the keyword rules,
 * the toasts of the bulk bar and the context menu, and the quick entry's preview – „Kupione dla: Tata” (they lend the
 * shields, it is to be paid back) or „Prezent dla: Tata” (nobody owes it). The field's own label stays „Finansuje”.
 */
export const financeLabel = (gift: boolean, name: string): string => `${gift ? 'Prezent dla' : 'Kupione dla'}: ${name}`
