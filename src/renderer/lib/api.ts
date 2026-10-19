// adapted from ICTTJ src/renderer/lib/api.ts @ 84a8339
import type { FiApi } from '@shared/api'

export const api: FiApi = window.fi

/** Strip Electron's "Error invoking remote method ..." prefix from IPC errors. */
export function errorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  return raw.replace(/^Error invoking remote method '[^']+': /, '').replace(/^(\w*Error): /, '')
}

/** A write refused for good (B67): a newer version of the app wrote the record's file – trying again changes nothing. */
export const isNewerFileError = (e: unknown): boolean => /\bNewerFileError: /.test(e instanceof Error ? e.message : String(e))
