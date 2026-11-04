// MG, przebieg 2 – cele z prognozy ICTTJ na kopii „rok”: MG.12 (dokąd naprawdę idą dostawy – DOL i „DOL · pula Cele”),
// MG.4 (zmiana scenariusza z potwierdzeniem, „Anuluj”), MG.2 (cele ICTTJ tylko do odczytu, zmiana kwoty i usunięcie celu
// w ICTTJ na żywo), MG.3 (cel bez kwoty – pula Cele w swoim miesiącu, scenariusz w EUR), MG.5 (tempo nie liczy wpłaty
// z bieżącego miesiąca). Stan zbudowany przed startem – w kopii ICTTJ: scenariusze „Plan testowy” (PLN: Laptop 5 000,
// Rezerwa bez kwoty w 11.2026, Rezerwa grudniowa bez kwoty w 12.2026, Stary cel 1 000 wyłączony) i „Plan EUR” (Wyjazd do
// Rzymu 2 000 EUR); wypłaty z 02.11.2026: pula Cele 6 000 zł i Bieżące 8 000 zł; w FI operacje mBanku z parą: +6 000
// i +8 000 (02.11), +1 500 (27.10 – para wypłaty persony z puli Cele z 25.10). Oceny w docs/audyt/raport/MG.md.
import { join } from 'node:path'
import { test } from '@playwright/test'
import { shot, start, text, useState } from './lab'
import {
  ACC,
  FORECAST,
  editJson,
  go,
  goalLine,
  ictjGuard,
  mgId,
  openDockRow,
  out,
  readDock,
  readJson,
  readNow,
  readStarmap,
  recordsOf,
  seedRecords,
  settingsTab,
  stepper,
  toasts,
  where,
  writeIctjPayout
} from './mg-pomoc'
import * as fs from 'node:fs'

const RUN = 'mg-2'
const STATE = 'rok + scenariusze „Plan testowy” i „Plan EUR” + wypłaty 02.11 (Cele 6 000, Bieżące 8 000) z parami w mBanku + para wypłaty Cele 1 500 z 25.10'
const F_TEST = '01KMXAMGRF0000000000000001'
const F_EUR = '01KMXAMGRF0000000000000002'
const G = { laptop: '01KMXAMGRG0000000000000001', rezerwa: '01KMXAMGRG0000000000000002', rezerwa12: '01KMXAMGRG0000000000000003', stary: '01KMXAMGRG0000000000000004', rzym: '01KMXAMGRG0000000000000005' }
const PAY_GOALS = '01KMXAMGR00000000000000911'
const PAY_CUR = '01KMXAMGR00000000000000912'

function forecastFile(ictjDir: string, id: string, data: Record<string, unknown>): string {
  const file = join(ictjDir, 'forecasts', `${id}.json`)
  fs.writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, id, createdAt: '2026-10-01T10:00:00.000Z', ...data }, null, 2)}\n`)
  return file
}

test('MG przebieg 2 – cele ICTTJ: dostawy, zmiana scenariusza, tylko do odczytu, bez kwoty, EUR', async () => {
  const st = useState('rok', RUN)
  const ictj = st.ictjDir!
  const dirs = { dataDir: st.dataDir, ictjDir: ictj }
  const testFile = forecastFile(ictj, F_TEST, {
    updatedAt: '2026-10-20T10:00:00.000Z',
    name: 'Plan testowy',
    currency: 'PLN',
    firstMonth: '2025-09',
    goals: [
      { id: G.laptop, name: 'Laptop', month: 20, amount: 5000, enabled: true, flexible: false },
      { id: G.rezerwa, name: 'Rezerwa', month: 15, amount: null, enabled: true, flexible: true },
      { id: G.rezerwa12, name: 'Rezerwa grudniowa', month: 16, amount: null, enabled: true, flexible: true },
      { id: G.stary, name: 'Stary cel', month: 18, amount: 1000, enabled: false, flexible: false }
    ]
  })
  forecastFile(ictj, F_EUR, {
    updatedAt: '2026-09-20T10:00:00.000Z',
    name: 'Plan EUR',
    currency: 'EUR',
    firstMonth: '2025-09',
    goals: [{ id: G.rzym, name: 'Wyjazd do Rzymu', month: 20, amount: 2000, enabled: true, flexible: false }]
  })
  writeIctjPayout(ictj, { id: PAY_GOALS, kind: 'withdrawal', date: '2026-11-02', amount: 6000, pool: 'goals' })
  writeIctjPayout(ictj, { id: PAY_CUR, kind: 'withdrawal', date: '2026-11-02', amount: 8000, pool: 'current' })
  seedRecords(st.dataDir, {
    transactions: [
      { id: mgId(11), date: '2026-11-02', accountId: ACC.mbank, kind: 'trading', amount: 600000, counterparty: 'XTB S.A.', title: 'WYPLATA SRODKOW' },
      { id: mgId(12), date: '2026-11-02', accountId: ACC.mbank, kind: 'trading', amount: 800000, counterparty: 'XTB S.A.', title: 'WYPLATA SRODKOW' },
      { id: mgId(13), date: '2026-10-27', accountId: ACC.mbank, kind: 'trading', amount: 150000, counterparty: 'XTB S.A.', title: 'WYPLATA SRODKOW' }
    ]
  })
  const guard = ictjGuard(RUN, ictj)
  const dump = out(RUN)
  const step = stepper(dump)
  const run = await start(RUN, { dataDir: st.dataDir, ictjDir: ictj })
  const page = run.page
  const goal = (name: string) => page.locator(`[data-testid="starmap-goal"][data-name="${name}"]`)
  const map = async () => {
    await go(page, '6', 'page-starmap')
    await page.waitForTimeout(800)
    return readStarmap(page)
  }
  const mapValues = async () => {
    const m = await map()
    return { ...Object.fromEntries(m.goals.map((g) => [g.name ?? '?', goalLine(g)])), zarchiwizowane: m.archived.join(' || '), naglowek: m.header, tempo: m.pace, prognoza: m.forecast }
  }
  const fiForecast = () => readJson(join(st.dataDir, 'fi.json')).settings?.ictj?.forecastId
  const dock = async (label: string, rowText: string, point: string, confirm: boolean) => {
    await go(page, '1', 'page-bridge')
    await page.waitForTimeout(1000)
    const ok = await openDockRow(page, rowText)
    if (!ok) {
      dump(`${point}-brak-wiersza-${rowText}`, (await text(page, 'section[data-panel="bridge:Dokowanie"]')).replace(/\s+/g, ' '))
      return null
    }
    const d = await readDock(page)
    await shot(page, `${point}-dokowanie-${rowText.replace(/\D/g, '')}`)
    await readNow(page, 'mg', point, `${STATE} – ${label}`, dirs, async () => d)
    if (confirm) {
      await page.getByTestId('docking-confirm').click()
      await page.waitForTimeout(1500)
      dump(`${point}-po-dokowaniu-${rowText.replace(/\D/g, '')}`, await where(page))
      if (await page.getByTestId('docking-done').count()) await page.keyboard.press('Escape')
    } else {
      await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(800)
    return d
  }
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    await page.waitForTimeout(6000)
    dump('0-dokowanie-panel', (await text(page, 'section[data-panel="bridge:Dokowanie"]')).replace(/\s+/g, ' '))

    // ---------------- MG.12 / MG.5: the map at the start, where the deliveries go
    await step('MG.12-start', async () => {
      await readNow(page, 'mg', 'MG.12', `${STATE} – mapa na starcie (scenariusz Plan główny)`, dirs, mapValues)
      await shot(page, 'MG.12-start')
    })
    await step('MG.12-biezace-podglad', async () => {
      await dock('okno dokowania Bieżące 8 000 zł (podgląd, bez zapisu) – dokąd idzie nadwyżka', '8 000,00', 'MG.12', false)
    })
    await step('MG.12-pula-cele-1500', async () => {
      await dock('okno dokowania pula Cele 1 500 zł (wpis 25.10, para 27.10) – zadokowane', '1 500,00', 'MG.12', true)
      await readNow(page, 'mg', 'MG.12', `${STATE} – mapa po dokowaniu puli Cele 1 500 zł`, dirs, mapValues)
      await shot(page, 'MG.12-po-1500')
    })

    // ---------------- MG.4: the scenario changed only after the confirmation
    await step('MG.4-anuluj', async () => {
      await readNow(page, 'mg', 'MG.4', `${STATE} – przed zmianą scenariusza`, dirs, mapValues)
      await settingsTab(page, 'ictj')
      const opts = await page.getByTestId('ictj-forecast').locator('option').allInnerTexts()
      await page.getByTestId('ictj-forecast').selectOption(F_TEST)
      await page.waitForTimeout(800)
      const box = await text(page, '[data-testid="ictj-forecast-confirm"]').catch(() => '(brak potwierdzenia)')
      await shot(page, 'MG.4-potwierdzenie')
      const fiBefore = fiForecast()
      await page.getByTestId('ictj-forecast-confirm').getByRole('button', { name: 'Anuluj' }).click()
      await page.waitForTimeout(1500)
      dump('MG.4-1-anuluj', { opcje: opts, okno: box, fiPrzedAnuluj: fiBefore, fiPoAnuluj: fiForecast(), wybor: await page.getByTestId('ictj-forecast').inputValue(), cele: recordsOf(st.dataDir, 'goals').map((g) => `${g.name} arch=${g.archived}`) })
      await readNow(page, 'mg', 'MG.4', `${STATE} – po „Anuluj”`, dirs, mapValues)
    })
    await step('MG.4-zmien', async () => {
      await settingsTab(page, 'ictj')
      await page.getByTestId('ictj-forecast').selectOption(F_TEST)
      await page.waitForTimeout(800)
      await page.getByTestId('ictj-forecast-confirm-ok').click()
      await page.waitForTimeout(3000)
      dump('MG.4-2-zmien', { fi: fiForecast(), cele: recordsOf(st.dataDir, 'goals').map((g) => `${g.name} src=${g.source} arch=${g.archived} target=${g.target}`) })
      await readNow(page, 'mg', 'MG.4', `${STATE} – po „Zmień scenariusz” na Plan testowy`, dirs, mapValues)
      await shot(page, 'MG.4-po-zmianie')
    })
    await step('MG.4-przenies', async () => {
      await go(page, '6', 'page-starmap')
      const row = page.locator('[data-testid="starmap-archived-row"]').filter({ hasText: 'Wkład własny' })
      const rowText = await row.innerText().catch(() => '(brak)')
      await row.getByTestId('starmap-archived-move').click()
      await page.getByTestId('starmap-money').waitFor({ state: 'visible', timeout: 10_000 })
      const dlg = (await text(page, '[data-testid="starmap-money"] [role="dialog"]')).replace(/\s+/g, ' ')
      await page.getByTestId('starmap-money-goal').check()
      await page.getByTestId('starmap-money').getByRole('combobox').selectOption({ label: 'Wakacje 2027' })
      await page.getByTestId('starmap-money-ok').click()
      await page.waitForTimeout(500)
      const t = await toasts(page)
      dump('MG.4-3-przenies', { wiersz: rowText, okno: dlg, toasty: t })
      await readNow(page, 'mg', 'MG.4', `${STATE} – po „przenieś środki” zarchiwizowanego Wkładu własnego do Wakacji 2027`, dirs, mapValues)
    })

    // ---------------- MG.2: ICTTJ goals read only
    await step('MG.2-odczyt', async () => {
      const m = await map()
      const laptop = goal('Laptop')
      const inputs = await laptop.locator('input').count()
      const nameInput = await laptop.getByLabel('Nazwa celu').count()
      const targetInput = await laptop.getByTestId('starmap-target').count()
      const archive = await laptop.getByTestId('starmap-archive').count()
      dump('MG.2-1-odczyt', { mapa: m, laptopInputy: inputs, poleNazwy: nameInput, poleKwoty: targetInput, archiwizuj: archive })
      await readNow(page, 'mg', 'MG.2', `${STATE} – scenariusz Plan testowy, przed zmianą w ICTTJ`, dirs, mapValues)
      await shot(page, 'MG.2-przed')
    })

    // ---------------- MG.3: the goal without a price in its month; MG.5: the tempo before and after a delivery of this month
    await step('MG.3-pula-cele-6000', async () => {
      const before = await map()
      await dock('okno dokowania pula Cele 6 000 zł (02.11, miesiąc Rezerwy)', '6 000,00', 'MG.3', true)
      const after = await map()
      dump('MG.3-1-tempo', { tempoPrzed: before.pace, tempoPo: after.pace })
      await readNow(page, 'mg', 'MG.3', `${STATE} – mapa po dokowaniu puli Cele 6 000 zł (11.2026)`, dirs, mapValues)
      await readNow(page, 'mg', 'MG.5', `${STATE} – tempo przed (${before.pace}) i po dokowaniu wpłaty z bieżącego miesiąca`, dirs, async () => ({ tempoPrzed: before.pace, tempoPo: after.pace }))
      await shot(page, 'MG.3-po-6000')
    })

    // ---------------- MG.2 (cont.): ICTTJ changes the amount of Laptop and removes Rezerwa – seen without a restart
    await step('MG.2-zmiana-w-ictj', async () => {
      guard.change('MG.2: Laptop 5 000 → 5 500, Rezerwa usunięta w scenariuszu Plan testowy', () =>
        editJson(testFile, (f) => ({ ...f, updatedAt: '2026-11-03T12:00:00.000Z', goals: (f.goals as Array<Record<string, unknown>>).filter((g) => g.id !== G.rezerwa).map((g) => (g.id === G.laptop ? { ...g, amount: 5500 } : g)) }))
      )
      const t0 = Date.now()
      let seen = ''
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(1500)
        const m = await readStarmap(page)
        const lap = m.goals.find((g) => g.name === 'Laptop')
        if (lap?.target?.includes('5 500')) {
          seen = `${Math.round((Date.now() - t0) / 1000)} s`
          break
        }
      }
      await page.waitForTimeout(2500)
      dump('MG.2-2-po-zmianie', { widacPo: seen || 'nie w 60 s', cele: recordsOf(st.dataDir, 'goals').filter((g) => g.source === 'ictj').map((g) => `${g.name} arch=${g.archived} target=${g.target}`) })
      await readNow(page, 'mg', 'MG.2', `${STATE} – po zmianie w ICTTJ (Laptop 5 500, Rezerwa usunięta), bez restartu`, dirs, mapValues)
      await shot(page, 'MG.2-po')
    })

    // ---------------- MG.3 (cont.): a scenario in EUR
    await step('MG.3-eur', async () => {
      await settingsTab(page, 'ictj')
      await page.getByTestId('ictj-forecast').selectOption(F_EUR)
      await page.waitForTimeout(800)
      const box = await text(page, '[data-testid="ictj-forecast-confirm"]').catch(() => '(brak potwierdzenia)')
      await page.getByTestId('ictj-forecast-confirm-ok').click().catch(() => undefined)
      await page.waitForTimeout(3000)
      const cur = await text(page, '[data-testid="ictj-currency"]').catch(() => '(brak)')
      await shot(page, 'MG.3-eur-ustawienia')
      dump('MG.3-2-eur-ustawienia', { okno: box, waluta: cur, fi: fiForecast() })
      await readNow(page, 'mg', 'MG.3', `${STATE} – scenariusz Plan EUR`, dirs, mapValues)
      await shot(page, 'MG.3-eur-mapa')
    })

    dump('bledy-okna', run.errors)
    dump('fi-scenariusz-na-koniec', { fi: fiForecast(), plan: FORECAST })
  } finally {
    await run.app.close().catch(() => undefined)
    dump('ictj-zmiany-aplikacji', guard.check())
  }
})
