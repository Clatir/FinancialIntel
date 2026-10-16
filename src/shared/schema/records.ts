/**
 * Records of the collections. E0: the common fields and the fields the file layout needs (`date` / `month`); the
 * full schemas of the budget come in stage E1 (docs/plan.md). Unknown fields are kept.
 */
import { z } from 'zod'
import { isoDate, isoMonth, recordBase } from './common'

const dated = z.looseObject({ ...recordBase, date: isoDate })
const byId = z.looseObject({ ...recordBase })
const monthly = z.looseObject({ ...recordBase, month: isoMonth })

export const transactionSchema = dated
export const containerSchema = byId
export const goalSchema = byId
export const monthPlanSchema = monthly
export const dockingSchema = dated
export const loanSchema = byId
export const balanceSchema = dated
export const gameMonthSchema = monthly

export type Transaction = z.infer<typeof transactionSchema>
export type Container = z.infer<typeof containerSchema>
export type Goal = z.infer<typeof goalSchema>
export type MonthPlan = z.infer<typeof monthPlanSchema>
export type Docking = z.infer<typeof dockingSchema>
export type Loan = z.infer<typeof loanSchema>
export type Balance = z.infer<typeof balanceSchema>
export type GameMonth = z.infer<typeof gameMonthSchema>
