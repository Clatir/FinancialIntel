// RY, przebieg 6 (persona „rok”, odczyt): powtórzenie znalezisk na świeżym przebiegu – przegląd roczny 2025 (miesiące
// sprzed historii), animacja bloku „Miesiąc zamknięty na plus” przy pierwszym i ponownym otwarciu, kolor Daily Bias
// w Raportach. Narzędzie obserwacji – oceny w docs/audyt/raport/RY.md.
import { test, type Page } from '@playwright/test'
import { reading, shot, start, useState } from './lab'
import { go, out, shotEl, stepper, textOf } from './wy-pomoc'

const RUN = 'ry-6'

async function plusBlock(page: Page): Promise<unknown> {
  const b = page.getByTestId('month-plus')
  if (!(await b.count())) return '(brak bloku)'
  return b.evaluate((e) => ({
    tekst: (e as HTMLElement).innerText,
    animacje: [e, ...Array.from(e.querySelectorAll('*'))].map((x) => getComputedStyle(x).animationName).filter((n) => n && n !== 'none'),
    ramka: getComputedStyle(e).borderColor
  }))
}

test('RY przebieg 6 – potwierdzenia', async () => {
  const st = useState('rok', RUN)
  let { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  const step = stepper(dump)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    await step('rok-2025', async () => {
      await go(page, '0', 'page-reports')
      await page.getByRole('radio', { name: 'Przegląd roczny' }).click()
      await page.waitForTimeout(800)
      await page.getByTestId('reports-year').locator('select').first().selectOption('2025')
      await page.waitForTimeout(1200)
      dump('RY.24-2025', await textOf(page.getByTestId('reports-year')))
      const zeros = await page.getByTestId('reports-year').locator('tr').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')).filter((t) => /2025 0,00 zł 0,00 zł/.test(t)))
      dump('RY.24-zera', zeros)
      await shot(page, 'RY.24-2025')
    })
    await step('dziennik', async () => {
      await go(page, '9', 'page-intel')
      await page.getByRole('radio', { name: '12 mies.', exact: true }).click()
      await page.waitForTimeout(1200)
      const rows = await page.getByTestId('intel-log-row').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
      const all = await textOf(page.getByTestId('intel-log'))
      reading('wy', 'WY.16', 'rok, okres 12 mies.', { ...Object.fromEntries(rows.map((r, i) => [`${i}`, r])), impulsyLacznie: all.split('\n').at(-1) ?? '' })
      dump('WY.16', all)
      await go(page, '0', 'page-reports')
    })
    await step('bias-raporty', async () => {
      await page.getByRole('radio', { name: 'Odprawa' }).click()
      await page.waitForTimeout(800)
      dump('WY.1-raporty-bias', { tekst: await textOf(page.getByTestId('reports-briefing-bias')), kolor: await page.getByTestId('reports-briefing-bias').evaluate((e) => getComputedStyle(e).color) })
    })
    await step('plus', async () => {
      await go(page, '4', 'page-month')
      await page.waitForTimeout(300)
      dump('RY.21-pierwsze', await plusBlock(page))
      await shotEl(page.getByTestId('month-debrief'), 'RY.21-plus-pierwsze')
      await go(page, '1', 'page-bridge')
      await go(page, '4', 'page-month')
      await page.waitForTimeout(300)
      dump('RY.21-drugie', await plusBlock(page))
    })
    await app.close().catch((e) => dump('problem-zamkniecia', String(e).split('\n')[0]))
    ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)
    await step('plus-po-restarcie', async () => {
      await go(page, '4', 'page-month')
      await page.waitForTimeout(300)
      dump('RY.21-po-restarcie', await plusBlock(page))
    })
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
