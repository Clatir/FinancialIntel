#!/usr/bin/env node
// Keeps the files Claude Code loads on its own small: CLAUDE.md (every turn of every session and subagent),
// docs/postep.md (read on every resume), the registers of decisions and the path-scoped rules in .claude/rules/. Fails CI when one outgrows
// its limit – history belongs in CHANGELOG.md and docs/archiwum/, module knowledge in .claude/rules/.
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const limits = [
  // D103: CLAUDE.md goes into every request – module knowledge belongs in .claude/rules/.
  { file: 'CLAUDE.md', lines: 120, kb: 10 },
  // D103: read in full on every resume – state and queue only, finished entries go to docs/archiwum/.
  { file: 'docs/postep.md', lines: 250, kb: 20 },
  // Registers of decisions (T525): D and T in separate files; new T entries stay short.
  { file: 'docs/decyzje.md', lines: 1000, kb: 200 },
  { file: 'docs/decyzje-techniczne.md', lines: 6000, kb: 560 },
]
const rules = new URL('.claude/rules/', root)
if (existsSync(rules)) {
  for (const name of readdirSync(rules).filter((n) => n.endsWith('.md')).sort()) {
    limits.push({ file: `.claude/rules/${name}`, lines: 200, kb: 20 })
  }
}

let failed = false
for (const { file, lines, kb } of limits) {
  const text = readFileSync(new URL(file, root), 'utf8')
  const count = text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
  const size = Buffer.byteLength(text) / 1024
  const ok = count <= lines && size <= kb
  console.log(`${ok ? 'ok ' : 'ZA DUŻY'} ${file}: ${count} / ${lines} linii, ${size.toFixed(1)} / ${kb} KB`)
  if (!ok) failed = true
}
if (failed) {
  console.error('Historia → CHANGELOG.md albo docs/archiwum/, wiedza modułu → .claude/rules/<moduł>.md.')
  process.exit(1)
}
