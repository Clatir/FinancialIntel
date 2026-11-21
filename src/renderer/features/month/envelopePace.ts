/**
 * An envelope against its pace (UX-34, D106 pkt 2): the part of its limit the month gone so far gives (the Equilibrium
 * of ICT); spent above it – „+X zł ponad tempo” (Premium in the hint), at or below it – nothing said. Pure (node tests).
 */

/**
 * How much of an envelope is spent over its pace (grosze, > 0); null – at or under it, no limit, or no pace (a month
 * other than this one). `elapsed` – the part of the month gone at today's end (`monthElapsed`).
 */
export function overPace(e: { limit: number; spent: number }, elapsed: number | undefined): number | null {
  if (elapsed == null || e.limit <= 0) return null
  const over = e.spent - paceOf(e.limit, elapsed)
  return over > 0 ? over : null
}

/** The pace: the part of the limit for the month gone so far, in whole grosze. */
export const paceOf = (limit: number, elapsed: number): number => Math.round(limit * elapsed)
