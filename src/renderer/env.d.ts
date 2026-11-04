// adapted from ICTTJ src/renderer/env.d.ts @ 84a8339
/// <reference types="vite/client" />
import type { FiApi } from '@shared/api'

declare global {
  /** The newest sections of CHANGELOG.md (electron.vite.config.mts – AP-28); absent in the phone's build and in tests. */
  const __FI_CHANGELOG__: string | undefined
  interface Window {
    fi: FiApi
  }
}

export {}
