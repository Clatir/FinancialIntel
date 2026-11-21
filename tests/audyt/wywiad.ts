import type { Page } from '@playwright/test'
import { intelTab } from '../e2e/app'

/**
 * The Wywiad screen is in tabs (Struktura / Wydatki / Prognozy / Dziennik): a panel is read on its own tab. The panels:
 * structure – intel-wealth, intel-fuel, intel-cushion; spending – intel-spending, intel-targets, intel-killzones-panel,
 * intel-fvg, intel-comparison, intel-expeditions, intel-inflation; forecasts – intel-range, intel-course, intel-forecast,
 * intel-maneuver; log – intel-log.
 */
export { intelTab }

export const INTEL_TAB_IDS = ['structure', 'spending', 'forecasts', 'log'] as const

const TAB_OF: Array<[RegExp, (typeof INTEL_TAB_IDS)[number]]> = [
  [/^intel-(wealth|fuel|cushion|marks)/, 'structure'],
  [/^intel-(spending|spend|targets?|killzones|fvg|comparison|expeditions?|inflation|cpi|order-block)/, 'spending'],
  [/^intel-(range|course|forecast|maneuver)|^maneuver-/, 'forecasts'],
  [/^intel-log/, 'log']
]

/** The tab a Wywiad panel (by its test id) is on. */
export function tabOfPanel(testId: string): (typeof INTEL_TAB_IDS)[number] {
  const hit = TAB_OF.find(([re]) => re.test(testId))
  if (!hit) throw new Error(`Wywiad: no tab for ${testId}`)
  return hit[1]
}

/** Opens the tab the panel is on. */
export async function openPanel(page: Page, testId: string): Promise<void> {
  await intelTab(page, tabOfPanel(testId))
}

/** The text of the whole screen: every tab opened in turn (the audit scripts read „the whole of Wywiad”). */
export async function wholeIntel(page: Page): Promise<string> {
  const parts: string[] = []
  for (const tab of INTEL_TAB_IDS) {
    await intelTab(page, tab)
    parts.push(await page.getByTestId('intel-tabpanel').innerText())
  }
  return parts.join('\n')
}
