/**
 * Amounts as the app writes them (the screens, the briefing, the notifications): 123456 grosze → "1 234,56" –
 * thousands with a no-break space, a decimal comma, the minus U+2212.
 */
export function formatPln(grosze: number, group = true): string {
  const abs = Math.abs(grosze)
  const zl = String(Math.floor(abs / 100))
  const int = group ? zl.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : zl
  return `${grosze < 0 ? '−' : ''}${int},${String(abs % 100).padStart(2, '0')}`
}
