# Przegląd 1.4.1 – brakujące funkcje: szczegóły

Lista i kolejność: [README.md](README.md). Propozycje z trzech perspektyw (porównanie z YNAB, Actual Budget, Firefly III, Monarch, Copilot, Spendee, Wallet; codzienne użycie; dane i automatyzacja), scalone i sprawdzone w kodzie, że funkcji nie ma. Nakład: S ≤ 0,5 h, M ≤ 2 h, L > 2 h pracy Claude'a.

## F1. Opłaty stałe w miesiącu: zapłacone / czeka / po terminie, alarm brakującej płatności, kontenery miesięczne na Radarze

Priorytet: wysoki · nakład: M

Każdy kontener ładowni ma w bieżącym miesiącu stan: zapłacony (połączona operacja – data i kwota), czeka (przed dniem płatności) albo po terminie (minęło dueDay + 3 dni robocze, a import późniejszy niż ten dzień nie przyniósł płatności; bez nowego importu stan to tylko „czeka na import”). Stan widać w Ładowni, w pasie „Kontenery w tym miesiącu” na Mostku i na Radarze – także kontenery miesięczne (czynsz, abonamenty, raty), nie tylko asteroidy. Odprawa i powiadomienie 2 dni przed terminem i przy zaległości: „Kontener niezaładowany: Czynsz 2 000 zł, termin 10.10”. Przycisk „Zapłacone” tworzy operację z kwotą, kontem i kategorią kontenera (np. opłata z Portfela XTB, której import nie widzi), a „Połącz płatność” łączy istniejącą operację bez containerId. Asteroida opłacona przed terminem przestaje być ogłaszana.

**Po co.** Kryterium sukcesu (D4, specyfikacja): „żadna opłata okresowa nie zaskakuje budżetu”. Radar i odprawa pomijają każdy kontener z cyklem 1 miesiąc (`if (c.cycleMonths <= 1 …) continue` – src/shared/calc/radar.ts:68, src/shared/calc/briefing.ts:161). Czynsz bez płatności po terminie nie daje więc pozycji odprawy, alarmu ani powiadomienia. Lista kontenerów (src/renderer/features/cargo/CargoPage.tsx:90-104) nie pokazuje stanu zapłaty. Asteroida jest ogłaszana według kalendarza (nextPaymentOf), nawet gdy jest już opłacona. Listę rachunków ze stanem i odhaczaniem mają YNAB (Scheduled), Actual Budget (schedules: upcoming / missed), Firefly III (bills), Monarch i Copilot.

**Na czym oprzeć.** containerId i łączenie po odbiorcy (T49): src/renderer/features/cargo/actions.ts:70 linkPayments, src/shared/calc/plan.ts:393 unlinkedPayments; nextPaymentOf / activeIn w src/shared/calc/fleet.ts:167, :177; radar() w src/shared/calc/radar.ts:52; briefing() w src/shared/calc/briefing.ts:139; dueNotices (tag 'asteroid') w src/shared/notify.ts; CargoPage.tsx, BridgePage.tsx; okno „3 dni robocze + późniejszy import” jak w src/shared/calc/dock.ts (T63).

## F2. Kopia dzienna także wtedy, gdy aplikacja tygodniami działa w zasobniku

Priorytet: wysoki · nakład: S · konflikt z decyzją: Zmienia decyzję techniczną T20 („przy starcie raz dziennie”) – zgodnie z D31 (kopie codzienne).

Proces główny co godzinę i po wybudzeniu komputera (powerMonitor 'resume') sprawdza, czy jest już kopia z dziś, i robi ją, jeśli jej brak. Do tego kopia przed operacjami masowymi: scalanie duplikatów, zbiorcza kategoria / finansujący, „Rozłącz wszystkie”. W panelu kopii napis „ostatnia kopia: 2 dni temu”, z ostrzeżeniem, gdy kopia jest starsza niż 3 dni.

**Po co.** runBackups jest wywoływane tylko przy otwarciu folderu (src/main/index.ts:413) – w procesie głównym nie ma zegara kopii ani obsługi wybudzenia. Według D46 i D64 FI startuje z Windows w zasobniku, a X chowa okno. Przy usypianiu komputera zamiast wyłączania folder otwiera się więc rzadko i przez tygodnie nie powstaje żadna kopia, choć D31 obiecuje kopie codzienne. To skutek T20 („przy starcie raz dziennie”) w połączeniu z D64, a nie świadomy wybór.

**Na czym oprzeć.** src/main/index.ts:410-417 (openFolder, heartbeat), src/main/datastore/backup.ts:52 runBackups (DAILY_KEEP), panel „Kopie zapasowe” w src/renderer/features/settings/SettingsPage.tsx:249-318; operacje masowe: categorizeTicked / financeTicked w src/renderer/features/operations/state.ts, mergeDuplicate w src/shared/import/duplicates.ts, unmergeAll w src/renderer/features/import/rules.ts.

## F3. Przywracanie z kopii zapasowej w aplikacji (cały folder albo wybrane wpisy)

Priorytet: wysoki · nakład: M

Ustawienia → Folder i kopie: przy każdej kopii (dziennej, ręcznej, sprzed importu, sprzed migracji) przyciski „Podgląd”, „Przywróć…” i „Otwórz jako osobny folder (tylko do odczytu)”. Podgląd porównuje kopię z bieżącym folderem: ile operacji, planów, kontenerów, celów i pożyczek jest nowych, zmienionych i usuniętych, z listą do przejrzenia. Do wyboru „Przywróć cały folder” albo „Przywróć zaznaczone wpisy”, np. operacje usunięte importem. Przed przywróceniem zawsze powstaje kopia „przed przywróceniem”, a zastąpione wersje trafiają do .history (powód 'restore'). Rozpakowanie jest bezpieczne (yauzl bez ../), a pliki są walidowane jak przy imporcie ZIP w ICTTJ. W metaforze: „Powrót do punktu kontrolnego”.

**Po co.** Kopie powstają (D31, T20, T42), ale API ma tylko listBackups / backupNow / importBackup (src/shared/api.ts:238-241). Panel mówi wprost: „Przywracanie: rozpakuj ZIP do pustego folderu i wskaż go wyżej” (src/renderer/features/settings/SettingsPage.tsx:315). Po złym imporcie, pomyłce przy decyzji zbiorczej albo uszkodzeniu przez synchronizację OneDrive zostaje ręczna praca na plikach JSON w folderze chmury, przy której łatwo nadpisać dobre dane. Przywracanie z podglądem mają YNAB, Actual i GnuCash, a ICTTJ ma import folderu lub ZIP z wyborem „scal” albo „otwórz jako osobny”.

**Na czym oprzeć.** src/main/datastore/backup.ts (listBackups :82, isDataFile :19, importBackup :78), src/main/datastore/zip.ts, src/main/datastore/history.ts (powód 'restore'), SettingsPage.tsx:249-318, yauzl już w package.json; wzór: ICTTJ src/main/datastore/transfer.ts (import folderu / ZIP z walidacją i polityką kolizji).

## F4. „Cofnij import” – całe wczytanie pliku z mBanku jednym przyciskiem

Priorytet: wysoki · nakład: M · konflikt z decyzją: T39 (operacja usunięta przez użytkownika nie wraca z kolejnym importem): usunięcie przy cofnięciu importu nie może być liczone jako „usunięte przez użytkownika”, inaczej ponowny import pominie te wiersze.

Każdy import zapisuje paczkę: identyfikator importu w operacjach (np. bank.importId), listę operacji utworzonych, połączonych z wpisami ręcznymi i rozliczonych, poprzednie wersje rekordów, które zmienił, oraz reguły, których się nauczył. W Ustawienia → Import z banku i na ekranie wyniku jest lista „Ostatnie importy” (data, konto, plik, liczby) z przyciskiem „Cofnij import”. Usuwa on utworzone operacje, przywraca zmienione wpisy ręczne i poprzednie reguły – z jednym „Cofnij” w toaście. Zapobieganie: numer rachunku z nagłówka CSV zapamiętany przy koncie. Plik z innego rachunku albo okres już w całości zaimportowany daje ostrzeżenie przed importem.

**Po co.** runImport (src/renderer/features/import/state.ts:446) tworzy, łączy, rozlicza i usuwa operacje oraz uczy reguł. Cofnąć to można tylko ręcznie z kopii ZIP, a tej z aplikacji też nie da się przywrócić. Masowa pomyłka (zła decyzja tematu, plik złego konta, podwójny plik) to dziesiątki operacji do poprawy po kolei. Parser czyta numer rachunku (src/shared/import/mbank.ts:177, pole `account`), ale nic go nie sprawdza. Cofnięcie całej paczki importu mają Firefly III (grupy importu), YNAB i Spendee.

**Na czym oprzeć.** src/renderer/features/import/state.ts:446-500 (runImport, settings.import.log), src/shared/import/reconcile.ts buildImport (create / update / remove), src/shared/import/mbank.ts:177, src/renderer/features/history/actions.ts deleteManyWithUndo, api.importBackup (backups/pre-import).

## F5. Saldo z pliku banku: automatyczne potwierdzenie i wskazanie dnia rozbieżności

Priorytet: wysoki · nakład: M · konflikt z decyzją: D73: misja „Inwentaryzacja” liczy potwierdzenia sald, więc potwierdzenie z pliku zaliczy ją dla mBanku samo – trzeba zdecydować, czy tak ma być.

Historia rachunku z mBanku ma w każdym wierszu „Saldo po operacji”. Po imporcie FI bierze saldo po ostatniej zaksięgowanej operacji pliku (bez nierozliczonych) i porównuje je z saldem FI na ten dzień. Gdy się zgadza, zapisuje potwierdzenie salda (rekord 'confirmation' z tą datą) bez ręcznego przepisywania liczby. Gdy się różni, zamiast od razu tworzyć korektę pokazuje pierwszy dzień, od którego salda się rozjeżdżają, i operacje tego dnia („brak wpisu? podwójny wpis? zła kwota?”); korekta zostaje ostatnią opcją. Łańcuch sald w pliku (saldo poprzedniego wiersza + kwota ≠ saldo wiersza) ostrzega o luce albo przefiltrowanej liście. Ręczne „Potwierdź” zostaje dla Portfela XTB i dla „Listy operacji”, która salda nie ma. W metaforze: „Telemetria z banku – kadłub zgodny z odczytem”.

**Po co.** MbankRow.balanceAfter jest czytane (src/shared/import/mbank.ts:39, :215), ale poza parserem nic go nie używa (sprawdzone grepem). Potwierdzenie salda (BalanceCheck, src/renderer/features/import/ImportPage.tsx:717) wymaga przepisania dzisiejszego salda z aplikacji banku. To saldo zawiera już operacje spoza pliku, więc łatwo o fałszywą korektę i alarm „Rozbieżność w ładowni”. Gdy saldo się nie zgadza, nic nie podpowiada, gdzie szukać błędu. Uzgodnienie z saldem banku (reconcile) mają YNAB, GnuCash, Firefly III i Monarch.

**Na czym oprzeć.** src/shared/import/mbank.ts:38-39, :215; ImportPage.tsx:717 BalanceCheck; src/renderer/features/balances/actions.ts confirmBalance; src/shared/calc/balances.ts planConfirmation / balanceAt / lastConfirmation; runImport w src/renderer/features/import/state.ts:446.

## F6. „Meldunki do rozpatrzenia”: skrzynka zaległych spraw i diagnostyka danych z licznikiem w menu

Priorytet: wysoki · nakład: M

Panel na Mostku i licznik przy „Operacje” w menu bocznym zbierają to, co czeka na decyzję:
- wydatki bez kategorii (liczba i kwota);
- zakupy od progu bez „plan / impuls”;
- korekty salda do wyjaśnienia;
- nierozliczone starsze niż 7 dni;
- możliwe duplikaty;
- wpływy domowników z „pytaj”;
- przelewy własne na konto budżetu bez drugiej strony;
- operacje w zarchiwizowanych kategoriach;
- luki w imporcie – okresy plików (`#Za okres`) zapamiętane przy koncie, np. „brak danych 03.04–17.04”.
Każda pozycja otwiera Operacje z gotowym filtrem albo od razu edytor. Raz dziennie trafia też jedną linią do odprawy. Przypomnienie o zaległym imporcie liczy się od końca okresu ostatniego pliku, a nie od chwili importu.

**Po co.** Import celowo zostawia tematy bez decyzji, a wydatek bez kategorii liczy się do energii jako codzienny (T30) i psuje koperty. Odprawa nie zna ani braku kategorii, ani braku odpowiedzi w dzienniku (rodzaje pozycji w src/shared/calc/briefing.ts:36). Na liście „bez kategorii” to tylko przygaszony tekst w kolumnie (src/renderer/features/operations/OperationsPage.tsx:189), a filtr znaczników trzeba ustawić samemu. Okres pliku jest czytany, ale nie zapisywany – służy tylko do zniknięć (src/shared/import/reconcile.ts:210). Przypomnienie o imporcie liczy od czasu importu (briefing.ts:176-179), więc import starego pliku je wycisza. Skrzynkę „do przejrzenia” mają YNAB (Unapproved / Uncategorized), Monarch („Needs review”) i Copilot („To review”).

**Na czym oprzeć.** src/shared/operationsView.ts marksOf / needsLog / OPERATION_MARKS, src/shared/calc/briefing.ts:36, :176, src/renderer/features/bridge/BridgePage.tsx, OperationsPage.tsx:189, src/renderer/features/import/DuplicatesPanel.tsx useDuplicates, src/renderer/app/App.tsx SideMenu, settings.import.lastImport / log w src/shared/schema/budget.ts, src/shared/calc/fleet.ts:722 (przelew).

## F7. Szybki wpis seriami: „Zapisz i następny”, szablony, powtórz ostatni, działania w kwocie, „wczoraj”, szkic po Esc

Priorytet: wysoki · nakład: M · konflikt z decyzją: D70 (Enter zapisuje, Esc zamyka) zostaje bez zmian – seria działa pod Ctrl+Enter.

W oknie szybkiego wpisu (Ctrl+Alt+B):
- Ctrl+Enter zapisuje i czyści formularz bez zamykania okna – z licznikiem „dopisano 3 · energia dziś …”.
- Rząd „ulubionych manewrów” (Kawa · Mokka · 12 zł, Paliwo · Auto, Bilet KOLEO) z klawiszami 1–9 wypełnia cały wpis: kwotę, kategorię, konto, kontrahenta i notatkę. Szablony powstają z „Zapisz jako szablon” albo z propozycji – najczęstszych par kontrahent + kategoria + kwota z 60 dni – i są wspólne dla komputerów (fi.json).
- „Powtórz ostatni” wpis.
- Pole kwoty liczy działania („12,50+8,30”, „3*4,99”).
- Data przyjmuje „wcz”, „-1” albo sam dzień („15”).
- Szkic zostaje po przypadkowym Esc i wraca przy kolejnym otwarciu (z przyciskiem „Wyczyść”).

**Po co.** Wieczorne dopisywanie kilku zakupów to rdzeń codziennego rytmu (D26). Każdy zapis zamyka jednak okno po 450 ms (src/renderer/features/quick/QuickApp.tsx:88), a każde otwarcie zeruje formularz (onQuickData → blank, :72-76), więc Esc gubi np. rozpisany paragon. Oficer podpowiada tylko kontrahenta (40 nazw) i jego ostatnią kategorię (src/renderer/store/quickHost.ts:43-67) – kwotę, konto i notatkę trzeba wpisać za każdym razem. Sonda: parseAmountInput('12,50+8,30') daje undefined (wartość niepoprawna), a parseDateInput('wcz') i parseDateInput('15') dają null (src/renderer/lib/format.ts:101, :130). Szablony i powtórzenie ostatniego wpisu mają Wallet by BudgetBakers, Spendee i Monefy.

**Na czym oprzeć.** QuickApp.tsx:21-24, :72-90; src/renderer/lib/format.ts parseAmountInput / parseDateInput; src/renderer/components/fields.tsx AmountField / DateField; src/renderer/store/quickHost.ts quickData / quickTransaction; ustawienia folderu w src/shared/schema/budget.ts.

## F8. Oficer szybkiego wpisu zna marki, reguły importu i słownik sieci

Priorytet: wysoki · nakład: S

Podpowiedź kategorii w szybkim wpisie i w edytorze operacji korzysta z brandOf (klucz marki) i findRule (reguły importu, słowa kluczowe, połączone nazwy, słownik sieci BRANDS), a nie z samego counterpartyKey. Po wpisaniu „Biedronka” oficer zna kategorię z reguły nauczonej na „BIEDRONKA 1234 WARSZAWA” albo ze słownika sieci (zakupy spożywcze), także bez historii ręcznych wpisów. Lista podpowiadanych kontrahentów jest grupowana po marce zamiast po surowych nazwach z banku.

**Po co.** Sonda: counterpartyKey('BIEDRONKA 1234 WARSZAWA') daje „biedronkawarszawa”, a counterpartyKey('Biedronka') – „biedronka”, więc historia z importu nic nie podpowiada przy ręcznym wpisie. brandOf daje „biedronka” dla obu nazw i zna kategorię ze słownika. QuickApp.tsx:213 szuka tylko po counterpartyKey, a edytor operacji nie podpowiada wcale. Wallet (BudgetBakers) i Spendee podpowiadają kategorię po nazwie sklepu.

**Na czym oprzeć.** src/renderer/store/quickHost.ts:43-56 (lastCategory, counterparties), src/renderer/features/quick/QuickApp.tsx:213, src/shared/import/brands.ts brandOf / BRANDS, src/shared/import/classify.ts:69 findRule / ruleTargetOf, src/shared/import/aliases.ts resolveBrand, src/renderer/features/operations/OperationEditor.tsx.

## F9. Ładownia pilnuje cen: podwyżki abonamentów, opłaty o zmiennej kwocie, martwe kontenery

Priorytet: średni · nakład: M

Dla kontenera z odbiorcą FI porównuje połączone płatności z kwotą kontenera. Gdy dwie ostatnie płatności różnią się od niej o ponad ±5% (albo ±2 zł), odprawa melduje: „Netflix: 43 → 49 zł/mies. (+14%, +72 zł rocznie) – zaktualizuj kontener?”. „Zaktualizuj” zmienia kwotę od bieżącego miesiąca – historia kwot w kontenerze, addytywnie, więc wcześniejsze miesiące liczą się starą kwotą. Przed zapisem pokazuje symulację linii zanurzenia i zasięgu (jak T50). Przy kontenerze widać mini-historię kwot. Brak płatności przez 2–3 cykle daje propozycję zrzutu („subskrypcja anulowana?”). Media o zmiennej kwocie dostają kwotę = średnia albo p75 z 12 miesięcy. W metaforze: „Kontener cięższy niż w manifeście”.

**Po co.** Linia zanurzenia, odkładki, Radar i symulacja liczą kwotę z kontenera (cargoMass src/shared/calc/fleet.ts:180, radar.ts:72, sinkingInstallment fleet.ts:108). Po podwyżce zaniżają więc koszty, a droższa polisa daje tylko żółte „za mało w zbiorniku”. recurringPayments pomija kontrahentów ładowni (src/shared/calc/plan.ts:151-157), a wśród alarmów nie ma rodzaju „zmiana ceny” (AlarmKind, fleet.ts:251). Ostrzeżenia o podwyżkach subskrypcji mają Rocket Money, Emma i Copilot; w Lunch Money to częsta prośba użytkowników.

**Na czym oprzeć.** src/shared/calc/plan.ts:72 payeeKey, :151 recurringPayments, :355 monthlyShare, :370 simulateCargo; src/shared/calc/fleet.ts:180 cargoMass, :603-640 płatności kontenerów i 'sinking-short'; briefing() w src/shared/calc/briefing.ts; ContainerEditor / SimulationLine w src/renderer/features/cargo/CargoPage.tsx; containerSchema w src/shared/schema/records.ts:135.

## F10. Przelew między kontami budżetu z drugą nogą

Priorytet: średni · nakład: M

Przelew własny z kontem docelowym w budżecie (np. mBank → Portfel XTB) tworzy w edytorze drugą nogę na koncie docelowym. Import z mBanku przy takim przelewie pyta: „Dopisać wpływ na Portfelu XTB?”. Nogi są połączone, więc zmiana kwoty i daty obejmuje obie, a usunięcie usuwa parę z „Cofnij”. Noga bez pary trafia do „Meldunków do rozpatrzenia”, a panel duplikatów nie łączy nóg ze sobą.

**Po co.** Każda noga przelewu działa osobno – case 'transfer' to addShields(amount) (src/shared/calc/fleet.ts:722). Ani import, ani edytor nie tworzą drugiej nogi: counterAccountId jest tylko zapisywany (src/shared/import/reconcile.ts:584, src/renderer/features/operations/OperationEditor.tsx:267). Zaimportowane −500 zł do Portfela XTB zmniejsza więc osłony, sumę kont i krzywą majątku, dopóki wpływ na Portfelu nie zostanie wpisany ręcznie, a Portfel XTB nie ma eksportu (D9). Actual Budget i Firefly III zapisują przelew jako jedną operację z dwoma kontami.

**Na czym oprzeć.** src/shared/calc/fleet.ts:722 (T31: para się znosi), OperationEditor.tsx:200, :267, src/shared/import/classify.ts:319, buildImport w src/shared/import/reconcile.ts, src/shared/import/duplicates.ts:63, deleteOperation / deleteManyWithUndo.

## F11. Zbiorcze naprawy w Operacjach: usuń, zmień konto, rodzaj albo datę zaznaczonych – z „Cofnij”

Priorytet: średni · nakład: M

Pasek zaznaczonych operacji, który dziś ma tylko kategorię i finansującego, dostaje:
- „Usuń zaznaczone” – jedno „Cofnij”, jak przy duplikatach;
- „Przenieś na konto…” – np. wpisane na mBank zamiast na Portfel XTB;
- „Zmień rodzaj…” – wydatek ↔ przelew własny;
- „Przesuń datę o ±N dni”.
Przed zatwierdzeniem podgląd skutku: zmiana energii dziś, kopert i salda konta.

**Po co.** Pasek zbiorczy (src/renderer/features/operations/OperationsPage.tsx:257-306) umie tylko ustawić kategorię i finansującego. Masowy błąd, np. seria wpisów na złym koncie albo przelewy własne wzięte za wydatki, wymaga otwierania operacji jedna po drugiej. Mechanizm deleteManyWithUndo już istnieje. Zbiorczą edycję wielu pól mają Firefly III, GnuCash i YNAB.

**Na czym oprzeć.** OperationsPage.tsx:257-306; tickOperations / categorizeTicked / financeTicked w src/renderer/features/operations/state.ts; deleteManyWithUndo w src/renderer/features/history/actions.ts; replaceRecords w src/renderer/store/data.ts; computeFleet (podgląd skutku).

## F12. Ostrzeżenie przy edycji operacji z potwierdzonego okresu albo z banku

Priorytet: średni · nakład: S · konflikt z decyzją: D28 (pełna edycja) – zostaje, bo to tylko ostrzeżenie, bez blokady.

Zmiana kwoty, daty albo konta operacji sprzed ostatniego potwierdzonego salda tego konta, a także zmiana kwoty operacji z banku, pokazuje ostrzeżenie: „To zmieni potwierdzone saldo z 12.10 o −45 zł i stan osłon”. Do wyboru „Zmień mimo to” albo „Anuluj”. W edytorze jest stały znacznik „okres potwierdzony”. Gra i zamrożone dni zostają bez zmian (T9).

**Po co.** Edytor (src/renderer/features/operations/OperationEditor.tsx) nie sprawdza niczego przy zmianie kwoty operacji z banku czy operacji sprzed miesięcy. Literówka albo kółko myszy w polu kwoty po cichu psuje potwierdzone salda i warstwy, a błąd wychodzi dopiero przy kolejnym potwierdzeniu jako „Rozbieżność w ładowni”. Ochronę uzgodnionych okresów mają GnuCash, Firefly III i programy księgowe.

**Na czym oprzeć.** OperationEditor.tsx:95-270, src/shared/calc/balances.ts lastConfirmation / balanceAt, src/renderer/components/fields.tsx AmountField (zapis po wyjściu z pola – T34).

## F13. Mądrzejsze wieczorne przypomnienie: „Dziś bez wydatków”, „Przypomnij za 30 min”, pominięcie po dopisaniu

Priorytet: średni · nakład: S

Przypomnienie „Raport wachty dnia” mówi, ile operacji z godziną już dziś wpisano. Ma przyciski „Dopisz” (szybki wpis), „Dziś bez wydatków” (potwierdzenie zapisane przy dniu – dziennik wachty, misja „Dzień bez wydatków”) i „Przypomnij za 30 min”. Na Windows przyciski powiadomienia wymagają toastXml w Electronie; te same przyciski są w menu zasobnika. Przypomnienie się nie pojawia, gdy dziś dopisano już wydatki po 18:00 albo potwierdzono dzień.

**Po co.** dueNotices wysyła przypomnienie od 21:00 bez względu na to, co dziś wpisano (`if (p.evening && o.time >= o.prefs.eveningTime)`, src/shared/notify.ts:55-56). Nie da się go odłożyć ani odpowiedzieć „nic nie wydałem”. Dzień bez wpisów jest dla gry zgodny i liczy się do misji „Dzień bez wydatków” (src/shared/calc/game.ts:414), więc gra nie odróżnia dnia bez wydatków od zapomnianego wpisu. Odpowiedź z powiadomienia i drzemkę mają Daylio, Spendee i Toshl.

**Na czym oprzeć.** src/shared/notify.ts:55-56, NotifyPrefs.evening w src/shared/machine.ts, src/renderer/store/notifier.ts, menu w src/main/tray.ts, misja 'nospend' w src/shared/calc/game.ts:414, notify() w src/main/index.ts.

## F14. Nowy plik z mBanku wykryty sam w folderze Pobrane – import jednym kliknięciem

Priorytet: średni · nakład: S

Ustawienie komputera: FI obserwuje folder Pobrane albo ostatni folder, z którego wybrano plik. Nowy CSV mBanku (nagłówek `#Klient`, „Lista operacji” albo „Historia rachunku”) daje toast i powiadomienie: „Nowy meldunek z mBanku (12–18.10) – importuj”. Kliknięcie otwiera Import z wczytanym plikiem. Po imporcie FI proponuje przeniesienie pliku do kosza (plik zawiera dane konta). Przypomnienie o zaległym imporcie podaje krótką instrukcję eksportu w mBanku.

**Po co.** Import co 2–3 dni (D26, D27) to główny obowiązek użytkownika. Dziś to: pobierz plik w banku, otwórz FI, Import, wybierz plik (dialog fi:pickImportFile, src/main/index.ts:608). Każdy krok mniej zwiększa regularność, od której zależą silnik i misja „Łączność z bazą”. Proces główny ma już obserwację plików (src/main/datastore/watch.ts). Automatyczną synchronizację z bankiem (Kontomierz, Monarch, Actual przez GoCardless) wyklucza zasada „sieć tylko do aktualizacji” (D74), więc to bezsieciowa namiastka.

**Na czym oprzeć.** src/main/datastore/watch.ts, src/main/index.ts:608 pickImportFile (CSV do 20 MB), parseMbank / decodeText w src/shared/import/mbank.ts i text.ts, src/renderer/features/import/ImportPage.tsx, ustawienie komputera w src/shared/machine.ts, IMPORT_DUE_DAYS w src/shared/calc/briefing.ts:134.

## F15. Cel z terminem: potrzebna rata miesięczna i opcjonalna odkładka z pensji

Priorytet: średni · nakład: M · konflikt z decyzją: Samo pokazanie potrzebnej raty – bez konfliktu. Rata z pensji omija kolejność D13 (osłony → kadłub → cele) i D72 (cele zasilane z dokowania) – do decyzji użytkownika.

Na Mapie gwiezdnej przy celu z terminem widać kwotę potrzebną miesięcznie do terminu, obok obecnego tempa (goalInflow), np. „brakuje 420 zł/mies., żeby zdążyć na 07.2027”. Opcjonalnie cel dostaje ratę z pensji, jak odkładka: w podziale pensji pozycja „Kurs na układ: Wakacje lipiec 2027 – 500 zł/mies.”, liczona jako (cel − stan) / miesiące do terminu, z resztą w ostatniej racie (jak T29). Cele bez raty dalej czekają na nadwyżkę z dokowania. W metaforze: „Kurs przechwycenia”.

**Po co.** Cele zasila tylko nadwyżka ponad pełne osłony i kadłub, łupy i pula Cele z ICTTJ, więc cel z datą (wakacje, prezent) może czekać miesiącami. ETA (goalEtas, src/shared/calc/goals.ts:117) i czerwony napis „po terminie” (src/renderer/features/starmap/StarMapPage.tsx:188, :245) tylko informują o spóźnieniu, nie mówią, co zrobić. YNAB („Needed for spending by date”, „Monthly savings builder”), Actual (szablony celów), Firefly III (skarbonki) i Monarch to liczą.

**Na czym oprzeć.** src/shared/calc/goals.ts:95 goalInflow, :117 goalEtas; StarMapPage.tsx:118 „Tempo”, :245; salarySplit / sinkingSchedule w src/shared/calc/plan.ts:208 i src/shared/calc/fleet.ts:92; dockAmount w fleet.ts:57; goalSchema.deadline w src/shared/schema/records.ts.

## F16. Zaplanowane operacje jednorazowe, spodziewane wpływy i przypomnienia własne na Radarze

Priorytet: średni · nakład: M

Nowy rodzaj wpisu „zaplanowane”:
- wydatek: wesele 12.06 – 1 500 zł, przegląd auta, wakacje;
- wpływ: premia, zwrot PIT-37, spłata od znajomego bez harmonogramu;
- termin bez kwoty: wymiana dowodu, koniec promocji internetu („od 03.2027 cena 89 zł”), odnowienie domeny.
Każdy ma datę, opcjonalnie kwotę, kategorię i konto oraz powtarzanie co rok. Wpis widać na Radarze 90 dni, w odprawie i w powiadomieniu N dni przed terminem (domyślnie 14 i 3), a w prognozie zasięgu jako wariant „z planami”. Do tego przypomnienie o końcu kontenera (until): ostatnia rata zwalnia miejsce w ładowni, koniec promocji to nowa kwota. Import z mBanku dopasowuje plan do prawdziwej operacji (kwota ±, data ±3 dni, jak looseMatch), a „Wykonaj teraz” zamienia go w operację. W metaforze: „Boje nawigacyjne”.

**Po co.** Radar zna tylko pensje, asteroidy, raty i PIT-38 (RadarKind, src/shared/calc/radar.ts:15), a plan miesiąca – tylko pensję, koperty i łupy (monthPlanSchema). Większego wydatku jednorazowego, niecyklicznego wpływu ani terminu umowy nie da się zapisać z wyprzedzeniem, więc i tak zaskakują budżet. Koniec kontenera (container.until) przechodzi bez słowa. Zaplanowane transakcje i przypomnienia mają YNAB (scheduled), Actual (schedules), Firefly III (recurring), Wallet (planned payments) i Monarch (bills & reminders).

**Na czym oprzeć.** radar() / RadarKind w src/shared/calc/radar.ts; briefing() w src/shared/calc/briefing.ts:139; tagi w src/shared/notify.ts:19; rangeForecast w src/shared/calc/intel.ts:198; looseMatch / planImport w src/shared/import/reconcile.ts; newOperation w src/renderer/features/operations/state.ts; container.until w src/shared/schema/records.ts; nowa kolekcja w src/shared/paths.ts COLLECTIONS / LAYOUTS (T18).

## F17. Tagi i „wyprawy” – koszt wyjazdu albo projektu przez wiele kategorii

Priorytet: średni · nakład: M

Operacja i każda część paragonu mogą mieć tagi, np. „Wakacje Chorwacja 2027”, „Remont łazienki”, „Prezent ślubny”. Tagi działają w szybkim wpisie (#słowo albo pole; ostatni tag podpowiadany przez kilka dni), w filtrze Operacji, w regułach importu („Netia → #ulga-internet”) i w eksporcie CSV (kolumna „Tagi”). Tag ma kartę z sumą, podziałem na kategorie i miesiące oraz opcjonalnym powiązaniem z celem z Mapy gwiezdnej („Ekspedycja: wydano 4 320 z 5 000 zł celu”). Pole jest addytywne (looseObject), bez podbijania SCHEMA_VERSION.

**Po co.** Kategorie mówią „na co”, a nie „po co”: kosztu urlopu albo remontu rozłożonego na paliwo, jedzenie, noclegi i wyposażenie nie da się dziś policzyć. transactionSchema i splitSchema nie mają tagów (src/shared/schema/records.ts:77-121) – tagi są tylko w dniach gry (:302) – a filtr zna tylko kategorie główne (src/shared/operationsView.ts:44-51). Etykiety mają Wallet (labels), Spendee, Toshl, Firefly III, Monarch, YNAB (flags) i Actual.

**Na czym oprzeć.** transactionSchema / splitSchema w src/shared/schema/records.ts; OperationsFilter i searchTextOf w src/shared/operationsView.ts; importRuleSchema i findRule w src/shared/import/classify.ts; operationRows / operationsCsv w src/shared/export/budget.ts; src/renderer/features/quick/QuickApp.tsx; src/renderer/features/starmap/StarMapPage.tsx.

## F18. Operacje: filtry zaawansowane, sortowanie, zapisane widoki, eksport widocznej listy

Priorytet: średni · nakład: M

W Operacjach dochodzą:
- filtry: kwota od–do, podkategoria (dziś tylko kategoria główna), domownik („finansuje” / „od”), kontrahent (marka), kontener, cel, pożyczka, konto przelewu;
- sortowanie po kwocie i kontrahencie, poza datą;
- zapisane widoki jako chipy nad listą („Jedzenie na mieście > 50 zł”, „Mama – ten rok”), wspólne dla komputerów w fi.json – jak savedFilters w ICTTJ;
- przycisk „CSV / Excel widocznych”, który eksportuje dokładnie to, co pokazuje lista.

**Po co.** OperationsFilter (src/shared/operationsView.ts:44-51) zna tylko okres, konta, rodzaje, kategorie główne, znaczniki i tekst, a kolejność listy jest stała (compareOperations, src/renderer/features/operations/OperationsPage.tsx:333). Pytań „największe wydatki w październiku”, „co zapłaciłem za Mamę” czy „ile wydałem na weterynarza” nie da się zadać bez eksportu i Excela, a eksport w Raportach bierze tylko zakres dat (src/renderer/features/reports/ReportsPage.tsx:447). ICTTJ ma zapisane filtry (settings.savedFilters) i exportCsv(ids). Zaawansowane filtry i zapisane widoki mają YNAB, Actual, Firefly III i Monarch.

**Na czym oprzeć.** matchesFilter / compareOperations w src/shared/operationsView.ts; filtr w localStorage fi.operations.filter (src/renderer/features/operations/state.ts); OperationsPage.tsx:313-340; operationRows / operationsCsv / operationsSheet w src/shared/export/budget.ts; wzór: ICTTJ src/shared/schema/journal.ts:565 savedFilters.

## F19. Paleta (Ctrl+K) szuka też wpisów: operacji, kontenerów, celów, pożyczek, domowników i ustawień

Priorytet: średni · nakład: M

Wpisanie w palecie „mokka”, „czynsz” albo „1240” pokazuje pasujące operacje (data, kwota, kontrahent), kontenery ładowni, cele z Mapy gwiezdnej, pożyczki, domowników i pozycje ustawień (np. „cisza nocna” → Warstwy i rozkazy). Enter otwiera wpis na jego ekranie. Wyszukiwanie korzysta z istniejącego wyszukiwania Operacji – bez polskich znaków i po kwocie.

**Po co.** Paleta zawiera tylko polecenia i ekrany. Komentarz zapowiada „later stages add their records to search” (src/renderer/features/palette/CommandPalette.tsx:31), ale tego nie zrobiono. Żeby znaleźć kontener albo konkretny zakup, trzeba wiedzieć, na którym ekranie leży, i przełączyć okres w Operacjach (domyślnie bieżący miesiąc). Paleta ICTTJ wyszukuje wszystkie transakcje, a globalne wyszukiwanie mają też YNAB i Firefly III.

**Na czym oprzeć.** src/renderer/features/palette/CommandPalette.tsx:31-75; searchTextOf / fold w src/shared/operationsView.ts i src/shared/fold.ts; useRecordList w src/renderer/store/records.ts; SETTINGS_TABS w src/renderer/features/settings/SettingsPage.tsx.

## F20. Wywiad z drążeniem: podkategorie, kontrahenci, porównania okresów

Priorytet: średni · nakład: M

Tabela „Wydatki w czasie” rozwija kategorię do podkategorii (Jedzenie → zakupy spożywcze / na mieście / kawa i przekąski), a kliknięcie komórki otwiera Operacje z tym filtrem. Nowy panel „Namierzone cele” po marce (brandOf + połączone nazwy) pokazuje dla każdej: sumę, liczbę wizyt, średni paragon, trend, udział w kategorii i ostatnią wizytę. Porównania: miesiąc wobec średniej z 3 i 12 miesięcy oraz rok do roku, z kolorem tylko dla przekroczeń. W edytorze operacji linijka „u tego kontrahenta w 2026: 34 operacje, 1 240 zł, średnio 36 zł”. W metaforze: „Rozpoznanie celu – Biedronka, 23 kontakty, 1 840 zł”.

**Po co.** spendingByMonth liczy tylko kategorie główne (cats.mainOf, src/shared/calc/intel.ts:169-195), więc podkategorie z D25 / D68 nie są używane w żadnej analizie. Panele Wywiadu nie są klikalne (src/renderer/features/intel/IntelPage.tsx), a analizy po kontrahentach nie ma, choć klucze marek i połączenia nazw istnieją od 1.2.x. Pytanie „ile rocznie zostawiam w Żabce” wymaga ręcznego sumowania. Drążenie i raporty kontrahentów mają YNAB Reflect, Monarch (Merchants), Copilot, Actual (custom reports) i Wallet.

**Na czym oprzeć.** spendingByMonth / weekNumbers / yearNumbers w src/shared/calc/intel.ts; categoryIndex (childrenOf / mainOf) w src/shared/calc/operations.ts:81; brandOf w src/shared/import/brands.ts; resolveBrand w src/shared/import/aliases.ts; IntelPage.tsx (SpendRow); filtr Operacji w src/renderer/features/operations/state.ts.

## F21. Dwa komputery: „w użyciu” zamiast „otwarty” – komputer w zasobniku nie pisze w tle i nie powiela powiadomień

Priorytet: średni · nakład: M

Obecność rozróżnia komputer „w użyciu” (okno pokazane albo ruch w ostatnich minutach) od komputera „w zasobniku”. Gdy inny komputer jest w użyciu, komputer w zasobniku wstrzymuje zapisy w tle: zamrażanie dni gry, synchronizację celów ICTTJ, zasiew salda domowników i rozliczenie łupów. Wstrzymuje też powiadomienia, które pokazał już komputer w użyciu – tak jak beta ICTTJ przy świeżym heartbeacie zwykłej wersji (main/sibling.ts). Baner „Ten folder jest też otwarty na…” pojawia się tylko wtedy, gdy oba komputery są w użyciu. Strona Synchronizacja pokazuje, z którego komputera i kiedy przyszła ostatnia zmiana.

**Po co.** Według D46 i D64 FI startuje z Windows i chowa się do zasobnika, więc przy dwóch włączonych komputerach działa na obu naraz. Heartbeat leci co minutę także z zasobnika (src/main/index.ts:410), a baner każe wtedy „zamknąć tam aplikację” (src/renderer/app/Banners.tsx:83-88), choć użytkownik nie pracuje na obu. Oba komputery liczą i zapisują w tle stan gry (src/renderer/store/game.ts:37-55) i cele ICTTJ (src/renderer/features/starmap/sync.ts), co grozi kopiami konfliktów OneDrive. Pokazują też te same przypomnienia, bo klucze wysłanych są tylko w localStorage danego komputera.

**Na czym oprzeć.** src/main/datastore/presence.ts, src/main/index.ts:268-281, :410, Banners.tsx:83-88, store/game.ts:37-55 useGameAdvance, features/starmap/sync.ts, useHouseholdSinceSeed w src/renderer/features/household/actions.ts, src/renderer/store/notifier.ts (fi.notify.sent); wzór: ICTTJ src/main/sibling.ts.

## F22. Audyt reguł importu: edycja, niespójności, „Zastosuj do historii”, warunek kwoty

Priorytet: średni · nakład: M

Ustawienia → Import z banku:
- wyszukiwarka i edycja reguły (kategoria, kierunek, finansujący) – dziś jest tylko „usuń”;
- licznik operacji, które reguła dziś łapie;
- niespójności: operacje marki z inną kategorią niż jej reguła, marki z dwiema i więcej kategoriami, reguły bez trafień;
- „Zastosuj do historii”: podgląd zmian, potem zapis z „Cofnij” (jak decyzja zbiorcza w Operacjach);
- opcjonalny warunek kwoty albo konta w regule, np. Orlen ≤ 40 zł → „kawa i przekąski”, inaczej „paliwo”; marka z różnymi kategoriami podsuwa taki próg.

**Po co.** Reguły uczą się z każdej decyzji, ale po miesiącach nie ma ich jak przejrzeć ani poprawić. Lista ma tylko „usuń” (src/renderer/features/settings/ImportTab.tsx:120-132). Zmieniona decyzja nie przechodzi na wcześniejsze operacje, a sklep wielobranżowy (Orlen, Allegro, Rossmann) zawsze dostaje jedną kategorię: importRuleSchema nie ma warunku kwoty (src/shared/schema/budget.ts:159-184), a findRule (src/shared/import/classify.ts:69) dopasowuje tylko nazwę i kierunek. Reguły z warunkiem kwoty i „apply to existing” mają YNAB, Monarch i Firefly III.

**Na czym oprzeć.** ImportTab.tsx:96-132; importRuleSchema w src/shared/schema/budget.ts:159; upsertRule (:28) i findRule (:69) w src/shared/import/classify.ts; categorizeTicked w src/renderer/features/operations/state.ts (wzór „Cofnij”); src/renderer/features/import/rules.ts.

## F23. Wykrywanie opłat cyklicznych: kwartalne, półroczne, zmienne kwoty i harmonogram dat

Priorytet: średni · nakład: M · konflikt z decyzją: T48 (zasady wykrywania stałych opłat: cykl miesięczny ±15% albo roczny) – do rozszerzenia.

Rozszerzenie recurringPayments:
- cykle 2, 3 i 6 miesięcy: gaz co 2 miesiące, wywóz śmieci, ubezpieczenia półroczne;
- miesięczne rachunki o zmiennej kwocie (prąd, woda): kontener „zmienny” z kwotą = średnia albo p75 z 12 miesięcy, a nie ostatnia płatność;
- kontener z własnym harmonogramem dat (addytywnie w schemacie), np. podatek od nieruchomości 15.03 / 15.05 / 15.09 / 15.11, którego jednym cyklem nie da się zapisać.
Nowo wykryta opłata to jednorazowa pozycja „info” w odprawie, a nie tylko lista na ekranie Ładowni. W metaforze: „Asteroida na orbicie nieregularnej”.

**Po co.** recurringPayments zna tylko cykl 1 (±15% mediany) i cykl 12 (src/shared/calc/plan.ts:140-184; RecurringPayment.cycleMonths: 1 | 12). Płatność co kwartał 240 zł albo prąd 150–260 zł co miesiąc nie są więc proponowane, choć kontener obsługuje cykl 1–60. Propozycje widać tylko w Ładowni i w kreatorze. Media i opłaty lokalne to typowe polskie „niespodzianki”. Rocket Money i Copilot („Recurring”) wykrywają opłaty o zmiennej kwocie i różnych cyklach.

**Na czym oprzeć.** src/shared/calc/plan.ts:140 steady, :151-184 recurringPayments; containerSchema w src/shared/schema/records.ts:135; cyclePosition / nextPaymentOf w src/shared/calc/fleet.ts:97, :167; propozycje w src/renderer/features/cargo/CargoPage.tsx:115-135; briefing() w src/shared/calc/briefing.ts.

## F24. Majątek netto: krzywa z długiem i należnościami

Priorytet: średni · nakład: M · konflikt z decyzją: D73 i T81 (krzywa majątku = suma sald kont na koniec tygodnia) – propozycja dodaje drugą linię zamiast zmieniać definicję; do decyzji użytkownika.

Obok obecnej krzywej (suma sald kont) druga linia „Majątek netto” = salda kont + należności (domownicy, pożyczki udzielone) − dług (pożyczki wzięte, z harmonogramu i spłat). Przełącznik w panelu Wywiadu wybiera, na której linii liczą się BOS / CHoCH i drawdown. Przegląd roczny podaje majątek netto na 31.12. W metaforze: „Siła floty netto”.

**Po co.** wealthCurve to sama suma sald kont budżetu (src/shared/calc/intel.ts:76, T81), więc wzięta pożyczka wygląda jak wzrost majątku, a pożyczenie komuś pieniędzy – jak strata. Struktura (BOS / CHoCH) czyta wtedy szum. Na przykład kredyt 10 000 zł podnosi krzywą z 20 000 do 30 000 zł, choć fleet.debt = 10 000. FleetState ma już debt i receivables. Majątek netto (aktywa − zobowiązania) to podstawowy raport Monarch, Copilot, YNAB, Empower i Kontomierza.

**Na czym oprzeć.** src/shared/calc/intel.ts:27 balancesAt, :76 wealthCurve, :103 structureOf, :330 yearWealth; FleetState.debt / receivables i loans w src/shared/calc/fleet.ts; loanStates w src/shared/calc/loans.ts; settleHousehold w src/shared/calc/household.ts; WealthChart w src/renderer/features/intel/charts.tsx; IntelPage.tsx:68.

## F25. Stopa oszczędności i bilans paliwa miesiąca

Priorytet: średni · nakład: S

W Wywiadzie, debriefingu i Raportach: przychód (incomeOfPeriod – praca i trading netto, bez pieniędzy domowników) minus koszty netto, czyli ile miesiąc dołożył do okrętu, oraz stopa oszczędności w %, z trendem 12 miesięcy i medianą. Osobno wariant „bez tradingu” – czy praca sama pokrywa koszty. W debriefingu jedna linia: „Stopa oszczędności 23% (mediana 6 mies.: 18%)”. Eksport „Miesiące” dostaje kolumny „Bilans” i „Stopa oszczędności”. Opcjonalnie wykres przepływu (Sankey): przychód → osłony / kadłub / cele, pensja → ładownia / odkładki / koperty. W metaforze: „Bilans paliwa”.

**Po co.** Kryterium sukcesu „osłony i kadłub rosną z miesiąca na miesiąc” nie ma dziś jednej miary miesięcznej. Debriefing porównuje koszty z pensją, panel „Przychody” – średnie z pensją, a eksport ma przychód i koszty bez różnicy (monthRows, src/shared/export/budget.ts:129). W kodzie nie ma stopy oszczędności, choć dane są gotowe (incomeByMonth, costsByMonth, dziennik silnika z moves). Stopę oszczędności i cash flow mają Monarch, Copilot, Emma i YNAB Reflect.

**Na czym oprzeć.** incomeOfPeriod (:71) / incomeByMonth (:84) / incomeStats w src/shared/calc/income.ts; costsByMonth (:41) i debriefing (:276) w src/shared/calc/plan.ts; yearNumbers w src/shared/calc/intel.ts:307; monthRows w src/shared/export/budget.ts:129; FleetState.log; IntelPage.tsx, MonthPage.tsx, ReportsPage.tsx.

## F26. Prognoza sald kont fizycznych – czy na mBanku starczy na płatność

Priorytet: średni · nakład: M

Radar liczy saldo każdego konta dzień po dniu: dziś + płatności kontenerów z kontem (container.accountId) + raty + spodziewane wpływy; pensja to ruch wirtualny, bez ruchu między kontami. Gdy mBank zszedłby pod zero – np. czynsz 10. dnia, a pieniądze z wypłaty leżą w Portfelu XTB (D56) – odprawa melduje: „Ładownia mBanku za lekka: brakuje 320 zł do 10.11 – przelej z Portfela XTB”. Przycisk „Zaplanuj przelew własny” tworzy przelew.

**Po co.** Warstwy są wirtualne (D10), ale płatności schodzą z konkretnego konta. Wypłaty z ICTTJ bez pary w mBanku trafiają do Portfela XTB (D56), więc pieniądze mogą leżeć na złym koncie, a FI tego nie widzi: radar() nie używa accountId kontenera (src/shared/calc/radar.ts:66-74). Prognozę salda konta i alert niskiego salda mają Copilot, Monarch, PocketSmith i aplikacje bankowe z PFM.

**Na czym oprzeć.** balanceAt / openingsOf w src/shared/calc/balances.ts; container.accountId w src/shared/schema/records.ts; radar() w src/shared/calc/radar.ts; briefing() i src/shared/notify.ts (nowy tag); przelew własny w src/renderer/features/operations/OperationEditor.tsx.

## F27. Kurs na 12 miesięcy: prognoza przepływów z wpływami

Priorytet: średni · nakład: L

Projekcja miesiąc po miesiącu na rok naprzód:
- wpływy: mediana albo średnia z panelu „Przychody”, osobno praca i trading;
- wypływy: pensja z osłon, kontenery miesięczne, asteroidy z odkładkami, raty pożyczek, zaplanowane operacje;
- dokowanie tą samą kolejnością (dockAmount).
Widać, kiedy osłony i kadłub będą pełne, kiedy każdy cel, i które miesiące spadną poniżej minimum osłon (np. OC i ubezpieczenie domu naraz). Trzy kursy: „bez wypłat z XTB”, „mediana”, „średnia”, opcjonalnie wypłaty planu ze scenariusza ICTTJ (forecasts/*.json już czytany). Panel w Wywiadzie i linia „osłony po zdarzeniu” na Radarze.

**Po co.** To problem nr 2 ze specyfikacji: nieregularne wypłaty utrudniają planowanie. „Prognoza zasięgu” (src/shared/calc/intel.ts:198) celowo zakłada zero wpływów i średnie koszty, a Radar to lista zdarzeń bez stanu warstw. ETA celów (src/shared/calc/goals.ts:117) bierze tylko średnią wpłat do celów. Projekcję przepływów mają PocketSmith, Monarch i Copilot (cash-flow forecast).

**Na czym oprzeć.** rangeForecast w src/shared/calc/intel.ts:198; radar() w src/shared/calc/radar.ts:52; incomeStats w src/shared/calc/income.ts; dockAmount (:57), paySalary (:84), sinkingInstallment (:108) w src/shared/calc/fleet.ts; goalEtas w src/shared/calc/goals.ts:117; parseIctjForecast w src/shared/ictj.ts.

## F28. Reszta koperty planowej na następny miesiąc i „pokryj przekroczenie z innej koperty”

Priorytet: średni · nakład: M · konflikt z decyzją: D18 (łupy: osłony / cel / następny miesiąc) – rozszerzenie trzeciej opcji. „Pokryj przekroczenie” przed końcem dnia może usunąć naruszenie koperty (D73, T75) – trzeba zdecydować, czy gra ocenia stan przed przesunięciem, czy po nim.

Na debriefingu łupy z koperty planowej (Zdrowie, Auto, Zwierzęta) można przenieść do tej samej koperty w następnym miesiącu, jak rollover w YNAB. Niewydane 200 zł na lekarza zostaje wtedy na Zdrowiu, a koperta pokazuje „limit 300 + 200 z zapasu”. W trakcie miesiąca przy przekroczonej kopercie planowej przycisk „Pokryj z koperty…” przesuwa limit z koperty, w której jest zapas. To dwie zmiany planu naraz, z „Cofnij” i wpisem w dzienniku wachty.

**Po co.** Dziś „na następny miesiąc” to jedna kwota dokładana do kopert codziennych (T28, T52), a lootSchema zna tylko shields, nextMonth i goals (src/shared/schema/records.ts, lootDecision w src/shared/calc/plan.ts:336). Koperty planowe z nieregularnymi wydatkami (weterynarz, serwis) co miesiąc oddają zapas do osłon albo do energii dnia, a w miesiącu wydatku są przekroczone. Rollover kategorii i przesuwanie pieniędzy między kategoriami to podstawa YNAB i Actual (tryb rollover); Monarch ma rollover budżetu.

**Na czym oprzeć.** lootSchema / lootDecision / lootDeadline w src/shared/calc/plan.ts:336-350; debriefing() w plan.ts:276; setEnvelope / decideLoot w src/renderer/features/month/actions.ts; EnvelopeBars.tsx; alarm envelope-over w src/shared/calc/fleet.ts; rateDay w src/shared/calc/game.ts.

## F29. „Skąd ta liczba?” – rozbicie energii dziś, zasięgu i warstw oraz słowniczek metafory

Priorytet: średni · nakład: M

Kliknięcie „Energia dziś” na Mostku (i w dymku zasobnika) rozwija proste rozbicie:
- zostało w kopertach codziennych X zł;
- pozostałe dni miesiąca: N;
- przeniesione z wczoraj: +Y;
- wydane dziś: −Z;
- = energia dziś.
Tak samo dla zasięgu ((osłony + kadłub − dług) / średnie koszty z 12 miesięcy), celu kadłuba i podziału ostatniej dostawy. Do tego krótki słowniczek metafory (Osłony = bufor na pensje, Kadłub = fundusz awaryjny…) pod F1 i w nagłówkach paneli.

**Po co.** Mostek pokazuje jedną liczbę z dopiskiem „przydział · podstawowy” (src/renderer/features/bridge/BridgePage.tsx:256-260), bez wyjaśnienia, skąd się wzięła. Po przekroczeniu albo imporcie liczba skacze bez komentarza, co podważa zaufanie do kryterium „codziennie jedna liczba”. Dla nowego użytkownika metafora (osłony, kadłub, łupy) jest barierą. Wyjaśnienie „Available” z rozbiciem mają YNAB i Goodbudget.

**Na czym oprzeć.** BridgePage.tsx:248-292; dailyAllowance (:130), rangeMonths (:140) i computeFleet w src/shared/calc/fleet.ts; src/renderer/app/ShortcutsHelp.tsx; src/renderer/components/Panel.tsx.

## F30. Skala interfejsu i tryb wyższego kontrastu (ustawienie komputera)

Priorytet: średni · nakład: S · konflikt z decyzją: D33 (wygląd jak ICTTJ) – tylko jako opcja komputera, domyślnie bez zmian.

W ustawieniach komputera suwak „Rozmiar interfejsu” 90–150% (webContents.setZoomFactor, osobno dla każdego komputera, także dla szybkiego wpisu i okien odłączonych) ze skrótami Ctrl+Plus i Ctrl+Minus. Reset wymaga innego skrótu niż Ctrl+0, bo ten zajmują Raporty. Opcja „Wyższy kontrast” rozjaśnia przygaszony tekst (--color-dim) i podnosi najmniejsze napisy z 10,5–11 px do 12 px. Domyślny wygląd zostaje jak w ICTTJ.

**Po co.** Menu aplikacji jest wyłączone (`Menu.setApplicationMenu(null)`, src/main/index.ts:955), więc nie działa nawet systemowe powiększenie Ctrl+=, a własnej skali nie ma. Kolor text-dim (#4f5862 na #111418) ma kontrast 2,55:1, poniżej WCAG AA 4,5:1, i występuje 153 razy (podpowiedzi, daty, dopiski). Na laptopie przy skali 100% albo wieczorem trudno to czytać.

**Na czym oprzeć.** src/main/index.ts:955; tokeny w src/renderer/styles/index.css:4-25; MachinePrefs w src/shared/machine.ts; src/main/quick.ts; src/main/detach.ts.

## F31. Radar anomalii: nietypowe kwoty i możliwe podwójne obciążenia

Priorytet: średni · nakład: M

Czysta funkcja sprawdza po każdym imporcie i wpisie:
(a) wydatek wyraźnie powyżej zwykłego u tej marki (ponad 1,5 × p90 z 12 miesięcy: „Orlen 450 zł, zwykle 180 zł”);
(b) kategorię, która w połowie miesiąca przekracza 2 × średnią z 3 miesięcy;
(c) nowego kontrahenta z kwotą od progu dziennika;
(d) dwa obciążenia z banku tej samej marki i kwoty tego samego albo następnego dnia (możliwe podwójne pobranie) – tylko do sprawdzenia, nigdy scalane.
Oznaczenie „nietypowa” w Operacjach (filtr), pozycja „info” w odprawie, a „to w porządku” zostaje zapamiętane. W metaforze: „Nieznany sygnał na radarze”.

**Po co.** Wydatki nie są śledzone (problem nr 4 specyfikacji), a import grupowy łatwo przepuszcza pomyłki. Dwa identyczne obciążenia z banku tego samego dnia (klucze `mbank:…:0` i `:1`) to zgodnie z T35 dwie operacje, więc findDuplicates (src/shared/import/duplicates.ts) słusznie ich nie łączy – ale też nikt ich nie pokazuje do sprawdzenia. Ostrzeżenia o nietypowych i zdublowanych transakcjach mają Copilot, Emma i Revolut.

**Na czym oprzeć.** src/shared/import/duplicates.ts; brandOf w src/shared/import/brands.ts; OPERATION_MARKS w src/shared/operationsView.ts:11; briefing() w src/shared/calc/briefing.ts:139; src/shared/notify.ts.

## F32. Flota rezerwowa: IKE, IKZE, PPK, obligacje i lokaty poza budżetem

Priorytet: średni · nakład: L · konflikt z decyzją: D10 (jeden zbiór kont, podział wirtualny) i T31 – aktywa wychodzą poza warstwy, więc nie zmieniają osłon ani zasięgu. D73 / T81 – krzywa majątku jako suma sald kont budżetu. D54 – konto tradingowe (maklerskie) XTB nie może tu trafić. Jeśli IKE / IKZE są w XTB, trzeba potwierdzić, że to nie konto tradingowe.

Nowy rodzaj konta: „aktywo poza budżetem” (IKE, IKZE, PPK, obligacje skarbowe EDO / COI, lokata, auto, mieszkanie). Takie konto nie należy do warstw, a jego wartość aktualizuje się ręcznie wyceną z datą – bez korekty i alarmu „Rozbieżność w ładowni”. Wpłata na nie (przelew własny) to „odłożone do hangaru”: nie jest decyzją dnia w grze ani spadkiem majątku netto. Wpłaty roku pokazane są wobec limitu ustawowego IKE / IKZE (limit roku wpisywany w ustawieniach), z przypomnieniem w grudniu. Przy IKZE dopisek, że odliczenie dotyczy PIT-36/37, a nie PIT-38. Majątek netto = konta budżetu + hangar + należności − dług. W metaforze: „Flota rezerwowa w hangarze”.

**Po co.** Dziś przelew na IKE albo lokatę spoza budżetu to przelew własny, który zabiera z osłon (src/shared/calc/fleet.ts:722, T31). Jest też decyzją dnia w grze (DECISIONS, src/shared/calc/game.ts:187), więc może dać poważne naruszenie „osłony poniżej minimum”. Krzywa majątku spada, np. 8 000 zł wpłacone na IKE obniża ją z 30 000 do 22 000 zł. Takie konto dodane do budżetu przy każdej wycenie robi korektę z alarmem. Oszczędności poza mBankiem i Portfelem XTB są niewidoczne. IKE / IKZE z limitami śledzą myfund.pl i Portfel Inwestycyjny, a aktywa w majątku netto liczą Monarch i Empower.

**Na czym oprzeć.** ACCOUNT_KINDS w src/shared/schema/budget.ts:29; fleet.ts:722 (transfer / correction); DECISIONS w src/shared/calc/game.ts:187; balancesAt / wealthCurve w src/shared/calc/intel.ts:27, :76; balanceSchema w src/shared/schema/records.ts; src/renderer/features/settings/AccountsTab.tsx.

## F33. Dziennik zmian folderu i historia przy każdym wpisie

Priorytet: niski · nakład: M

Na stronie Synchronizacja oś czasu ostatnich zmian wszystkich wpisów: operacji, planów miesięcy, kopert, celów, pożyczek, kontenerów i ustawień. Każda pozycja pokazuje rodzaj zmiany, komputer (updatedBy), pola przed i po oraz przycisk „Przywróć poprzednią”. Filtry: dziś / tydzień, komputer, rodzaj. Do tego przycisk „Historia” także przy planie miesiąca, celu i pożyczce.

**Po co.** Historia istnieje (.history, HistoryDialog), ale tylko pojedynczo przy wpisie. Nie da się zobaczyć, co zmieniło się „dziś rano na laptopie” albo po zbiorczej kategorii, ani sprawdzić, czemu nagle zmieniła się energia. HistoryButton jest tylko w edytorze operacji, Ładowni i Synchronizacji (ustawienia), więc zmiana kopert w planie miesiąca, celu albo pożyczki nie ma widocznej historii – choć D28 mówi o „pełnej edycji z dziennikiem zmian”. Dziennik zmian mają Firefly III (audit log), Notion i Google Sheets.

**Na czym oprzeć.** src/main/datastore/history.ts; src/renderer/features/history/HistoryDialog.tsx; src/renderer/features/sync/SyncPage.tsx:150-200 (Usunięte wpisy); src/renderer/lib/recordTitle.ts; etykiety pól w src/shared/merge.ts; MonthPage.tsx, StarMapPage.tsx, RadarPage.tsx.

## F34. Zwroty w drodze: oczekiwany zwrot pieniędzy

Priorytet: niski · nakład: M

Przy wydatku opcja „czekam na zwrot” (oddany towar, reklamacja, anulowana rezerwacja) z kwotą i terminem, domyślnie 14 dni. Import, który już rozpoznaje przychodzące „ZWROT” i „POS ZWROT TOWARU”, sam paruje zwrot tej marki (±10%) z oczekiwaniem i je zamyka. Gdy zwrot nie przyjdzie w terminie, odprawa melduje: „Allegro: 249 zł zwrotu nie dotarło od 12 dni”. Na Radarze lista „w drodze” jako spodziewane wpływy. W metaforze: Turtle Soup „w drodze”.

**Po co.** Zwroty z zakupów internetowych łatwo przepadają. FI rozpoznaje je dopiero, gdy przyjdą (T37, T104), więc nikt nie przypomina o tych, które nie przyszły. To typowy brak w budżetach opartych na wyciągach: YNAB radzi sobie zaplanowanym wpływem, a Copilot pozwala oznaczyć transakcję jako oczekującą na zwrot.

**Na czym oprzeć.** classifyRow w src/shared/import/classify.ts (ZWROT → kategoria sklepu); POS ZWROT w src/shared/import/mbank.ts; radar() w src/shared/calc/radar.ts; briefing() w src/shared/calc/briefing.ts; transactionSchema w src/shared/schema/records.ts:77 (pole addytywne).

## F35. Symulator manewrów „co jeśli”

Priorytet: niski · nakład: M

Panel w Planie miesiąca albo w Wywiadzie z polami: zmiana pensji, jednorazowy zakup (z osłon albo z celu) w wybranym miesiącu, brak wypłat z XTB przez N miesięcy, wzrost kosztów o X%, nowy cel albo nowy kontener. Wynik obok stanu bieżącego: zasięg i klasa okrętu, miesiąc pełnych osłon i kadłuba, ETA każdego celu, miesiące poniżej minimum osłon, ewentualne „pensja z kadłuba”. Liczone na kopii danych silnikiem z propozycji „Kurs na 12 miesięcy”; nic się nie zapisuje. „Zastosuj” jest tylko tam, gdzie to zwykła edycja (np. pensja w planie). W metaforze: „Symulator manewrów na mostku”.

**Po co.** Przy nieregularnych wypłatach kluczowe pytania to „czy stać mnie na laptopa teraz?” i „co, jeśli przez pół roku nie wypłacę z XTB?”. Dziś jest tylko symulacja dodania albo zrzutu kontenera (simulateCargo, src/shared/calc/plan.ts:370) i stała prognoza zasięgu bez wpływów (src/shared/calc/intel.ts:198). Scenariusze „what-if” mają PocketSmith, ProjectionLab i Monarch.

**Na czym oprzeć.** simulateCargo w src/shared/calc/plan.ts:370; rangeForecast w src/shared/calc/intel.ts:198; rangeMonths / shipClass w src/shared/calc/fleet.ts:140, :160; goalEtas w src/shared/calc/goals.ts:117; SalaryPanel w src/renderer/features/month/MonthPage.tsx. Zależy od „Kursu na 12 miesięcy”.

## F36. Osobista inflacja koszyka

Priorytet: niski · nakład: M · konflikt z decyzją: Automatyczne pobieranie CPI z GUS łamałoby zasadę „sieć tylko do aktualizacji” (D74), stąd wariant z CPI wpisywanym ręcznie.

Analiza w Wywiadzie:
- koszty każdej kategorii rok do roku za te same miesiące;
- średni paragon u tych samych marek rok do roku (np. Biedronka +11%);
- zmiany cen kontenerów (z propozycji „Ładownia pilnuje cen”);
- ważona „Twoja inflacja”.
Opcjonalnie pole na CPI GUS wpisywane ręcznie raz w miesiącu i porównanie „Twoja vs GUS”. Panel pokazuje też, o ile urósł cel kadłuba, który rośnie razem ze średnimi kosztami.

**Po co.** Przy stałej pensji od siebie (D11) realna wartość energii spada. Użytkownik nie wie, czy rosnące koszty to ceny, czy nawyki, a od tego zależy, czy podnieść pensję, czy pilnować kopert. Marki i kategorie już są, więc FI policzy to offline. Taką rolę pełnią kalkulatory osobistej inflacji (ONS, NBP) i PocketSmith z raportami rok do roku.

**Na czym oprzeć.** spendingByMonth w src/shared/calc/intel.ts:169; costsByMonth w src/shared/calc/plan.ts:41; brandOf w src/shared/import/brands.ts; IntelPage.tsx.

## F37. Plan roczny: siatka kopert i pensji na 12 miesięcy

Priorytet: niski · nakład: M

Widok „Plan kampanii” w Planie miesiąca: wiersze to koperty i pensja, kolumny to miesiące roku, w komórkach limit planu z faktem obok (kolor tylko dla przekroczeń). Edycja komórki tworzy własny plan miesiąca (jak T46), a „Skopiuj na kolejne miesiące” działa na cały wiersz. Podpowiedź z tego samego miesiąca rok wcześniej (sezonowość: grudzień – prezenty, lipiec – podróże) i suma roczna na kopertę.

**Po co.** Plan istnieje tylko miesiąc po miesiącu (MonthPage: poprzedni / następny), więc wydatków sezonowych nie widać z wyprzedzeniem. Proponowane koperty liczą się z 3 ostatnich miesięcy (T47, proposeEnvelopes) i nie znają sezonu. Wielomiesięczny widok budżetu mają YNAB i Actual, budżety z okresem – Firefly III, roczne – Wallet.

**Na czym oprzeć.** monthPlanSchema i planFor (T46) w src/shared/calc/plan.ts:270; proposeEnvelopes w plan.ts:90; debriefing (plan − fakt) w plan.ts:276; editPlan / setEnvelope w src/renderer/features/month/actions.ts; src/renderer/features/month/MonthPage.tsx.

## F38. Paragony, faktury i gwarancje przy operacji – z terminem zwrotu lub rękojmi

Priorytet: niski · nakład: M · konflikt z decyzją: Brak sprzeczności z decyzją użytkownika. Trzeba zmienić decyzje techniczne T22 („bez protokołu plików – FI nie ma screenów”) i T20 (kopia „folder FI jest mały, bez screenów”) – kopie bez załączników albo tygodniowe, pilnowanie rozmiaru folderu na OneDrive.

W edytorze operacji, przy kontenerze i w szybkim wpisie można wkleić (Ctrl+V) albo upuścić zdjęcie lub PDF: paragon, fakturę, kartę gwarancyjną, umowę. Obraz jest kompresowany do WebP potokiem screenów z ICTTJ i zapisywany w receipts/RRRR/MM/ULID.webp, z miniaturą i podglądem; na liście operacji pojawia się znacznik „z paragonem” (także w filtrze). Opcjonalne pole „zwrot do” albo „gwarancja / rękojmia do 18.10.2028” daje pozycję na Radarze i przypomnienie 14 dni wcześniej („Rękojmia odkurzacza mija za 30 dni”).

**Po co.** Paragony termiczne blakną, a reklamacja (rękojmia 2 lata, zwrot zakupu online 14 dni) wymaga dowodu zakupu. Podział paragonu na kategorie i domowników też bywa sporny. Operacja nie ma dziś pola na załącznik (transactionSchema, src/shared/schema/records.ts:77-121). Załączniki mają Firefly III, Monarch, Spendee, Wallet i Monefy; Wallet ma też gwarancje.

**Na czym oprzeć.** transactionSchema / containerSchema w src/shared/schema/records.ts; OperationEditor.tsx; QuickApp.tsx; radar() w src/shared/calc/radar.ts; kopie w src/main/datastore/backup.ts; wzór ICTTJ: src/renderer/lib/image.ts (compressImage), ScreensPanel, protokół journal-file:// (do przeniesienia z komentarzem „adapted from ICTTJ”).

## F39. Ulgi z PIT-37 / PIT-36: wydatki do odliczenia w roku

Priorytet: niski · nakład: M · konflikt z decyzją: D58 dotyczy tylko PIT-38 (termin bez kwoty) – PIT-37/36 to nowa sprawa. D8 (trading bez ZUS) sugeruje, że dochodu z PIT-37 może nie być – do potwierdzenia przez użytkownika.

Oznaczenie „do ulgi” przy wydatku albo w regule importu (najprościej jako tag): internet (do 760 zł rocznie), darowizny (do 6% dochodu), ulga rehabilitacyjna, termomodernizacyjna, wpłaty IKZE. Suma roku pokazana jest wobec limitu wpisanego w ustawieniach. W przeglądzie rocznym sekcja „Do zeznania” z listą operacji i CSV. W lutym przypomnienie na Radarze „zbierz faktury do ulg” i termin 30 kwietnia także dla PIT-37/36. Dopisek, że w PIT-38 (trading, kwota w ICTTJ) tych ulg nie ma. FI nie liczy podatku – kwoty są informacyjne.

**Po co.** Ulgi przepadają, bo faktury i przelewy trzeba w kwietniu zbierać z całego roku, a tytuły przelewów bywają nieczytelne. FI ma te operacje skategoryzowane. Panel „Przychody” rozróżnia „Pracę i inne” (D81), więc przy dochodach z pracy lub umów ma to sens. Programy podatkowe (e-pity, PITax) zbierają ulgi dopiero przy zeznaniu, a budżet może zbierać je przez cały rok.

**Na czym oprzeć.** PIT38_DAY / pit38Deadline w src/shared/calc/radar.ts:12, :34; pozycja pit38 w src/shared/calc/briefing.ts; yearNumbers w src/shared/calc/intel.ts:307; przegląd roczny w src/renderer/features/reports/ReportsPage.tsx; reguły importu (importRuleSchema); zależy od propozycji „Tagi”.

## F40. Automatyczne ukrycie kwot po bezczynności i przy starcie z Windows

Priorytet: niski · nakład: S · konflikt z decyzją: D30 (bez blokady) – zgodne, bo to tylko ukrycie kwot.

Opcje komputera w sekcji prywatności: „Ukryj kwoty po N minutach bezczynności” (powerMonitor, jak bezczynność w ICTTJ) i „Startuj z ukrytymi kwotami”. Do tego przyciski „Pokaż na 5 minut” i „Pokaż do końca sesji”. Dymek zasobnika i powiadomienia są wtedy też zamaskowane. To nie jest blokada – jedno Ctrl+$ odsłania kwoty.

**Po co.** Ukrycie kwot (Ctrl+$) jest wyłącznie ręczne i pamiętane na stałe (MachinePrefs.hideAmounts). Proces główny nie korzysta z powerMonitor do bezczynności. Kto zapomni ukryć kwoty przed udostępnieniem ekranu albo zostawieniem komputera, pokazuje salda i energię w oknie i w dymku zasobnika. D30 wyklucza blokadę i szyfrowanie, więc automatyczne ukrycie to jedyna ochrona zgodna z decyzjami. Ukrywanie salda po czasie mają aplikacje banków (mBank, Revolut).

**Na czym oprzeć.** MachinePrefs.hideAmounts w src/shared/machine.ts; toggleHideAmounts w src/renderer/store/machine.ts; setAmountsHidden w src/renderer/components/fields.tsx; setStatus w src/main/tray.ts; wzór: ICTTJ systemIdle / powerMonitor w src/main/index.ts.

## F41. Wpisy z telefonu przez skrzynkę na OneDrive

Priorytet: niski · nakład: M · konflikt z decyzją: D2 (bez wersji na iPhone'a) – to nie aplikacja na telefon, tylko skrót iOS zapisujący plik; do decyzji użytkownika.

FI obserwuje podfolder inbox/ w folderze danych. Skrót iOS (Shortcuts: kwota, kategoria, notatka) albo dowolna notatka zapisuje tam mały plik JSON lub tekstowy, np. „42,50 biedronka”. FI zamienia go w szkic operacji z godziną z telefonu i pokazuje na Mostku „Meldunki z lądu: 3 do potwierdzenia”. Po zatwierdzeniu plik jest usuwany. Telefon nie potrzebuje żadnej aplikacji FI.

**Po co.** Wydatki poza domem trafiają do FI dopiero wieczorem albo z importem co 2–3 dni (D26), więc energia dziś bywa nieaktualna, a drobne zakupy się zapominają. Cisza nocna i dziennik kapitański potrzebują prawdziwej godziny, której import z mBanku nie ma. Wszystkie porównywane aplikacje mają wpis mobilny, a tu wystarczy plik w OneDrive, który i tak się synchronizuje.

**Na czym oprzeć.** src/main/datastore/watch.ts (watcher folderu), skan w src/main/datastore/store.ts (inbox/ poza kolekcjami), quickTransaction w src/renderer/store/quickHost.ts, asksImpulse / isNight w src/shared/calc/operations.ts.

## F42. Polskie dni wolne w liczeniu dni roboczych

Priorytet: niski · nakład: S · konflikt z decyzją: T63 (decyzja techniczna: „pon–pt, bez świąt”) – do zmiany. D72 mówi o „3 dniach roboczych”, więc uwzględnienie świąt jest zgodne z intencją użytkownika.

Kalendarz świąt ustawowych w Polsce, liczony sam: Nowy Rok, Trzech Króli, Wielkanoc i Poniedziałek Wielkanocny, 1 i 3 maja, Zielone Świątki, Boże Ciało, 15 sierpnia, 1 i 11 listopada, Wigilia (wolna od 2025), 25–26 grudnia. Używany w oknie dopasowania wypłat ICTTJ (3 dni robocze), w terminie zaległej raty i w przypomnieniu o zaległym imporcie.

**Po co.** addWorkingDays pomija tylko soboty i niedziele (src/shared/calc/dock.ts:25-32). Sonda: addWorkingDays('2027-03-25', 3) daje 2027-03-30 – Poniedziałek Wielkanocny (29.03) liczy się jako dzień roboczy. Wypłata z ICTTJ zlecona przed świętami może więc dostać przedwcześnie propozycję „Portfel XTB”, zanim mBank zaksięguje przelew. Skutek łagodzi wymóg późniejszego importu i potwierdzenie przy dokowaniu.

**Na czym oprzeć.** addWorkingDays / PAIR_WORKING_DAYS w src/shared/calc/dock.ts:20-32; OVERDUE_DAYS w src/shared/calc/loans.ts; IMPORT_DUE_DAYS w src/shared/calc/briefing.ts:134; src/shared/calc/dates.ts.

## F43. Zamknięcie i archiwizacja starych lat, porządki w folderze

Priorytet: niski · nakład: L · konflikt z decyzją: Brak sprzeczności z decyzją użytkownika. Zmienia decyzję techniczną T2 (jeden plik JSON na rekord) dla zamkniętych lat i wymaga ostrożności przy scalaniu / konfliktach (T18).

W Raportach → Przegląd roczny przycisk „Zamknij rok 2025”. Operacje, dokowania i salda roku są pakowane do archive/2025.json.gz (albo jednego pliku na miesiąc), tylko do odczytu, i nadal liczone przez silnik i Wywiad. Rok można „Otworzyć ponownie”. Panel „Zajętość folderu” pokazuje liczbę plików, rozmiar .history i kopii, z przyciskami „Wyczyść historię starszą niż rok” i „Usuń kopie sprzed…”.

**Po co.** Każda operacja to osobny plik (T2), a na nowym komputerze OneDrive pobiera każdy plik przy pierwszym odczycie. To właśnie zawieszało otwieranie folderu (D82, T123), a problem rośnie z każdym rokiem pełnej historii z mBanku. Zamknięty rok to kilkanaście plików zamiast tysięcy i ochrona starych danych przed przypadkową edycją. Zamykanie lat mają GnuCash i programy księgowe. Uwaga: to nie naprawia znanego przepełnienia stosu przy ponad ok. 120 tys. plików (src/main/datastore/store.ts:271).

**Na czym oprzeć.** src/main/datastore/store.ts (walkFiles, open), COLLECTIONS / LAYOUTS w src/shared/paths.ts, src/main/datastore/backup.ts, src/main/datastore/history.ts, src/main/datastore/progress.ts, przegląd roczny w src/renderer/features/reports/ReportsPage.tsx.
