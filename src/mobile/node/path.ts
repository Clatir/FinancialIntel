/**
 * `node:path` on the phone (T305): the data store of the computers (`main/datastore/`) runs in the app's web view over
 * the mirror of the OneDrive folder (`vfs/vfs.ts`) – POSIX paths only, the current directory is the root.
 */

export const sep = '/'
export const delimiter = ':'

function normalizeParts(parts: readonly string[], absolute: boolean): string[] {
  const out: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop()
      else if (!absolute) out.push('..')
    } else out.push(part)
  }
  return out
}

export function isAbsolute(p: string): boolean {
  return p.startsWith('/')
}

export function normalize(p: string): string {
  if (!p) return '.'
  const absolute = isAbsolute(p)
  const trailing = p.endsWith('/')
  const body = normalizeParts(p.split('/'), absolute).join('/')
  if (absolute) return `/${body}${body && trailing ? '/' : ''}`
  return (body || '.') + (body && trailing ? '/' : '')
}

export function join(...parts: string[]): string {
  const joined = parts.filter((p) => p !== '').join('/')
  return joined ? normalize(joined) : '.'
}

export function resolve(...parts: string[]): string {
  let path = ''
  for (let i = parts.length - 1; i >= 0 && !isAbsolute(path); i--) {
    const p = parts[i]
    if (p) path = path ? `${p}/${path}` : p
  }
  const body = normalizeParts(path.split('/'), true).join('/')
  return `/${body}`
}

export function dirname(p: string): string {
  if (!p) return '.'
  const trimmed = p.length > 1 ? p.replace(/\/+$/, '') : p
  const i = trimmed.lastIndexOf('/')
  if (i < 0) return '.'
  if (i === 0) return '/'
  return trimmed.slice(0, i)
}

export function basename(p: string, ext?: string): string {
  const trimmed = p.length > 1 ? p.replace(/\/+$/, '') : p
  const base = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  return ext && base.endsWith(ext) && base !== ext ? base.slice(0, -ext.length) : base
}

export function extname(p: string): string {
  const base = basename(p)
  const i = base.lastIndexOf('.')
  return i <= 0 ? '' : base.slice(i)
}

export function relative(from: string, to: string): string {
  const a = resolve(from).split('/').filter(Boolean)
  const b = resolve(to).split('/').filter(Boolean)
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/')
}

export function parse(p: string): { root: string; dir: string; base: string; ext: string; name: string } {
  const base = basename(p)
  const ext = extname(p)
  return { root: isAbsolute(p) ? '/' : '', dir: dirname(p), base, ext, name: ext ? base.slice(0, -ext.length) : base }
}

const path = { sep, delimiter, isAbsolute, normalize, join, resolve, dirname, basename, extname, relative, parse }
export const posix = path
export default { ...path, posix: path }
