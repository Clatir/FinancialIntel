/**
 * Audit KR – the first-run screen's other ways (KR.3, KR.4, KR.5).
 * KR.3: „Nowe dane gdzie indziej” on a lab folder with two foreign files.
 * KR.4: „Otwórz istniejące” – a copy of the state „rok”, a clean user data and another machine name (DRUGI-PC);
 *       „Nie” to the start with Windows; closed and started again.
 * KR.5: „Otwórz istniejące” on a copy of „rok” with every file read slowed (FI_OPEN_DELAY_MS 1500, FI_OPEN_SLOW_MS 1000);
 *       the progress read, „Otwórz folder logów”, „Przerwij”.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { LAB, answerDialogs, recorded, start, useState } from './lab'
import { Log, checksums, diff, logDiff } from './kr-pomoc'

/** A folder of two foreign files in the run's folder. */
function foreignFolder(name: string, sub: string): string {
  const foreign = join(LAB, 'przebiegi', name, sub)
  rmSync(foreign, { recursive: true, force: true })
  mkdirSync(foreign, { recursive: true })
  writeFileSync(join(foreign, 'notatki.txt'), 'Lista zakupów: chleb, mleko\r\n')
  writeFileSync(join(foreign, 'budzet-stary.xlsx'), Buffer.from('PK\u0003\u0004 fake xlsx content for the audit'))
  return foreign
}

for (const way of ['setup-create', 'setup-open'] as const) {
  test(`KR.3 – folder z obcymi plikami: ${way === 'setup-create' ? '„Nowe dane gdzie indziej”' : '„Otwórz istniejące”'}`, async () => {
    test.setTimeout(10 * 60_000)
    const NAME = `${process.env.KR_RUN ?? 'kr-obce'}-${way === 'setup-create' ? 'nowe' : 'otworz'}`
    const log = new Log(NAME)
    const foreign = foreignFolder(NAME, 'Dokumenty-test')
    const before = checksums(foreign)
    const run = await start(NAME, { usePreset: false })
    const { page, app } = run
    try {
      await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
      await answerDialogs(app, { paths: [foreign] })
      await page.getByTestId(way).click()
      await expect(page.getByTestId('setup-message').or(page.getByTestId('page-bridge'))).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(1500)
      log.line(`po wyborze folderu: komunikat ${await page.getByTestId('setup-message').count()}, Mostek ${await page.getByTestId('page-bridge').count()}`)
      await log.screen(page, 'okno po wyborze folderu', 'body')
      await log.shot(page, `KR.3-${way}`)
      if (await page.getByTestId('setup-message').count()) {
        const buttons = await page.locator('[data-testid="setup-message"] button').allInnerTexts()
        log.line(`przyciski w komunikacie: ${buttons.join(' | ')}`)
        logDiff(log, 'obcy folder po wyborze (przed utworzeniem)', diff(before, checksums(foreign)))
        if (await page.getByTestId('create-subfolder').count()) {
          await page.getByTestId('create-subfolder').click()
          await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 60_000 })
          await page.waitForTimeout(1500)
        }
      }
      log.line(`pasek ścieżki: ${await page.locator('header, [role="banner"]').first().innerText().catch(() => '?')}`)
      const after = checksums(foreign)
      logDiff(log, 'obcy folder na końcu', diff(before, after))
      log.line(`fi.json w podfolderze: ${after.has('FinancialIntel/fi.json')}, obok obcych plików: ${after.has('fi.json')}`)
      log.line(`obce pliki bez zmian: ${[...before.entries()].every(([k, v]) => after.get(k) === v)}`)
      log.line(`toasty: ${(await page.getByRole('status').allInnerTexts()).join(' || ')}`)
      log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
    } finally {
      await app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
    }
  })
}

test('KR.4 – otwórz istniejące z drugiego komputera', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'kr-istniejace'
  const log = new Log(NAME)
  const { dataDir } = useState('rok', NAME)
  const before = checksums(dataDir)
  let run = await start(NAME, { usePreset: false, machine: 'DRUGI-PC' })
  try {
    const { page, app } = run
    await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
    await answerDialogs(app, { paths: [dataDir] })
    await page.getByTestId('setup-open').click()
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 120_000 })
    await page.waitForTimeout(3000)
    await log.screen(page, 'okno po otwarciu', 'body')
    await log.shot(page, 'KR.4-mostek')
    log.line(`baner kreatora: ${await page.getByTestId('banner-wizard-start').count()}, baner autostartu: ${await page.getByTestId('banner-autostart-no').count()}, strona kreatora: ${await page.getByTestId('page-wizard').count()}`)
    await page.getByTestId('banner-autostart-no').click()
    await page.waitForTimeout(800)
    log.line(`po „Nie”: baner autostartu ${await page.getByTestId('banner-autostart-no').count()}`)
    log.line(`zapis laboratorium: ${JSON.stringify(await recorded(app))}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'folder po pierwszym otwarciu', diff(before, checksums(dataDir)))
  run = await start(NAME, { fresh: false, machine: 'DRUGI-PC', dataDir })
  try {
    const { page } = run
    await expect(page.getByTestId('page-bridge')).toBeVisible({ timeout: 120_000 })
    await page.waitForTimeout(3000)
    log.line(`drugi start: baner kreatora ${await page.getByTestId('banner-wizard-start').count()}, baner autostartu ${await page.getByTestId('banner-autostart-no').count()}`)
    await log.screen(page, 'banery po ponownym starcie', '[data-testid="page-bridge"]')
    await log.shot(page, 'KR.4-drugi-start')
    log.line(`zapis laboratorium: ${JSON.stringify(await recorded(run.app))}`)
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'folder po drugim starcie (od stanu rok)', diff(before, checksums(dataDir)))
})

test('KR.5 – postęp otwierania i „Przerwij”', async () => {
  test.setTimeout(10 * 60_000)
  const NAME = 'kr-postep'
  const log = new Log(NAME)
  const { dataDir } = useState('rok', NAME)
  const before = checksums(dataDir)
  log.line(`plików w folderze: ${before.size}`)
  const run = await start(NAME, { usePreset: false, env: { FI_OPEN_DELAY_MS: '1500', FI_OPEN_SLOW_MS: '1000' } })
  const { page, app } = run
  try {
    await expect(page.getByTestId('folder-setup')).toBeVisible({ timeout: 60_000 })
    await answerDialogs(app, { paths: [dataDir] })
    await page.getByTestId('setup-open').click()
    const seen = new Set<string>()
    for (let i = 0; i < 24; i++) {
      const p = page.getByTestId('open-progress')
      if (await p.count()) seen.add((await p.innerText().catch(() => '')).replace(/\s+/g, ' '))
      await page.waitForTimeout(250)
    }
    for (const s of seen) log.line(`panel: ${s}`)
    await expect(page.getByTestId('open-progress-cloud')).toBeVisible({ timeout: 30_000 })
    await log.screen(page, 'panel postępu', '[data-testid="open-progress"]')
    await log.shot(page, 'KR.5-postep')
    log.line(`pasek: ${await page.getByTestId('open-progress-bar').getAttribute('style')}`)
    await page.getByTestId('open-logs').click()
    await page.waitForTimeout(300)
    await page.getByTestId('open-cancel').click()
    await expect(page.getByTestId('folder-setup')).toBeVisible()
    await page.waitForTimeout(3000)
    await log.screen(page, 'po „Przerwij”', 'body')
    await log.shot(page, 'KR.5-przerwij')
    log.line(`Mostek widoczny: ${await page.getByTestId('page-bridge').count()}`)
    await page.getByTestId('setup-logs').click()
    await page.waitForTimeout(300)
    log.line(`zapis laboratorium: ${JSON.stringify(await recorded(app))}`)
    logDiff(log, 'folder po „Przerwij”', diff(before, checksums(dataDir)))
    log.line(`błędy okna: ${run.errors.length ? run.errors.join(' | ') : 'brak'}`)
  } finally {
    await app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'folder po zamknięciu', diff(before, checksums(dataDir)))
})
