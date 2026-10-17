/**
 * fi.json: the folder's settings – the foundation's (ship name, sync mode, layout presets) and the budget's
 * (`budget.ts`: accounts, categories, layers, orders, the start, import rules). Unknown fields are kept
 * (`z.looseObject`), so an older version never drops what a newer one wrote.
 */
import { z } from 'zod'
import { budgetSettingsShape, seedSettings } from './budget'
import { isoDateTime, recordBase, ulidSchema } from './common'

/**
 * A saved page layout (adapted from ICTTJ src/shared/schema/journal.ts @ 84a8339): panels and column widths by keys
 * relative to the page. Kept in fi.json, so every computer has the same presets.
 */
export const layoutPresetSchema = z.looseObject({
  id: ulidSchema,
  name: z.string().min(1).max(40),
  page: z.string().min(1).max(30),
  panels: z
    .record(
      z.string().max(200),
      z.object({
        collapsed: z.boolean().optional(),
        height: z.number().finite().optional(),
        hidden: z.boolean().optional()
      })
    )
    .default({}),
  columns: z.record(z.string().max(200), z.array(z.number().finite().positive()).max(12)).default({})
})
export type LayoutPreset = z.infer<typeof layoutPresetSchema>

export const DEFAULT_SHIP_NAME = 'Flagowiec'

export const settingsSchema = z.looseObject({
  /** The ship's name (decision D1), shown on the bridge and in the title of the sidebar. */
  shipName: z.string().trim().min(1).max(40).catch(DEFAULT_SHIP_NAME).default(DEFAULT_SHIP_NAME),
  sync: z
    .looseObject({
      /** A record edited here and changed on another computer: merge field by field ('merge') or always ask. */
      remoteChanges: z.enum(['merge', 'ask']).default('merge')
    })
    .prefault({}),
  /** Saved page layouts; a malformed preset is left out rather than failing the settings. */
  layoutPresets: z
    .array(layoutPresetSchema.nullable().catch(null))
    .transform((xs) => xs.filter((x): x is LayoutPreset => x != null))
    .catch([])
    .default([]),
  ...budgetSettingsShape
}).transform(seedSettings)
export type Settings = z.infer<typeof settingsSchema>

export const settingsFileSchema = z.looseObject({
  ...recordBase,
  createdAt: isoDateTime,
  settings: settingsSchema.prefault({})
})
export type SettingsFile = z.infer<typeof settingsFileSchema>
