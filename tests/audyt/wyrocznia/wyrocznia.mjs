#!/usr/bin/env node
// Wyrocznia liczb audytu AU-9 (D97): liczy z wymagań (docs/specyfikacja.md, docs/decyzje.md) i z danych, jakie liczby
// aplikacja POWINNA pokazać. Bez kodu aplikacji. Tylko moduły wbudowane Node 24.
//
//   node tests/audyt/wyrocznia/wyrocznia.mjs --dane <folder FI> [--ictj <folder ICTTJ>] --chwila "2026-11-03 12:00" [--json <plik>]
import fs from 'node:fs'
import { loadFolder, loadIctj } from './lib/dane.mjs'
import { buildReport } from './lib/raport.mjs'
import { zl } from './lib/kwoty.mjs'
import { fromWarsaw } from './lib/daty.mjs'

function args(argv) {
  const out = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
    }
  }
  return out
}

const a = args(process.argv)
if (!a.dane || !a.chwila) {
  console.error('Użycie: node tests/audyt/wyrocznia/wyrocznia.mjs --dane <folder FI> [--ictj <folder ICTTJ>] --chwila "RRRR-MM-DD GG:MM" [--json <plik>]')
  process.exit(2)
}
const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?$/.exec(String(a.chwila).trim())
if (!m) {
  console.error('Zła chwila – oczekiwano „RRRR-MM-DD GG:MM” (czas warszawski)')
  process.exit(2)
}
const chwila = { date: m[1], time: m[2] ?? '12:00' }
chwila.ms = fromWarsaw(chwila.date, chwila.time) + 59_999 // u2 (C6, C9): koniec minuty chwili – zapisy z tej minuty się liczą
const input = loadFolder(a.dane)
const ictj = a.ictj ? loadIctj(a.ictj) : null
const rep = buildReport(input, ictj, chwila)

if (a.json) fs.writeFileSync(a.json, JSON.stringify(rep, null, 2) + '\n', 'utf8')

// ---------------- podsumowanie tekstowe
const L = []
const w = rep.warstwy
L.push(`Wyrocznia AU-9 (${rep.wersja}) · ${rep.meta.chwila} · start budżetu ${rep.meta.startBudzetu}`)
L.push(`Konta: ${rep.konta.map((k) => `${k.nazwa} ${k.koniecDnia.zl}`).join(' · ')} · razem ${rep.sumaKont.zl}`)
for (const p of rep.kontrolaSald.potwierdzenia) L.push(`  potwierdzenie ${p.konto} ${p.dzien}: ${p.potwierdzone.zl} / wyliczone ${p.wyliczone.zl} (różnica ${p.roznica.zl})`)
L.push(`Warstwy: osłony ${w.oslony.zl} · energia ${w.energia.zl} · kadłub ${w.kadlub.zl} · cele ${w.celeRazem.zl} · zbiorniki ${w.zbiornikiRazem.zl} · rezerwa PIT ${w.rezerwaPodatku.zl} · depozyt ${w.depozytRazem.zl} · łupy ${w.lupyRazem.zl}`)
L.push(`  suma warstw ${w.suma.zl} = salda ${w.sumaKont.zl} (różnica ${w.roznica.zl})`)
for (const g of w.cele) L.push(`  cel ${g.nazwa} (${g.zrodlo}, prio ${g.priorytet}${g.archiwalny ? ', archiwum' : ''}): ${g.stan.zl} / ${g.cel.zl}`)
const c = rep.celeWarstw
L.push(`Cele warstw: osłony ${c.celOslon.zl} (min ${c.minimumOslon.zl}) · kadłub ${c.celKadluba.zl} (${c.kadlubPelny ? 'pełny' : 'brakuje ' + c.brakDoCeluKadluba.zl}) · wolne do decyzji ${c.wolneDoDecyzji.zl} (${c.wolnePowod})`)
L.push(`Koszty netto: średnia 12 ${rep.koszty.srednia12.zl} · 6 ${rep.koszty.srednia6.zl} · 3 ${rep.koszty.srednia3.zl} · użyte ${rep.koszty.uzyte.zl}; propozycja pensji ${rep.propozycje.pensja.zl}`)
const s = rep.przychody.srednie
if (s.s6) L.push(`Przychody: śr. 3 ${s.s3.razem.zl} · 6 ${s.s6.razem.zl} · 12 ${s.s12.razem.zl} · mediana 12 ${rep.przychody.mediana12.razem.zl} · ostrzeżenie pensji: ${rep.przychody.ostrzezeniePensji ? 'TAK' : 'nie'}`)
const p = rep.planMiesiaca
L.push(`Plan ${p.miesiac}: pensja ${p.pensja.zl} (z osłon ${p.zOslon.zl}, z kadłuba ${p.zKadluba.zl}, brakuje ${p.brakuje.zl}) · odkładki ${p.ratyOdkladekRazem.zl} · energia start ${p.energiaNaStart.zl} · teraz ${p.energiaTeraz.zl}`)
const pr = rep.przydzial
L.push(`Przydział dziś ${pr.przydzialDzis.zl} = (${pr.kopertyCodzienne.zl} + łupy ${pr.lupyNaNastepnyMiesiac.zl} − ${pr.wydaneCodzienneDoWczoraj.zl}) / ${pr.dniDoKoncaZDzis} dni · wydane dziś ${pr.wydaneDzis.zl} · energia dziś (T295) ${pr.energiaDzis_T295.zl} / (spec) ${pr.energiaDzis_spec.zl} · podstawowy ${pr.podstawowyPrzydzial.zl}`)
if (rep.lupy) L.push(`Łupy ${rep.lupy.miesiac}: A ${rep.lupy.wariantA_niewydanaEnergia.zl} · B ${rep.lupy.wariantB_niewydaneZKopert_dodatnie.zl} · decyzja do ${rep.lupy.terminDecyzji}, potem ${rep.lupy.bezDecyzji} · ${rep.lupy.stan}`)
const z = rep.zasieg
L.push(`Zasięg ${z.obciecie} (obcięcie) / ${z.zaokraglenie} (zaokr.) mies. – ${z.klasa}; z łupami w osłonach ${z.zLupamiWOslonach.obciecie}`)
if (rep.doZadokowania.liczba) L.push(`Do zadokowania (T342): ${rep.doZadokowania.liczba} · wpływ ${rep.doZadokowania.wplyw.zl} · wypływ ${rep.doZadokowania.wyplyw.zl} · w celach ${rep.doZadokowania.wCelach.zl}`)
L.push(`Masa ładunku ${rep.ladownia.masaMiesieczna.zl} = ${rep.ladownia.masaProcentPensji} pensji (linia ${rep.ladownia.liniaZanurzenia})`)
for (const d of rep.domownicy.wariantD99) L.push(`  domownik ${d.osoba}: ma oddać ${d.maOddac.zl}${d.najstarszyOtwartyZakup ? ` (od ${d.najstarszyOtwartyZakup.dzien}, ${d.najstarszyOtwartyZakup.dni} dni)` : ''} · zaliczka ${d.zaliczka.zl}`)
for (const l of rep.pozyczki) L.push(`  pożyczka ${l.nazwa} (${l.kierunek}): zostało ${l.zostalo.zl}, zaległe ${l.zalegle.liczba} = ${l.zalegle.kwota.zl}${l.zalegle.od ? ' od ' + l.zalegle.od : ''}`)
if (rep.gra?.dni) {
  const g = rep.gra
  L.push(`Gra: ${g.dni.length} dni ocenionych (${g.start}…${g.ostatniZamrozony}), zgodnych ${g.dniZgodne}, seria ${g.seria}, rekord ${g.rekord}, stopień A ${g.stopien_A_bezMisjiWMinionychTygodniach} / z misjami ${g.stopien_A_zMisjami}, klasa ${g.klasaTeraz}`)
  if (g.misjaBiezacegoTygodnia) L.push(`  misja ${g.misjaBiezacegoTygodnia.tydzien}: kandydaci ${g.misjaBiezacegoTygodnia.kandydaciWKolejnosci.join(' → ')}`)
} else if (rep.gra) L.push(`Gra: ${rep.gra.uwaga}`)
L.push(`Daily Bias: T295 ${rep.dailyBias.energiaDzis_T295.bullishPierwszy} · spec ${rep.dailyBias.energiaDzis_spec_przydzial.bullishPierwszy}`)
if (rep.uwagi.length) L.push(`Uwagi: ${rep.uwagi.join(' | ')}`)
console.log(L.join('\n'))
void zl
