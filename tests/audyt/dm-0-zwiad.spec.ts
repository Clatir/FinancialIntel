/**
 * DM – reconnaissance: the persona „rok” with the points' members (the persona's Anna renamed „A. Testowa”, a clean
 * „Anna”, „Tata”, „Babcia” via Tata) – what the screens say before any point, the editor's household parts.
 */
import { test } from '@playwright/test'
import { DMM, ROK, editorText, fill, log, mostek, newOp, odprawa, plan, przychody, radar, raport, runRok, ustawieniaDomownicy, members, dzisGra } from './dm-pomoc'

test('DM zwiad', async () => {
  test.setTimeout(10 * 60_000)
  const run = 'dm-0'
  const t0 = Date.now()
  const { app, page } = await runRok(run, (d) =>
    members(d, [
      { id: DMM.anna, name: 'Anna', inflow: 'advance' },
      { id: DMM.tata, name: 'Tata', inflow: 'ask' },
      { id: DMM.babcia, name: 'Babcia', inflow: 'ask', via: DMM.tata }
    ])
  )
  try {
    log(run, 'start ms', Date.now() - t0)
    log(run, 'mostek', await mostek(page))
    log(run, 'odprawa', await odprawa(page))
    log(run, 'radar', await radar(page))
    log(run, 'ustawienia', await ustawieniaDomownicy(page))
    log(run, 'plan', await plan(page))
    log(run, 'przychody', await przychody(page))
    log(run, 'raport 2026-11', await raport(page, '2026-11'))
    log(run, 'raport 2026-10', await raport(page, '2026-10'))
    log(run, 'gra', await dzisGra(page))
    await newOp(page, 'Wydatek')
    log(run, 'financer options', await page.getByTestId('operation-financer').evaluate((s: HTMLSelectElement) => [...s.options].map((o) => `${o.value}=${o.textContent}`)))
    log(run, 'editor wydatek', await editorText(page))
    await page.keyboard.press('Escape')
    await newOp(page, 'Wpływ')
    await fill(page, { amount: '10' })
    log(run, 'payer options', await page.getByTestId('operation-payer').evaluate((s: HTMLSelectElement) => [...s.options].map((o) => `${o.value}=${o.textContent}`)))
    await page.getByTestId('operation-payer').selectOption(ROK.marek)
    await page.waitForTimeout(500)
    log(run, 'editor wpływ Marek', await editorText(page))
  } finally {
    await app.close()
  }
})
