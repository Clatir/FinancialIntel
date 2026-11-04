/**
 * The metaphor's glossary (1.10.0, F29): each ship's word with its real meaning – the help (F1) lists them, the
 * bridge's panels say them in their headers' tooltips. The metaphor never stands alone (D34).
 */
export const GLOSSARY = [
  { term: 'Osłony', meaning: 'Bufor na pensje: pieniądze na pensję od siebie na kolejne miesiące (cel – kilka pensji).' },
  { term: 'Kadłub', meaning: 'Fundusz awaryjny: kilka miesięcy kosztów na nieprzewidziane (cel – miesiące × koszty miesiąca).' },
  { term: 'Pensja', meaning: 'Stała kwota, którą budżet wypłaca sobie co miesiąc z osłon – nie wypłata z XTB.' },
  { term: 'Energia', meaning: 'Pieniądze miesiąca z pensji, w kopertach; energia dziś – dzienny przydział z kopert codziennych, nie więcej niż zostało energii miesiąca.' },
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
  { term: 'Firewall', meaning: 'Zasilenie konta XTB tylko z nadwyżki ponad pełne osłony i kadłub (kadłub od 99 % celu liczy się jako pełny).' },
  { term: 'Depozyt', meaning: 'Pieniądze domowników trzymane na kontach budżetu – ich, nie moje.' },
  { term: 'Wyprawa', meaning: 'Tag: koszt wyjazdu albo projektu przez wiele kategorii.' },
  { term: 'Bilans paliwa', meaning: 'Przychód miesiąca minus koszty netto; stopa oszczędności – ten bilans w % przychodu.' },
  { term: 'Układy gwiezdne', meaning: 'Cele oszczędnościowe: tyle pieniędzy leży już w celach (własnych i z prognozy ICTTJ).' },
  { term: 'Podatek', meaning: 'Rezerwa na PIT-38 z wypłat z XTB – leży poza budżetem i nie jest do wydania.' },
  { term: 'Dług', meaning: 'Pożyczki wzięte: odejmowane od zasięgu, bo trzeba je oddać.' },
  { term: 'Masa ładunku', meaning: 'Stałe koszty miesiąca (ładownia) jako % pensji; powyżej linii zanurzenia stałe opłaty zjadają za dużo pensji.' },
  { term: 'Do zadokowania', meaning: 'Wypłaty i zwroty z ICTTJ sparowane z bankiem, a jeszcze niezatwierdzone w dokowaniu.' }
] as const

/**
 * Terms of ICT (Inner Circle Trader) the screens use, each with what it means for the money (AP-23): the help (F1) lists
 * them under „Terminy ICT”, the screens say them in tooltips. The terms stay in English.
 */
export const ICT_GLOSSARY = [
  { term: 'Daily Bias', meaning: 'Kierunek dnia z odprawy: Bullish – energia dziś co najmniej podstawowa i koperty w planie; Bearish – energia poniżej połowy podstawowej albo osłony pod minimum; w innym razie Neutral.' },
  { term: 'Bullish / Neutral / Bearish', meaning: 'Dobry, spokojny i zły dzień dla budżetu – wynik Daily Bias.' },
  { term: 'Killzone', meaning: 'Godzina tygodnia, w której wydajesz najwięcej; misja „Killzone” prosi o niższy wydatek w tej godzinie.' },
  { term: 'BOS', meaning: 'Break of Structure: majątek przebił ostatni szczyt albo dołek zgodnie z trendem – trend trwa.' },
  { term: 'CHoCH', meaning: 'Change of Character: pierwsze przebicie przeciw trendowi majątku – możliwa zmiana kierunku.' },
  { term: 'FVG', meaning: 'Fair Value Gap: luka między planem a faktem w kopercie (+ zostało, − ponad plan).' },
  { term: 'Order Block', meaning: 'Strefa stałych kosztów: kontenery ładowni, które co miesiąc zabierają tę samą kwotę.' },
  { term: 'Premium / Discount', meaning: 'Wydane ponad część miesiąca, która minęła (Equilibrium), to Premium – za szybko; poniżej niej to Discount – zapas.' },
  { term: 'DOL', meaning: 'Draw on Liquidity: cel, do którego popłynie następna dostawa z puli Cele.' },
  { term: 'Silver Bullet', meaning: 'Odprawa otwarta między 10:00 a 11:00 czasu nowojorskiego – skrót w trzech zdaniach.' },
  { term: 'Judas Swing', meaning: 'Zakup oznaczony jako impuls – znacznik w dzienniku wachty, nie naruszenie.' },
  { term: 'Turtle Soup', meaning: 'Zwrot towaru: pieniądze oczekiwane z zakupu wracają i zamykają się z wpływem tej samej marki.' },
  { term: 'Liquidity sweep', meaning: 'Energia dnia zebrana co do grosza – znacznik w dzienniku wachty.' },
  { term: 'Zwrot do masy', meaning: 'Dopłata z budżetu do konta tradingowego (wpis w ICTTJ); sprawdza ją rozkaz „firewall”.' },
  { term: 'Nadwyżki w masie', meaning: 'Pula wypłaty z ICTTJ – nadwyżka z konta tradingowego; dokuje się w zwykłej kolejności (osłony, kadłub, cele).' },
  { term: 'Bieżące', meaning: 'Pula wypłaty z ICTTJ na bieżące potrzeby; dokuje się w zwykłej kolejności (osłony, kadłub, cele).' }
] as const

export type GlossaryTerm = (typeof GLOSSARY)[number]['term']
export type IctTerm = (typeof ICT_GLOSSARY)[number]['term']

/** „Daily Bias – Kierunek dnia: …” – an ICT term with its meaning (a tooltip). */
export function ictOf(term: IctTerm): string {
  const g = ICT_GLOSSARY.find((x) => x.term === term)
  return g ? `${g.term} – ${g.meaning}` : term
}

/** „Osłony – bufor na pensje: …” – a term with its meaning (a tooltip). */
export function glossaryOf(term: GlossaryTerm): string {
  const g = GLOSSARY.find((x) => x.term === term)
  return g ? `${g.term} – ${g.meaning}` : term
}
