// DW, przebieg 12 (DW.14, DW.31): na kopii „rok” dni od 30.10 wycofane z gry; kontener 700 zł/mies. z długą polską nazwą
// dodany 30.10 (masa ponad linią 40 %), z nazwą zmienioną 01.11 (updatedAt), kwota bez zmian od 30.10 (amountAt).
// Aplikacja zamraża 30.10–01.11. Potem w Ładowni dziś: zmiana nazwy (300 znaków) → „Dziś na razie”, podniesienie kwoty →
// „Dziś na razie”. Narzędzie obserwacji – oceny w docs/audyt/raport/DW.md.
import { test } from '@playwright/test'
import { reading, shot, start, text, useState } from './lab'
import { addRecords, command, dropGameDays, gameFiles, go, MBANK, out, textOf, todayLine, toasts } from './dw-pomoc'

const NAME80 = 'Żółć ęśąłńź – długi kontener: ubezpieczenie mieszkania i garażu na Mazowszu, rata'
const NAME300 = `${'Zażółć gęślą jaźń – ubezpieczenie domu, garażu i piwnicy w Łodzi; '.repeat(5)}koniec`

test('DW.14 / DW.31 – ładunek ponad linią zanurzenia', async () => {
  const RUN = 'dw-12'
  const st = useState('rok', RUN)
  const dump = out(RUN)
  const dropped = dropGameDays(st.dataDir, '2026-10-30')
  const [c] = addRecords(st.dataDir, 'containers', [
    { name: NAME80.slice(0, 80), type: 'fixed', amount: 70000, cycleMonths: 1, dueMonth: '2026-10', dueDay: 28, accountId: MBANK, from: '2026-10', createdAt: '2026-10-30T09:00:00.000Z', updatedAt: '2026-11-01T09:00:00.000Z', amountAt: '2026-10-30T09:00:00.000Z' }
  ])
  dump('wariant', { dropped, kontener: c?.id, nazwa: c?.name, dlugosc: String(c?.name).length })
  const r = await start(RUN, { dataDir: st.dataDir, ictjDir: st.ictjDir })
  const page = r.page
  try {
    await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500)
      if (await page.getByTestId('celebration').count()) await page.keyboard.press('Escape')
    }
    const s: Record<string, unknown> = {}
    await go(page, '8', 'page-command')
    const c0 = await command(page)
    s.dziennik = (c0.log as string[]).slice(0, 14)
    s.dzis0 = c0.today
    s.gra = gameFiles(st.dataDir)
    await shot(page, 'DW.31-dziennik')
    s.panelSzerokosc = await page.getByTestId('command-log').evaluate((e) => ({ scroll: e.scrollWidth, client: e.clientWidth }))
    // Ładownia: the container renamed with 300 characters, then its amount raised.
    await go(page, '5', 'page-cargo')
    const row = page.getByTestId('cargo-row').filter({ hasText: 'Żółć' }).first()
    await row.click()
    await page.waitForTimeout(800)
    const nameField = page.getByTestId('container-name').first()
    await nameField.click()
    await nameField.fill(NAME300)
    await nameField.press('Tab')
    await page.waitForTimeout(800)
    s.nazwaPole = await nameField.inputValue()
    s.nazwaDlugosc = s.nazwaPole ? String(s.nazwaPole).length : 0
    s.toastyNazwa = await toasts(page)
    s.dzisPoNazwie = await todayLine(page)
    await go(page, '5', 'page-cargo')
    const row2 = page.getByTestId('cargo-row').filter({ hasText: 'Zażółć' }).first()
    if (await row2.count()) await row2.click()
    else await page.getByTestId('cargo-row').filter({ hasText: 'Żółć' }).first().click()
    await page.waitForTimeout(800)
    const amount = page.getByTestId('container-amount').first()
    await amount.click()
    await amount.fill('800')
    await amount.press('Tab')
    await page.waitForTimeout(1000)
    s.toastyKwota = await toasts(page)
    await shot(page, 'DW.14-ladownia')
    s.dzisPoKwocie = await todayLine(page)
    await shot(page, 'DW.14-dowodztwo')
    s.dziennikPo = ((await command(page)).log as string[]).slice(0, 6)
    dump('kroki', s)
    reading('dw', 'DW.14', 'rok + kontener 700 zł od 30.10', { dziennik: JSON.stringify(s.dziennik), dzisPoNazwie: String(s.dzisPoNazwie), dzisPoKwocie: String(s.dzisPoKwocie) })
    dump('bledy', r.errors)
    dump('pasek-bledow', await text(page).then((t) => t.split('\n').filter((l) => /błąd|nie udało/i.test(l))))
  } finally {
    await r.app.close()
  }
})
