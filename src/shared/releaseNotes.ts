/**
 * „Co nowego” without the network (AP-28, AF-40): the sections of CHANGELOG.md built into the window – an update from
 * outside the app (a new installer, a copied portable) or with GitHub out of reach still shows what changed. The same
 * sections the release's notes are made of (`scripts/release-notes.mjs`).
 */
import { isNewerVersion } from './update'

export interface ChangelogSection {
  version: string
  body: string
}

/** The sections of a CHANGELOG.md, newest first („## 1.15.9” … up to the next „## ”). */
export function changelogSections(text: string): ChangelogSection[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const heads = lines.flatMap((l, i) => (l.startsWith('## ') ? [{ i, version: l.slice(3).trim().split(/\s+/)[0] ?? '' }] : []))
  return heads.map((h, n) => ({ version: h.version, body: lines.slice(h.i + 1, heads[n + 1]?.i ?? lines.length).join('\n').trim() }))
}

/**
 * The notes of `version`, and – after an update from `from` – of every version between them (skipped ones too), as
 * the release's notes write them; '' = the changelog has no section of this version.
 */
export function notesOf(text: string, version: string, from?: string | null): string {
  const sections = changelogSections(text)
  const own = sections.find((s) => s.version === version)
  if (!own?.body) return ''
  const between = from
    ? sections.filter((s) => s.version !== version && s.body && safeNewer(s.version, from) && safeNewer(version, s.version))
    : []
  return [own.body, ...between.map((s) => `### ${s.version}\n\n${s.body}`)].join('\n\n')
}

function safeNewer(a: string, b: string): boolean {
  try {
    return isNewerVersion(a, b)
  } catch {
    return false
  }
}
