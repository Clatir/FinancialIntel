// MO, przebiegi F3 i G2 – dalsze stany szczególne:
// F3 kopia „rok”: cel osłon 1 pensja, kadłub 3 miesiące (MO.22 b – „wolne do decyzji”);
// G2 krótka historia: budżet od 29.10.2026, saldo otwarcia 25 000 zł, pensja 2 000 zł (MO.22 c, MO.30 – drugi przebieg).
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, reading, shot, start, text, useState } from './lab'
import { editJson, go, out, readBridge, textOf } from './mo-pomoc'
import { seedFolder, zl } from '../e2e/seed'

const ACC = '01KDEFACC00000000000000001'
const FOOD = '01KDEFCAT00000000000000100'

test('MO F3 – osłony ponad cel, kadłub 3 mies.', async () => {
  const RUN = 'mo-f3'
  const st = useState('rok', RUN)
  editJson(join(st.dataDir, 'fi.json'), (j) => {
    j.settings.layers.shieldSalaries = 1
    j.settings.layers.hullMonths = 3
  })
  const { app, page } = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const dump = out(RUN)
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 60_000 })
    await page.waitForTimeout(5000)
    const b = await readBridge(page)
    dump('mostek', b)
    dump('MO.22-podpis', await textOf(page.getByTestId('state-shields')))
    reading('mo', 'MO.22', 'rok mo-f3 (osłony 1 pensja, kadłub 3 mies.)', { stan: String(b.stan) })
    await page.locator('section[data-panel="bridge:Stan okrętu"]').first().screenshot({ path: join(LAB, 'zrzuty', 'MO.22-mo-f3.png') })
  } finally {
    await app.close()
  }
})

test('MO G2 – krótka historia od 29.10, pensja 2 000 zł', async () => {
  const RUN = 'mo-g2'
  const dataDir = join(LAB, 'przebiegi', RUN, 'dane')
  rmSync(dataDir, { recursive: true, force: true })
  seedFolder(dataDir, {
    settings: (s) => ({ ...s, shipName: 'Krótki', budget: { ...s.budget, start: '2026-10-29', initial: { shields: zl(19000), hull: zl(3000), goals: {} } }, household: { ...s.household, since: '2026-10-29' } }),
    records: {
      balances: [{ date: '2026-10-29', accountId: ACC, kind: 'opening', amount: zl(25000) }],
      months: [{ month: '2026-11', salary: zl(2000), envelopes: { [FOOD]: zl(1000) } }],
      transactions: [{ date: '2026-11-02', accountId: ACC, amount: -zl(60), categoryId: '01KDEFCAT00000000000000101', counterparty: 'Lidl' }]
    }
  })
  const { app, page } = await start(RUN, { dataDir })
  const dump = out(RUN)
  try {
    await page.waitForTimeout(3000)
    await go(page, '1', 'page-bridge').catch(() => undefined)
    await page.waitForTimeout(4000)
    const b = await readBridge(page)
    dump('mostek', b)
    dump('MO.22-podpis', await textOf(page.getByTestId('state-shields')))
    dump('MO.30', await textOf(page.getByTestId('bridge-wealth')))
    await page.getByTestId('bridge-wealth').screenshot({ path: join(LAB, 'zrzuty', 'MO.30-krotka.png') }).catch(() => undefined)
    await page.locator('section[data-panel="bridge:Stan okrętu"]').first().screenshot({ path: join(LAB, 'zrzuty', 'MO.22-c.png') }).catch(() => undefined)
    await go(page, '9', 'page-intel')
    await page.waitForTimeout(1500)
    dump('wywiad', (await text(page, '[data-testid="page-intel"]')).slice(0, 800))
  } finally {
    await app.close()
  }
})
