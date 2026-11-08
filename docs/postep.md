# Financial Intel – postęp

Stan bieżący, kolejka i komunikat przed najbliższą grupą. Zakończone etapy, ich wpisy i pomiary: do 1.15.4 –
`docs/archiwum/postep-do-1.15.md`, audyt 1.15.4 i grupy po nim – `docs/archiwum/postep-od-1.15.4.md` (Grep po wersji,
grupie albo identyfikatorze). Po wydaniu wpisy grupy przenoś do archiwum – tutaj zostaje stan (≤ 20 KB, sprawdza CI – D103).
Odwołania „`docs/postep.md` „…”” w starszych dokumentach i komentarzach (sekcje do 1.15.1 i audyt) prowadzą do archiwum.

**Stan (08.11.2026):** **1.19.1 wydane** (07.11.2026, Sankey „Skąd i dokąd” – miesiąc w nagłówku, składniki przychodów
z pracy, oznaczenie miesiąca w Debriefingu; PR #66). Wcześniej: 1.19.0 (D102), ciągi N1–R2 (1.15.5–1.17.0) i G0–GD
(1.17.1–1.18.1) – wpisy w archiwum `postep-od-1.15.4.md`. Żadna grupa nie jest zaczęta; następna – na komendę (D67).

## Otwarte
- **Odbiór zbiorczy 1.15.5–1.19.1:** maszyna wirtualna przez Cowork (48 punktów, `docs/audyt/maszyna.md`, wynik →
  `docs/audyt/raport/maszyna.md`) i sesje „Ty” (`docs/audyt/ty.md`); opisy punktów w `docs/audyt/punkty/`. Warianty
  „do potwierdzenia” z ciągów zaakceptowane 05.11.2026 – tabela w archiwum (Grep „Do potwierdzenia”).
- **Rzeczy otwarte z grup** (archiwum, punkty „Otwarte” N1–R2): podpowiedź oprocentowania, pomiar Workera w maszynie
  (IM.55), niestabilny `ap20.spec.ts:53`.
- **Porządek lokalny** (Sonnet 5.5 · medium, ok. 0,25 h): drzewa `C:\CC-Projekty\FI-wt\*` (gałęzie scalone, bez zmian) do
  usunięcia – najpierw łącza `node_modules` / `.tools` (`[System.IO.Directory]::Delete(<łącze>, $false)`), potem
  `git worktree remove`; scalone gałęzie `claude/1.15.*`–`1.17.*`; `git pull` w `C:\CC-Projekty\FinancialIntel`.
- **Node lokalnie:** systemowy 20.12 jest za stary (`check-node.mjs`) – na początek `PATH` folder
  `.tools\node-v24.21.0-win-x64`.
- **iPhone iD / iE** – wstrzymane (D98), tylko na osobną decyzję; dawny komunikat „Przed grupą iD” (21.10) w archiwum.
- Odrzucone (D88): F32, F38, F39, F41, F43.

## Oszczędzanie tokenów (D103, 08.11.2026) – bez wersji, bez CHANGELOG
- Po audycie zużycia tokenów: zasady przeglądów, thinking i kontekstu (D103, zmienia D96 cz. 1) – w CLAUDE.md i skillu
  `etap`. Technicznie (T525–T530): rejestr T w `docs/decyzje-techniczne.md`, CLAUDE.md 13,3 → ok. 7 KB (wiedza do
  `.claude/rules/`, nowy `dane.md`), ten plik 49 → poniżej 20 KB, zamknięte przeglądy do `docs/archiwum/`, długie linie
  złamane, ciche reportery testów lokalnie, blokady czytania wyników buildów i testów.

**Lekcje z ciągu:** równolegle najwyżej 4–5 podagentów (więcej – zbyt wolne E2E i niestabilności); jeden przegląd xhigh
całości + jeden high na poprawkach, dalej tylko przy poważnych uwagach; numery T przydzielaj podagentom z góry.

## Zasady prowadzenia (prośba użytkownika 16.10.2026 – D67)
- Po każdym kroku (etapie albo grupie) zaktualizowana tabela: model i thinking z górką, szacowany czas pracy Claude'a.
- Bez komendy użytkownika nie zaczynam kolejnego etapu ani grupy. Wyjątek: ciąg N1–R2 – komenda z 04.11.2026 obejmuje
  wszystkie grupy, bez pauz między nimi (D101).
- Etapy, które mogą iść jednym ciągiem, są zgrupowane: w grupie bez pauzy między etapami (każdy etap i tak kończy się
  testami, `/code-review` high, commitem i wpisem tutaj), jeden PR i jedno wydanie na grupę, potem pauza.
- Wpis etapu: zakres, decyzje (D… / T…), testy, czas faktyczny, rzeczy otwarte – zwięźle; mapa kodu nie jest
  potrzebna (kod przeszukuje się Grepem).

## Kolejka prac

Czas = praca Claude Code w sesji, bez testowania przez użytkownika i bez czekania na CI. Ukończone grupy z czasami:
archiwa dziennika (sekcje „Kolejka prac”). Planowane grupy:

| Grupa | Etapy | Model | Thinking | Czas Claude'a | Wydanie | Co potrzebne przed startem | Stan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **iD** | iPhone: Ładownia i gwiazdy – dokowanie z ICTTJ, Ładownia, Mapa gwiezdna (IP15–IP17) | Opus 5.5 | **max** (z IP15; bez niego xhigh) | 1,25–1,75 h z IP15, 0,5–0,75 h bez (z górką 2 h; plan był 4–4,5 h – grupy iA–iC trwały 0,15–0,3 planu) | później | odpowiedź: czy folder danych ICTTJ jest na OneDrive (bez tego IP15 odpada); limit tygodniowy po iC; komenda | ⏸ wstrzymane (D98) |
| **iE** | iPhone: Dowództwo – Dowództwo, Wywiad, kreator, Ustawienia, zapisy w tle (IP18, IP19, IP21, IP22, IP24) | Opus 5.5 | **xhigh** (D96; max tylko w krokach silnika pieniędzy albo granicy ICTTJ) | 5,5–7,5 h (z górką 8 h) | później | decyzje: IP21 (kreator – propozycja: bez), IP24 (zapisy w tle z telefonu) | ⏸ wstrzymane (D98) |
