import { newId } from '@shared/ids'
import { envelopeKind, type Category, type EnvelopeKind } from '@shared/schema'
import { canWrite, updateSettings } from '../../store/data'
import { toast } from '../../store/ui'
import { dropEnvelope, restoreEnvelope } from '../month/actions'
import { IconPlus } from '../../components/icons'
import { NameInput, Panel, Segmented, cx } from '../../components/ui'
import { useCategories } from '../operations/pickers'

function patchCategory(id: string, p: Partial<Category>): void {
  updateSettings((f) => ({ ...f, settings: { ...f.settings, categories: f.settings.categories.map((c) => (c.id === id ? { ...c, ...p } : c)) } }))
}

/**
 * A main category archived takes its envelope off this month's plan and the later ones (N8) – it would still count in
 * the sums and today's energy; „Cofnij” brings the category and its envelopes back.
 */
function archiveMain(c: Category): void {
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

function addCategory(parentId: string | null, name: string): void {
  const c: Category = { id: newId(), name, parentId, envelope: parentId ? null : 'planned', system: null, archived: false }
  updateSettings((f) => {
    const list = f.settings.categories
    // A subcategory goes after its siblings, a main category at the end of the main ones.
    const at = parentId ? Math.max(list.findIndex((x) => x.id === parentId), ...list.map((x, i) => (x.parentId === parentId ? i : -1))) + 1 : list.length
    return { ...f, settings: { ...f.settings, categories: [...list.slice(0, at), c, ...list.slice(at)] } }
  })
}

const freeName = (taken: string[], base: string) => {
  let name = base
  for (let i = 2; taken.includes(name.toLowerCase()); i++) name = `${base} ${i}`
  return name
}

/**
 * Ustawienia → Kategorie (D25, D68): main categories with subcategories. A main category's envelope (D16):
 * „codzienna” = part of today's energy, „planowa” = a monthly limit. Removing = archiving: old operations keep their
 * category.
 */
export function CategoriesTab() {
  const cats = useCategories()
  const mains = [...cats.mains.filter((c) => !c.archived), ...cats.mains.filter((c) => c.archived)]
  const mainNames = cats.mains.map((c) => c.name.toLowerCase())
  return (
    <Panel
      title="Kategorie"
      actions={
        <button className="btn h-[22px]" onClick={() => addCategory(null, freeName(mainNames, 'Nowa kategoria'))} data-testid="category-add">
          <IconPlus size={12} /> Kategoria
        </button>
      }
    >
      <p className="mb-2 text-[11.5px] text-muted">
        Koperta kategorii głównej: <b className="text-fg">codzienna</b> – jej wydatki tworzą „energię dziś” (dzienny przydział), <b className="text-fg">planowa</b> –
        własny limit miesięczny, nie rusza energii dnia. Usunięcie to archiwizacja: dawne operacje zachowują kategorię. Kategorie są wspólne dla wszystkich
        komputerów.
      </p>
      <div className="flex flex-col" data-testid="categories">
        {mains.map((main) => {
          const subs = cats.childrenOf(main.id)
          const subNames = subs.map((s) => s.name.toLowerCase())
          return (
            <div key={main.id} className={cx('border-b border-line/70 py-1.5 last:border-b-0', main.archived && 'opacity-55')} data-testid="category-row" data-name={main.name}>
              <div className="flex flex-wrap items-center gap-2">
                <NameInput
                  className="w-[200px] font-medium"
                  value={main.name}
                  maxLength={40}
                  emptyMessage="Kategoria musi mieć nazwę."
                  validate={(name) => (name.toLowerCase() !== main.name.toLowerCase() && mainNames.includes(name.toLowerCase()) ? 'Taka kategoria już jest.' : null)}
                  onChange={(name) => patchCategory(main.id, { name })}
                  aria-label="Nazwa kategorii"
                  data-testid="category-name"
                />
                <Segmented<EnvelopeKind | 'none'>
                  size="sm"
                  value={envelopeKind(main) ?? (main.envelope ? null : 'none')}
                  onChange={(v) => patchCategory(main.id, { envelope: v === 'none' ? null : v })}
                  options={[
                    { value: 'daily', label: 'codzienna' },
                    { value: 'planned', label: 'planowa' },
                    { value: 'none', label: 'bez koperty' }
                  ]}
                  aria-label="Koperta"
                />
                {main.system === 'cash' && <span className="text-[11px] text-dim">wypłata z bankomatu</span>}
                <span className="flex-1" />
                {!main.archived && (
                  <button type="button" className="btn h-[22px]" onClick={() => addCategory(main.id, freeName(subNames, 'nowa'))} data-testid="category-add-sub">
                    <IconPlus size={12} /> podkategoria
                  </button>
                )}
                {main.system == null && (
                  <button type="button" className="btn h-[22px]" onClick={() => (main.archived ? patchCategory(main.id, { archived: false }) : archiveMain(main))} data-testid="category-archive">
                    {main.archived ? 'przywróć' : 'archiwizuj'}
                  </button>
                )}
              </div>
              {subs.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-4">
                  {subs.map((sub) => (
                    <span key={sub.id} className={cx('flex items-center gap-1', sub.archived && 'opacity-55')} data-testid="subcategory" data-name={sub.name}>
                      <NameInput
                        className="w-[150px]"
                        value={sub.name}
                        maxLength={40}
                        emptyMessage="Podkategoria musi mieć nazwę."
                        validate={(name) => (name.toLowerCase() !== sub.name.toLowerCase() && subNames.includes(name.toLowerCase()) ? 'Taka podkategoria już jest.' : null)}
                        onChange={(name) => patchCategory(sub.id, { name })}
                        aria-label={`Podkategoria ${sub.name}`}
                      />
                      <button
                        type="button"
                        className="text-[11px] text-dim hover:text-fg-strong"
                        title={sub.archived ? 'Przywróć' : 'Archiwizuj (dawne operacje zachowają kategorię)'}
                        onClick={() => patchCategory(sub.id, { archived: !sub.archived })}
                      >
                        {sub.archived ? '↺' : '×'}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
