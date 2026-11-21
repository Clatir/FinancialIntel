/** The docking's effect on the layers in one line (UX-52): from the engine's preview, never computed again here. */

export interface DockEffect {
  shields: { before: number; after: number }
  hull: { before: number; after: number }
  /** What the goals take together (− a return takes from them). */
  goals: number
  /** What goes to the tax reserve (outside the budget). */
  taxHold: number
}

const signed = (g: number, zl: (grosze: number) => string) => `${g < 0 ? '−' : '+'}${zl(Math.abs(g))}`

/** „osłony X → Y, kadłub A → B, cele +C, podatek +D” – the goals and the tax only when they change. */
export function dockEffectText(e: DockEffect, zl: (grosze: number) => string): string {
  return [
    `osłony ${zl(e.shields.before)} → ${zl(e.shields.after)}`,
    e.hull.before === e.hull.after ? 'kadłub bez zmian' : `kadłub ${zl(e.hull.before)} → ${zl(e.hull.after)}`,
    ...(e.goals ? [`cele ${signed(e.goals, zl)}`] : []),
    ...(e.taxHold ? [`podatek ${signed(e.taxHold, zl)}`] : [])
  ].join(', ')
}
