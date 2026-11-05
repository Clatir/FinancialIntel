/**
 * R1 (1.16.0), AP-47 (T475): the data folder's description is the schemas' – every field of every record has its words,
 * no words for a field that is gone, and `docs/format-folderu.md` is the one generated from the schemas of now
 * (`npm run docs:format` writes it again).
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { allPaths, fieldsOf, folderFormat, hasBase } from '../../scripts/format-folderu'
import { FIELD_WORDS } from '../../scripts/format-folderu-pola'
import { SCHEMAS } from '@shared/records'
import { COLLECTIONS } from '@shared/paths'
import { transactionSchema } from '@shared/schema'
import { FOLDER_FORMAT_PAGE } from '@shared/update'

describe('AP-47: opis formatu folderu ze schematów', () => {
  it('każde pole każdego rekordu ma opis (pole spoza opisu – test pada)', () => {
    const missing = allPaths().filter((p) => !FIELD_WORDS[p]?.trim())
    expect(missing).toEqual([])
  })

  it('żadnego opisu pola, którego schematy nie mają', () => {
    const paths = new Set(allPaths())
    expect(Object.keys(FIELD_WORDS).filter((k) => !paths.has(k))).toEqual([])
  })

  it('nowe pole w schemacie wychodzi w opisie – generator widzi je, póki nie ma słów', () => {
    const wider = transactionSchema.extend({ receiptPhoto: z.string().optional() })
    const field = fieldsOf(wider).find((f) => f.path === 'receiptPhoto')
    expect(field).toEqual({ path: 'receiptPhoto', type: 'tekst', presence: 'opcjonalne' })
    expect(FIELD_WORDS['transactions:receiptPhoto']).toBeUndefined()
  })

  it('każdy rekord ma pola wspólne (wersja, id, czasy)', () => {
    for (const kind of ['fi', ...COLLECTIONS] as const) expect(hasBase(SCHEMAS[kind]), kind).toBe(true)
  })

  it('typy i obecność: grosze, data, ULID, wyliczenie, domyślne, null', () => {
    const tx = new Map(fieldsOf(SCHEMAS.transactions).map((f) => [f.path, f]))
    expect(tx.get('amount')).toEqual({ path: 'amount', type: 'grosze (liczba całkowita)', presence: 'wymagane' })
    expect(tx.get('date')?.type).toBe('data RRRR-MM-DD')
    expect(tx.get('accountId')?.type).toBe('ULID')
    expect(tx.get('kind')?.presence).toBe('domyślnie `"expense"`')
    expect(tx.get('categoryId')?.presence).toBe('domyślnie `null`, może być `null`')
    expect(tx.get('splits[].amount')?.type).toBe('grosze (liczba całkowita)')
    // A shared part described once: its fields are not repeated under the operation.
    expect(tx.get('bank')?.type).toContain('Wiersz z banku')
    expect([...tx.keys()].some((p) => p.startsWith('bank.'))).toBe(false)
    expect(fieldsOf(SCHEMAS.scheduled).find((f) => f.path === 'remind')?.presence).toBe('domyślnie `[14,3]`')
  })

  it('docs/format-folderu.md jest aktualny (inaczej: npm run docs:format)', async () => {
    await expect(folderFormat()).toMatchFileSnapshot('../../docs/format-folderu.md')
  })

  it('link w Ustawieniach prowadzi do tego pliku w repozytorium', () => {
    expect(FOLDER_FORMAT_PAGE).toMatch(/^https:\/\/github\.com\/Clatir\/FinancialIntel\/blob\/main\/docs\/format-folderu\.md$/)
    expect(existsSync(join(__dirname, '../../docs/format-folderu.md'))).toBe(true)
  })
})
