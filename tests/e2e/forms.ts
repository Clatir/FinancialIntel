import type { Page } from '@playwright/test'

// Z10 (UX-75): the forms of a new loan, buoy and goal sit behind „+ …” buttons – opened (once; the open state and the
// draft stay while another screen is looked at) before their fields are filled.
const FORMS = {
  loan: { button: 'radar-new-loan-open', form: 'radar-new-loan' },
  buoy: { button: 'radar-new-buoy-open', form: 'radar-new-buoy' },
  goal: { button: 'starmap-new-open', form: 'starmap-new' }
} as const

export async function openForm(page: Page, which: keyof typeof FORMS): Promise<void> {
  const { button, form } = FORMS[which]
  if (await page.getByTestId(form).isVisible()) return
  await page.getByTestId(button).click()
  await page.getByTestId(form).waitFor()
}

// Z7 (UX-70): the category field is a combobox (an input with a list of options), not a native select – a category is
// chosen by clicking the field and the option: by the label „Jedzenie · zakupy spożywcze”, by its id, or '' / null for
// „bez kategorii”. `scope` may be a locator (a phone's editor): the list is in a portal, so it is looked up on the page.
type Scope = Pick<Page, 'getByTestId'> & { page?: () => Page }

export async function pickCategory(scope: Scope, testId: string, nameOrId: string | null, nth = 0): Promise<void> {
  const page: Page = typeof scope.page === 'function' ? scope.page() : (scope as Page)
  // The field typed in before (a counterparty with suggestions) leaves first: its list may cover this one.
  await page.evaluate('document.activeElement?.blur?.()')
  // `nth`: the n-th field of the same test id (the lines of a split receipt).
  await scope.getByTestId(testId).nth(nth).click()
  const list = page.getByTestId(`${testId}-list`).first()
  await list.waitFor()
  const by = !nameOrId ? '[data-id=""]' : /^01[0-9A-Z]{24}$/.test(nameOrId) ? `[data-id="${nameOrId}"]` : `[data-label="${nameOrId}"]`
  await list.locator(`[role="option"]${by}`).first().click()
  await list.waitFor({ state: 'detached' })
}

// Z7 (UX-37): „Podziel…” is one button with a menu – „Na kategorie” (`operation-split`, a receipt's lines) and „Na osoby”
// (`operation-share-start`, a shared purchase); the menu is opened and its item clicked.
export async function splitOperation(page: Page, how: 'categories' | 'people'): Promise<void> {
  await page.getByTestId('operation-split-menu').click()
  await page.getByTestId(how === 'categories' ? 'operation-split' : 'operation-share-start').click()
}

// U5: the quick entry's „Podziel…” is the same menu – „Na kategorie” (`quick-split`) and „Na osoby” (`quick-joint-start`).
export async function splitQuick(quick: Pick<Page, 'getByTestId'>, how: 'categories' | 'people'): Promise<void> {
  await quick.getByTestId('quick-split-menu').click()
  await quick.getByTestId(how === 'categories' ? 'quick-split' : 'quick-joint-start').click()
}
