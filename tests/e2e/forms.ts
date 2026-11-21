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
