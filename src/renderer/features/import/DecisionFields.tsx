/**
 * What a theme, a group of the import or a rule (F22) is: the kind (with the household's per member – D80, a shared
 * purchase – D83, a loan of the Radar – B34) and the category.
 */
import { startShare } from '@shared/calc/share'
import type { Choice } from '@shared/import/reconcile'
import { SHARE_MODES, type Share } from '@shared/schema'
import { useRecordList } from '../../store/records'
import { CategorySelect } from '../operations/pickers'
import { useMembers } from '../household/actions'
import { ShareEditor } from '../household/ShareEditor'
import { choiceFor, optionOf, optionsFor, type Option } from './options'

/** A shared purchase's split for the import (D83): equally or by percents – each row has its own amount. */
export const IMPORT_SHARE_MODES = SHARE_MODES.filter((m) => m !== 'amounts')

export function DecisionFields({
  choice,
  direction,
  onChange,
  testId,
  exclude
}: {
  choice: Choice
  direction: 'in' | 'out'
  onChange: (c: Choice) => void
  testId: string
  /** Options not offered (a rule: no kind decided operation by operation – N14). */
  exclude?: (o: Option) => boolean
}) {
  const members = useMembers()
  const loans = useRecordList('loans')
  const option = optionOf(choice, direction)
  const first = members.find((m) => !m.archived)
  return (
    <>
      <select
        className="input h-[24px] w-[230px] py-0"
        value={option}
        onChange={(e) => onChange(choiceFor(e.currentTarget.value as Option, choice, first ? startShare(first.id) : null))}
        aria-label="Co to jest"
        data-testid={`${testId}-kind`}
      >
        {optionsFor(direction, members, choice, loans)
          .filter((o) => o.value === option || !exclude?.(o.value))
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </select>
      {choice.kind === 'expense' && (
        <CategorySelect className="h-[24px] min-w-[180px] flex-1 py-0" value={choice.categoryId} onChange={(categoryId) => onChange({ ...choice, categoryId })} data-testid={`${testId}-category`} />
      )}
      {choice.kind === 'expense' && choice.share && (
        <div className="basis-full pl-1">
          <ShareEditor share={choice.share} total={null} members={members} onChange={(share: Share) => onChange({ ...choice, share })} modes={IMPORT_SHARE_MODES} testId={`${testId}-share`} />
        </div>
      )}
    </>
  )
}
