// 1.21.0 Z11 (T545): the texts and rules of the Plan miesiąca's „Na początek miesiąca” strip (UX-48), the wizard's step
// marks (UX-49), the Dowództwo's „Dziś” line and dates with a year (UX-51, UX-55), the docking's one-line effect (UX-52)
// and the freezing question's sentence (UX-54) – pure modules, no window needed.
import { describe, expect, it } from 'vitest'
import { blockedSteps, finishBlockers } from '../../src/renderer/features/wizard/blockers'
import { commandSummary, freezeEffectText, weekLabel } from '../../src/renderer/features/command/texts'
import { dockEffectText } from '../../src/renderer/features/dock/effect'
import { START_STRIP_LAST_DAY, startStrip, type StartStripInput } from '../../src/renderer/features/month/startStrip'

const zl = (g: number) => `${g / 100} zł`
const base: StartStripInput = {
  today: '2026-11-03',
  month: '2026-11',
  brief: { month: '2026-10', plus: true, loot: 12_000 },
  lootPending: { amount: 12_000, deadline: '2026-11-07' },
  lootDecided: false,
  salary: 400_000,
  envelopes: 6,
  inherited: null,
  toDock: 0,
  zl
}

describe('UX-48: pasek „Na początek miesiąca”', () => {
  it('pokazuje się do 7. dnia bieżącego miesiąca – nie później i nie dla innego miesiąca', () => {
    expect(START_STRIP_LAST_DAY).toBe(7)
    expect(startStrip({ ...base, today: '2026-11-07' })).not.toBeNull()
    expect(startStrip({ ...base, today: '2026-11-08' })).toBeNull()
    expect(startStrip({ ...base, month: '2026-12' })).toBeNull()
  })

  it('kroki w kolejności dnia wypłaty: debriefing, łupy, pensja i koperty, dokowanie', () => {
    const steps = startStrip(base)!
    expect(steps.map((s) => s.key)).toEqual(['debrief', 'loot', 'plan', 'dock'])
    expect(steps[0]).toMatchObject({ state: 'info', title: 'Debriefing – październik 2026', text: 'miesiąc zamknięty na plus' })
    expect(steps[1]).toMatchObject({ state: 'todo', text: 'do podziału 120 zł – decyzja do 7 listopada' })
    expect(steps[2]).toMatchObject({ state: 'done', text: 'pensja 4000 zł, 6 kopert' })
    expect(steps[3]).toMatchObject({ state: 'skip', text: 'brak dostaw do zadokowania' })
  })

  it('łupy: zatwierdzone – gotowe; po terminie bez decyzji – trafiły do osłon; bez łupów – pominięte', () => {
    expect(startStrip({ ...base, lootDecided: true, lootPending: null })![1]).toMatchObject({ state: 'done', text: 'podział zatwierdzony' })
    expect(startStrip({ ...base, lootPending: null })![1]).toMatchObject({ state: 'done', text: 'trafiły do osłon' })
    expect(startStrip({ ...base, brief: { month: '2026-10', plus: false, loot: 0 }, lootPending: null })![1]).toMatchObject({ state: 'skip', text: 'bez łupów' })
  })

  it('pierwszy miesiąc budżetu: debriefing i łupy pominięte, plan bez pensji do zrobienia', () => {
    const steps = startStrip({ ...base, brief: null, lootPending: null, salary: null })!
    expect(steps[0]).toMatchObject({ state: 'skip' })
    expect(steps[1]).toMatchObject({ state: 'skip' })
    expect(steps[2]).toMatchObject({ state: 'todo', text: 'wpisz pensję' })
  })

  it('plan: pensja bez kopert do zrobienia; plan odziedziczony – z nazwą miesiąca; dostawy – z odmianą', () => {
    expect(startStrip({ ...base, envelopes: 0 })![2]).toMatchObject({ state: 'todo', text: 'pensja 4000 zł – wpisz koperty' })
    expect(startStrip({ ...base, inherited: '2026-10' })![2]!.text).toBe('pensja 4000 zł, 6 kopert · plan z października 2026')
    expect(startStrip({ ...base, toDock: 1 })![3]).toMatchObject({ state: 'todo', text: '1 dostawa czeka na dokowanie' })
    expect(startStrip({ ...base, toDock: 3 })![3]!.text).toBe('3 dostawy czekają na dokowanie')
    expect(startStrip({ ...base, toDock: 5 })![3]!.text).toBe('5 dostaw czeka na dokowanie')
  })
})

describe('UX-49: znak „!” przy kroku kreatora z brakami', () => {
  it('każdy brak wskazuje swój krok (0 – salda, 2 – pensja, 5 – podział)', () => {
    expect([...blockedSteps({ missing: ['mBank'], salary: null, overSplit: true }).keys()]).toEqual([0, 2, 5])
    expect([...blockedSteps({ missing: [], salary: 500_000, overSplit: false }).keys()]).toEqual([])
    expect(blockedSteps({ missing: ['mBank', 'Karta'], salary: 1, overSplit: false }).get(0)).toBe('brak salda teraz: mBank, Karta')
    expect(blockedSteps({ missing: [], salary: 0, overSplit: false }).get(2)).toBe('brak pensji')
    expect(blockedSteps({ missing: [], salary: 1, overSplit: true }).get(5)).toBe('kadłub, cele i zbiorniki przekraczają środki')
  })

  it('lista braci przy „Uruchom budżet” bez zmian', () => {
    expect(finishBlockers({ missing: ['mBank'], salary: null, overSplit: false })).toEqual(['saldo teraz (krok 1): mBank', 'pensja (krok 3)'])
  })
})

describe('UX-51, UX-55: Dowództwo', () => {
  it('pasek „Dziś”: ocena dnia, seria, misja', () => {
    expect(commandSummary({ today: { violations: 0, serious: false }, streak: 12, mission: { title: 'Bez zakupów w ciszy', status: 'na razie: 3 z 5' } })).toBe('Dziś: zgodny · seria 12 dni · misja: Bez zakupów w ciszy – na razie: 3 z 5')
    expect(commandSummary({ today: { violations: 2, serious: false }, streak: 1, mission: null })).toBe('Dziś: naruszenie · seria 1 dzień')
    expect(commandSummary({ today: { violations: 1, serious: true }, streak: 0, mission: { title: 'Kurs', status: null } })).toBe('Dziś: poważne naruszenie · seria 0 dni · misja: Kurs')
    expect(commandSummary({ today: null, streak: 4, mission: null })).toBe('seria 4 dni')
  })

  it('tydzień misji słowami i z rokiem, nie „W47”', () => {
    expect(weekLabel('2026-W47')).toBe('tydzień 47 (od 16.11.2026)')
    expect(weekLabel('2027-W01')).toBe('tydzień 1 (od 04.01.2027)')
  })
})

describe('UX-52: jedna linia skutku dokowania', () => {
  it('osłony i kadłub z przed → po; cele i podatek tylko gdy się zmieniają', () => {
    expect(dockEffectText({ shields: { before: 100_000, after: 160_000 }, hull: { before: 50_000, after: 90_000 }, goals: 0, taxHold: 0 }, zl)).toBe('osłony 1000 zł → 1600 zł, kadłub 500 zł → 900 zł')
    expect(dockEffectText({ shields: { before: 100_000, after: 100_000 }, hull: { before: 50_000, after: 50_000 }, goals: 30_000, taxHold: 20_000 }, zl)).toBe('osłony 1000 zł → 1000 zł, kadłub bez zmian, cele +300 zł, podatek +200 zł')
  })

  it('zwrot do ICTTJ zmniejsza warstwy (minus typograficzny)', () => {
    expect(dockEffectText({ shields: { before: 100_000, after: 60_000 }, hull: { before: 50_000, after: 50_000 }, goals: -10_000, taxHold: 0 }, zl)).toBe('osłony 1000 zł → 600 zł, kadłub bez zmian, cele −100 zł')
  })
})

describe('UX-54: zdanie o skutku zamrożenia', () => {
  it('mówi, że ocena liczy się z operacji teraz w budżecie, a późniejszy import jej nie zmieni', () => {
    const text = freezeEffectText('dzień 02.11.2026')
    expect(text).toContain('dzień 02.11.2026')
    expect(text).toContain('nie ocenę')
  })
})
