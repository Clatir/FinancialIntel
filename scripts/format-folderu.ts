/**
 * The data folder's format for the user's own tools (AP-47, T475): `docs/format-folderu.md` generated from the zod
 * schemas (`src/shared/schema`, `SCHEMAS`) and the Polish words of each field (`format-folderu-pola.ts`) – the schemas
 * are the source, so the description never drifts from them: `tests/unit/format-folderu.test.ts` fails on a field
 * without its words and on a file not generated from the schemas of now (`npm run docs:format` writes it again).
 */
import { SCHEMAS } from '../src/shared/records'
import { COLLECTIONS, LAYOUTS, type FileKind } from '../src/shared/paths'
import { clockTime, grosze, isoDate, isoMonth, recordBase, SCHEMA_VERSION, ulidSchema } from '../src/shared/schema/common'
import { bankRowSchema, importBatchSettingsSchema, shareSchema, transactionSchema } from '../src/shared/schema/records'
import { FIELD_WORDS, KIND_WORDS, PART_WORDS } from './format-folderu-pola'

/** A field of a record as the description lists it. */
export interface Field {
  /** Its path: `a.b` – a field of an object, `a[]` – an item of a list, `a{}` – a value of a map. */
  path: string
  type: string
  /** 'wymagane', 'opcjonalne', „domyślnie …”. */
  presence: string
}

/** The parts several records share – described once, in their own section. */
export const PARTS = [
  { key: 'bank', schema: bankRowSchema, title: 'Wiersz z banku (`bank`, `counterBank`)' },
  { key: 'share', schema: shareSchema, title: 'Wspólny zakup (`share`)' },
  { key: 'importSettings', schema: importBatchSettingsSchema, title: 'Ustawienia importu przed i po (`before`, `after` w `imports/`)' }
] as const
export type PartKey = (typeof PARTS)[number]['key']

type Def = { type: string; [k: string]: unknown }
const defOf = (s: unknown): Def | null => ((s as { _zod?: { def?: Def } })?._zod?.def ?? null)
const WRAPPERS = new Set(['default', 'prefault', 'optional', 'nullable', 'catch', 'readonly', 'nonoptional'])

/** The checks of the shared basic types (a derived schema – `grosze.min(0)` – keeps them, `common.ts`). */
const checksOf = (s: unknown): unknown[] => (defOf(s)?.checks as unknown[] | undefined) ?? []
const BASIC: Array<{ check: unknown; name: string }> = [
  { check: checksOf(ulidSchema)[0], name: 'ULID' },
  { check: checksOf(isoDate)[0], name: 'data RRRR-MM-DD' },
  { check: checksOf(isoMonth)[0], name: 'miesiąc RRRR-MM' },
  { check: checksOf(clockTime)[0], name: 'godzina GG:MM' },
  { check: checksOf(grosze)[0], name: 'grosze (liczba całkowita)' }
]

interface Unwrapped {
  inner: unknown
  optional: boolean
  nullable: boolean
  hasDefault: boolean
  defaultValue?: unknown
}

function unwrap(s: unknown): Unwrapped {
  const out: Unwrapped = { inner: s, optional: false, nullable: false, hasDefault: false }
  for (;;) {
    const d = defOf(out.inner)
    if (!d) return out
    if (d.type === 'pipe') {
      out.inner = d.in
      continue
    }
    if (d.type === 'lazy') {
      out.inner = (d.getter as () => unknown)()
      continue
    }
    if (!WRAPPERS.has(d.type)) return out
    if (d.type === 'optional') out.optional = true
    if (d.type === 'nullable') out.nullable = true
    if ((d.type === 'default' || d.type === 'prefault') && !out.hasDefault) {
      out.hasDefault = true
      out.defaultValue = d.defaultValue
    }
    out.inner = d.innerType
  }
}

const partOf = (s: unknown): (typeof PARTS)[number] | null => PARTS.find((p) => p.schema === s) ?? null

function typeName(s: unknown): string {
  const u = unwrap(s)
  const d = defOf(u.inner)
  if (!d) return 'dowolna wartość'
  if (u.inner === transactionSchema) return 'operacja (jak w `transactions/`)'
  const part = partOf(u.inner)
  if (part) return `obiekt – zob. „${part.title.replace(/ \(.*$/, '')}”`
  switch (d.type) {
    case 'string': {
      if (d.format === 'datetime') return 'chwila ISO 8601 (UTC)'
      const basic = BASIC.find((b) => checksOf(u.inner).includes(b.check))
      return basic?.name ?? 'tekst'
    }
    case 'number': {
      const basic = BASIC.find((b) => checksOf(u.inner).includes(b.check))
      if (basic) return basic.name
      const int = checksOf(u.inner).some((c) => /int/.test(String(defOf(c)?.format ?? '')))
      return int ? 'liczba całkowita' : 'liczba'
    }
    case 'boolean':
      return 'tak / nie (`true` / `false`)'
    case 'enum':
      return `jedna z: ${Object.values(d.entries as Record<string, string>)
        .map((v) => `\`${v}\``)
        .join(', ')}`
    case 'custom':
      return 'tekst z listy (nowsza wersja może dodać wartość)'
    case 'literal':
      return (d.values as unknown[]).map((v) => `\`${String(v)}\``).join(', ')
    case 'union':
      return (d.options as unknown[]).map(typeName).join(' albo ')
    case 'array':
      return `lista: ${typeName(d.element)}`
    case 'record':
      return `mapa: ${typeName(d.keyType)} → ${typeName(d.valueType)}`
    case 'object':
      return 'obiekt'
    case 'unknown':
    case 'any':
      return 'dowolna wartość'
    default:
      return d.type
  }
}

function presenceOf(s: unknown): string {
  const u = unwrap(s)
  const nullable = u.nullable ? ', może być `null`' : ''
  if (u.hasDefault) {
    const v = u.defaultValue
    const shown =
      v === null ? '`null`' : typeof v === 'number' || typeof v === 'boolean' ? `\`${String(v)}\`` : typeof v === 'string' ? `\`"${v}"\`` : Array.isArray(v) && !v.length ? 'pusta lista' : Array.isArray(v) && v.every((x) => typeof x !== 'object') ? `\`${JSON.stringify(v)}\`` : typeof v === 'object' && !Object.keys(v).length ? 'pusty obiekt' : 'zestaw startowy'
    return `domyślnie ${shown}${nullable}`
  }
  return `${u.optional ? 'opcjonalne' : 'wymagane'}${nullable}`
}

/** The fields of a schema, depth first; a shared part (`PARTS`) or an operation in it – one line, no fields below. */
export function fieldsOf(schema: unknown, skipBase = true): Field[] {
  const out: Field[] = []
  const walk = (s: unknown, path: string) => {
    const u = unwrap(s)
    if (path && (partOf(u.inner) || u.inner === transactionSchema)) return
    const d = defOf(u.inner)
    if (!d) return
    if (d.type === 'object') {
      for (const [k, v] of Object.entries(d.shape as Record<string, unknown>)) {
        if (!path && skipBase && (recordBase as Record<string, unknown>)[k] === v) continue
        const p = path ? `${path}.${k}` : k
        out.push({ path: p, type: typeName(v), presence: presenceOf(v) })
        walk(v, p)
      }
    } else if (d.type === 'array') walk(d.element, `${path}[]`)
    else if (d.type === 'record') walk(d.valueType, `${path}{}`)
    else if (d.type === 'union') for (const o of d.options as unknown[]) walk(o, path)
  }
  walk(schema, '')
  return out
}

/** Does the record have every common field (`recordBase`)? fi.json's `createdAt` is its own, the same type. */
export function hasBase(schema: unknown): boolean {
  const shape = defOf(unwrap(schema).inner)?.shape as Record<string, unknown> | undefined
  return !!shape && Object.keys(recordBase).every((k) => k in shape)
}

/** Every path of every record and part: `kind:path` – the keys of `FIELD_WORDS`. */
export function allPaths(): string[] {
  const out: string[] = []
  for (const kind of ['fi', ...COLLECTIONS] as FileKind[]) for (const f of fieldsOf(SCHEMAS[kind])) out.push(`${kind}:${f.path}`)
  for (const p of PARTS) for (const f of fieldsOf(p.schema)) out.push(`${p.key}:${f.path}`)
  for (const k of Object.keys(recordBase)) out.push(`base:${k}`)
  return out
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

function table(key: string, fields: Field[]): string {
  const rows = fields.map((f) => `| \`${f.path}\` | ${cell(f.type)} | ${cell(f.presence)} | ${cell(FIELD_WORDS[`${key}:${f.path}`] ?? '')} |`)
  return ['| Pole | Typ | Obecność | Co znaczy |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

const FILE_OF: Record<FileKind, string> = {
  fi: '`fi.json`',
  ...(Object.fromEntries(COLLECTIONS.map((c) => [c, LAYOUTS[c] === 'dated' ? `\`${c}/RRRR/RRRR-MM-DD_ULID.json\`` : LAYOUTS[c] === 'month' ? `\`${c}/RRRR-MM.json\`` : `\`${c}/ULID.json\``])) as Record<string, string>)
} as Record<FileKind, string>

/** The whole `docs/format-folderu.md`. */
export function folderFormat(): string {
  const parts: string[] = [INTRO.trim(), '', '## Pola rekordów', '', FIELDS_INTRO.trim(), '']
  parts.push('### Pola każdego rekordu', '', 'Każdy plik rekordu (także `fi.json`) ma na początku te pola:', '')
  parts.push(table('base', fieldsOf(SCHEMAS.transactions, false).filter((f) => f.path in recordBase)), '')
  for (const kind of ['fi', ...COLLECTIONS] as FileKind[]) {
    const words = KIND_WORDS[kind]
    parts.push(`### ${words.title} – ${FILE_OF[kind]}`, '', words.text.trim(), '', table(kind, fieldsOf(SCHEMAS[kind])), '')
  }
  parts.push('### Części wspólne', '')
  for (const p of PARTS) parts.push(`#### ${p.title}`, '', PART_WORDS[p.key].trim(), '', table(p.key, fieldsOf(p.schema)), '')
  return `${parts.join('\n').trim()}\n`
}

/** The schema version written in every file now (`schemaVersion`). */
const VERSION = SCHEMA_VERSION

const INTRO = `
<!-- Plik generowany: npm run docs:format (scripts/format-folderu.ts ze schematów src/shared/schema). Nie edytuj ręcznie. -->

# Format folderu danych Financial Intel

Opis dla własnych narzędzi: skryptów, arkuszy, kopii w innym programie. Folder danych to zwykłe pliki JSON – można je
czytać bez aplikacji. Przykładowy skrypt odczytu: [\`docs/przyklady/odczyt.mjs\`](przyklady/odczyt.mjs) (Node.js, bez
dodatkowych bibliotek – suma wydatków miesiąca po kategoriach).

## Najważniejsze zasady

- **Tylko odczyt.** Nie zapisuj do folderu z zewnątrz, gdy aplikacja działa na którymkolwiek komputerze – aplikacja
  pilnuje zapisów, historii i scalania zmian dwóch komputerów; obcy zapis może zostać nadpisany albo wzięty za konflikt
  OneDrive. Jeśli już coś zmieniasz ręcznie: zamknij aplikację na wszystkich komputerach, poczekaj na synchronizację
  OneDrive, zrób kopię (Ustawienia → Folder i kopie) i dopiero wtedy edytuj.
- **Stanów warstw nie ma w plikach.** Osłony, kadłub, energia, zbiorniki, zasięg i klasa okrętu są liczone przez
  aplikację z rekordów za każdym razem – w folderze są tylko operacje, plany, kontenery, cele i pozostałe zapisy.
- **Kwoty w groszach**, liczby całkowite, tylko PLN: \`-1250\` to −12,50 zł. W operacji znak mówi o kierunku: pieniądze
  wychodzące z konta < 0, wchodzące > 0.
- **Daty** operacji, sald, dokowań i boi to daty warszawskie \`RRRR-MM-DD\` (bez godziny); miesiące \`RRRR-MM\`; chwile
  zapisu (\`createdAt\`, \`updatedAt\` i inne pola „…At”) – ISO 8601 w UTC, np. \`2026-11-05T09:30:00.000Z\`. Godzina
  operacji (\`time\`, \`GG:MM\`) jest opcjonalna – import z mBanku jej nie ma.
- **Identyfikatory** to ULID (26 znaków, np. \`01KDEFACC00000000000000001\`); nazwa pliku zawiera identyfikator rekordu.
  Domyślne konta, kategorie i domownik mają stałe identyfikatory \`01KDEF…\` – takie same w każdym folderze.
- **JSON** z wcięciem 2 spacje i znakiem nowej linii na końcu; ścieżki w polach względne, z \`/\`.
- **Wersja formatu** w każdym pliku: \`schemaVersion\` (teraz ${VERSION}). Plik z wyższą wersją zapisała nowsza aplikacja –
  starsza czyta go tylko do odczytu. Nowe pola dochodzą bez zmiany wersji, więc narzędzie powinno **pomijać pola, których
  nie zna** (aplikacja zachowuje je przy zapisie) i nie zakładać, że opcjonalne pole jest zawsze obecne.

## Układ folderu

\`\`\`
fi.json                                  ustawienia: konta, kategorie, warstwy, rozkazy, domownicy, reguły importu
transactions/RRRR/RRRR-MM-DD_ULID.json   operacja (data warszawska w nazwie)
containers/ULID.json                     kontener Ładowni albo opłata okresowa
goals/ULID.json                          cel (własny albo z prognozy ICTTJ)
months/RRRR-MM.json                      plan miesiąca: pensja, koperty, podział łupów
dockings/RRRR/RRRR-MM-DD_ULID.json       dokowanie wpływu
loans/ULID.json                          pożyczka (udzielona albo wzięta) z harmonogramem
balances/RRRR/RRRR-MM-DD_ULID.json       saldo otwarcia albo potwierdzenie salda konta
game/RRRR-MM.json                        Dowództwo: oceny dni, misje, awanse (zamrożone)
scheduled/ULID.json                      boja: zaplanowany wydatek, wpływ albo termin
imports/ULID.json                        paczka importu z banku (do „Cofnij import”)
backups/                                 kopie ZIP (dzienne, tygodniowe, przed importem)
.history/                                poprzednie wersje rekordów
.presence/                               obecność komputerów (który komputer ma aplikację otwartą)
\`\`\`

Rekordem jest tylko plik o dokładnie takiej nazwie. Pliki tymczasowe (\`.tmp-\` w nazwie), foldery zaczynające się od
kropki i \`backups/\` nie są rekordami – narzędzie powinno je pomijać.

## Historia (\`.history/\`)

Przed nadpisaniem albo usunięciem rekordu aplikacja odkłada jego poprzednią wersję do
\`.history/<rodzaj>/<id>/<czas>_<powód>_<losowe>.json\` (\`rodzaj\` to nazwa folderu rekordu albo \`fi\`). Plik historii
ma pola \`savedAt\`, \`savedBy\` (komputer), \`reason\` (np. \`edit\`, \`delete\`) i \`record\` – całą wersję rekordu.
Zostaje najwyżej 40 wersji jednego rekordu. Historia nie jest stanem – bieżące dane są tylko w plikach rekordów.

## Konflikty OneDrive

Gdy dwa komputery zmienią ten sam plik, OneDrive zostawia obok kopię z dopiskiem w nazwie (np.
\`fi-KOMPUTER.json\`, \`2026-11-05_01K…-KOMPUTER.json\`). Taka kopia **nie jest rekordem** – nazwa nie pasuje do układu
wyżej. Aplikacja wykrywa ją i scala zmiany (pole po polu) albo pyta, co zostawić. Narzędzie czytające powinno brać tylko
pliki o kanonicznej nazwie, inaczej policzy rekord dwa razy.
`

const FIELDS_INTRO = `
Tabele niżej są wygenerowane ze schematów aplikacji. Ścieżka \`a.b\` to pole obiektu \`a\`, \`a[]\` – element listy,
\`a{}\` – wartość mapy (klucze mapy opisuje typ). „Wymagane” – pole jest w każdym pliku; „domyślnie …” – brak pola
aplikacja czyta jako tę wartość (zapisuje je przy następnej zmianie); „opcjonalne” – pole może nie istnieć i brak ma
własne znaczenie (opisane obok).
`
