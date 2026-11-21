/**
 * A form opened behind its „+ …” button (UX-75): once it is on screen, its first field is scrolled to and focused – the form
 * may be below the fold of a long column. `testId` – that field's `data-testid`.
 */
export function revealField(testId: string): void {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
    el?.focus()
  }, 0)
}
