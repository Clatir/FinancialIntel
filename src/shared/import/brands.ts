/**
 * Who a row of the bank is about, beyond its exact wording (1.2.1, D75) – no AI, fixed lists and whole words:
 * - the brand key a group of the import and a learned rule stand on: one chain is one group whatever its city, shop
 *   number, card processor or domain („DINO JELENIA GORA 4”, „SumUp *KAWIARNIA”, „ALLEGRO.PL”);
 * - the starter dictionary of chains with their categories (`BRANDS`);
 * - the keywords of names and titles („apteka”, „stacja paliw”, `KEYWORDS`), for expenses.
 * Text is folded (lower case without Polish marks); a „?” – a letter the bank could not encode („Jelenia G?ra”) –
 * matches any letter.
 */
import { fold } from '../fold'
import { cleanBankName, counterpartyKey, withoutLegalForms } from './names'

/** A shop's code („Z6512”). */
const STORE_CODE = /^[a-z]{1,2}\d{2,}$/

export interface Token {
  /** Folded, for matching. */
  word: string
  /** As written (lower case), for the screen: „kręgle”. */
  text: string
}

/** The words of a text (letters and digits); a number glued to the end of a word goes („SCHRONIS67048”). */
export function tokens(text: string): Token[] {
  const out: Token[] = []
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}?]+/u)) {
    if (!raw) continue
    const folded = fold(raw)
    for (const part of folded.split(/[^a-z0-9?]+/)) {
      // A shop's code („Z6512”) stays whole (`brandOf` drops it); a number glued to a word goes.
      const word = STORE_CODE.test(part) ? part : part.replace(/([a-z?])\d{3,}$/, '$1')
      if (word) out.push({ word, text: part === folded ? raw.replace(/(\p{L})\d{3,}$/u, '$1') : word })
    }
  }
  return out
}

/** Folded words of a text (`tokens`). */
export const words = (text: string): string[] => tokens(text).map((t) => t.word)

interface Pattern {
  words: string[]
  /** The last word may go on („aptek*” = apteka, apteki). */
  prefix: boolean
  /** Only at the start of the name („^dino”: not „PARK DINO”). */
  start: boolean
}

/** „stacja paliw*”, „^dino”: whole folded words, „*” = the last word may go on, „^” = at the start. */
function pattern(src: string): Pattern {
  return { words: words(src.replace(/^\^|\*$/g, '')), prefix: src.endsWith('*'), start: src.startsWith('^') }
}

/** A word of a text is `word` (or goes on from it, `prefix`); a „?” of the text is any letter. */
export function sameWord(text: string, word: string, prefix: boolean): boolean {
  if (prefix ? text.length < word.length : text.length !== word.length) return false
  for (let i = 0; i < word.length; i++) if (text[i] !== word[i] && text[i] !== '?') return false
  return true
}

/** Where the pattern's first word is in `ws`, -1 = nowhere. */
function find(ws: readonly string[], p: Pattern): number {
  const last = p.start ? Math.min(0, ws.length - p.words.length) : ws.length - p.words.length
  for (let i = 0; i <= last; i++) if (p.words.every((w, j) => sameWord(ws[i + j]!, w, p.prefix && j === p.words.length - 1))) return i
  return -1
}

/** A keyword typed by the user (a rule of the 'keyword' mode): its words, the last one may go on. */
export function keywordMatches(ws: readonly string[], keyword: string): boolean {
  const p = pattern(`${keyword}*`)
  return p.words.length > 0 && find(ws, p) >= 0
}

/** A keyword as a rule keeps it: folded words, one space between them („Stacja  Paliw” → „stacja paliw”). */
export const normalizeKeyword = (text: string): string => words(text).join(' ')

// ------------------------------------------------------------------ starting categories

/** A default (sub)category by its place in the starting tree (`defaultCategoryId(main, sub)`; sub 0 = the main one). */
export type CategoryPlace = readonly [main: number, sub: number]

const CAT = {
  groceries: [1, 1],
  eatingOut: [1, 2],
  coffee: [1, 3],
  rent: [2, 1],
  utilities: [2, 2],
  furnishing: [2, 3],
  fuel: [3, 1],
  carService: [3, 2],
  parking: [3, 4],
  travel: [3, 5],
  pets: [4, 0],
  petFood: [4, 1],
  vet: [4, 2],
  medicines: [5, 1],
  doctor: [5, 2],
  sport: [5, 3],
  // Taxis like Bolt (D69): going out.
  fun: [6, 0],
  goingOut: [6, 1],
  hobby: [6, 2],
  trips: [6, 3],
  phone: [7, 1],
  internet: [7, 2],
  streaming: [7, 3],
  apps: [7, 4],
  clothes: [8, 1],
  cosmetics: [8, 2],
  hairdresser: [8, 3],
  gifts: [9, 1],
  other: [9, 2]
} as const satisfies Record<string, CategoryPlace>

// ------------------------------------------------------------------ chains

export interface Brand {
  /** The brand key of its groups and rules – never changed (rules learned on it). */
  id: string
  label: string
  /** null = a marketplace selling everything (Allegro): one group, the category is the user's. */
  category: CategoryPlace | null
  patterns: readonly string[]
}

const brand = (id: string, label: string, category: CategoryPlace | null, ...patterns: string[]): Brand => ({ id, label, category, patterns })

/** Well-known chains and services in Poland; the more specific first („bolt food” before „bolt”). */
export const BRANDS: readonly Brand[] = [
  // Food delivery before the taxis of the same companies.
  brand('boltfood', 'Bolt Food', CAT.eatingOut, 'bolt food'),
  brand('ubereats', 'Uber Eats', CAT.eatingOut, 'uber eats'),
  brand('glovo', 'Glovo', CAT.eatingOut, 'glovo'),
  brand('wolt', 'Wolt', CAT.eatingOut, '^wolt'),
  brand('pyszne', 'Pyszne.pl', CAT.eatingOut, 'pyszne', 'takeaway'),
  brand('bolt', 'Bolt', CAT.fun, '^bolt'),
  brand('uber', 'Uber', CAT.fun, '^uber'),
  brand('freenow', 'FreeNow', CAT.fun, 'free now', 'freenow', 'mytaxi'),
  brand('itaxi', 'iTaxi', CAT.fun, '^itaxi'),
  // Groceries.
  brand('biedronka', 'Biedronka', CAT.groceries, 'biedronka'),
  brand('lidl', 'Lidl', CAT.groceries, 'lidl'),
  brand('zabka', 'Żabka', CAT.groceries, 'zabka'),
  brand('dino', 'Dino', CAT.groceries, '^dino'),
  brand('kaufland', 'Kaufland', CAT.groceries, 'kaufland'),
  brand('auchan', 'Auchan', CAT.groceries, 'auchan'),
  brand('carrefour', 'Carrefour', CAT.groceries, 'carrefour'),
  brand('netto', 'Netto', CAT.groceries, '^netto'),
  brand('stokrotka', 'Stokrotka', CAT.groceries, 'stokrotka'),
  brand('lewiatan', 'Lewiatan', CAT.groceries, 'lewiatan'),
  brand('polomarket', 'POLOmarket', CAT.groceries, 'polomarket', 'polo market'),
  brand('intermarche', 'Intermarché', CAT.groceries, 'intermarche'),
  brand('leclerc', 'E.Leclerc', CAT.groceries, 'leclerc', 'eleclerc', 'eleclecrc'),
  brand('aldi', 'Aldi', CAT.groceries, '^aldi'),
  brand('spar', 'Spar', CAT.groceries, '^spar', 'eurospar', 'interspar'),
  brand('freshmarket', 'Freshmarket', CAT.groceries, 'freshmarket', 'fresh market'),
  brand('delikatesycentrum', 'Delikatesy Centrum', CAT.groceries, 'delikatesy centrum'),
  brand('groszek', 'Groszek', CAT.groceries, '^groszek'),
  brand('topaz', 'Topaz', CAT.groceries, '^topaz'),
  brand('selgros', 'Selgros', CAT.groceries, 'selgros'),
  brand('makro', 'Makro', CAT.groceries, '^makro'),
  brand('chatapolska', 'Chata Polska', CAT.groceries, 'chata polska'),
  brand('piotripawel', 'Piotr i Paweł', CAT.groceries, 'piotr i pawel'),
  // Eating out, coffee and sweets.
  brand('mcdonalds', "McDonald's", CAT.eatingOut, 'mcdonald*', 'mc donald*'),
  brand('kfc', 'KFC', CAT.eatingOut, '^kfc'),
  brand('burgerking', 'Burger King', CAT.eatingOut, 'burger king', '^pl bk', '^bk'),
  brand('pizzahut', 'Pizza Hut', CAT.eatingOut, 'pizza hut'),
  brand('subway', 'Subway', CAT.eatingOut, '^subway'),
  brand('dominos', "Domino's", CAT.eatingOut, 'domino s', 'dominos'),
  brand('telepizza', 'Telepizza', CAT.eatingOut, 'telepizza'),
  brand('dagrasso', 'Da Grasso', CAT.eatingOut, 'da grasso'),
  brand('pasibus', 'Pasibus', CAT.eatingOut, 'pasibus'),
  brand('maxburgers', 'Max Premium Burgers', CAT.eatingOut, 'max premium burgers', 'max burgers'),
  brand('northfish', 'North Fish', CAT.eatingOut, 'north fish'),
  brand('sphinx', 'Sphinx', CAT.eatingOut, '^sphinx'),
  brand('saladstory', 'Salad Story', CAT.eatingOut, 'salad story'),
  brand('popeyes', 'Popeyes', CAT.eatingOut, 'popeyes'),
  brand('bobbyburger', 'Bobby Burger', CAT.eatingOut, 'bobby burger'),
  brand('starbucks', 'Starbucks', CAT.coffee, 'starbucks'),
  brand('costacoffee', 'Costa Coffee', CAT.coffee, 'costa coffee'),
  brand('caffenero', 'Green Caffè Nero', CAT.coffee, 'caffe nero', 'green caffe'),
  brand('tchibo', 'Tchibo', CAT.coffee, 'tchibo'),
  brand('wedel', 'E. Wedel', CAT.coffee, 'wedel'),
  brand('grycan', 'Grycan', CAT.coffee, 'grycan'),
  brand('krispykreme', 'Krispy Kreme', CAT.coffee, 'krispy kreme'),
  // Home, furniture, electronics.
  brand('ikea', 'IKEA', CAT.furnishing, '^ikea'),
  brand('castorama', 'Castorama', CAT.furnishing, 'castorama'),
  brand('leroymerlin', 'Leroy Merlin', CAT.furnishing, 'leroy merlin'),
  brand('obi', 'OBI', CAT.furnishing, '^obi'),
  brand('bricomarche', 'Bricomarché', CAT.furnishing, 'bricomarche', '^brico'),
  brand('jysk', 'Jysk', CAT.furnishing, '^jysk'),
  brand('action', 'Action', CAT.furnishing, '^action'),
  brand('pepco', 'Pepco', CAT.furnishing, '^pepco'),
  brand('homla', 'Homla', CAT.furnishing, 'homla'),
  brand('blackredwhite', 'Black Red White', CAT.furnishing, 'black red white'),
  brand('agatameble', 'Agata Meble', CAT.furnishing, 'agata meble'),
  brand('mediamarkt', 'Media Markt', CAT.furnishing, 'media markt', 'mediamarkt'),
  brand('mediaexpert', 'Media Expert', CAT.furnishing, 'media expert'),
  brand('rtveuroagd', 'RTV Euro AGD', CAT.furnishing, 'rtv euro agd', 'euro rtv agd', 'euro net'),
  brand('xkom', 'x-kom', CAT.furnishing, 'x kom', 'xkom'),
  brand('komputronik', 'Komputronik', CAT.furnishing, 'komputronik'),
  brand('morele', 'Morele', CAT.furnishing, '^morele'),
  brand('neonet', 'Neonet', CAT.furnishing, 'neonet'),
  // Drugstores, pharmacies, health, sport.
  brand('rossmann', 'Rossmann', CAT.cosmetics, 'rossmann'),
  brand('hebe', 'Hebe', CAT.cosmetics, '^hebe'),
  brand('dm', 'dm', CAT.cosmetics, '^dm drogerie'),
  brand('superpharm', 'Super-Pharm', CAT.cosmetics, 'super pharm', 'superpharm'),
  brand('sephora', 'Sephora', CAT.cosmetics, 'sephora'),
  brand('douglas', 'Douglas', CAT.cosmetics, '^douglas'),
  brand('notino', 'Notino', CAT.cosmetics, 'notino'),
  brand('inglot', 'Inglot', CAT.cosmetics, '^inglot'),
  brand('doz', 'DOZ', CAT.medicines, '^doz'),
  brand('drmax', 'Dr.Max', CAT.medicines, 'dr max', 'drmax'),
  brand('ziko', 'Ziko', CAT.medicines, '^ziko'),
  brand('gemini', 'Apteka Gemini', CAT.medicines, 'apteka gemini', 'apteki gemini', 'gemini apteka'),
  brand('cefarm', 'Cefarm', CAT.medicines, 'cefarm'),
  brand('medicover', 'Medicover', CAT.doctor, 'medicover'),
  brand('luxmed', 'LUX MED', CAT.doctor, 'lux med', 'luxmed'),
  brand('enelmed', 'Enel-Med', CAT.doctor, 'enel med', 'enelmed'),
  brand('znanylekarz', 'ZnanyLekarz', CAT.doctor, 'znanylekarz', 'znany lekarz'),
  brand('diagnostyka', 'Diagnostyka', CAT.doctor, '^diagnostyka'),
  brand('alab', 'ALAB', CAT.doctor, '^alab'),
  brand('synevo', 'Synevo', CAT.doctor, 'synevo'),
  brand('decathlon', 'Decathlon', CAT.sport, 'decathlon'),
  brand('multisport', 'MultiSport', CAT.sport, 'multisport', 'benefit systems'),
  brand('zdrofit', 'Zdrofit', CAT.sport, 'zdrofit'),
  brand('mcfit', 'McFit', CAT.sport, 'mcfit'),
  brand('justgym', 'Just Gym', CAT.sport, 'just gym'),
  brand('calypso', 'Calypso Fitness', CAT.sport, 'calypso fitness'),
  brand('martessport', 'Martes Sport', CAT.sport, 'martes sport'),
  // Car: parcels of Orlen before its stations; fuel, tolls, parking apps.
  brand('orlenpaczka', 'Orlen Paczka', CAT.other, 'orlen paczka'),
  brand('orlen', 'Orlen', CAT.fuel, '^orlen', 'pkn orlen', 'stacja orlen'),
  brand('bp', 'BP', CAT.fuel, '^bp'),
  brand('shell', 'Shell', CAT.fuel, '^shell'),
  brand('circlek', 'Circle K', CAT.fuel, 'circle k', 'circlek'),
  brand('lotos', 'Lotos', CAT.fuel, '^lotos'),
  brand('moya', 'Moya', CAT.fuel, '^moya'),
  brand('amic', 'Amic', CAT.fuel, '^amic'),
  brand('huzar', 'Huzar', CAT.fuel, '^huzar'),
  brand('avia', 'Avia', CAT.fuel, '^avia'),
  brand('skycash', 'SkyCash', CAT.parking, 'skycash'),
  brand('mpay', 'mPay', CAT.parking, '^mpay'),
  brand('mobilet', 'moBiLET', CAT.parking, 'mobilet'),
  brand('etoll', 'e-TOLL', CAT.parking, 'e toll', 'etoll'),
  brand('stalexport', 'Stalexport', CAT.parking, 'stalexport'),
  brand('amberone', 'Amber One', CAT.parking, 'amber one'),
  // Trains and city transport.
  brand('koleo', 'KOLEO', CAT.travel, 'koleo'),
  brand('pkpintercity', 'PKP Intercity', CAT.travel, 'pkp intercity', 'intercity', '^pkp ic'),
  brand('pkp', 'PKP', CAT.travel, '^pkp'),
  brand('polregio', 'Polregio', CAT.travel, 'polregio', 'przewozy regionalne'),
  brand('kolejedolnoslaskie', 'Koleje Dolnośląskie', CAT.travel, 'koleje dolnoslaskie', '^kd'),
  brand('kolejemazowieckie', 'Koleje Mazowieckie', CAT.travel, 'koleje mazowieckie'),
  brand('kolejeslaskie', 'Koleje Śląskie', CAT.travel, 'koleje slaskie'),
  brand('kolejewielkopolskie', 'Koleje Wielkopolskie', CAT.travel, 'koleje wielkopolskie'),
  brand('lka', 'Łódzka Kolej Aglomeracyjna', CAT.travel, 'lodzka kolej'),
  brand('skm', 'SKM', CAT.travel, '^skm'),
  brand('wkd', 'WKD', CAT.travel, '^wkd'),
  brand('jakdojade', 'jakdojade', CAT.travel, 'jakdojade'),
  brand('flixbus', 'FlixBus', CAT.travel, 'flixbus', 'flix bus'),
  brand('mpk', 'MPK', CAT.travel, '^mpk'),
  brand('ztm', 'ZTM', CAT.travel, '^ztm'),
  brand('zkm', 'ZKM', CAT.travel, '^zkm'),
  // Pets.
  brand('maxizoo', 'Maxi Zoo', CAT.pets, 'maxi zoo', 'maxizoo'),
  brand('kakadu', 'Kakadu', CAT.pets, '^kakadu'),
  brand('zooplus', 'zooplus', CAT.pets, 'zooplus'),
  brand('zookarina', 'Zoo Karina', CAT.pets, 'zoo karina'),
  // Going out, hobby, trips.
  brand('multikino', 'Multikino', CAT.goingOut, 'multikino'),
  brand('cinemacity', 'Cinema City', CAT.goingOut, 'cinema city'),
  brand('helios', 'Helios', CAT.goingOut, '^helios'),
  brand('eventim', 'Eventim', CAT.goingOut, 'eventim'),
  brand('ebilet', 'eBilet', CAT.goingOut, 'ebilet'),
  brand('biletyna', 'Biletyna', CAT.goingOut, 'biletyna'),
  brand('empik', 'Empik', CAT.hobby, '^empik'),
  brand('steam', 'Steam', CAT.hobby, '^steam', 'steampowered', 'steamgames'),
  brand('playstation', 'PlayStation', CAT.hobby, 'playstation', 'sony interactive'),
  brand('xbox', 'Xbox', CAT.hobby, '^xbox'),
  brand('nintendo', 'Nintendo', CAT.hobby, 'nintendo'),
  brand('audible', 'Audible', CAT.hobby, 'audible'),
  brand('legimi', 'Legimi', CAT.hobby, 'legimi'),
  brand('storytel', 'Storytel', CAT.hobby, 'storytel'),
  brand('booking', 'Booking.com', CAT.trips, '^booking'),
  brand('airbnb', 'Airbnb', CAT.trips, 'airbnb'),
  brand('ryanair', 'Ryanair', CAT.trips, 'ryanair'),
  brand('wizzair', 'Wizz Air', CAT.trips, 'wizz air', 'wizzair', '^wizz'),
  brand('lot', 'LOT', CAT.trips, 'lot polish', 'polskie linie lotnicze'),
  brand('easyjet', 'easyJet', CAT.trips, 'easyjet'),
  brand('expedia', 'Expedia', CAT.trips, 'expedia'),
  brand('itaka', 'Itaka', CAT.trips, '^itaka'),
  brand('rainbow', 'Rainbow', CAT.trips, '^rainbow tours'),
  brand('tui', 'TUI', CAT.trips, '^tui'),
  // Phone, internet, streaming, apps.
  brand('play', 'Play', CAT.phone, '^play', '^p4'),
  brand('orange', 'Orange', CAT.phone, '^orange'),
  brand('tmobile', 'T-Mobile', CAT.phone, 't mobile', 'tmobile'),
  brand('plus', 'Plus', CAT.phone, 'plus gsm', 'polkomtel'),
  brand('heyah', 'Heyah', CAT.phone, 'heyah'),
  brand('nju', 'nju mobile', CAT.phone, 'nju mobile', '^nju'),
  brand('virginmobile', 'Virgin Mobile', CAT.phone, 'virgin mobile'),
  brand('lycamobile', 'Lycamobile', CAT.phone, 'lycamobile'),
  brand('vectra', 'Vectra', CAT.internet, '^vectra'),
  brand('upc', 'UPC', CAT.internet, '^upc'),
  brand('netia', 'Netia', CAT.internet, '^netia'),
  brand('inea', 'Inea', CAT.internet, '^inea'),
  brand('toya', 'Toya', CAT.internet, '^toya'),
  brand('netflix', 'Netflix', CAT.streaming, 'netflix'),
  brand('spotify', 'Spotify', CAT.streaming, 'spotify'),
  brand('hbomax', 'HBO Max', CAT.streaming, '^hbo'),
  brand('disney', 'Disney+', CAT.streaming, 'disney*'),
  brand('youtube', 'YouTube Premium', CAT.streaming, 'youtube*'),
  brand('primevideo', 'Prime Video', CAT.streaming, 'prime video', 'amazon prime', 'primevideo'),
  brand('canalplus', 'Canal+', CAT.streaming, '^canal'),
  brand('player', 'Player', CAT.streaming, '^player'),
  brand('polsatboxgo', 'Polsat Box Go', CAT.streaming, 'polsat box go', 'polsat go'),
  brand('skyshowtime', 'SkyShowtime', CAT.streaming, 'skyshowtime'),
  brand('tidal', 'Tidal', CAT.streaming, '^tidal'),
  brand('deezer', 'Deezer', CAT.streaming, 'deezer'),
  brand('apple', 'Apple', CAT.apps, '^apple', 'itunes', 'icloud'),
  brand('google', 'Google', CAT.apps, '^google'),
  brand('microsoft', 'Microsoft', CAT.apps, '^microsoft', '^msft'),
  brand('adobe', 'Adobe', CAT.apps, '^adobe'),
  brand('canva', 'Canva', CAT.apps, '^canva'),
  brand('openai', 'OpenAI', CAT.apps, 'openai', 'chatgpt'),
  brand('anthropic', 'Anthropic', CAT.apps, 'anthropic', 'claude ai'),
  brand('dropbox', 'Dropbox', CAT.apps, 'dropbox'),
  brand('github', 'GitHub', CAT.apps, 'github'),
  brand('duolingo', 'Duolingo', CAT.apps, 'duolingo'),
  brand('linkedin', 'LinkedIn', CAT.apps, 'linkedin'),
  brand('notion', 'Notion', CAT.apps, '^notion'),
  // Clothes and shoes.
  brand('reserved', 'Reserved', CAT.clothes, '^reserved'),
  brand('cropp', 'Cropp', CAT.clothes, '^cropp'),
  brand('mohito', 'Mohito', CAT.clothes, '^mohito'),
  brand('sinsay', 'Sinsay', CAT.clothes, '^sinsay'),
  brand('hm', 'H&M', CAT.clothes, '^h m', '^hm', 'hennes'),
  brand('zara', 'Zara', CAT.clothes, '^zara'),
  brand('pullbear', 'Pull&Bear', CAT.clothes, 'pull bear', 'pull and bear'),
  brand('bershka', 'Bershka', CAT.clothes, 'bershka'),
  brand('stradivarius', 'Stradivarius', CAT.clothes, 'stradivarius'),
  brand('massimodutti', 'Massimo Dutti', CAT.clothes, 'massimo dutti'),
  brand('ccc', 'CCC', CAT.clothes, '^ccc'),
  brand('deichmann', 'Deichmann', CAT.clothes, 'deichmann'),
  brand('eobuwie', 'eobuwie', CAT.clothes, 'eobuwie'),
  brand('modivo', 'Modivo', CAT.clothes, 'modivo'),
  brand('zalando', 'Zalando', CAT.clothes, 'zalando'),
  brand('tkmaxx', 'TK Maxx', CAT.clothes, 'tk maxx', 'tkmaxx', 'tjx*'),
  brand('primark', 'Primark', CAT.clothes, 'primark'),
  brand('kik', 'KiK', CAT.clothes, '^kik'),
  brand('halfprice', 'Half Price', CAT.clothes, 'half price'),
  brand('newyorker', 'New Yorker', CAT.clothes, 'new yorker'),
  brand('bigstar', 'Big Star', CAT.clothes, 'big star'),
  brand('4f', '4F', CAT.clothes, '^4f'),
  brand('answear', 'Answear', CAT.clothes, 'answear'),
  brand('shein', 'Shein', CAT.clothes, '^shein'),
  brand('vinted', 'Vinted', CAT.clothes, 'vinted'),
  brand('aboutyou', 'About You', CAT.clothes, 'about you'),
  // Parcels, utilities.
  brand('inpost', 'InPost', CAT.other, 'inpost', 'paczkomat*'),
  brand('pocztapolska', 'Poczta Polska', CAT.other, 'poczta polska'),
  brand('dpd', 'DPD', CAT.other, '^dpd'),
  brand('dhl', 'DHL', CAT.other, '^dhl'),
  brand('pge', 'PGE', CAT.utilities, '^pge'),
  brand('tauron', 'Tauron', CAT.utilities, 'tauron'),
  brand('enea', 'Enea', CAT.utilities, '^enea'),
  brand('energa', 'Energa', CAT.utilities, '^energa'),
  brand('eon', 'E.ON', CAT.utilities, '^e on', '^eon'),
  brand('pgnig', 'PGNiG', CAT.utilities, 'pgnig'),
  brand('fortum', 'Fortum', CAT.utilities, 'fortum'),
  brand('veolia', 'Veolia', CAT.utilities, 'veolia'),
  brand('mpwik', 'MPWiK', CAT.utilities, '^mpwik'),
  // Marketplaces: everything is sold there – one group, the category is the user's.
  brand('allegro', 'Allegro', null, 'allegro'),
  brand('amazon', 'Amazon', null, '^amazon', '^amzn'),
  brand('aliexpress', 'AliExpress', null, 'aliexpress'),
  brand('temu', 'Temu', null, '^temu'),
  brand('olx', 'OLX', null, '^olx'),
  brand('ebay', 'eBay', null, '^ebay')
]

const BRAND_PATTERNS = BRANDS.map((b) => ({ brand: b, patterns: b.patterns.map(pattern) }))

const BRAND_BY_ID = new Map(BRANDS.map((b) => [b.id, b]))

/** The chain of the dictionary with this brand key (a key merged into a chain by the user takes its category). */
export const brandById = (id: string): Brand | null => BRAND_BY_ID.get(id) ?? null

// ------------------------------------------------------------------ keywords

export interface Keyword {
  /** The word shown to the user („apteka”). */
  word: string
  category: CategoryPlace
  patterns: readonly string[]
}

const keyword = (word: string, category: CategoryPlace, ...patterns: string[]): Keyword => ({ word, category, patterns })

/**
 * Words of a name or a title that say what was bought; the first that fits decides (specific phrases first: an animal
 * shelter is no mountain hut, a toilet at a station no train ticket). For expenses only – money in with „kręgle” in
 * the title is a friend paying back, the user's decision.
 */
export const KEYWORDS: readonly Keyword[] = [
  keyword('schronisko dla zwierząt', CAT.pets, 'schronisko dla zwierzat', 'schroniska dla zwierzat'),
  keyword('kolej linowa', CAT.trips, 'kolej linow*', 'kolej gondolow*', 'kolejka linow*'),
  keyword('toaleta', CAT.other, 'toalet*', 'wc', 'kurier*', 'ksero*', 'oplata skarbowa', 'notariu*'),
  keyword('stacja paliw', CAT.fuel, 'stacja paliw*', 'stacji paliw*', 'paliw*', 'fuel*', 'lpg'),
  keyword('apteka', CAT.medicines, 'aptek*', 'aptec*', 'farmac*'),
  keyword('weterynarz', CAT.vet, 'weteryn*', 'lecznica dla zwierzat', 'lecznica zwierzat'),
  keyword('sklep zoologiczny', CAT.pets, 'zoolog*', 'pet shop', 'petshop'),
  keyword('karma', CAT.petFood, 'karma', 'karmy'),
  keyword('fryzjer', CAT.hairdresser, 'fryzj*', 'barber*'),
  keyword('kosmetyczka', CAT.cosmetics, 'kosmety*', 'drogeri*', 'perfumer*', 'manicure', 'pedicure', 'paznok*'),
  keyword(
    'lekarz',
    CAT.doctor,
    'lekar*',
    'przychodni*',
    'stomatolog*',
    'dentyst*',
    'dental*',
    'ortodont*',
    'okulist*',
    'klinik*',
    'clinic*',
    'szpital*',
    'laborator*',
    'diagnost*',
    'rehabilit*',
    'fizjoter*',
    'psycholog*',
    'psychiatr*',
    'psychoterap*',
    'gabinet*'
  ),
  keyword('siłownia', CAT.sport, 'silowni*', 'fitness*', 'gym', 'basen*', 'aquapark*', 'squash*', 'crossfit*', 'joga', 'yoga', 'pilates'),
  keyword('parking', CAT.parking, 'parking*', 'parkomat*', 'parkowani*', 'spp', 'strefa platn*', 'autostrad*', 'oplata drogowa', 'myto'),
  keyword('warsztat', CAT.carService, 'warsztat*', 'wulkaniz*', 'mechanik*', 'myjni*', 'car wash', 'autoserwis*', 'auto serwis*', 'autoczesci*', 'auto czesci*'),
  keyword('taxi', CAT.fun, 'taxi*', 'taksowk*'),
  keyword('kolej', CAT.travel, 'koleje', 'kolej', 'autobus*', 'komunikacja miejska', 'bilet miesieczny'),
  keyword(
    'meble',
    CAT.furnishing,
    'meble*',
    'meblow*',
    'agd',
    'rtv',
    'elektronik*',
    'oswietleni*',
    'dekorac*',
    'market budowlan*',
    'budowlan*',
    'remont*',
    'narzedzi*',
    'ogrodnicz*'
  ),
  keyword('cukiernia', CAT.coffee, 'cukierni*', 'kawiarni*', 'cafe', 'caffe*', 'coffee*', 'kawa', 'lodziarni*', 'lody', 'gelat*', 'vending*', 'patisser*', 'ciastkarni*', 'donut*'),
  keyword('piekarnia', CAT.groceries, 'piekar*', 'bakery', 'bakeri*'),
  keyword(
    'restauracja',
    CAT.eatingOut,
    'restaurac*',
    'restaurant*',
    'bistro*',
    'pizz*',
    'kebab*',
    'kebap*',
    'sushi*',
    'ramen*',
    'burger*',
    'pierogarni*',
    'bar mleczny',
    'jadlodajni*',
    'stolowk*',
    'gastronom*',
    'grill*',
    'trattori*',
    'tawern*',
    'karczm*',
    'gospoda',
    'kuchni*',
    'food',
    'kolacj*',
    'obiad*',
    'lunch*',
    'sniadani*',
    'catering*'
  ),
  keyword('sklep spożywczy', CAT.groceries, 'spozywcz*', 'supermarket*', 'hipermarket*', 'market', 'delikates*', 'warzywniak*', 'warzywa', 'masarni*', 'rzezni*', 'sklep miesny'),
  keyword(
    'kino',
    CAT.goingOut,
    'kino',
    'kina',
    'cinema*',
    'teatr*',
    'koncert*',
    'muzeum',
    'muzea',
    'opera',
    'escape room*',
    'kregiel*',
    'kregl*',
    'bowling*',
    'bilard*',
    'paintball*',
    'laser tag',
    'park rozrywki',
    'pub',
    'piwiarni*'
  ),
  keyword('hotel', CAT.trips, 'hotel*', 'hostel*', 'motel*', 'pensjonat*', 'apartament*', 'nocleg*', 'schronis*', 'camping*', 'kemping*', 'wyciag*', 'skipass*', 'ski pass', 'biuro podrozy', 'lotnisk*', 'airport*'),
  keyword('księgarnia', CAT.hobby, 'ksiegarni*', 'ksiazk*', 'antykwariat*'),
  keyword('doładowanie', CAT.phone, 'doladowani*'),
  keyword('internet', CAT.internet, 'internet', 'swiatlowod*'),
  keyword('czynsz', CAT.rent, 'czynsz*', 'wspolnota mieszk*', 'spoldzielnia mieszk*', 'najem mieszk*', 'oplata za mieszk*'),
  keyword('prąd', CAT.utilities, 'prad', 'pradu', 'za gaz', 'za wode', 'ogrzewani*', 'wodociag*', 'kanalizac*', 'smieci', 'wywoz smieci'),
  keyword('kwiaciarnia', CAT.gifts, 'kwiaciarni*', 'kwiaty', 'florist*', 'prezent*', 'upomink*', 'pamiatk*'),
  keyword('odzież', CAT.clothes, 'odziez*', 'obuwi*', 'butik*', 'boutique*')
]

const KEYWORD_PATTERNS = KEYWORDS.map((k) => ({ keyword: k, patterns: k.patterns.map(pattern) }))

/** Every word of the keywords' patterns („kawiarni*”, „stacja paliw*”): it says what a place is, not which one. */
const KEYWORD_WORDS = KEYWORD_PATTERNS.flatMap((k) => k.patterns.flatMap((p) => p.words.map((w, i) => ({ w, prefix: p.prefix && i === p.words.length - 1 }))))

const KEYWORD_WORD_MEMO = new Map<string, boolean>()

/** A word of a built-in keyword („kawiarnia”, „stacja”, „pizzeria”). */
export function isKeywordWord(word: string): boolean {
  let hit = KEYWORD_WORD_MEMO.get(word)
  if (hit === undefined) KEYWORD_WORD_MEMO.set(word, (hit = KEYWORD_WORDS.some((k) => sameWord(word, k.w, k.prefix))))
  return hit
}

/**
 * Words that tell no counterparty apart (1.2.2): a shop, a firm, the bank's own words, a country, a month of a
 * transfer's title („ZA PAŹDZIERNIK”), legal forms written out. Folded.
 */
const GENERIC = new Set(
  (
    'sklep sklepy sklepik kiosk market markety centrum salon studio firma uslugi usluga uslugowy uslugowa handel handlowy handlowa handlowe ' +
    'ph phu fhu ppuh pphu phup ppu sc zaklad oddzial filia punkt sprzedaz hurtownia galeria dom polska polski polskie poland polsce ' +
    'www com net online shop store express ekspres mini maxi super the and plac ulica aleja osiedle spolka akcyjna jawna komandytowa cywilna ' +
    'grupa group company international service services serwis system systems tech partner partners center centre kraj kraju ' +
    'zakup zakupy platnosc platnosci przelew przelewy przelewu blik zwrot zwrotu wplata wyplata oplata oplaty prowizja transakcja transakcje ' +
    'karta karty kartu terminal numer pay payment payments faktura faktury fakture rachunek rachunku zamowienie zamowienia dla przy pod nad oraz ' +
    'plus srodki srodkow tytul tytulem przekaz telefon telefonu nazwa adres kwota media visa mastercard debit ecommerce commerce ' +
    'rynek dworzec pasaz hala targ targowisko bazar park stare miasto nowe glowny glowna glowne gorny dolny centralny centralna ' +
    'data transakcji transakcja operacji operacja wykonania ksiegowania waluty ref nr kod pln eur usd ' +
    'styczen stycznia luty lutego marzec marca kwiecien kwietnia maj maja czerwiec czerwca lipiec lipca sierpien sierpnia wrzesien wrzesnia ' +
    'pazdziernik pazdziernika listopad listopada grudzien grudnia'
  ).split(' ')
)

/** A word no counterparty is told by (`GENERIC`), a number or a word of one or two letters. */
export const isGenericWord = (word: string): boolean => word.replace(/[^a-z?]/g, '').length < 3 || GENERIC.has(word)

/**
 * A kind of place or institution („pracownia”, „szkola”, „klub”): it says what, not which – no similar names are told
 * by it (1.2.3), though it may well be a keyword of the user's.
 */
const KINDS = new Set(
  (
    'pracownia pralnia szkola fundacja stowarzyszenie przedszkole urzad poczta biuro agencja instytut akademia uniwersytet ' +
    'politechnika spoldzielnia wspolnota parafia klub osrodek zespol bank lokal przedsiebiorstwo zaklady uslug internetowy'
  ).split(' ')
)
export const isKindWord = (word: string): boolean => KINDS.has(word)

/** The first keyword of `KEYWORDS` in the words of a name or a title, and where (`at`, `length` words – „weterynaryjna”). */
export function keywordIn(ws: readonly string[]): { keyword: Keyword; at: number; length: number } | null {
  for (const k of KEYWORD_PATTERNS)
    for (const p of k.patterns) {
      const at = find(ws, p)
      if (at >= 0) return { keyword: k.keyword, at, length: p.words.length }
    }
  return null
}

// ------------------------------------------------------------------ the brand key

/** Cities and towns a shop's name carries („DINO JELENIA GORA 4”): the 100 biggest and resorts, folded. */
const CITIES = [
  'warszawa', 'krakow', 'lodz', 'wroclaw', 'poznan', 'gdansk', 'szczecin', 'bydgoszcz', 'lublin', 'bialystok', 'katowice',
  'gdynia', 'czestochowa', 'radom', 'rzeszow', 'torun', 'sosnowiec', 'kielce', 'gliwice', 'olsztyn', 'zabrze', 'bielsko biala',
  'bytom', 'zielona gora', 'rybnik', 'ruda slaska', 'opole', 'tychy', 'gorzow wielkopolski', 'elblag', 'plock', 'dabrowa gornicza',
  'walbrzych', 'wloclawek', 'tarnow', 'chorzow', 'koszalin', 'kalisz', 'legnica', 'grudziadz', 'jaworzno', 'slupsk',
  'jastrzebie zdroj', 'nowy sacz', 'jelenia gora', 'siedlce', 'myslowice', 'konin', 'piotrkow trybunalski', 'inowroclaw', 'lubin',
  'ostrow wielkopolski', 'suwalki', 'stargard', 'gniezno', 'ostrowiec swietokrzyski', 'siemianowice slaskie', 'glogow', 'pabianice',
  'leszno', 'zamosc', 'lomza', 'zory', 'pruszkow', 'tomaszow mazowiecki', 'chelm', 'mielec', 'kedzierzyn kozle', 'przemysl',
  'stalowa wola', 'tczew', 'biala podlaska', 'belchatow', 'swidnica', 'bedzin', 'zgierz', 'piekary slaskie', 'raciborz', 'legionowo',
  'ostroleka', 'swietochlowice', 'wejherowo', 'zawiercie', 'starachowice', 'skierniewice', 'tarnowskie gory', 'pulawy',
  'wodzislaw slaski', 'starogard gdanski', 'kolobrzeg', 'krosno', 'otwock', 'mikolow', 'swinoujscie', 'nysa', 'sopot', 'zakopane',
  'karpacz', 'szklarska poreba', 'ustka', 'leba', 'miedzyzdroje', 'wladyslawowo', 'augustow', 'gizycko', 'mikolajki', 'krynica zdroj',
  'krynica', 'szczyrk', 'ustron', 'polanica zdroj', 'kudowa zdroj', 'swieradow zdroj', 'boleslawiec', 'zgorzelec', 'klodzko',
  'oswiecim', 'wieliczka', 'piaseczno', 'grodzisk mazowiecki', 'minsk mazowiecki', 'sochaczew'
].map(pattern)

/** A country at the end of a name („SHOP PL”). */
const COUNTRY = new Set(['pl', 'pol', 'polska', 'poland'])

/** Card processors and platforms written before the shop („SumUp *PRACOWNIA”, „PAYPRO SA *ALLEGRO”, „GOOGLE *YouTube”). */
const PROCESSOR = /^(sumup|paypro|payu|paypal|przelewy24|p24|dotpay|tpay|sq|iz|izettle|zettle|stripe|google|int|zen|mypos|revolut)\s*\*\s*/
const PROCESSOR_WRITTEN = new RegExp(PROCESSOR.source, 'i')

/** A name as written without the card processor before the shop („SumUp *PRACOWNIA” → „PRACOWNIA”). */
export const withoutProcessor = (name: string): string => name.trim().replace(PROCESSOR_WRITTEN, '')
/** „SP FLARE AUDIO”: a Shopify shop. */
const SHOPIFY = /^sp (?=[a-z?]{2})/
const WWW = /(^|[^a-z0-9])www\./g
const DOMAIN = /\.(pl|com|eu|net|org|co|io|de|uk|app|shop|store|me|tv|fm|gg|info|biz)(?=$|[^a-z0-9])/g

export interface BrandMatch {
  /** The key the import groups and remembers by: the chain's id, else the name without its city, numbers and processor. */
  key: string
  /** The chain of the dictionary; null = not one of them. */
  brand: Brand | null
  /** The words the key is made of (a name outside the dictionary; none for a chain): what similar names compare (1.2.2). */
  words: string[]
}

const CITY_WORD_MEMO = new Map<string, boolean>()

/** A word of a city's name („nowy”, „sacz”, „zdroj”): never a keyword of its own (1.2.2). */
export function isCityWord(word: string): boolean {
  let hit = CITY_WORD_MEMO.get(word)
  if (hit === undefined) CITY_WORD_MEMO.set(word, (hit = CITIES.some((p) => p.words.some((w) => sameWord(word, w, false)))))
  return hit
}

/** The words of a name without the cities in it – unless nothing would be left. */
function withoutCities(ws: readonly string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < ws.length; ) {
    // The longest city at this word („krynica zdroj” before „krynica”).
    let skip = 0
    for (const p of CITIES) if (p.words.length > skip && i + p.words.length <= ws.length && p.words.every((w, j) => sameWord(ws[i + j]!, w, false))) skip = p.words.length
    if (skip) i += skip
    else out.push(ws[i++]!)
  }
  return out.some((w) => /[a-z]{2}/.test(w)) ? out : [...ws]
}

/**
 * The brand of a counterparty's name. `dictionary` false = only the cleaned name (a person paid by BLIK P2P, an ATM
 * in a shop); `transfer` = the name of a transfer's other side, often a person: a chain only at the start of the
 * name („PGE OBRÓT”, not „ANNA BIEDRONKA”), and no city is cut („JAN KALISZ” is not „JAN KONIN”). The bank's additions
 * (a date of the transaction, the town after „/” – `cleanBankName`) are no part of it, unless `raw` (the key versions
 * before 1.2.3 made – their rules still decide).
 */
export function brandOf(name: string, opts: { dictionary?: boolean; transfer?: boolean; raw?: boolean } = {}): BrandMatch {
  // The town after „/” of a shop's name (not of a transfer's side, not of a person paid by BLIK).
  const shop = !opts.transfer && opts.dictionary !== false
  const cleaned = withoutLegalForms(fold(opts.raw ? name : cleanBankName(name, { town: shop }))).trim().replace(WWW, '$1').replace(DOMAIN, ' ').replace(PROCESSOR, '').replace(SHOPIFY, '')
  const ws = words(cleaned)
  if (opts.dictionary !== false)
    for (const b of BRAND_PATTERNS) if (b.patterns.some((p) => find(ws, opts.transfer ? { ...p, start: true } : p) >= 0)) return { key: b.brand.id, brand: b.brand, words: [] }
  let rest = opts.transfer ? [...ws] : withoutCities(ws)
  while (rest.length > 1 && COUNTRY.has(rest.at(-1)!)) rest = rest.slice(0, -1)
  const kept = rest.filter((w) => !/^\d+$/.test(w) && !STORE_CODE.test(w))
  const key = kept.join('').replace(/[^a-z0-9]/g, '')
  return key ? { key, brand: null, words: kept } : { key: counterpartyKey(name, opts.raw), brand: null, words: [] }
}
