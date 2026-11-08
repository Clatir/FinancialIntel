# Katalog funkcji użytkowych – Financial Intel 1.15.4 (komputer)

Spis funkcji widocznych dla użytkownika z odnośnikiem do wymagań i do punktów audytu (`docs/audyt/punkty/`). Źródła:
specyfikacja, decyzje D… / T…, przegląd 1.4.1 (B, N, F), audyt 1.15.2 (N-PC), CHANGELOG, listy „Do sprawdzenia
w aplikacji” 1.5.0–1.12.0. Telefon poza zakresem (D97).

| Plik punktów | Obszary | Punkty | Claude / Maszyna / Ty |
| --- | --- | --- | --- |
| `1-start-mostek-wpis.md` | KR kreator, MO Mostek, SW szybki wpis | 103 | 95 / 6 / 2 |
| `2-operacje-import.md` | OP Operacje, ME meldunki, IM import z mBanku, SA salda | 118 | 112 / 5 / 1 |
| `3-pieniadze.md` | PM plan miesiąca, LA Ładownia, DO dokowanie, MG Mapa gwiezdna, DM domownicy i pożyczki, RA Radar, PR przekrój | 130 | 120 / 9 / 1 |
| **Razem** | | **587** | **527 / 48 / 12** |
| `4-dowodztwo-wywiad-raporty.md` | DW Dowództwo, WY Wywiad, RY rytuały, RE raporty i eksport | 105 | 94 / 8 / 3 |
| `5-dane-interfejs-system.md` | DA dane i dwa komputery, US Ustawienia, IN interfejs, SY system Windows | 131 | 106 / 20 / 5 |

## KR – kreator startu (KR.1–33)
- Wybór folderu: propozycja w OneDrive, podfolder, „Otwórz istniejące”, postęp i „Przerwij” (spec „Kreator” 1, D62, D82)
  – KR.1–5; baner kreatora (T220) – KR.6.
- Salda teraz → saldo otwarcia (T51) – KR.7–10; domownicy i rozliczenia na start (N-PC-18) – KR.11–12.
- Import historii i powrót do kreatora (D27) – KR.13–14; pensja, cele osłon i kadłuba (D70, T45, T47) – KR.15–18;
  ładownia, koperty, bilans pensji – KR.19–21; ICTTJ i cele (D84 C8) – KR.22; podział środków (D13), zbiorniki na
  start – KR.23–25; rozkazy, skrót, autostart – KR.26–27; „Uruchom budżet” – KR.28–29; przerwanie – KR.30–31;
  start gry (D73) – KR.32; prawdziwy CSV (Ty) – KR.33.

## MO – Mostek (MO.1–34)
- Energia dziś i ta sama liczba wszędzie (spec, T30, D17) – MO.2–4, MO.34; „Skąd ta liczba?” (F29) – MO.5–7;
  Daily Bias (T57, T216) – MO.8; odprawa: alarmy i przejścia, asteroidy, import, nowy plik, salda, domownicy, F1, F9,
  F16, F26, F31, F34, pierwsze otwarcie dnia – MO.9–16; odsłuch (D49) – MO.17–18; Silver Bullet – MO.19.
- Stan okrętu: warstwy, suma warstw = suma kont, wolne do decyzji, zasięg i klasa, masa ładunku – MO.20–24.
- Panele: koperty, rozliczenia (D80), przychody (D81), dokowanie, „Wycofaj dokowanie” (N-PC-2), krzywa majątku,
  ostatnie operacje, osobne okna – MO.25–32; słowniczek (F29) – MO.33.

## SW – szybki wpis (SW.1–36)
- Otwarcie i skrót, AltGr (D46, B29) – SW.1–3; wydatek i Enter – SW.4; podgląd energii (T186) – SW.5–7.
- Wpływ, od domownika, „W tym za X” (D80, D81) – SW.8–11; za domownika, prezent, wspólnie (D83) – SW.12–14;
  podział paragonu – SW.15–17; „plan czy impuls” (D41) – SW.18; cisza nocna (D40, N-PC-19) – SW.19–20.
- Konto (N-PC-5) – SW.21; data, kwota, zwrot – SW.22–24; oficer (F8) – SW.25; tagi (F17, N-PC-11) – SW.26; seria,
  „Powtórz ostatni”, szablony, szkic po Esc (F7) – SW.27–30; Esc / Enter, podwójny zapis – SW.31–32; listy, tylko do
  odczytu, ukryte kwoty – SW.33–35; ergonomia samą klawiaturą – SW.36.

## OP – Operacje (OP.1–43)
- Lista, sumy, salda kont, okres, wyszukiwanie, filtry, oznaczenia, „Więcej filtrów”, sortowanie, zapisane widoki
  (F18), filtr komputera, kolumny – OP.1–12.
- Nowa operacja i szkic, pola edytora, oficer i „Zapamiętaj”, historia zmian (D28), ostrzeżenia przy edycji (F12) –
  OP.13–20; usuwanie z „Cofnij”, podział paragonu, oznaczenia domownik / plan / noc, tagi – OP.21–27.
- Zmiany zbiorcze z „Cofnij” (F11) – OP.28–33; przelew między kontami (F10, D87) – OP.34–35; zwroty w drodze (F34) –
  OP.36–37, OP.43; reguła dla tytułu (1.15.3) – OP.38; eksport widocznej listy – OP.39; brzegi, klawiatura, tylko do
  odczytu – OP.40–42.

## ME – meldunki (ME.1–10)
- Skrzynka, licznik, Ctrl+Shift+M (F6, D86) – ME.1–3; bez kategorii, duplikaty, pary przelewów, nietypowe sygnały
  (F31), salda po 30 dniach – ME.4–10.

## IM – import z mBanku (IM.1–56)
- Ekran, formaty, kodowania, pliki błędne – IM.1–6; tematy i decyzje, podpowiedzi, wyszukiwarka, słowa kluczowe,
  podobne nazwy (D68, D75–D78) – IM.7–13; łączenie z wpisem ręcznym ±3 dni (D77) – IM.14–15; nierozliczone – IM.16–17.
- Rozpoznanie: przelew własny, gotówka, opłaty, zwrot towaru, XTB, druga strona (N-PC-15) – IM.18–22; domownicy,
  „+ domownik”, wspólnie, pożyczka i PIT-38 (D80, D81, D83, D91, 1.15.3) – IM.23–26; nauka reguł – IM.27.
- Kopia przed importem, wynik, „Cofnij import” (F4), saldo z pliku (F5), Pobrane (F14), inny rachunek, powtórny import
  – IM.28–44; audyt reguł (F22) – IM.45–48; duplikaty – IM.49–51; zaległy import – IM.52–53; brzegi, duży plik,
  prawdziwy plik (Ty) – IM.54–56.

## SA – salda (SA.1–9)
- Saldo otwarcia, potwierdzenie, rozbieżność i korekta, wyjaśnienie, przypomnienia, dwa komputery, niedziela – SA.1–9.

## PM – Plan miesiąca (PM.1–30)
- Pensja 1. dnia, z kadłuba, częściowa (D11, D14) – PM.1–3; „pensja > przychody”, panel Przychody (D81) – PM.4–6;
  propozycje pensji i kopert (D70) – PM.7–8; plan odziedziczony – PM.9; podział pensji, koperty codzienne i planowe
  (D16) – PM.10–11; przydział, przeniesienie, przekroczenie, deficyt (D15, D17, T30) – PM.12–15; próg 20 %, limit 0 –
  PM.16; „pokryj z koperty” (F28) – PM.17; łupy: decyzja, osłony po 7 dniach, zmiana po 7. dniu (D18, N-PC-16) –
  PM.18–21; reszta koperty planowej (F28) – PM.22; debriefing i „na plus” – PM.23–24; pierwszy miesiąc – PM.25;
  zarchiwizowana kategoria – PM.26; plan następnego miesiąca – PM.27; plan kampanii (F37) – PM.28; spłata pożyczki
  z planu (N-PC-17) – PM.29; powiadomienia energii i kopert – PM.30.

## LA – Ładownia (LA.1–19)
- Nowy kontener, linia zanurzenia i symulacja – LA.1–2; odkładki: roczna, kwartał, harmonogram, cykl 13, dzień 31.,
  rachunek zmienny, propozycje (F23) – LA.3–7; rata nominalna i wyrównawcza (N-PC-8), zbiornik, płatność przed terminem,
  zrzut – LA.8–11; stan opłat w miesiącu, „Zapłacone”, „Połącz płatności” (F1) – LA.12–14; nowa cena, historia kwot,
  kontener bez płatności (F9) – LA.15–17; usunięcie z „Cofnij” – LA.18; powiadomienia – LA.19.

## DO – dokowanie i granica ICTTJ (DO.1–25)
- Kolejność rozładunku – przykład ze specyfikacji (D13) – DO.1–2; pule Cele i Podatek (D55, D72) – DO.3–5; częściowe
  dokowanie, kwoty celów, wycofanie (N-PC-1–3) – DO.6–7; Portfel XTB po 3 dniach roboczych, święta, wpływ bez wpisu,
  inna kwota (D56, D72) – DO.8–12; każdy wpis raz, wpis usunięty, sprzed startu, „Pomiń” – DO.13–16; firewall (D23) –
  DO.17–18; wpis na żywo, powiadomienie, Ustawienia → ICTTJ, nowszy format – DO.19–22; **FI nie pisze w folderze
  ICTTJ**, prawdziwa wypłata (Ty), „Otwórz ICTTJ” – DO.23–25.

## MG – Mapa gwiezdna (MG.1–12)
- Cele własne i z ICTTJ, bez kwoty, inna waluta, zmiana scenariusza – MG.1–4; tempo i ETA – MG.5; kurs przechwycenia
  i rata z pensji (F15) – MG.6–7; przeniesienie środków (N-PC-6), archiwizacja, wydatek z celu – MG.8–11; DOL – MG.12.

## DM – domownicy i pożyczki (DM.1–19)
- Zakup finansowany, zaliczka (D80) – DM.1–2; wpłaty: wskazane zakupy, do przypisania, pytanie raz, niezależna wpłata
  (1.15.3), wcześniejsza wpłata (D94), zamknięte miesiące (N-PC-9) – DM.3–8; „+ także za X”, podział, wspólnie,
  prezent (D81, D83) – DM.9–11; rozliczenia od dnia, saldo na start, dług otwarcia (N-PC-12) – DM.12–13; zwrot towaru
  domownika – DM.14; przypomnienie po 30 dniach – DM.15–16; pożyczki udzielone i wzięte (D22, D72) – DM.17–19.

## RA – Radar (RA.1–14)
- Oś 90 dni, pensje, asteroidy, opłaty miesięczne, spodziewane wpłaty – RA.1–5; boje (F16) – RA.6–7; PIT-38 – RA.8–9;
  salda kont naprzód (F26) – RA.10; osłony po zdarzeniu – RA.11; należności – RA.12; koniec kontenera, zwroty – RA.13–14.

## PR – przekrój liczb (PR.1–11)
- Suma warstw = salda kont, cele warstw i wolne do decyzji, zasięg i klasa, „Skąd ta liczba?”, energia dziś wszędzie
  (także w dymku zasobnika), te same liczby na ekranach, w raportach i eksporcie, grosze z resztą w ostatniej części,
  kwota 0 i duże kwoty, przełom miesiąca – PR.1–11.

## DW – Dowództwo (DW.1–37)
- Start gry, ocena i zamrożenie dni (T9, T75) – DW.1–8; naruszenia zwykłe i poważne (D17, D23, D40, D80 f, T216,
  T279, N-PC-19) – DW.9–16; seria i rekord – DW.17; awans 30 z 35, misja = 3 dni (D35, D73) – DW.18–21; degradacja
  (D36) – DW.22–23; klasy okrętu – DW.24–25; misje tygodniowe (D38, T78) – DW.26–29; osiągnięcia (D39) – DW.30;
  dziennik wachty – DW.31; smaczki ICT – DW.32–33; rozkazy i progi – DW.34–36; powrót po przerwie – DW.37.

## WY – Wywiad (WY.1–28)
- Daily Bias, krzywa majątku z BOS / CHoCH i majątkiem netto (F24), okres, Killzones, FVG, wydatki w czasie z drążeniem
  (F20), prognoza zasięgu, dziennik kapitański, bilans paliwa (F25), kurs 12 miesięcy (F27), manewry (F35), inflacja
  (F36), wyprawy (F17), terminy ICT i puste stany – WY.1–28.

## RY – rytuały (RY.1–25)
- Odprawa poranna, odsłuch, Silver Bullet – RY.1–7; raport wachty – RY.8–11; wieczorne dopisanie (F13, N-PC-20) –
  RY.12–17; debriefing (D18) – RY.18–20; „Miesiąc zamknięty na plus” – RY.21–22; przegląd roczny – RY.23–25.

## RE – raporty i eksport (RE.1–15)
- Ekran Raporty, eksport CSV / Excel / PDF / ZIP, eksport widocznej listy, zgodność sum z ekranem, znaki specjalne
  (D29, D89, T84) – RE.1–15.

## DA – dane i dwa komputery (DA.1–46)
- Folder: wybór, obce pliki, folder ICTTJ odrzucony, „tylko online” i „Przerwij”, zmiana folderu, uszkodzony fi.json –
  DA.1–8; kopie (D31, D84 C4, F2) – DA.9–16; odzyskanie z kopii (F3) – DA.17–20; historia wpisu, usunięte, dziennik
  zmian (F33) – DA.21–25; konflikty chmury i scalanie – DA.26–31; drugi komputer, obecność, „w użyciu” (D86, F21) –
  DA.32–37; nowsza wersja – DA.38–39; znikający folder – DA.40–42; zamknięcie z niezapisanymi – DA.43–44; szkic i format
  plików – DA.45–46.

## US – Ustawienia (US.1–33)
- Zakładki, nazwa okrętu, konta, kategorie, warstwy, rozkazy, cisza nocna, próg dziennika, domownicy, ICTTJ, import,
  powiadomienia, dźwięki, skrót i AltGr, rozmiar, kontrast, ukrywanie kwot (F30, F40), zasobnik, kopie, aktualizacje,
  token, trwałość ustawień, tylko do odczytu – US.1–33.

## IN – interfejs (IN.1–28)
- Menu i Ctrl+1…0, Ctrl+N / S / $, rozmiar, paleta (F19), panele i układy, panele odłączone, F1 i słowniczek, okna
  modalne, puste stany, brzegi tekstu, komunikaty, banery, terminy i metafora, polszczyzna, wygląd ICTTJ, animacje,
  „Co nowego”, wskaźnik zapisu, klawiatura – IN.1–28.

## SY – system Windows (SY.1–24)
- Pliki wydania i SHA-256, instalacja, pierwsze uruchomienie, aktualizacje, portable, jedna instancja, X i „Zakończ”,
  zasobnik, autostart, globalny skrót, powiadomienia o swoich porach, kliknięcie powiadomienia, logi, uśpienie,
  zamknięcie Windows, odinstalowanie – SY.1–24 (głównie Maszyna).

## Wątpliwości z pisania punktów (kandydaci na luki – do wniosków, AU-11)
Zebrane z raportów agentów; każda ma odnośnik w punkcie:
- 1.15.3 bez decyzji D / T: „niezależne wpłaty domowników” przeczą spec / D80 b / D91; cztery nazwy tej samej opcji
  (IM.23, OP.38; patrz `raport/0-przygotowanie.md` P.3).
- D95 vs kod: N-PC-2 „Wycofaj dokowanie” (MO.29) i N-PC-7 „usuwanie nieużywanych kategorii” (US.6) – opis decyzji nie
  zgadza się z tym, co widać w interfejsie; N-PC-1…20 opisane jednym zdaniem.
- D84 C9 „odprawa o ustalonej godzinie z powiadomieniem” – spec i T56 mówią o pierwszym otwarciu (MO.16, US.16).
- Zakup nocny „plan”: N-PC-19 / D95 zmieniają regułę gry bez decyzji użytkownika; pytanie „plan czy impuls” dopiero
  od progu (SW.20, DW.13).
- „Miesiąc na plus”: spec (koszty netto ≤ pensja) vs T178 (wynik energii ≥ 0) – RY.21.
- D84 C9 (rozkazy tylko w Ustawieniach) vs T227 / N73 (edycja w Dowództwie) – DW.34.
- Retencja kopii: spec „30” vs D84 C4 „14 dziennych + 8 tygodniowych” – DA.11; brak kopii przed aktualizacją – SY.4.
- Gotówka: spec „bez osobnego portfela” vs D83 (konto Gotówka) – ryzyko podwójnego liczenia bankomatu (IM.19).
- Trzy progi przypomnień o saldach (7 dni, 30 dni, niedziela) – SA.6, ME.10.
- Przerwany kreator: część odpowiedzi zapisuje się od razu, a baner zaczyna od nowa (KR.30–31).
- Usuwanie reguły i słowa kluczowego bez „Cofnij” (IM.48); „Cofnij import” tylko dla ostatniego (IM.31).
- Teksty z kodami decyzji w interfejsie („(D40)”, „Daily Bias (spec, Wywiad)”) – OP.26, WY.25, DW.34.
- Powiadomienia procesu głównego bez przełącznika, brak „Nie przeszkadzać” w wymaganiach (SY.20).
- Przykład dokowania ze specyfikacji: zasięg „6,5 mies.”, a T218 (D87) obcina napis – aplikacja pokaże 6,4 (DO.1).
- Skład sumy warstw (należności, rezerwa podatku, łupy do podziału) i definicja łupów (spec „niewydane z kopert” vs
  T28 „niewydana energia”) – PR.1, PM.18; „energia dziś” = przydział (spec) vs przydział − wydane dziś (T295).
- N-PC-3 „checkbox celu” w CHANGELOG – w oknie same pola kwot (DO.6); F37 bez sumy rocznej na kopertę (PM.28).
- Firewall: spec wymaga potwierdzenia, nie mówi gdzie – zwłaszcza dla dopłaty wykrytej tylko z importu (DO.17).
- Powrót po przerwie: dni zamrażane 3 min po otwarciu, przed importem z banku – możliwy „darmowy” awans (DW.37).
- Przegląd roczny „w styczniu” bez przypomnienia w tabeli powiadomień (RY.25); „Cisza w eterze” – misja i osiągnięcie
  o tej samej nazwie (D73).
