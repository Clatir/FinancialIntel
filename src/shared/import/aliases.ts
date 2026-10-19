/**
 * Names the user said are one counterparty (1.2.2, D78): a brand key merged into another one is grouped and ruled as
 * that one, in this import and every later one, in Operacje too (`settings.import.aliases`).
 */
import type { BrandAlias } from '../schema/budget'

export type BrandAliases = Readonly<Record<string, BrandAlias>>

/**
 * The key a brand is one with (through earlier merges). Two computers merging one pair both ways make a loop: every
 * name of it is the loop's first key in order – one key for all, as merged. Own keys only (B104: „constructor” is a
 * brand's key too, never the object's).
 */
export function resolveBrand(aliases: BrandAliases, key: string): string {
  const path: string[] = []
  let k = key
  while (Object.hasOwn(aliases, k)) {
    const at = path.indexOf(k)
    if (at >= 0) return path.slice(at).sort()[0]!
    path.push(k)
    k = aliases[k]!.to
  }
  return k
}

/** The key of a pair of brands (either order), for „to nie to samo”. */
export const pairKey = (a: string, b: string): string => [a, b].sort().join('|')

export interface BrandName {
  key: string
  /** As the bank writes it. */
  label: string
}

/**
 * The aliases with `from` merged into `into`: each of them (and whatever was merged into it before – chains stay one
 * step long) points at `into`'s key.
 */
export function withMerged(aliases: BrandAliases, into: BrandName, from: readonly BrandName[], now: string): Record<string, BrandAlias> {
  const target = resolveBrand(aliases, into.key)
  const out: Record<string, BrandAlias> = { ...aliases }
  const moved = new Map<string, BrandName>()
  for (const f of from) {
    const k = resolveBrand(aliases, f.key)
    if (k !== target) moved.set(k, f)
  }
  for (const [k, a] of Object.entries(aliases)) if (moved.has(resolveBrand(aliases, a.to)) && k !== target) out[k] = { ...a, to: target, toLabel: into.label, at: now }
  for (const [k, f] of moved) out[k] = { to: target, label: f.label, toLabel: into.label, at: now }
  delete out[target]
  return out
}
