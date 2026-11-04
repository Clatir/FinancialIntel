/**
 * The package of the virtual machine (docs/audyt/maszyna.md, AU-3): C:\FI-vm-pakiet – the persona's folder and ICTTJ's,
 * the bank's files (with a double charge for ME.9), a new ICTTJ payout (DO.20), the points and the instruction. Shared
 * read-only with the machine. Run after persona.spec.ts: `npx playwright test -c playwright.audyt.config.ts pakiet`.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from '@playwright/test'
import { addDays } from '../../src/shared/calc/dates'
import { LAB } from './lab'
import { cp1250, fid, listaCsv, type BankEvent } from './persona'

const PAKIET = 'C:\\FI-vm-pakiet'

test('pakiet maszyny wirtualnej', () => {
  const { anchor } = JSON.parse(readFileSync(join(LAB, 'stany', 'rok.persona.json'), 'utf8')) as { anchor: string }
  rmSync(PAKIET, { recursive: true, force: true })
  mkdirSync(join(PAKIET, 'pliki'), { recursive: true })
  mkdirSync('C:\\FI-vm-raport', { recursive: true })
  cpSync(join(LAB, 'stany', 'rok'), join(PAKIET, 'rok'), { recursive: true })
  cpSync(join(LAB, 'stany', 'ictj-rok'), join(PAKIET, 'ictj'), { recursive: true })
  cpSync(join(LAB, 'pliki'), join(PAKIET, 'pliki'), { recursive: true })
  cpSync(resolve('docs', 'audyt', 'punkty'), join(PAKIET, 'punkty'), { recursive: true })
  cpSync(resolve('docs', 'audyt', 'maszyna.md'), join(PAKIET, 'maszyna.md'))

  // ME.9: the same brand and amount charged on two days in a row (a possible double charge), after the persona's data.
  const card = (d: string, merchant: string, amount: number): BankEvent => ({ ref: merchant, date: d, op: 'ZAKUP PRZY UŻYCIU KARTY', title: `${merchant} /TESTOWO`, who: '  ', acct: "''", amount })
  const rows = [card(addDays(anchor, 1), 'ALLEGRO', -12999), card(addDays(anchor, 2), 'ALLEGRO', -12999), card(addDays(anchor, 2), 'BIEDRONKA 1234', -6420), card(addDays(anchor, 3), 'KAWIARNIA MOKKA', -1450)]
  writeFileSync(join(PAKIET, 'pliki', 'rok-podwojne.csv'), cp1250(listaCsv(rows, addDays(anchor, 1), addDays(anchor, 3))))

  // DO.20: a new payout of ICTTJ, copied into the machine's ICTTJ folder while FI is in the tray.
  const id = fid(70, 90)
  const payout = { schemaVersion: 1, id, createdAt: `${anchor}T19:00:00.000Z`, updatedAt: `${anchor}T19:00:00.000Z`, kind: 'withdrawal', date: anchor, amount: 2200, pool: 'current', note: '', categoryId: null, goal: null }
  const name = `${anchor}_${id}.json`
  writeFileSync(join(PAKIET, 'pliki', name), `${JSON.stringify(payout, null, 2)}\n`)
  writeFileSync(
    join(PAKIET, 'pliki', 'CZYTAJ.txt'),
    [
      'Pliki pakietu (dane syntetyczne – persona „Kapitan Testowy”):',
      '- rok-historia.csv – historia rachunku z 14 miesięcy (import w kreatorze, SY.3);',
      '- rok-nowe-lista.csv, rok-nowe-historia.csv – ostatni tydzień, jeszcze nie zaimportowany (IM.37);',
      '- rok-podwojne.csv – podwójne obciążenie ALLEGRO (ME.9);',
      `- ${name} – nowa wypłata ICTTJ 2 200 zł (DO.20): skopiuj ją do C:\\FI-test\\ictj\\payouts\\${anchor.slice(0, 4)}\\`,
      '  przy aplikacji w zasobniku.',
      ''
    ].join('\r\n')
  )
  console.log(`pakiet: ${PAKIET} (kotwica ${anchor}), raport: C:\\FI-vm-raport, istnieje: ${existsSync(join(PAKIET, 'rok', 'fi.json'))}`)
})
