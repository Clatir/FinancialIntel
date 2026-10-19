/**
 * The metaphor's glossary (1.10.0, F29): each ship's word with its real meaning – the help (F1) lists them, the
 * bridge's panels say them in their headers' tooltips. The metaphor never stands alone (D34).
 */
export const GLOSSARY = [
  { term: 'Osłony', meaning: 'Bufor na pensje: pieniądze na pensję od siebie na kolejne miesiące (cel – kilka pensji).' },
  { term: 'Kadłub', meaning: 'Fundusz awaryjny: kilka miesięcy kosztów na nieprzewidziane (cel – miesiące × koszty miesiąca).' },
  { term: 'Pensja', meaning: 'Stała kwota, którą budżet wypłaca sobie co miesiąc z osłon – nie wypłata z XTB.' },
  { term: 'Energia', meaning: 'Pieniądze miesiąca z pensji, w kopertach; energia dziś – dzienny przydział z kopert codziennych.' },
  { term: 'Koperty', meaning: 'Limity wydatków miesiąca na kategorie: codzienne (dzienny przydział) i planowe.' },
  { term: 'Ładownia', meaning: 'Stałe opłaty (kontenery): abonamenty, rachunki, raty; linia zanurzenia – ich część pensji.' },
  { term: 'Zbiornik', meaning: 'Odkładka na opłatę okresową (co kwartał, co rok): co miesiąc rata z pensji.' },
  { term: 'Łupy', meaning: 'Energia, która została na koniec miesiąca – do podziału na cele, koperty i osłony.' },
  { term: 'Dostawa', meaning: 'Wypłata z XTB (wpis w ICTTJ) zadokowana w budżecie: rezerwa na PIT-38, osłony, kadłub, cele.' },
  { term: 'Zasięg', meaning: 'Na ile miesięcy kosztów starczą osłony i kadłub bez żadnej wypłaty (po odjęciu długu).' },
  { term: 'Klasa okrętu', meaning: 'Zasięg w stopniach: od Zwiadowcy (poniżej miesiąca) do Flagowca (rok i więcej).' },
  { term: 'Mapa gwiezdna', meaning: 'Cele oszczędnościowe – własne i z prognozy ICTTJ – w kolejności priorytetu.' },
  { term: 'Radar', meaning: 'Co przed budżetem w 90 dniach: pensje, opłaty, raty, boje, PIT-38.' },
  { term: 'Boja', meaning: 'Zaplanowany wydatek, wpływ albo termin na Radarze.' },
  { term: 'Asteroida', meaning: 'Zbliżająca się opłata okresowa, którą pokryje jej zbiornik.' },
  { term: 'Firewall', meaning: 'Zasilenie konta XTB tylko z nadwyżki ponad pełne osłony i kadłub.' },
  { term: 'Depozyt', meaning: 'Pieniądze domowników trzymane na kontach budżetu – ich, nie moje.' },
  { term: 'Wyprawa', meaning: 'Tag: koszt wyjazdu albo projektu przez wiele kategorii.' },
  { term: 'Bilans paliwa', meaning: 'Przychód miesiąca minus koszty netto; stopa oszczędności – ten bilans w % przychodu.' }
] as const

export type GlossaryTerm = (typeof GLOSSARY)[number]['term']

/** „Osłony – bufor na pensje: …” – a term with its meaning (a tooltip). */
export function glossaryOf(term: GlossaryTerm): string {
  const g = GLOSSARY.find((x) => x.term === term)
  return g ? `${g.term} – ${g.meaning}` : term
}
