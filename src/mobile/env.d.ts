/// <reference types="vite/client" />

/** The app's version (package.json), set by the build. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** The app registration's client id (Entra) built into the phone's app – optional: the user can type it. */
  readonly VITE_FI_CLIENT_ID?: string
}
