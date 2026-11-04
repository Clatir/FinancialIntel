// RY, przebieg 2 (persona „rok”, zapisy z interfejsu): podział łupów października (na następny miesiąc, do celu, reszta do
// osłon), debriefing w Raportach i w Planie miesiąca, potem późny import `rok-nowe-historia.csv` (27.10–02.11) i znowu
// oba debriefingi. Raport wachty – „później ›” dalej niż bieżący. Narzędzie obserwacji – oceny w RY.md.
import { join } from 'node:path'
import { test, type Page } from '@playwright/test'
import { answerDialogs, LAB, reading, shot, start, text, useState } from './lab'
import { go, out, shotEl, stepper, textOf } from './wy-pomoc'

const RUN = 'ry-2'

async function debriefs(page: Page, label: string, dump: (n: string, c: unknown) => void): Promise<void> {
  await go(page, '0', 'page-reports')
  await page.getByRole('radio', { name: 'Debriefing' }).click()
  await page.waitForTimeout(800)
  await page.getByTestId('reports-debrief-month').selectOption('2026-10')
  await page.waitForTimeout(1200)
  const r = await textOf(page.getByTestId('reports-debrief'))
  dump(`RY.19-raporty-${label}`, r)
  await shot(page, `RY.19-raporty-${label}`)
  await go(page, '4', 'page-month')
  await page.waitForTimeout(800)
  const p = await textOf(page.getByTestId('month-debrief'))
  dump(`RY.19-plan-${label}`, p)
  await shotEl(page.getByTestId('month-debrief'), `RY.19-plan-${label}`)
  reading('ry', 'RY.19', `rok + podział łupów października (${label})`, { raporty: r.replace(/\n/g, ' | ').slice(0, 3000), plan: p.replace(/\n/g, ' | ').slice(0, 2500) })
}

test('RY przebieg 2 – łupy i późny import', async () => {
  const st = useState('rok', RUN)
  const { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)

    // RY.9 – „później ›” z bieżącego tygodnia dalej (powtórzenie na świeżym przebiegu).
    await step('wachta', async () => {
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Raport wachty' }).click()
      await page.waitForTimeout(800)
      const title = async () => (await textOf(page.getByTestId('reports-watch'))).split('\n')[0]
      const later = page.getByText('później ›')
      const nav: string[] = [`domyślny: ${await title()} | później disabled=${await later.isDisabled()}`]
      for (let k = 1; k <= 3; k++) {
        await later.click({ timeout: 2000 }).catch((e) => nav.push(`klik ${k}: ${String(e).slice(0, 80)}`))
        await page.waitForTimeout(700)
        nav.push(`później ×${k}: ${await title()} | później disabled=${await later.isDisabled()}`)
      }
      dump('RY.9-pozniej', nav)
      dump('RY.9-tydzien-biezacy', await textOf(page.getByTestId('page-reports')))
      await shot(page, 'RY.9-pozniej')
    })

    await debriefs(page, 'przed-decyzja', dump)

    // Decyzja: 200 zł na następny miesiąc, 300 zł do celu „Wakacje 2027”, reszta do osłon.
    await step('decyzja', async () => {
      await go(page, '4', 'page-month')
      const amount = async (l: ReturnType<Page['locator']>, v: string) => {
        await l.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.type(v)
        await page.keyboard.press('Tab')
        await page.waitForTimeout(400)
      }
      await amount(page.getByTestId('loot-next'), '200')
      await amount(page.getByLabel('Cel Wakacje 2027'), '300')
      dump('RY.19-formularz', await textOf(page.getByTestId('month-debrief')))
      await page.getByTestId('loot-confirm').click()
      await page.waitForTimeout(2500)
    })
    await debriefs(page, 'po-decyzji', dump)

    // Późny import: tydzień 27.10–02.11 (operacje października po decyzji).
    await step('import', async () => {
      await page.keyboard.press('Control+3')
      await page.getByTestId('page-import').waitFor({ timeout: 30_000 })
      await page.getByTestId('import-close').click({ timeout: 1500 }).catch(() => undefined)
      await answerDialogs(app, { paths: [join(LAB, 'pliki', 'rok-nowe-historia.csv')] })
      await page.getByTestId('import-pick').click()
      await page.getByTestId('import-file').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(1000)
      dump('RY.19-import-podglad', (await text(page, '[data-testid="page-import"]')).slice(0, 3000))
      await page.getByTestId('import-run').click()
      await page.getByTestId('import-done').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(1500)
      dump('RY.19-import-wynik', await textOf(page.getByTestId('import-done')))
    })
    await debriefs(page, 'po-imporcie', dump)
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
