// adapted from ICTTJ src/renderer/env.d.ts @ 84a8339
/// <reference types="vite/client" />
import type { FiApi } from '@shared/api'

declare global {
  interface Window {
    fi: FiApi
  }
}

export {}
