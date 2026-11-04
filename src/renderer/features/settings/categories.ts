/**
 * Ustawienia → Kategorie, the changes of the tree: a category's fields, archiving a main one (N8) and deleting one
 * nothing uses (AP-9, N-PC-7 – `calc/categoryUse.ts`), each with „Cofnij”.
 */
import { categoryUses, type CategoryUse, type CategoryUseKind } from '@shared/calc/categoryUse'
import { plural } from '@shared/format'
import type { Category } from '@shared/schema'
import { canWrite, listOf, updateSettings, useData } from '../../store/data'
import { toast } from '../../store/ui'
import { dropEnvelope, restoreEnvelope } from '../month/actions'
import { useImport } from '../import/state'

export function patchCategory(id: string, p: Partial<Category>): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, categories: f.settings.categories.map((c) => (c.id === id ? { ...c, ...p } : c)) } }))
}

/**
 * A main category archived takes its envelope off this month's plan and the later ones (N8) – it would still count in
 * the sums and today's energy; „Cofnij” brings the category and its envelopes back.
 */
export function archiveMain(c: Category): void {
  if (!canWrite()) return
  patchCategory(c.id, { archived: true })
  const taken = dropEnvelope(c.id)
  if (taken.size)
    toast(`Zarchiwizowano „${c.name}” – jej koperta zniknęła z planu tego miesiąca i kolejnych.`, 'info', 8000, {
      label: 'Cofnij',
      run: () => {
        patchCategory(c.id, { archived: false })
        restoreEnvelope(c.id, taken)
      }
    })
}

const USE_LABEL: Record<CategoryUseKind, [string, string, string]> = {
  operations: ['operacja', 'operacje', 'operacji'],
  parts: ['część paragonu', 'części paragonów', 'części paragonów'],
  plans: ['plan miesiąca', 'plany miesięcy', 'planów miesięcy'],
  rules: ['reguła importu', 'reguły importu', 'reguł importu'],
  import: ['decyzja otwartego importu', 'decyzje otwartego importu', 'decyzji otwartego importu'],
  containers: ['kontener Ładowni', 'kontenery Ładowni', 'kontenerów Ładowni'],
  scheduled: ['boja', 'boje', 'boi'],
  views: ['widok Operacji', 'widoki Operacji', 'widoków Operacji'],
  game: ['miesiąc ocen dni', 'miesiące ocen dni', 'miesięcy ocen dni']
}

/** „3 operacje, 1 reguła importu” – where a category is used. */
export const usesText = (uses: readonly CategoryUse[]): string => uses.map((u) => `${u.count} ${plural(u.count, ...USE_LABEL[u.kind])}`).join(', ')

/** The uses of a category with its subcategories, in the records and settings in memory now – and the open import's decisions. */
export function usesOf(id: string): CategoryUse[] {
  const s = useData.getState()
  if (!s.fi) return []
  const ids = new Set([id, ...s.fi.settings.categories.filter((c) => c.parentId === id).map((c) => c.id)])
  return categoryUses(ids, {
    transactions: listOf(s.records.transactions),
    months: listOf(s.records.months ?? {}),
    containers: listOf(s.records.containers ?? {}),
    scheduled: listOf(s.records.scheduled ?? {}),
    game: listOf(s.records.game ?? {}),
    rules: s.fi.settings.import.rules,
    views: s.fi.settings.operationViews,
    importing: importDecisions()
  })
}

/**
 * „Usuń” (AP-9, N-PC-7): a category nothing uses leaves the tree – a main one with its subcategories – with „Cofnij”
 * (back in its place). One in use stays: the toast says where, and offers archiving (the old records keep it). A system
 * category („Gotówka”) is never deleted.
 */
export function deleteCategory(id: string): boolean {
  if (!canWrite()) return false
  const fi = useData.getState().fi
  const c = fi?.settings.categories.find((x) => x.id === id)
  if (!fi || !c || c.system != null) return false
  const what = c.parentId ? 'Podkategoria' : 'Kategoria'
  const uses = usesOf(id)
  if (uses.length) {
    const archive = c.archived ? undefined : { label: 'Archiwizuj', run: () => (c.parentId ? patchCategory(c.id, { archived: true }) : archiveMain(c)) }
    toast(`${what} „${c.name}” jest w użyciu (${usesText(uses)}) – usunąć można tylko nieużywaną; zarchiwizuj ją, a dawne wpisy ją zachowają.`, 'error', 10000, archive)
    return false
  }
  // Each one with its place in the list: „Cofnij” puts it back there.
  const gone = fi.settings.categories.flatMap((x, at) => (x.id === id || x.parentId === id ? [{ at, category: x }] : []))
  const ids = new Set(gone.map((g) => g.category.id))
  if (!updateSettings((f) => ({ ...f, settings: { ...f.settings, categories: f.settings.categories.filter((x) => !ids.has(x.id)) } }))) return false
  const subs = gone.length - 1
  toast(`Usunięto: ${what.toLowerCase()} „${c.name}”${subs ? ` z ${subs} ${plural(subs, 'podkategorią', 'podkategoriami', 'podkategoriami')}` : ''}.`, 'success', 8000, {
    label: 'Cofnij',
    run: () =>
      updateSettings((f) => {
        const list = [...f.settings.categories]
        // Added back meanwhile (another computer – the same ids): kept as it is.
        for (const g of gone) if (!list.some((x) => x.id === g.category.id)) list.splice(Math.min(g.at, list.length), 0, g.category)
        return { ...f, settings: { ...f.settings, categories: list } }
      })
  })
  return true
}

/**
 * The decisions of the import in progress (przegląd N2): its themes, groups and rows – a category deleted meanwhile would
 * be written into its operations, gone from the tree. None while no file is open.
 */
function importDecisions(): Array<{ categoryId: string | null }> {
  const { plan, choices } = useImport.getState()
  return plan ? [...Object.values(choices.themes), ...Object.values(choices.groups), ...Object.values(choices.rows)] : []
}
