# Audyt w maszynie wirtualnej (Cowork)

Cowork w maszynie wirtualnej z Windows sprawdza punkty audytu oznaczone **Kto: Maszyna** – te, których Claude nie
sprawdzi na Twoim komputerze: instalacja i aktualizacja z GitHuba, zasobnik, autostart, globalny skrót, prawdziwe
powiadomienia Windows i wszystko, co wymaga przestawienia zegara (D97). Wzór: `docs/odbior-vm.md` w Regulated Day.
Część 1 robisz Ty (raz ok. 1 h, potem dwa wklejenia polecenia), części 2–4 – Cowork. Raport to nie odbiór: werdykty
sprawdzam ja (AU-11), a decyzje o poprawkach są Twoje.

Opisy punktów („Jak sprawdzić”, „Oczekiwany efekt”, „Nie przechodzi, gdy”) są w pakiecie (`Y:\punkty\*.md`) i na
GitHubie: https://github.com/Clatir/FinancialIntel/tree/claude/audyt-1.15.4/docs/audyt/punkty – tutaj tylko kolejność,
przygotowanie i różnice w maszynie. W maszynie jest 48 punktów; zgrubnie 8–12 h pracy Cowork **jednym ciągiem**
(etapy 1–6), potem krótkie dokończenie po restarcie Windows (etap 7) – restart zamyka Claude Desktop, więc to drugie
polecenie.

## 1. Przygotowanie (Ty, raz – ok. 1 h)

1. **Maszyna `FI-test`.** Jeśli masz `RD-test` z Regulated Day – sklonuj ją z migawki „czysta” (stan RD-test zostaje
   nietknięty), w PowerShell na komputerze:
   ```
   & "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" clonevm "RD-test" --snapshot "czysta" --options link --name "FI-test" --register
   ```
   Bez `RD-test` – nowa maszyna jak w `odbior-vm.md` RD, część 1, kroki 1–3 (Windows 11, region i format Polska, strefa
   Warszawa, 1920×1080 przy 100 %, konto lokalne z administratorem, czas automatyczny wyłączony, zasilanie „Nigdy”, UAC
   „Nigdy nie powiadamiaj”, powiadomienia włączone, „Nie przeszkadzać” wyłączone).
2. Zegar maszyny bez synchronizacji z komputerem (maszyna wyłączona):
   ```
   & "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" setextradata "FI-test" "VBoxInternal/Devices/VMMDev/0/Config/GetHostTimeDisabled" 1
   ```
3. Foldery współdzielone (Ustawienia maszyny → Foldery współdzielone, „Automatyczne montowanie”, „Stały”):
   - `C:\FI-vm-raport` → nazwa `FI-raport` (w maszynie zwykle `Z:`) – raport, zrzuty, logi;
   - `C:\FI-vm-pakiet` → nazwa `FI-pakiet`, **tylko do odczytu** (w maszynie zwykle `Y:`) – pakiet z danymi
     syntetycznymi: `maszyna.md` (ta instrukcja), `rok\` (folder danych persony), `ictj\` (folder ICTTJ persony),
     `pliki\` (CSV z mBanku, nowa wypłata ICTTJ, `CZYTAJ.txt`), `punkty\` (opisy punktów).
     Pakiet przygotowuję ja (Claude) – sprawdź, że `C:\FI-vm-pakiet` istnieje.
4. W maszynie: folder roboczy `C:\FI-raport`, folder `C:\FI-test`. Claude Desktop z Cowork i sterowaniem komputerem;
   próba „zrób zrzut ekranu i otwórz Notatnik”.
5. Migawka „fi-czysta” (Maszyna → Zrób migawkę) – przed instalacją Financial Intel.

**W trakcie** nie wyłączaj i nie uruchamiaj ponownie maszyny – restart cofa zegar do prawdziwej daty, a zegar idzie tylko
do przodu. Jedyny restart robi sam Cowork na końcu (etap 7). Pauza = „Zapisz stan maszyny”.

**Uruchomienie (Ty):** w maszynie Claude Desktop → Cowork → nowe zadanie; dostęp do `C:\FI-raport`, `C:\FI-test` i `Y:`,
zgoda na sterowanie (Financial Intel, Ustawienia, PowerShell, Edge, Eksplorator, Notatnik, Menedżer zadań); wklej
polecenie 1. Pierwsze minuty popatrz i odpowiadaj na prośby o zgodę, potem pracujesz normalnie na swoim komputerze.
Po restarcie Windows (koniec etapu 6) zaloguj się w maszynie i wklej polecenie 2. Na końcu napisz mi „Maszyna gotowa”.
Model Cowork: **Sonnet 5.5** wystarczy (ocena dosłownie według punktów); Opus 5.5 – gdy Sonnet gubi się w krokach
z zegarem albo w długim ciągu.

**Polecenie 1** (całość, jednym ciągiem):

```text
Wykonaj po kolei etapy 1–6 instrukcji Y:\maszyna.md (zasady w części 2, raport w części 3, opisy punktów w Y:\punkty\*.md), bez pytania mnie o kolejne etapy; jeśli zadanie zostało przerwane, przeczytaj C:\FI-raport\raport.md i wznów od pierwszego punktu, którego tam nie ma.
```

**Polecenie 2** (po restarcie Windows):

```text
Wykonaj etap 7 instrukcji Y:\maszyna.md (zasady w części 2, raport w części 3) i na koniec napisz krótko, ile punktów jest ZGODNE, NIEZGODNE i pozostałych w całym C:\FI-raport\raport.md oraz które są NIEZGODNE.
```

Gdy instrukcji nie ma na `Y:` – ta sama treść jest pod
https://raw.githubusercontent.com/Clatir/FinancialIntel/claude/audyt-1.15.4/docs/audyt/maszyna.md.

## 2. Zasady dla Cowork

1. Pracujesz tylko w tej maszynie: bez logowania do kont, bez zmian w Windows poza opisanymi, bez ręcznej edycji plików
   danych (poza krokami: skopiowanie pliku z pakietu, zmiana nazwy folderu).
2. Każdy punkt oceniasz wyłącznie według „Oczekiwanego efektu” i „Nie przechodzi, gdy”; „Stan danych” mówi, który folder:
   **`C:\FI-test\nowy`** (kreator od zera – punkty ze stanem `start` / `pusty`) albo **`C:\FI-test\rok`** (persona `rok`
   – kopia `Y:\rok`). Folder ICTTJ: `C:\FI-test\ictj` (kopia `Y:\ictj`). Pliki z banku: `Y:\pliki`.
3. **Zegar:** Ustawienia → Czas i język → Data i godzina → „Ustaw ręcznie datę i godzinę” → „Zmień”. Tylko do przodu.
   Gdy zegar pokazuje chwilę wcześniejszą niż ostatni wpis w raporcie – przerwij i zapisz to.
4. **Powiadomienia:** po kroku, który ma wywołać powiadomienie, czekasz do 2 min; zapisujesz tytuł i treść dosłownie;
   klikasz powiadomienie tylko, gdy punkt każe.
5. **Okna:** okno Financial Intel niezmaksymalizowane, okno Claude obok. Gdy punkt każe zostawić aplikację w zasobniku –
   zamykasz okno krzyżykiem (nie „Zakończ”).
6. Raport dopisujesz zaraz po każdym punkcie. Błąd (komunikat, zamknięcie aplikacji) – zrzut, godzina, wpis, następny
   punkt. Wygląd, kolory i ton ocenia użytkownik – zapisujesz, co widać, z wynikiem „DO OCENY”.
7. Do kilku punktów potrzebne są wydatki „z dziś” – dopisujesz je szybkim wpisem (kwoty dowolne, 10–80 zł, kategoria
   Jedzenie).

## 3. Raport

Folder roboczy `C:\FI-raport`, raport `C:\FI-raport\raport.md`. Zrzut: Win+PrtScn (Obrazy → Zrzuty ekranu), w raporcie
nazwa pliku. `main.log`: `%APPDATA%\Financial Intel\logs\` (wersja portable – ten sam folder). Na koniec **każdego
etapu** w PowerShell (N – numer etapu) – raport i logi są wtedy już u użytkownika, nawet gdyby ciąg się przerwał:

```
$n = N
New-Item -ItemType Directory -Force "C:\FI-raport\logi\etap-$n", "C:\FI-raport\zrzuty" | Out-Null
Copy-Item "$env:APPDATA\Financial Intel\logs\*" "C:\FI-raport\logi\etap-$n\" -Recurse -Force
Copy-Item "$env:USERPROFILE\Pictures\Screenshots\*" "C:\FI-raport\zrzuty\" -Force
Copy-Item "C:\FI-raport\*" "Z:\" -Recurse -Force
```

Nagłówek etapu `## Etap N – <data i godzina maszyny>, wersja <Ustawienia → Aktualizacje>`, każdy punkt:

```
### SY.13 – ZGODNE
- Godzina (zegar maszyny): 9:12–9:20
- Zrobione: …
- Widać: … (teksty dosłownie, w cudzysłowie)
- Zrzuty: Zrzut ekranu (12).png
```

Wyniki: **ZGODNE** – dokładnie „Oczekiwany efekt”; **NIEZGODNE** – który przykład z „Nie przechodzi, gdy” albo czym
zachowanie różni się od oczekiwanego; **UWAGA** – różnica tylko w wyglądzie albo tekście; **DO OCENY** – gust albo zmysł
(dźwięk); **NIE DO SPRAWDZENIA** – dlaczego. Punkt w kilku etapach („część 1”, „część 2”) ma wpis w każdym.

## 4. Etapy (Cowork) – jeden ciąg

Etapy 1–6 idą jednym ciągiem, bez pytania użytkownika o kolejne. Etap 1 ma prawdziwą datę (D1), dalej zegar idzie tylko
do przodu. Daty w nawiasach są dla D1 = 4–6.11.2026; inny D1 – przesuń o tyle samo dni, zachowując dni tygodnia
i przełomy miesięcy (persona ma dane do 3.11.2026, OC 25.11, podatek od nieruchomości 15.11, zwrot w drodze do 21.11).
Przerwany ciąg wznawiasz od pierwszego punktu, którego nie ma w raporcie (zegar maszyny jest już dalej – kroki
„zegar na …” z przeszłości pomijasz i zapisujesz to). Etap 7 to osobne polecenie po restarcie Windows.

### Etap 1 – instalacja, aktualizacja, system (prawdziwa data, ok. 3–4 h)
1. **SY.2** – w Edge: https://github.com/Clatir/FinancialIntel/releases/tag/v1.15.3 → `Financial-Intel-Setup.exe`
   (SmartScreen: „Więcej informacji” → „Uruchom mimo to”).
2. **SY.3** – kreator: „Nowe dane gdzie indziej” → `C:\FI-test\nowy` (utwórz pusty); w kroku importu historii plik
   `Y:\pliki\rok-historia.csv`; reszta według punktu. Autostart w kreatorze – włączony.
3. **SY.4** – Ustawienia → Aktualizacje: 1.15.4 (sieć jest) → „Uruchom ponownie teraz”.
4. **SY.5** – zainstaluj ponownie 1.15.3 (ten sam instalator), uruchom: aktualizacja do 1.15.4 czeka → zamknij okno
   krzyżykiem (do zasobnika) według punktu.
5. (SY.12 i SY.23 – restart Windows – są w etapie 7, na samym końcu.)
6. **SY.7** – „Zakończ” w zasobniku; z https://github.com/Clatir/FinancialIntel/releases/tag/v1.15.4 pobierz
   `Financial-Intel-portable.exe`, uruchom, sprawdź według punktu, zamknij „Zakończ”; uruchom zainstalowaną z menu Start.
7. **SY.10**, **SY.13** (Notatnik na pełnym ekranie), **SY.14**, **SW.2**, **US.25** (bezczynność i Win+L), **SY.20**.
8. Folder ICTTJ: skopiuj `Y:\ictj` → `C:\FI-test\ictj`; Ustawienia → ICTTJ → wskaż go. **SY.17** (powiadomienia
   o zdarzeniach) i **DO.20**: zamknij okno do zasobnika, skopiuj do `C:\FI-test\ictj\payouts\<rok>\` nowy plik wypłaty
   (`Y:\pliki\ictj-nowa-wyplata.json` – nazwa pliku według jego daty i id, opis w pliku `Y:\pliki\CZYTAJ.txt`).
9. **MO.18** – jeśli Windows maszyny nie ma polskiego głosu (Ustawienia → Czas i język → Mowa) – punkt według opisu;
   z głosem – NIE DO SPRAWDZENIA (zapisz, jaki głos jest).
10. Persona: skopiuj `Y:\rok` → `C:\FI-test\rok`; Ustawienia → Folder danych → „Otwórz istniejące” → `C:\FI-test\rok`.
    Od teraz aplikacja pracuje w `rok`. Dopisz 2 wydatki z dziś. **PR.6** (energia w dymku = energia dziś na Mostku).

### Etap 2 – wieczór, noc, poranek (D1 → D1+1, ok. 2 h)
1. „Zakończ” → zegar D1 20:55 → uruchom, zamknij okno do zasobnika. **SY.16** część 1 i **RY.17** (21:00 – wieczorne
   dopisanie).
2. „Zakończ” → zegar 23:30 → uruchom. **SW.20** (szybki wpis zakupu z godziną 23:35, potwierdzenie ciszy nocnej),
   **SY.16** część 2 (w ciszy nocnej brak powiadomień).
3. Zegar 23:55 przy aplikacji w zasobniku (zmiana zegara przy działającej aplikacji – wyjątek z zasady 3). **SY.11**,
   **DA.16** część 1, **MO.4** część 1 (przez północ), **DW.5** (Dowództwo przed i po północy).
4. „Zakończ” → zegar D1+1 05:01 → uruchom (start z menu Start), zamknij do zasobnika; 07:30 otwórz z zasobnika:
   **MO.16**, **RY.3**, **SY.16** część 3.
5. „Zakończ” → zegar D1+1 16:25 → uruchom. **MO.19** (Silver Bullet: 10:30 czasu Nowego Jorku = 16:30 w listopadzie),
   po 17:05 drugi rzut oka według punktu.

### Etap 3 – niedziela i poniedziałek (pierwsza niedziela po D1, ok. 1,5 h)
1. „Zakończ” → zegar niedziela 10:00 → uruchom. **SA.9**, **IM.53** (zaległy import), **DM.16** (Marek – najstarszy
   zakup ponad 30 dni).
2. Zamknij do zasobnika; skopiuj `Y:\pliki\rok-nowe-lista.csv` do Pobranych maszyny. **IM.37**.
3. Import tego pliku na ekranie Import, potem `Y:\pliki\rok-podwojne.csv`. **ME.9** (nietypowy sygnał).
4. „Zakończ” → zegar niedziela 18:05 → uruchom. **RY.10**.
5. „Zakończ” → zegar poniedziałek 09:00 → uruchom. **DA.16** część 2 (kopia tygodniowa, ostrzeżenie o kopii według punktu).

### Etap 4 – terminy (11–22.11, ok. 1,5 h; każdy krok: „Zakończ” → zegar → uruchom, 10:00)
1. 11.11 10:00 – **SY.18** część 1 i **LA.19** część 1 (OC za 14 dni).
2. 12.11 10:00 – **SY.18** część 2 (podatek od nieruchomości za 3 dni).
3. 22.11 10:00 – **SY.18** część 3, **LA.19** część 2 (OC za 3 dni), **OP.43** (zwrot w drodze po terminie 21.11).
4. **SY.22** – 22.11 22:00: Start → Uśpij; zegar się nie zmienia; obudź po ok. 3 min (klawisz w oknie maszyny); według
   punktu. Gdy maszyna nie umie usnąć – NIE DO SPRAWDZENIA.

### Etap 5 – przełom miesiąca (30.11 → 8.12, ok. 1,5 h)
1. 30.11 18:05 – **RY.11** (raport wachty w ostatni dzień miesiąca); dopisz 2 wydatki z dziś.
2. 30.11 23:00 → aplikacja działa przez północ do 1.12 00:10: **PR.11**, **MO.4** część 2, **RY.22** (dźwięk – DO OCENY).
3. 1.12 09:00 – **SY.19** część 1 (debriefing), **PM.14** część 1 (1. dzień miesiąca).
4. 7.12 23:50 → aplikacja działa do 8.12 00:10: **PM.19** (łupy bez decyzji do osłon).
5. **PM.30** – według punktu (energia poniżej 20 %, koperta ponad 80 %: dopisz wydatki, aż alarm się pojawi).

### Etap 6 – rok dalej (2.01 → 1.06.2027, ok. 2 h; każdy krok „Zakończ” → zegar → uruchom)
1. 2.01.2027 10:00 – **RY.25** (przegląd roczny).
2. 31.01 23:55 → 1.02 10:00 – **RA.9** część 1 (PIT-38 od 1 lutego).
3. 28.02 10:00 i 1.03 10:00 – **PM.14** część 2.
4. 15.03 16:00 – **RY.7** (Silver Bullet: USA już na czasie letnim, Polska jeszcze nie – okno 15:30–16:30).
5. 16.04 10:00, 27.04 10:00 – **RA.9** część 2 (14 i 3 dni przed 30.04).
6. 30.04 10:00, 1.05 10:00 – **PM.14** część 3, **RA.9** część 3.
7. 31.05 10:00 → 1.06 10:00 – **PM.14** część 4.
8. **Przygotowanie restartu (SY.12, SY.23):** Ustawienia → Folder danych → „Otwórz istniejące” → `C:\FI-test\nowy`;
   autostart (Ustawienia → zasobnik i start z Windows) włączony; w Operacjach zmień notatkę jednej operacji i **od razu**
   (w ciągu 2 s) Start → Uruchom ponownie – według opisu SY.23. Zapisz w raporcie godzinę i tekst notatki, potem
   skopiuj raport (część 3, etap 6) przed restartem. Restart kończy tę sesję Cowork.

### Etap 7 – po restarcie (polecenie 2, ok. 15 min)
Zegar maszyny wrócił do prawdziwej daty (tak działa restart) – w tym etapie to oczekiwane; ocenia się tylko poniższe.
1. **SY.12** – po zalogowaniu: Financial Intel w zasobniku, okna brak; według punktu.
2. **SY.23** – otwórz okno: czy zmieniona notatka jest zapisana, co mówi `main.log` o zamknięciu; według punktu.
3. **SY.24** – odinstaluj (Ustawienia Windows → Aplikacje); sprawdź `C:\FI-test\rok` i `C:\FI-test\nowy` według punktu.
4. Skopiuj raport i logi (część 3, etap 7).

## 5. Po raporcie
Napisz mi „Maszyna gotowa” (albo wcześniej, gdy coś się zatrzyma): czytam `C:\FI-vm-raport` (raport, zrzuty, logi),
każde NIEZGODNE sprawdzam w logu i w laboratorium, wpisy trafiają do `docs/audyt/raport/maszyna.md` i do syntezy (AU-11).
