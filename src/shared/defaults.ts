import { newId } from './ids'
import { SCHEMA_VERSION } from './schema/common'
import { settingsFileSchema, type SettingsFile } from './schema/settings'

/** fi.json of a new data folder. */
export function createDefaultSettings(now = new Date().toISOString()): SettingsFile {
  return settingsFileSchema.parse({ schemaVersion: SCHEMA_VERSION, id: newId(), createdAt: now, updatedAt: now, settings: {} })
}
