// MO, przebiegi E–G – małe stany szczególne:
// E  „pusty” – nowy folder bez kreatora (MO.1);
// F1 kopia „rok”: cel osłon 1 pensja, kadłub 12 miesięcy, bez folderu ICTTJ (MO.22 a, MO.28 bez ICTTJ);
// F2 kopia „rok”: cel osłon 1 pensja, kadłub 5 miesięcy (MO.22 b);
// G  krótka historia: budżet od 27.10.2026, saldo otwarcia 25 000 zł, pensja 4 000 zł (MO.21 start, MO.22 c, MO.23, MO.30).
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, reading, shot, start, text, useState } from './lab'
import { editJson, go, out, readBridge, textOf } from './mo-pomoc'
import { seedFolder, zl } from '../e2e/seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

async function readAll(run: string, page: import('@playwright/test').Page): Promise<void> {
  const dump = out(run)
  await page.waitForTimeout(5000)
  dump('mostek-caly', await text(page))
  try {
    dump('mostek', await readBridge(page))
  } catch (e) {
    dump('BLAD-readBridge', String(e))
  }
  await shot(page, `MO-${run}`)
}

test('MO E – pusty folder', async () => {
  const RUN = 'mo-e'
  const dataDir = join(LAB, 'przebiegi', RUN, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  mkdirSync(dataDir, { recursive: true })
  const { app, page, errors } = await start(RUN, { dataDir })
  const dump = out(RUN)
  try {
    await page.waitForTimeout(6000)
    dump('pierwszy-ekran', await text(page))
    await shot(page, 'MO.1-start')
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(2000)
    dump('mostek-caly', await text(page))
    await shot(page, 'MO.1')
    const wiz = page.getByTestId('bridge-wizard')
    if (await wiz.count()) {
      await wiz.click()
      await page.waitForTimeout(1500)
      dump('po-kreator-startu', (await text(page)).slice(0, 800))
    }
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})

for (const v of [
  { RUN: 'mo-f1', shieldSalaries: 1, hullMonths: 12, ictj: false },
  { RUN: 'mo-f2', shieldSalaries: 1, hullMonths: 5, ictj: true }
]) {
  test(`MO ${v.RUN} – osłony ponad cel, kadłub ${v.hullMonths} mies.`, async () => {
    const st = useState('rok', v.RUN)
    editJson(join(st.dataDir, 'fi.json'), (j) => {
      j.settings.layers.shieldSalaries = v.shieldSalaries
      j.settings.layers.hullMonths = v.hullMonths
    })
    const { app, page, errors } = await start(v.RUN, { dataDir: st.dataDir, ictjDir: v.ictj ? st.ictjDir : undefined })
    const dump = out(v.RUN)
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
      await readAll(v.RUN, page)
      const state = page.locator('section[data-panel="bridge:Stan okrętu"]').first()
      const over = await textOf(page.getByTestId('state-shields'))
      dump('MO.22-podpis', over)
      reading('mo', 'MO.22', `rok ${v.RUN} (osłony ${v.shieldSalaries} pensja, kadłub ${v.hullMonths} mies.)`, { oslony: over, kadlub: await textOf(page.getByTestId('state-hull')) })
      await state.screenshot({ path: `C:\\FI-audyt\\zrzuty\\MO.22-${v.RUN}.png` })
      if (!v.ictj) {
        const dock = page.locator('section[data-panel^="bridge:Dokowanie"]').first()
        dump('MO.28-bez-ictj', await dock.innerText().catch(() => '(brak panelu)'))
        await dock.screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.28-bez-ictj.png' }).catch(() => undefined)
        const link = page.getByTestId('docking-ictj-state')
        if (await link.count()) {
          await link.click()
          await page.waitForTimeout(1000)
          dump('MO.28-link', (await text(page, 'main')).slice(0, 600))
        }
      }
      dump('bledy-okna', errors)
    } finally {
      await app.close()
    }
  })
}

test('MO G – krótka historia (tydzień)', async () => {
  const RUN = 'mo-g'
  const dataDir = join(LAB, 'przebiegi', RUN, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, shipName: 'Krótki', budget: { ...s.budget, start: '2026-10-27', initial: { shields: zl(19000), hull: zl(5000), goals: {} } }, household: { ...s.household, since: '2026-10-27' } }),
    records: {
      balances: [{ date: '2026-10-27', accountId: ACC, kind: 'opening', amount: zl(25000) }],
      months: [
        { month: '2026-10', salary: zl(4000), envelopes: { [FOOD]: zl(1500) } },
        { month: '2026-11', salary: zl(4000), envelopes: { [FOOD]: zl(1500) } }
      ],
      transactions: [
        { date: '2026-10-28', accountId: ACC, amount: -zl(42.5), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Biedronka' },
        { date: '2026-11-02', accountId: ACC, amount: -zl(60), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Lidl' }
      ]
    }
  })
  const { app, page, errors } = await start(RUN, { dataDir })
  const dump = out(RUN)
  try {
    await page.waitForTimeout(3000)
    await go(page, '1', 'page-bridge').catch(() => undefined)
    await readAll(RUN, page)
    dump('MO.22-podpis', await textOf(page.getByTestId('state-shields')))
    dump('MO.30', await textOf(page.getByTestId('bridge-wealth')))
    await page.locator('section[data-panel="bridge:Stan okrętu"]').first().screenshot({ path: 'C:\\FI-audyt\\zrzuty\\MO.22-c.png' }).catch(() => undefined)
    await page.keyboard.press('Control+,')
    await page.getByTestId('settings-tab-accounts').click()
    await page.waitForTimeout(600)
    dump('konta', (await text(page, 'main')).slice(0, 1200))
    reading('mo', 'MO.21', 'krótka historia (mo-g)', { stan: JSON.stringify((await import('node:fs')).readFileSync(join(LAB, 'przebiegi', RUN, 'out', 'mostek.txt'), 'utf8')).slice(0, 1500) })
    dump('bledy-okna', errors)
  } finally {
    await app.close()
  }
})
