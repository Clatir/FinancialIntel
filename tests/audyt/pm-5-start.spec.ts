// PM, przebieg 5 – folder od zera (seedFolder) i kreator startu uruchomiony 03.11.2026 (opis w PM.md): historia od 14.10.2026
// (żadnego pełnego miesiąca), przed startem w listopadzie: 01.11 Jedzenie 200 zł i ubrania 300 zł, 02.11 zwrot ubrań
// +100 zł i płatność opłaty okresowej „Ubezpieczenie mieszkania” 600 zł (kontener roczny), 03.11 (dzień startu) Jedzenie
// 45 zł. Kreator: saldo mBanku 10 000 zł, pensja 4 000 zł, koperty Jedzenie 1 200 i Osobiste 300 (codzienne). Punkty PM.25
// i PM.6 (wariant start).
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { test } from '@playwright/test'
import { LAB, shot, start } from './lab'
import { seedFolder } from '../e2e/seed'
import { ACC, CAT, type Ctx, go, goMonth, out, read, readBridgeAll, readDaily, readIncome, readSalary, readSplit, shotEl, stepper, textOf, toasts, typeAmount } from './pm-pomoc'

const RUN = 'pm-5'
const INS = '01KMXAPM000000000000000501'

test('PM przebieg 5 – kreator w trakcie miesiąca, krótka historia', async () => {
  test.setTimeout(15 * 60_000)
  const dataDir = join(LAB, 'przebiegi', RUN, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  const tx = (date: string, amount: number, categoryId: string | null, counterparty: string, extra: Record<string, unknown> = {}) => ({ date, accountId: ACC.mbank, kind: 'expense', amount, categoryId, counterparty, ...extra })
  seedFolder(dataDir, {
    records: {
      containers: [{ id: INS, name: 'Ubezpieczenie mieszkania', type: 'fixed', amount: 60000, cycleMonths: 12, dueMonth: '2026-11', dueDay: 2, accountId: ACC.mbank, categoryId: '01KDEFCAT00000000000000201', counterparty: 'PZU SA', from: '2025-12' }],
      transactions: [
        tx('2026-10-14', -12000, CAT.groceries, 'BIEDRONKA PM'),
        tx('2026-10-20', -20000, CAT.fuel, 'ORLEN PM'),
        tx('2026-10-28', -6000, '01KDEFCAT00000000000000601', 'KINO PM'),
        { date: '2026-10-25', accountId: ACC.mbank, kind: 'income', amount: 700000, counterparty: 'FIRMA PM', title: 'WYNAGRODZENIE' },
        tx('2026-11-01', -20000, CAT.groceries, 'BIEDRONKA PM'),
        tx('2026-11-01', -30000, CAT.clothes, 'ZALANDO PM'),
        tx('2026-11-02', 10000, CAT.clothes, 'ZALANDO PM', { title: 'ZWROT TOWARU' }),
        tx('2026-11-02', -60000, '01KDEFCAT00000000000000201', 'PZU SA', { containerId: INS }),
        tx('2026-11-03', -4500, CAT.groceries, 'LIDL PM', { time: '09:00' })
      ]
    }
  })
  const ctx: Ctx = { dataDir, state: 'start (pm-5): kreator 03.11.2026, historia od 14.10.2026' }
  const { app, page, errors } = await start(RUN, { dataDir })
  const dump = out(RUN)
  const step = stepper(dump)
  const rd = (point: string, v: Record<string, string | number | null>) => read(page, ctx, point, v)
  const wiz: Record<string, string> = {}
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(3000)
    await step('kreator', async () => {
      await page.getByTestId('banner-wizard-start').click()
      await page.getByTestId('page-wizard').waitFor()
      await page.waitForTimeout(800)
      const bal = page.getByTestId('wizard-balance')
      const n = await bal.count()
      for (let i = 0; i < n; i++) {
        await bal.nth(i).click()
        await bal.nth(i).fill(i === 0 ? '10000' : '0')
        await bal.nth(i).press('Enter')
      }
      wiz.krok0 = (await textOf(page.getByTestId('page-wizard'))).slice(0, 1500)
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(800)
      wiz.krok1 = (await textOf(page.getByTestId('page-wizard'))).slice(0, 1500)
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(800)
      wiz.krok2przed = (await textOf(page.getByTestId('page-wizard'))).slice(0, 2500)
      await typeAmount(page, page.getByTestId('wizard-salary'), '4000')
      if (await page.getByTestId('wizard-assumed-costs').count()) await typeAmount(page, page.getByTestId('wizard-assumed-costs'), '3000')
      await page.waitForTimeout(500)
      wiz.krok2 = (await textOf(page.getByTestId('page-wizard'))).slice(0, 2500)
      await shot(page, 'PM.25-kreator-pensja')
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(800)
      wiz.krok3przed = (await textOf(page.getByTestId('page-wizard'))).slice(0, 3000)
      await typeAmount(page, page.locator('[data-testid="wizard-envelope"][data-name="Jedzenie"] input'), '1200')
      await typeAmount(page, page.locator('[data-testid="wizard-envelope"][data-name="Osobiste"] input'), '300')
      wiz.krok3 = (await textOf(page.getByTestId('page-wizard'))).slice(0, 3000)
      // Wróć do kroku „Pensja” – czy zapowiedź się zmieniła po wyborze ładowni.
      await page.getByTestId('wizard-back').click()
      await page.waitForTimeout(600)
      wiz.krok2powrot = (await textOf(page.getByTestId('page-wizard'))).slice(0, 2500)
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(600)
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(800)
      wiz.krok4 = (await textOf(page.getByTestId('page-wizard'))).slice(0, 1500)
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(800)
      wiz.krok5 = (await textOf(page.getByTestId('page-wizard'))).slice(0, 2500)
      await shot(page, 'PM.25-kreator-podzial')
      await page.getByTestId('wizard-next').click()
      await page.waitForTimeout(800)
      await page.getByTestId('wizard-ship').fill('Start PM')
      wiz.krok6 = (await textOf(page.getByTestId('page-wizard'))).slice(0, 1500)
      await page.getByTestId('wizard-finish').click()
      await page.getByTestId('page-bridge').waitFor({ timeout: 30_000 })
      await page.waitForTimeout(3000)
      dump('kreator', wiz)
    })
    await step('PM.25', async () => {
      const b = await readBridgeAll(page)
      await go(page, '4', 'page-month')
      const s = await readSalary(page)
      const dl = await readDaily(page)
      const sp = await readSplit(page)
      dump('plan', { s, dl, sp, b })
      await shot(page, 'PM.25-plan')
      await shotEl(page.getByTestId('month-salary-panel'), 'PM.25-pensja')
      const note = (t: string | undefined) => (t ?? '').split('\n').filter((l) => /wydano już|pierwsza pensja/.test(l)).join(' | ')
      await rd('PM.25', { zapowiedzKrok2: note(wiz.krok2), zapowiedzPoPowrocie: note(wiz.krok2powrot), pensjaPlanu: s.pole, wyplacono: s.wyplacono, pensja: s.panel, dzienny: dl.panel, mostekEnergia: b.energia, mostekPodpis: b.podpis, rozbicie: b.rozbicie ?? '', stan: b.stan })
    })
    await step('PM.6-start', async () => {
      await go(page, '4', 'page-month')
      await goMonth(page, '2026-11')
      const inc = await readIncome(page)
      const s0 = await readSalary(page)
      await page.getByTestId('month-envelopes-propose').click()
      await page.waitForTimeout(600)
      const t0 = await toasts(page)
      await shot(page, 'PM.6-start-M0')
      await goMonth(page, '2026-12')
      const s1 = await readSalary(page)
      await page.getByTestId('month-envelopes-propose').click()
      await page.waitForTimeout(600)
      const t1 = await toasts(page)
      const sp1 = await readSplit(page)
      await shot(page, 'PM.6-start-M1')
      const b = await readBridgeAll(page)
      await rd('PM.6', { wariant: 'start (pm-5)', przychody: inc.panel, przychodyMostek: b.przychody, pensjaM0: s0.panel, kopertyM0toast: t0.join(' || '), pensjaM1: s1.panel, kopertyM1toast: t1.join(' || '), kopertyM1: sp1.koperty })
    })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
