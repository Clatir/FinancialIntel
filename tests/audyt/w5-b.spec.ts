// W5 (AU-11, weryfikacja sceptyczna): odtworzenie MG.12 (migawka mg\MG.12-2), RA.4 (ra\RA.4-1), PR.9 (pr\PR.9-4),
// PR.10 (pr\PR.10-2 i kontener 0 w UI) i DM.11 (dm\DM.11-1, wydatek wspólny w UI). Migawki kopiowane do przebiegu.
import { test } from '@playwright/test'
import { shot, start } from './lab'
import { cargoScreen, go, monthAt, ready, textOf } from './la-pomoc'
import { bridgeValues, dockPanel } from './do-pomoc'
import { openDockRow, readDock, readRadar, readStarmap, itemLine } from './mg-pomoc'
import { CAT, DMM, fill, newOp, openOp, txs, brief, typeIn } from './dm-pomoc'
import { allBriefing, boundary, prepare } from './w5-pomoc'

const flat = (s: string) => s.replace(/\s+/g, ' ').trim()

test('W5 – MG.12 (migawka MG.12-2)', async () => {
  const p = prepare('w5-mg12', 'mg\\MG.12-2')
  const r = await start('w5-mg12', { dataDir: p.dataDir, ictjDir: p.ictjDir })
  const page = r.page
  try {
    await ready(page)
    await page.waitForTimeout(3000)
    p.log('mostek', await bridgeValues(page))
    p.log('dokowanie', await dockPanel(page))
    await go(page, '6', 'page-starmap')
    p.log('mapa', await readStarmap(page))
    await shot(page, 'W5-MG.12-mapa')
    for (const row of ['8 000,00', '6 000,00', '1 500,00']) {
      await go(page, '1', 'page-bridge')
      await page.waitForTimeout(800)
      if (await openDockRow(page, row)) {
        p.log(`okno ${row}`, await readDock(page))
        await shot(page, `W5-MG.12-okno-${row.replace(/\D/g, '')}`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(600)
      } else p.log(`okno ${row}`, '(brak wiersza)')
    }
  } finally {
    await r.app.close().catch(() => undefined)
    boundary(p)
  }
})

test('W5 – RA.4 (migawka RA.4-1)', async () => {
  const p = prepare('w5-ra4', 'ra\\RA.4-1')
  const r = await start('w5-ra4', { dataDir: p.dataDir, ictjDir: p.ictjDir })
  const page = r.page
  try {
    await ready(page)
    await page.waitForTimeout(3000)
    p.log('odprawa', await allBriefing(page))
    await go(page, '7', 'page-radar')
    const rad = await readRadar(page)
    p.log('radar telefon', rad.items.filter((i) => /Telefon/.test(i.name)).map(itemLine))
    p.log('radar opłaty', rad.items.filter((i) => /opłata/.test(i.kindLabel)).map(itemLine))
    await shot(page, 'W5-RA.4-radar')
    await go(page, '5', 'page-cargo')
    const c = await cargoScreen(page)
    p.log('ładownia telefon', (c.rows as Array<{ name: string; text: string }>).filter((x) => /Telefon/.test(x.name)))
    await page.locator('[data-testid="cargo-row"][data-name="Telefon Play"]').first().click().catch(() => undefined)
    await page.waitForTimeout(600)
    p.log('edytor telefon', flat(await textOf(page.getByTestId('cargo-editor'))).slice(0, 700))
    await shot(page, 'W5-RA.4-telefon')
    await go(page, '1', 'page-bridge')
    const strip = page.getByText(/Kontenery w tym miesiącu/).first()
    if (await strip.count()) p.log('mostek kontenery', flat(await strip.locator('xpath=ancestor::section[1]').innerText()).slice(0, 1500))
  } finally {
    await r.app.close().catch(() => undefined)
    boundary(p)
  }
})

test('W5 – PR.9 (migawka PR.9-4) i PR.10 (migawka PR.10-2)', async () => {
  const p = prepare('w5-pr9', 'pr\\PR.9-4')
  const r = await start('w5-pr9', { dataDir: p.dataDir, ictjDir: p.ictjDir })
  const page = r.page
  try {
    await ready(page)
    await go(page, '7', 'page-radar')
    const rad = await readRadar(page)
    p.log('radar raty', rad.items.filter((i) => /Kredyt|Pożyczka R/.test(i.name)).map(itemLine))
    await go(page, '5', 'page-cargo')
    const c = await cargoScreen(page)
    p.log('ładownia raty', (c.rows as Array<{ name: string; text: string }>).filter((x) => /Rata/.test(x.name)))
    await page.locator('[data-testid="cargo-row"][data-name="Rata: Kredyt R2"]').first().click().catch(() => undefined)
    await page.waitForTimeout(600)
    p.log('edytor raty', flat(await textOf(page.getByTestId('cargo-editor'))).slice(0, 900))
    await shot(page, 'W5-PR.9-ladownia')
    for (const d of [0, 1, 2, 3]) {
      const m = await monthAt(page, d)
      p.log(`plan ${m.miesiac}`, `${m.ladownia} || ${(m.podzial.match(/Ładownia[^|]*\|[^|]*\|[^|]*/)?.[0] ?? '')}`)
    }
  } finally {
    await r.app.close().catch(() => undefined)
    boundary(p)
  }
  const q = prepare('w5-pr10', 'pr\\PR.10-2')
  const s = await start('w5-pr10', { dataDir: q.dataDir, ictjDir: q.ictjDir })
  const pg = s.page
  try {
    await ready(pg)
    const m = await monthAt(pg, 1)
    q.log('plan grudnia (pensja 0)', m)
    await shot(pg, 'W5-PR.10-grudzien')
    await go(pg, '5', 'page-cargo')
    await pg.getByTestId('cargo-add').click()
    await pg.getByTestId('container-name').fill('Kontener zero W5')
    const a = pg.getByTestId('container-amount')
    await a.click()
    await a.fill('0')
    await a.press('Tab')
    await pg.waitForTimeout(500)
    const save = pg.getByTestId('cargo-new-save')
    q.log('kontener 0', { aktywny: await save.isEnabled(), title: await save.getAttribute('title'), formularz: flat(await textOf(pg.getByTestId('cargo-new'))) })
    await shot(pg, 'W5-PR.10-kontener-0')
  } finally {
    await s.app.close().catch(() => undefined)
    boundary(q)
  }
})

test('W5 – DM.11 (migawka DM.11-1, procenty ≠ 100 %)', async () => {
  const p = prepare('w5-dm11', 'dm\\DM.11-1')
  const r = await start('w5-dm11', { dataDir: p.dataDir, ictjDir: p.ictjDir })
  const page = r.page
  try {
    await ready(page)
    await newOp(page, 'Wydatek')
    await fill(page, { amount: '100', counterparty: 'Sklep W5', categoryId: CAT.food })
    await page.getByTestId('operation-share-start').click()
    await page.waitForTimeout(400)
    const share = page.getByTestId('operation-share')
    await share.getByTestId('operation-share-person').nth(1).selectOption(DMM.anna)
    await page.waitForTimeout(300)
    await share.getByTestId('operation-share-add').click()
    await page.waitForTimeout(300)
    await share.getByTestId('operation-share-person').nth(2).selectOption(DMM.tata)
    await page.waitForTimeout(600)
    p.log('równo', flat(await share.innerText()))
    await openOp(page, 'Sklep W5')
    const share2 = page.getByTestId('operation-share')
    await share2.getByRole('radio', { name: 'procenty' }).click()
    await page.waitForTimeout(400)
    for (const [i, v] of [[0, '50'], [1, '30'], [2, '10']] as const) await typeIn(page, share2.getByTestId('operation-share-percent').nth(i), v)
    await page.waitForTimeout(1500)
    p.log('procenty 50/30/10 – okno', flat(await share2.innerText()))
    p.log('procenty – edytor', flat(await page.getByTestId('operation-editor').innerText()).slice(0, 900))
    await shot(page, 'W5-DM.11-procenty')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1500)
    p.log('plik', txs(p.dataDir).filter((t) => t.counterparty === 'Sklep W5').map(brief))
  } finally {
    await r.app.close().catch(() => undefined)
    boundary(p)
  }
})
