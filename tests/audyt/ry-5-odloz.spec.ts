// RY, przebieg 5 (persona „rok”, godzina wieczornego dopisania = teraz − 1 min): „Przypomnij za 30 min” – pasek, restart
// w trakcie, powrót po 30 minutach, powiadomienia. Narzędzie obserwacji – oceny w docs/audyt/raport/RY.md.
import { test } from '@playwright/test'
import { recorded, shot, start, useState } from './lab'
import { go, out, stepper, textOf } from './wy-pomoc'

const RUN = 'ry-5'
const warsaw = (d = new Date()) => d.toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hour12: false })

test('RY przebieg 5 – „Przypomnij za 30 min”', async () => {
  test.setTimeout(60 * 60_000)
  const st = useState('rok', RUN)
  const eveningTime = warsaw(new Date(Date.now() - 60_000))
  let { app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, prefs: { notify: { eveningTime } } })
  const dump = out(RUN)
  const step = stepper(dump)
  const bar = async () => ({ at: warsaw(), otwarty: await textOf(page.getByTestId('evening-report')), zamkniety: await textOf(page.getByTestId('evening-closed')) })
  const log: unknown[] = [{ eveningTime }]
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)
    await go(page, '2', 'page-operations')
    log.push({ krok: 'start', ...(await bar()), toasty: (await recorded(app)).toasts.filter((t) => /wachty/i.test(t.title)) })
    let until = ''
    await step('odloz', async () => {
      await page.getByTestId('evening-snooze').click()
      await page.waitForTimeout(800)
      const toastText = await page.locator('[role="status"], [data-testid^="toast"]').allInnerTexts().catch(() => [])
      const b = await bar()
      until = (b.zamkniety.match(/(\d\d:\d\d)/) ?? [])[1] ?? ''
      log.push({ krok: 'po odłożeniu', ...b, toastOkna: toastText })
      await shot(page, 'RY.14-odlozony')
    })
    dump('RY.14-log', log)
    // Restart po ok. 5 minutach (dane komputera zostają).
    await page.waitForTimeout(5 * 60_000)
    log.push({ krok: 'przed restartem', ...(await bar()), toasty: (await recorded(app)).toasts.filter((t) => /wachty/i.test(t.title)) })
    await app.close()
    ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(4000)
    await go(page, '2', 'page-operations')
    log.push({ krok: 'po restarcie', ...(await bar()), toasty: (await recorded(app)).toasts.filter((t) => /wachty/i.test(t.title)) })
    dump('RY.14-log', log)
    // Czekanie do „until” + 90 s, z zapisem co 5 minut.
    for (let i = 0; i < 40; i++) {
      const now = warsaw()
      if (until && now > until && i > 0) {
        await page.waitForTimeout(90_000)
        break
      }
      await page.waitForTimeout(60_000)
      if (i % 5 === 0) log.push({ krok: `czekanie ${i}`, ...(await bar()), toasty: (await recorded(app)).toasts.filter((t) => /wachty/i.test(t.title)).length })
    }
    log.push({ krok: 'po czasie', ...(await bar()), toasty: (await recorded(app)).toasts.filter((t) => /wachty/i.test(t.title)) })
    await shot(page, 'RY.14-po-30-min')
    await page.waitForTimeout(3 * 60_000)
    log.push({ krok: 'po czasie + 3 min', ...(await bar()), toasty: (await recorded(app)).toasts.filter((t) => /wachty/i.test(t.title)) })
    // Wznów po odłożeniu (RY.15): najpierw odłóż drugi raz, potem „Wznów raport wachty”.
    await step('wznow', async () => {
      await page.getByTestId('evening-snooze').click()
      await page.waitForTimeout(800)
      log.push({ krok: 'drugie odłożenie', ...(await bar()) })
      await page.getByTestId('watch-reopen').click()
      await page.waitForTimeout(800)
      log.push({ krok: 'po „Wznów”', ...(await bar()), snooze: await page.evaluate(() => localStorage.getItem('fi.evening.snooze')) })
      await app.close()
      ;({ app, page, errors } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir, fresh: false }))
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(4000)
      await go(page, '2', 'page-operations')
      log.push({ krok: 'po „Wznów” i restarcie', ...(await bar()), toasty: (await recorded(app)).toasts.filter((t) => /wachty/i.test(t.title)) })
    })
    dump('RY.14-log', log)
    dump('bledy', errors)
  } finally {
    await app.close()
  }
})
