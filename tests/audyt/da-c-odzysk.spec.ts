/**
 * Audit DA – recovery from a backup (DA.17–DA.20). Observation only: C:\FI-audyt\przebiegi\da-*\da.log.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LAB } from './lab'
import {
  OP,
  byId,
  Log, checksums, diff, findOp, folderEntries, goFolderTab, logDiff, makeZip, openOp, openRok, readJson, recordFiles, sleep, toasts, typeAmount } from './da-pomoc'

const runDir = (n: string) => join(LAB, 'przebiegi', n)

async function bridgeSum(page: Page): Promise<string> {
  await page.keyboard.press('Control+1')
  await page.getByTestId('page-bridge').waitFor()
  await page.waitForTimeout(800)
  const t = await page.getByTestId('page-bridge').innerText()
  return (t.match(/Suma kont budżetu: [^\n]+/)?.[0] ?? '?') + ' | ' + (t.match(/ENERGIA DZIŚ\n[^\n]+/)?.[0]?.replace('\n', ' ') ?? '?')
}

/** The recovery dialog's whole text with every difference opened. */
async function dialogText(page: Page): Promise<string> {
  const dialog = page.getByTestId('recover-dialog')
  const n = await dialog.getByTestId('recover-diff').count()
  for (let i = 0; i < n; i++) await dialog.getByTestId('recover-diff').nth(i).click().catch(() => undefined)
  await page.waitForTimeout(400)
  return (await dialog.innerText()).replace(/\n{2,}/g, '\n')
}

test('DA.17 / DA.18 – podgląd odzyskania i odzyskanie wybranych wpisów', async () => {
  test.setTimeout(20 * 60_000)
  const NAME = 'da-17'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  const cinema = () => byId(dataDir, OP.cinema)
  const ids = { cinema: cinema().rec.id, zoo: byId(dataDir, OP.zoo).rec.id, fryzjer: byId(dataDir, OP.fryzjer).rec.id }
  const fryzjerBefore = readFileSync(byId(dataDir, OP.fryzjer).path, 'utf8')
  try {
    log.line(`Mostek przed: ${await bridgeSum(page)}`)
    await goFolderTab(page)
    await page.getByTestId('backup-now').click()
    await page.waitForTimeout(3000)
    log.line(`kopia: ${await toasts(page)}`)
    await log.step('zmiany po kopii', async () => {
      await openOp(page, 'CINEMA CITY', OP.cinema)
      log.line(`edytor CINEMA kwota przed: ${await page.getByTestId('operation-amount').inputValue()}`)
      await typeAmount(page, 'operation-amount', '77,77')
      await page.waitForTimeout(800)
      await openOp(page, 'ZOOPLUS', OP.zoo)
      await typeAmount(page, 'operation-amount', '180')
      await page.waitForTimeout(800)
      await openOp(page, 'FRYZJER STYL', OP.fryzjer)
      await page.getByTestId('operation-delete').click()
      await page.getByTestId('operation-delete-confirm').click()
      await page.waitForTimeout(1000)
      await page.keyboard.press('Control+4')
      const env = page.locator('[data-testid="month-envelope"][data-name="Rozrywka i hobby"] input')
      log.line(`koperta Rozrywka przed: ${await env.inputValue()}`)
      await env.click()
      await env.fill('500')
      await env.press('Enter')
      await page.waitForTimeout(800)
      await page.keyboard.press('Control+,')
      await page.getByTestId('settings-tab-general').click()
      const ship = page.getByTestId('ship-name-input')
      await ship.fill('Orzeł Audytu')
      await ship.press('Enter')
      await page.waitForTimeout(800)
      await page.keyboard.press('Control+2')
      await page.keyboard.press('Control+n')
      await typeAmount(page, 'operation-amount', '12,50')
      await page.getByTestId('operation-counterparty').fill('Po kopii DA')
      await page.getByTestId('operation-counterparty').press('Enter')
      await page.waitForTimeout(1500)
      log.line(`pliki: CINEMA ${cinema().rec.amount}, ZOOPLUS ${byId(dataDir, OP.zoo).rec.amount}, FRYZJER ${recordFiles(dataDir, 'transactions').some((f) => f.rec.id === ids.fryzjer) ? 'jest' : 'usunięty'}, nowa ${recordFiles(dataDir, 'transactions').filter((f) => f.rec.counterparty === 'Po kopii DA').length}`)
      log.line(`plan: ${JSON.stringify(readJson(join(dataDir, 'months', '2026-11.json'))?.envelopes)}`)
      log.line(`fi.json shipName: ${readJson(join(dataDir, 'fi.json'))?.settings.shipName}`)
      log.line(`Mostek po zmianach: ${await bridgeSum(page)}`)
    })
    const before = checksums(dataDir, true)
    await log.step('DA.17 podgląd', async () => {
      await goFolderTab(page)
      const manual = page.locator('[data-testid="backup-row"]', { hasText: 'ręczna' }).first()
      await manual.getByTestId('backup-recover').click()
      await expect(page.getByTestId('recover-dialog')).toBeVisible()
      await page.waitForTimeout(1500)
      log.line(`--- okno odzyskania ---\n${await dialogText(page)}`)
      await log.shot(page, 'DA.17-podglad')
      await page.keyboard.press('Control+Shift+Digit4')
      await page.waitForTimeout(800)
      log.line(`--- okno odzyskania przy ukrytych kwotach ---\n${(await page.getByTestId('recover-dialog').innerText()).replace(/\n{2,}/g, '\n')}`)
      await log.shot(page, 'DA.17-ukryte')
      await page.keyboard.press('Control+Shift+Digit4')
      await page.waitForTimeout(800)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(800)
      logDiff(log, 'folder po samym podglądzie (wszystkie pliki)', diff(before, checksums(dataDir, true)))
    })
    await log.step('DA.18 odzyskanie wybranych', async () => {
      const manual = page.locator('[data-testid="backup-row"]', { hasText: 'ręczna' }).first()
      await manual.getByTestId('backup-recover').click()
      const dialog = page.getByTestId('recover-dialog')
      await expect(dialog).toBeVisible()
      await page.waitForTimeout(1200)
      await dialog.locator('[data-testid="recover-item"][data-change="deleted"]', { hasText: 'FRYZJER' }).getByTestId('recover-pick').check()
      await dialog.locator('[data-testid="recover-item"][data-change="changed"]', { hasText: 'CINEMA' }).getByTestId('recover-pick').check()
      log.line(`przycisk: ${await dialog.getByTestId('recover-selected').innerText()}`)
      const histBefore = existsSync(join(dataDir, '.history', 'transactions', ids.cinema)) ? readdirSync(join(dataDir, '.history', 'transactions', ids.cinema)) : []
      await dialog.getByTestId('recover-selected').click()
      await page.waitForTimeout(2500)
      log.line(`toast: ${await toasts(page)}`)
      await log.shot(page, 'DA.18-toast')
      const fr = recordFiles(dataDir, 'transactions').find((f) => f.rec.id === ids.fryzjer)
      log.line(`FRYZJER wrócił: ${!!fr} (${fr?.rel}), bajty jak przed usunięciem: ${fr ? readFileSync(fr.path, 'utf8') === fryzjerBefore : '-'}`)
      log.line(`CINEMA: ${cinema().rec.amount} (id ${cinema().rec.id === ids.cinema}), ZOOPLUS: ${byId(dataDir, OP.zoo).rec.amount}, nowa: ${recordFiles(dataDir, 'transactions').filter((f) => f.rec.counterparty === 'Po kopii DA').length}`)
      log.line(`plan: ${JSON.stringify(readJson(join(dataDir, 'months', '2026-11.json'))?.envelopes)}; shipName: ${readJson(join(dataDir, 'fi.json'))?.settings.shipName}`)
      const histAfter = readdirSync(join(dataDir, '.history', 'transactions', ids.cinema))
      log.line(`historia CINEMA: przed ${histBefore.join(', ')} → po ${histAfter.join(', ')}`)
      const fh = join(dataDir, '.history', 'transactions', ids.fryzjer)
      log.line(`historia FRYZJER: ${existsSync(fh) ? readdirSync(fh).join(', ') : 'brak'}`)
      await openOp(page, 'CINEMA CITY', OP.cinema)
      await page.getByTestId('operation-editor').getByTestId('history-open').click()
      await page.waitForTimeout(800)
      log.line(`--- Historia CINEMA ---\n${(await page.getByTestId('history-dialog').innerText()).replace(/\n{2,}/g, '\n')}`)
      await log.shot(page, 'DA.18-historia')
      await page.keyboard.press('Escape')
      log.line(`Mostek po odzyskaniu: ${await bridgeSum(page)}`)
    })
    await log.step('DA.18 Cofnij', async () => {
      await goFolderTab(page)
      const manual = page.locator('[data-testid="backup-row"]', { hasText: 'ręczna' }).first()
      await manual.getByTestId('backup-recover').click()
      const dialog = page.getByTestId('recover-dialog')
      await page.waitForTimeout(1200)
      log.line(`--- okno po odzyskaniu (nic do odzyskania z FRYZJER/CINEMA?) ---\n${(await dialog.innerText()).replace(/\n{2,}/g, '\n').slice(0, 800)}`)
      await dialog.locator('[data-testid="recover-item"]', { hasText: 'ZOOPLUS' }).getByTestId('recover-pick').check()
      await dialog.getByTestId('recover-selected').click()
      await page.waitForTimeout(2000)
      const toast = page.getByRole('status').filter({ hasText: 'Odzyskano z kopii' }).last()
      log.line(`toast przed Cofnij: ${(await toast.innerText()).replace(/\s+/g, ' ')}`)
      log.line(`ZOOPLUS po odzyskaniu: ${byId(dataDir, OP.zoo).rec.amount}`)
      await toast.getByTestId('toast-action').click()
      await page.waitForTimeout(2000)
      log.line(`po Cofnij: ${await toasts(page)}`)
      log.line(`ZOOPLUS po Cofnij: ${byId(dataDir, OP.zoo).rec.amount}; FRYZJER: ${recordFiles(dataDir, 'transactions').some((f) => f.rec.id === ids.fryzjer)}; CINEMA: ${cinema().rec.amount}`)
      log.line(`duplikaty id: ${(() => {
        const all = recordFiles(dataDir, 'transactions', true).map((f) => f.rec.id)
        return all.length - new Set(all).size
      })()}`)
    })
    await log.step('DA.18 Cofnij odzyskania dwóch (pierwszego)', async () => {
      // The first recovery's undo (FRYZJER back, CINEMA from the backup) – done again, then its „Cofnij”.
      await goFolderTab(page)
      log.line(`stan: FRYZJER ${recordFiles(dataDir, 'transactions').some((f) => f.rec.id === ids.fryzjer)}, CINEMA ${cinema().rec.amount}`)
    })
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.18b – „Cofnij” odzyskania usuniętej i zmienionej', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-18'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  const op = (cp: string) => recordFiles(dataDir, 'transactions').find((f) => f.rec.counterparty === cp)
  const fryzjerId = op('FRYZJER STYL')!.rec.id
  try {
    await goFolderTab(page)
    await page.getByTestId('backup-now').click()
    await page.waitForTimeout(3000)
    await openOp(page, 'CINEMA CITY', OP.cinema)
    await typeAmount(page, 'operation-amount', '77,77')
    await page.waitForTimeout(800)
    await openOp(page, 'FRYZJER STYL', OP.fryzjer)
    await page.getByTestId('operation-delete').click()
    await page.getByTestId('operation-delete-confirm').click()
    await page.waitForTimeout(1500)
    log.line(`po zmianach: CINEMA ${op('CINEMA CITY')?.rec.amount}, FRYZJER ${!!op('FRYZJER STYL')}`)
    const s0 = (await (async () => {
      await page.keyboard.press('Control+1')
      await page.waitForTimeout(800)
      return (await page.getByTestId('page-bridge').innerText()).match(/Suma kont budżetu: [^\n]+/)?.[0]
    })())
    log.line(`Mostek: ${s0}`)
    await goFolderTab(page)
    await page.locator('[data-testid="backup-row"]', { hasText: 'ręczna' }).first().getByTestId('backup-recover').click()
    const dialog = page.getByTestId('recover-dialog')
    await page.waitForTimeout(1200)
    await dialog.locator('[data-testid="recover-item"][data-change="deleted"]', { hasText: 'FRYZJER' }).getByTestId('recover-pick').check()
    await dialog.locator('[data-testid="recover-item"][data-change="changed"]', { hasText: 'CINEMA' }).getByTestId('recover-pick').check()
    await dialog.getByTestId('recover-selected').click()
    await page.waitForTimeout(2000)
    const toast = page.getByRole('status').filter({ hasText: 'Odzyskano z kopii' }).last()
    log.line(`toast: ${(await toast.innerText()).replace(/\s+/g, ' ')}`)
    log.line(`po odzyskaniu: CINEMA ${op('CINEMA CITY')?.rec.amount}, FRYZJER ${op('FRYZJER STYL')?.rec.id === fryzjerId}`)
    await toast.getByTestId('toast-action').click()
    await page.waitForTimeout(2500)
    log.line(`po Cofnij: toasty ${await toasts(page)}`)
    log.line(`po Cofnij: CINEMA ${op('CINEMA CITY')?.rec.amount}, FRYZJER ${!!op('FRYZJER STYL')}`)
    const all = recordFiles(dataDir, 'transactions', true).map((f) => f.rec.id)
    log.line(`duplikaty id: ${all.length - new Set(all).size}`)
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    log.line(`Mostek po Cofnij: ${(await page.getByTestId('page-bridge').innerText()).match(/Suma kont budżetu: [^\n]+/)?.[0]}`)
    // Again, and left.
    await goFolderTab(page)
    await page.locator('[data-testid="backup-row"]', { hasText: 'ręczna' }).first().getByTestId('backup-recover').click()
    await page.waitForTimeout(1200)
    await dialog.locator('[data-testid="recover-item"][data-change="deleted"]', { hasText: 'FRYZJER' }).getByTestId('recover-pick').check()
    await dialog.locator('[data-testid="recover-item"][data-change="changed"]', { hasText: 'CINEMA' }).getByTestId('recover-pick').check()
    await dialog.getByTestId('recover-selected').click()
    await page.waitForTimeout(2500)
    log.line(`drugie odzyskanie: CINEMA ${op('CINEMA CITY')?.rec.amount}, FRYZJER ${op('FRYZJER STYL')?.rec.id === fryzjerId}`)
    await page.keyboard.press('Control+1')
    await page.waitForTimeout(800)
    log.line(`Mostek: ${(await page.getByTestId('page-bridge').innerText()).match(/Suma kont budżetu: [^\n]+/)?.[0]}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})

test('DA.19 – odzyskanie całego folderu do nowego', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-19'
  const log = new Log(NAME)
  const { run, dataDir } = await openRok(NAME, { log })
  const { page } = run
  const before = checksums(dataDir)
  const parent = dirname(dataDir)
  try {
    for (let i = 1; i <= 2; i++) {
      await log.step(`odzyskanie całego folderu #${i}`, async () => {
        await goFolderTab(page)
        const daily = page.locator('[data-testid="backup-row"]', { hasText: 'dzienna' }).first()
        log.line(`kopia: ${(await daily.innerText()).replace(/\s+/g, ' ')}`)
        await daily.getByTestId('backup-recover').click()
        await expect(page.getByTestId('recover-dialog')).toBeVisible()
        await page.waitForTimeout(1000)
        log.line(`sekcja folderu: ${(await page.getByTestId('recover-folder-section').innerText()).replace(/\s+/g, ' ')}`)
        const t0 = Date.now()
        await page.getByTestId('recover-folder').click()
        const seen = new Set<string>()
        for (let k = 0; k < 60; k++) {
          const p = page.getByTestId('open-progress')
          if (await p.count()) seen.add((await p.innerText().catch(() => '')).replace(/\s+/g, ' ').replace(/\d+/g, 'N'))
          if ((await page.getByTestId('settings-data-dir').innerText().catch(() => '')).includes('kopia z') && !(await p.count())) break
          await sleep(300)
        }
        log.line(`postęp: ${[...seen].join(' || ') || '(nie widać)'}; ${Math.round((Date.now() - t0) / 1000)} s`)
        log.line(`toasty: ${await toasts(page)}`)
        const now = await page.getByTestId('settings-data-dir').innerText()
        log.line(`otwarty folder: ${now}`)
        log.line(`obok folderu danych: ${readdirSync(parent).join(' | ')}`)
        if (now !== dataDir && existsSync(now)) {
          const nd = checksums(now)
          const fromZip = new Map([...checksums(dataDir)].filter(([k]) => !k.startsWith('.history/')))
          logDiff(log, 'nowy folder vs bieżący (dane bez .history)', diff(fromZip, new Map([...nd].filter(([k]) => !k.startsWith('.history/')))), 10)
          log.line(`nowy folder ma fi.json: ${existsSync(join(now, 'fi.json'))}`)
        }
        await log.shot(page, `DA.19-nowy-${i}`)
        // Back through „Ostatnio używane foldery”.
        const back = page.locator('[data-testid="recent-folder-open"]')
        const rows = await page.locator('text=Ostatnio używane foldery').locator('..').innerText().catch(() => '')
        log.line(`ostatnio używane: ${rows.replace(/\s+/g, ' ')}`)
        const target = page.locator('div', { hasText: dataDir }).locator('[data-testid="recent-folder-open"]').last()
        if (await target.count()) await target.click()
        else await back.first().click()
        await expect(page.getByTestId('settings-data-dir')).toHaveText(dataDir, { timeout: 120_000 })
        await page.waitForTimeout(2000)
        log.line(`powrót: ${await page.getByTestId('settings-data-dir').innerText()}; toasty: ${await toasts(page)}`)
      })
    }
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
  logDiff(log, 'bieżący folder po (bez .presence i backups)', diff(before, checksums(dataDir)))
})

test('DA.20 – spreparowana albo uszkodzona kopia', async () => {
  test.setTimeout(15 * 60_000)
  const NAME = 'da-20'
  const log = new Log(NAME)
  const base = runDir(NAME)
  const candidates = () => [join(base, 'audyt.json'), join(LAB, 'przebiegi', 'audyt.json'), join(LAB, 'audyt.json'), join(base, 'dane', 'audyt.json'), 'C:\\audyt.json']
  const { run, dataDir } = await openRok(NAME, {
    log,
    prepare: (dir) => {
      void dir
    }
  })
  const { page } = run
  try {
    const daily = join(dataDir, 'backups', 'daily')
    const entries = folderEntries(dataDir)
    await makeZip(join(daily, '2026-10-01.zip'), [...entries, { name: 'xx/xx/audyt.json', data: '{"audyt": "ukośniki wsteczne"}\n' }], [['xx/xx/audyt.json', '..\\..\\audyt.json']])
    await makeZip(join(daily, '2026-10-02.zip'), [...entries, { name: 'yy/yy/audyt.json', data: '{"audyt": "ukośniki"}\n' }], [['yy/yy/audyt.json', '../../audyt.json']])
    const full = readFileSync(join(daily, '2026-11-03.zip'))
    writeFileSync(join(daily, '2026-10-03.zip'), full.subarray(0, Math.floor(full.length / 2)))
    const cinema = byId(dataDir, OP.cinema)
    const newer = entries.map((e) => (e.name === cinema.rel ? { name: e.name, data: Buffer.from(`${JSON.stringify({ ...cinema.rec, schemaVersion: 2, amount: -99999, nowePole: 'v2' }, null, 2)}\n`) } : e))
    await makeZip(join(daily, '2026-10-04.zip'), newer)
    log.line(`ZIP-y: ${readdirSync(daily).join(', ')}`)
    await page.keyboard.press('Control+1')
    await goFolderTab(page)
    for (const [name, label] of [
      ['2026-10-01.zip', '(a) ..\\..\\audyt.json'],
      ['2026-10-02.zip', '(a2) ../../audyt.json'],
      ['2026-10-03.zip', '(b) ucięty'],
      ['2026-10-04.zip', '(c) operacja v2']
    ] as const) {
      await log.step(label, async () => {
        const row = page.locator('[data-testid="backup-row"]', { hasText: name })
        log.line(`wiersz: ${(await row.innerText()).replace(/\s+/g, ' ')}`)
        await row.getByTestId('backup-recover').click()
        await page.waitForTimeout(2500)
        const dialog = page.getByTestId('recover-dialog')
        log.line(`okno: ${(await dialog.innerText().catch(() => '(brak okna)')).replace(/\n{2,}/g, '\n').slice(0, 1500)}`)
        log.line(`toasty: ${await toasts(page)}`)
        await log.shot(page, `DA.20-${name.replace('.zip', '')}`)
        if (label.startsWith('(c)')) {
          const item = dialog.locator('[data-testid="recover-item"]', { hasText: 'CINEMA' })
          log.line(`pozycja CINEMA: ${await item.count()} ${(await item.innerText().catch(() => '')).replace(/\s+/g, ' ')}`)
          if (await item.count()) {
            await item.getByTestId('recover-pick').check().catch((e) => log.line(`zaznaczenie: ${(e as Error).message.split('\n')[0]}`))
            await dialog.getByTestId('recover-selected').click().catch((e) => log.line(`odzyskaj: ${(e as Error).message.split('\n')[0]}`))
            await page.waitForTimeout(2000)
            log.line(`po próbie odzyskania: ${await toasts(page)}; CINEMA w pliku: ${byId(dataDir, OP.cinema).rec.amount}`)
          }
        }
        if (await dialog.count()) {
          // The whole folder from this backup: unpacked beside the data folder.
          const folderBtn = dialog.getByTestId('recover-folder')
          if ((await folderBtn.count()) && (await folderBtn.isEnabled())) {
            await folderBtn.click()
            await page.waitForTimeout(6000)
            log.line(`„cały folder”: toasty ${await toasts(page)}; folder ${await page.getByTestId('settings-data-dir').innerText()}`)
            if (!(await page.getByTestId('settings-data-dir').innerText()).endsWith('dane')) {
              const back = page.locator('[data-testid="recent-folder-open"]')
              for (let i = 0; i < (await back.count()); i++) {
                const rowText = await back.nth(i).locator('..').innerText()
                if (rowText.includes(`${NAME}\\dane`) && !rowText.includes('kopia z')) {
                  await back.nth(i).click()
                  break
                }
              }
              await page.waitForTimeout(4000)
              log.line(`powrót: ${await page.getByTestId('settings-data-dir').innerText()}`)
            }
          } else {
            await page.keyboard.press('Escape')
          }
        }
        await page.waitForTimeout(800)
        if (await page.getByTestId('recover-dialog').count()) await page.keyboard.press('Escape')
        log.line(`audyt.json poza folderem: ${candidates().filter(existsSync).join(', ') || 'brak'}`)
        log.line(`obok folderu danych: ${readdirSync(base).join(' | ')}`)
      })
    }
    log.line(`okno działa: ${await page.evaluate(() => 2).catch(() => 'NIE')}; błędy okna: ${run.errors.join(' | ') || 'brak'}`)
  } finally {
    await run.app.close().catch((e) => log.line(`zamknięcie: ${(e as Error).message}`))
  }
})
