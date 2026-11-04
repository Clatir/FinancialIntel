/**
 * W1 – IM.23 = P.3 (W): a member's transfer imported with the person's setting „reszta jako zaliczka” – does it repay
 * what the member owes first (spec „Rozliczenia z domownikami”, D80 b, D91 c) or go whole to the deposit (1.15.3
 * `inflowKind`)? State: plain „rok” – Marek owes 360,00 zł (EVENTIM 20.08), his setting „advance”. A list file with one
 * row: MAREK TESTOWY +100,00 zł on 02.11 (cut from the IM team's L1, the PIOTR TESTOWY row with the name and amount
 * changed, bytes kept). Run a: the group as the import proposes it (nothing clicked); run b: „zaliczka” clicked.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import { LAB, answerDialogs, shot, start, useState } from './lab'
import { readable } from './im-pomoc'
import { logger, recs } from './w1-pomoc'

function markFile(dst: string): void {
  const lines = readFileSync(join(LAB, 'pliki', 'im', 'L1.csv')).toString('latin1').split('\r\n')
  const hdrEnd = lines.findIndex((l) => l.startsWith('#Data operacji'))
  const head = lines.slice(0, hdrEnd + 1).map((l, i) => (i > 0 && lines[i - 1].startsWith('#Za okres') ? '02.11.2026;02.11.2026;;' : l))
  const piotr = lines.find((l) => l.includes('PIOTR TESTOWY'))!
  const row = piotr.replace(/^\d\d\.\d\d\.\d{4}/, '02.11.2026').replace('PIOTR TESTOWY, OD TATY I BABCI', 'MAREK TESTOWY, ZWROT ZA BILETY').replace('0000 0002', '0000 0003').replace('300,00 PLN', '100,00 PLN')
  const tail = lines.slice(hdrEnd + 1).filter((l) => !/^\d\d\.\d\d\.\d{4};/.test(l))
  writeFileSync(dst, Buffer.from([...head, row, ...tail].join('\r\n'), 'latin1'))
}

for (const variant of ['a', 'b'] as const) {
  test(`W1 IM.23 ${variant} – wpłata Marka ${variant === 'a' ? '(propozycja importu)' : '(„zaliczka” kliknięta)'}`, async () => {
    test.setTimeout(10 * 60_000)
    const RUN = `w1-im23${variant}`
    const log = logger(RUN)
    const { dataDir, ictjDir } = useState('rok', RUN)
    const file = join(LAB, 'przebiegi', RUN, 'W1-marek-0211.csv')
    markFile(file)
    const { app, page } = await start(RUN, { dataDir, ictjDir })
    const marek = async (label: string) => {
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(1500)
      const t = (await page.evaluate(() => document.body.innerText)).replace(/[ \t]+/g, ' ')
      await page.keyboard.press('Control+7')
      await page.waitForTimeout(1500)
      const r = (await page.evaluate(() => document.body.innerText)).replace(/[ \t]+/g, ' ')
      log(label, { mostek: t.match(/[^\n]*Marek[^\n]*/g), radar: r.match(/[^\n]*Marek[^\n]*\n?[^\n]*/g)?.slice(0, 4) })
    }
    try {
      await page.getByTestId('page-bridge').waitFor({ timeout: 90_000 })
      await page.waitForTimeout(3000)
      await marek('przed')
      await page.keyboard.press('Control+3')
      await page.getByTestId('page-import').waitFor({ timeout: 60_000 })
      await answerDialogs(app, { paths: [file] })
      await page.getByTestId('import-pick').click()
      await page.getByTestId('import-file').waitFor({ timeout: 60_000 })
      await page.waitForTimeout(1500)
      const done = page.getByTestId('import-section-done')
      if ((await done.count()) && !(await done.locator('[data-testid="import-theme"]').count())) await done.locator('button').first().click().catch(() => undefined)
      await page.waitForTimeout(800)
      const group = page.locator('[data-testid="import-group"][data-label="MAREK TESTOWY"]').first()
      log('grupa – przed', await readable(page, '[data-testid="import-groups"]'))
      const pressed = async () => group.locator('[role="radio"]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).innerText}=${e.getAttribute('aria-checked')}`))
      log('przełącznik – stan proponowany', await pressed().catch((e) => String(e)))
      if (variant === 'b') {
        await group.getByRole('radio', { name: 'zaliczka' }).click()
        await page.waitForTimeout(500)
        log('przełącznik – po „zaliczka”', await pressed())
      }
      await shot(page, `W1-IM.23-${variant}-grupa`)
      await page.getByTestId('import-run').click()
      await page.getByTestId('import-done').waitFor({ timeout: 60_000 }).catch(() => undefined)
      await page.waitForTimeout(2000)
      log('wynik importu', (await page.getByTestId('import-done').innerText().catch(() => '(brak)')).replace(/\s+/g, ' '))
      log('plik – wpłata Marka', recs(dataDir, 'transactions').filter((t) => /MAREK/.test(t.counterparty ?? '')).map((t) => `${t.date} ${t.amount} member=${String(t.memberId).slice(-4)} inflowKind=${t.inflowKind ?? '-'} advance=${t.advance} covers=${JSON.stringify(t.covers ?? [])}`))
      await marek('po imporcie')
      await shot(page, `W1-IM.23-${variant}-radar`)
    } finally {
      await app.close()
    }
  })
}
