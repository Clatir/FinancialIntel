import { expect, test } from '@playwright/test'
import { launch } from './app'

// Z3 (1.21.0): the window's shell – „wstecz” / „dalej”, shortcuts over a dialog, the toasts, the palette's „Ostatnio”, the menu.
test('Z3: Alt+← / Alt+→ bez duplikatów, skróty nie działają nad oknem, toast zamyka klik, „Ostatnio” w palecie, menu bez podpisu skrótu', async () => {
  const { app, page, errors } = await launch()
  try {
    await expect(page.getByTestId('page-bridge')).toBeVisible()

    // UX-12: the same screen twice is one step back; Alt+← goes back, Alt+→ forward.
    await page.keyboard.press('Control+2')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.keyboard.press('Control+2')
    await page.keyboard.press('Control+4')
    await expect(page.getByTestId('page-month')).toBeVisible()
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(page.getByTestId('page-operations')).toBeVisible()
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(page.getByTestId('page-bridge')).toBeVisible()
    await page.keyboard.press('Alt+ArrowRight')
    await expect(page.getByTestId('page-operations')).toBeVisible()

    // UX-11: over an open dialog (F1) neither the screens nor the palette open.
    await page.keyboard.press('F1')
    await expect(page.getByTestId('shortcuts')).toBeVisible()
    await page.keyboard.press('Control+3')
    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('palette')).toHaveCount(0)
    await expect(page.getByTestId('page-operations')).toBeVisible()
    // UX-53, UX-63: the help tells the panels and the quick entry, in one format of keys.
    await expect(page.getByTestId('shortcuts')).toContainText('Szybki wpis')
    await expect(page.getByTestId('shortcuts')).toContainText('Ctrl+Shift+4 ($)')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('shortcuts')).toHaveCount(0)

    // UX-43: the bottom items of the menu have the shortcut in the tooltip only.
    await expect(page.getByTestId('nav-sync')).toHaveAttribute('title', 'Synchronizacja (Ctrl+Shift+Y)')
    await expect(page.getByTestId('nav-sync')).not.toContainText('Ctrl')
    await expect(page.getByTestId('nav-settings')).not.toContainText('Ctrl')
    await expect(page.getByTestId('nav-operations')).toContainText('Ctrl+2')

    // UX-10: a toast stays longer than 3.2 s and a click closes it.
    await page.keyboard.press('Control+s')
    const toast = page.getByTestId('toast').first()
    await expect(toast).toBeVisible()
    await page.waitForTimeout(3600)
    await expect(toast).toBeVisible()
    await toast.click({ position: { x: 8, y: 8 } })
    await expect(page.getByTestId('toast')).toHaveCount(0)

    // UX-78: the command used last is under „Ostatnio” the next time; „Zakończ aplikację” and „Wyczyść filtry” are there.
    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('palette-recent')).toHaveCount(0)
    await page.getByTestId('palette-input').fill('zapisz teraz')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('palette')).toHaveCount(0)
    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('palette-recent-item').first()).toContainText('Zapisz teraz')
    await page.getByTestId('palette-input').fill('zakończ')
    await expect(page.getByTestId('palette')).toContainText('Zakończ aplikację')
    await page.getByTestId('palette-input').fill('wyczyść filtry')
    await expect(page.getByTestId('palette')).toContainText('Wyczyść filtry Operacji')
    await page.keyboard.press('Escape')
    expect(errors).toEqual([])
  } finally {
    await app.close()
  }
})
