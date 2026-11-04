// RE, przebieg 0: RE.1 zakładki i dojście, RE.2 odprawa = odprawa Mostka, RE.3 panel Eksport (okres, nazwy, toasty, anulowanie).
import { existsSync, statSync } from 'node:fs'
import { test } from '@playwright/test'
import { reading, useState, start, text } from './lab'
import { answerCancel, answerSave, EXPORT, go, goReports, proposed, run, say, snap, step, toasts, waitFile } from './re-pomoc'

test('RE.1 / RE.2 / RE.3 na rok', async () => {
  const r = await run('re-0')
  const { page, app, errors } = r
  try {
    // ---- RE.1
    await step('RE.1 skrót i zakładki', async () => {
      await page.keyboard.press('Control+0')
      await page.getByTestId('page-reports').waitFor()
      const tabs = await page.getByRole('radio').allInnerTexts()
      const checked = await page.locator('[role="radio"][aria-checked="true"]').allInnerTexts()
      say('RE.1 po Ctrl+0', { zakładki: tabs, zaznaczona: checked, ekran: (await text(page, '[data-testid="page-reports"]')).slice(0, 400) })
      await snap(page, 'RE.1-ctrl0')
      for (const t of ['Odprawa', 'Raport wachty', 'Debriefing', 'Przegląd roczny', 'Eksport']) {
        await page.getByRole('radio', { name: t }).click()
        await page.waitForTimeout(500)
        const body = (await text(page, '[data-testid="page-reports"]')).replace(/\n+/g, ' | ')
        say(`RE.1 zakładka ${t}`, { długość: body.length, początek: body.slice(0, 300) })
      }
    })
    await step('RE.1 paleta', async () => {
      await go(page, '1', 'page-bridge')
      await page.keyboard.press('Control+k')
      await page.waitForTimeout(500)
      await page.keyboard.type('raport')
      await page.waitForTimeout(600)
      const dlg = await page.locator('[cmdk-root], [role="dialog"]').first().innerText().catch(() => '(brak okna palety)')
      say('RE.1 paleta „raport”', dlg.replace(/\n+/g, ' | '))
      await snap(page, 'RE.1-paleta')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(800)
      say('RE.1 po Enter w palecie', { raporty: await page.getByTestId('page-reports').isVisible().catch(() => false), zakładka: await page.locator('[role="radio"][aria-checked="true"]').allInnerTexts() })
    })
    await step('RE.1 kliknięcie powiadomienia (symulowane)', async () => {
      await go(page, '1', 'page-bridge')
      const url = page.url()
      await app.evaluate(({ BrowserWindow }, u) => {
        const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL() === u)
        w?.webContents.send('fi:notificationClick', 'reports')
      }, url)
      await page.waitForTimeout(1200)
      say('RE.1 po kliknięciu powiadomienia tag=reports', { raporty: await page.getByTestId('page-reports').isVisible().catch(() => false), zakładka: await page.locator('[role="radio"][aria-checked="true"]').allInnerTexts(), początek: (await text(page, 'body')).slice(0, 200) })
    })

    // ---- RE.2
    await step('RE.2 odprawa Mostek vs Raporty', async () => {
      await go(page, '1', 'page-bridge')
      const od = page.locator('section[data-panel="bridge:Odprawa"]').first()
      const bridge = (await od.innerText()).split('\n').map((s) => s.trim()).filter(Boolean)
      const items = (await od.locator('[data-testid="briefing-item"]').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
      await goReports(page, 'Odprawa')
      const rep = (await page.getByTestId('reports-briefing').innerText()).split('\n').map((s) => s.trim()).filter(Boolean)
      const repItems = (await page.getByTestId('reports-briefing-item').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim())
      say('RE.2 Mostek – panel', bridge)
      say('RE.2 Raporty – panel', rep)
      say('RE.2 pozycje', { mostek: items, raporty: repItems, równe: JSON.stringify(items) === JSON.stringify(repItems) })
      await snap(page, 'RE.2-raporty-odprawa')
      reading('re', 'RE.2', 'rok', { mostek: bridge.slice(0, 4).join(' | '), raporty: rep.slice(0, 4).join(' | '), liczba_mostek: items.length, liczba_raporty: repItems.length })
    })

    // ---- RE.3
    await step('RE.3 panel Eksport', async () => {
      await goReports(page, 'Eksport')
      say('RE.3 panel', (await text(page, '[data-testid="reports-export"]')))
      say('RE.3 pola', { od: await page.getByTestId('export-from').inputValue(), do: await page.getByTestId('export-to').inputValue() })
      await snap(page, 'RE.3-panel')
      const files: Record<string, { id: string; file: string }> = {
        ops: { id: 'export-operations-csv', file: `${EXPORT}\\re-3-operacje.csv` },
        months: { id: 'export-months-csv', file: `${EXPORT}\\re-3-miesiace.csv` },
        xlsx: { id: 'export-xlsx', file: `${EXPORT}\\re-3-budzet.xlsx` },
        zip: { id: 'export-zip', file: `${EXPORT}\\re-3-kopia.zip` }
      }
      for (const [k, f] of Object.entries(files)) {
        await answerSave(app, f.file)
        const before = (await proposed(app)).length
        await page.getByTestId(f.id).click()
        const ok = await waitFile(f.file, 60_000)
        await page.waitForTimeout(800)
        const o = (await proposed(app)).slice(before)
        say(`RE.3 ${k}`, { propozycja: o, plik: ok ? statSync(f.file).size : 'BRAK', toast: await toasts(page) })
        await page.waitForTimeout(6500)
      }
      // Cancel on each button.
      for (const [k, f] of Object.entries(files)) {
        await answerCancel(app)
        const base = f.file.replace(/(\.\w+)$/, '-anul$1')
        await page.getByTestId(f.id).click()
        await page.waitForTimeout(1500)
        say(`RE.3 anulowanie ${k}`, { plik: existsSync(base), toast: await toasts(page), błędy: errors.slice() })
      }
      await snap(page, 'RE.3-po-anulowaniu')
      // Range typed: from 01.10.2026 to 31.10.2026.
      await page.getByTestId('export-from').click()
      await page.getByTestId('export-from').fill('01.10.2026')
      await page.getByTestId('export-from').press('Enter')
      await page.getByTestId('export-to').click()
      await page.getByTestId('export-to').fill('31.10.2026')
      await page.getByTestId('export-to').press('Enter')
      await page.waitForTimeout(400)
      const f = `${EXPORT}\\re-3-pazdziernik.csv`
      await answerSave(app, f)
      const before = (await proposed(app)).length
      await page.getByTestId('export-operations-csv').click()
      await waitFile(f)
      say('RE.3 okres 1–31.10', { propozycja: (await proposed(app)).slice(before), pola: [await page.getByTestId('export-from').inputValue(), await page.getByTestId('export-to').inputValue()] })
    })
    say('errors', errors)
  } finally {
    await app.close()
  }
})

test('RE.2 odprawa na start (bez alarmów)', async () => {
  const st = useState('start', 're-0-start')
  const r = await start('re-0-start', { dataDir: st.dataDir, ictjDir: st.ictjDir })
  r.page.setDefaultTimeout(15_000)
  try {
    await r.page.getByTestId('page-bridge').waitFor({ timeout: 120_000 })
    await r.page.waitForTimeout(2500)
    const od = r.page.locator('section[data-panel="bridge:Odprawa"]').first()
    const bridge = (await od.innerText().catch(() => '(brak panelu)')).replace(/\n+/g, ' | ')
    await goReports(r.page, 'Odprawa')
    const rep = (await r.page.getByTestId('reports-briefing').innerText()).replace(/\n+/g, ' | ')
    say('RE.2 start – Mostek', bridge)
    say('RE.2 start – Raporty', rep)
    await snap(r.page, 'RE.2-start')
  } finally {
    await r.app.close()
  }
})
