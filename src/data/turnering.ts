// Turneringsdata for Fotball-VM 2026 (USA, Canada, Mexico).
// Grupper og lag er bekreftet mot NRK og Eurosport. Sluttspill-stigen
// (kamp 73-104) følger FIFAs offisielle oppsett.

export type Gruppe =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type Lag = {
  id: string;
  navn: string;
  flagg: string;
  gruppe: Gruppe;
};

export const grupper: Gruppe[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

export const lag: Lag[] = [
  // Gruppe A
  { id: "mexico", navn: "Mexico", flagg: "🇲🇽", gruppe: "A" },
  { id: "sor-korea", navn: "Sør-Korea", flagg: "🇰🇷", gruppe: "A" },
  { id: "tsjekkia", navn: "Tsjekkia", flagg: "🇨🇿", gruppe: "A" },
  { id: "sor-afrika", navn: "Sør-Afrika", flagg: "🇿🇦", gruppe: "A" },
  // Gruppe B
  { id: "canada", navn: "Canada", flagg: "🇨🇦", gruppe: "B" },
  { id: "qatar", navn: "Qatar", flagg: "🇶🇦", gruppe: "B" },
  { id: "sveits", navn: "Sveits", flagg: "🇨🇭", gruppe: "B" },
  { id: "bosnia-hercegovina", navn: "Bosnia-Hercegovina", flagg: "🇧🇦", gruppe: "B" },
  // Gruppe C
  { id: "brasil", navn: "Brasil", flagg: "🇧🇷", gruppe: "C" },
  { id: "haiti", navn: "Haiti", flagg: "🇭🇹", gruppe: "C" },
  { id: "skottland", navn: "Skottland", flagg: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", gruppe: "C" },
  { id: "marokko", navn: "Marokko", flagg: "🇲🇦", gruppe: "C" },
  // Gruppe D
  { id: "usa", navn: "USA", flagg: "🇺🇸", gruppe: "D" },
  { id: "paraguay", navn: "Paraguay", flagg: "🇵🇾", gruppe: "D" },
  { id: "australia", navn: "Australia", flagg: "🇦🇺", gruppe: "D" },
  { id: "tyrkia", navn: "Tyrkia", flagg: "🇹🇷", gruppe: "D" },
  // Gruppe E
  { id: "tyskland", navn: "Tyskland", flagg: "🇩🇪", gruppe: "E" },
  { id: "curacao", navn: "Curaçao", flagg: "🇨🇼", gruppe: "E" },
  { id: "elfenbenskysten", navn: "Elfenbenskysten", flagg: "🇨🇮", gruppe: "E" },
  { id: "ecuador", navn: "Ecuador", flagg: "🇪🇨", gruppe: "E" },
  // Gruppe F
  { id: "nederland", navn: "Nederland", flagg: "🇳🇱", gruppe: "F" },
  { id: "japan", navn: "Japan", flagg: "🇯🇵", gruppe: "F" },
  { id: "sverige", navn: "Sverige", flagg: "🇸🇪", gruppe: "F" },
  { id: "tunisia", navn: "Tunisia", flagg: "🇹🇳", gruppe: "F" },
  // Gruppe G
  { id: "belgia", navn: "Belgia", flagg: "🇧🇪", gruppe: "G" },
  { id: "egypt", navn: "Egypt", flagg: "🇪🇬", gruppe: "G" },
  { id: "iran", navn: "Iran", flagg: "🇮🇷", gruppe: "G" },
  { id: "new-zealand", navn: "New Zealand", flagg: "🇳🇿", gruppe: "G" },
  // Gruppe H
  { id: "spania", navn: "Spania", flagg: "🇪🇸", gruppe: "H" },
  { id: "kapp-verde", navn: "Kapp Verde", flagg: "🇨🇻", gruppe: "H" },
  { id: "saudi-arabia", navn: "Saudi-Arabia", flagg: "🇸🇦", gruppe: "H" },
  { id: "uruguay", navn: "Uruguay", flagg: "🇺🇾", gruppe: "H" },
  // Gruppe I
  { id: "frankrike", navn: "Frankrike", flagg: "🇫🇷", gruppe: "I" },
  { id: "senegal", navn: "Senegal", flagg: "🇸🇳", gruppe: "I" },
  { id: "irak", navn: "Irak", flagg: "🇮🇶", gruppe: "I" },
  { id: "norge", navn: "Norge", flagg: "🇳🇴", gruppe: "I" },
  // Gruppe J
  { id: "argentina", navn: "Argentina", flagg: "🇦🇷", gruppe: "J" },
  { id: "algerie", navn: "Algerie", flagg: "🇩🇿", gruppe: "J" },
  { id: "osterrike", navn: "Østerrike", flagg: "🇦🇹", gruppe: "J" },
  { id: "jordan", navn: "Jordan", flagg: "🇯🇴", gruppe: "J" },
  // Gruppe K
  { id: "portugal", navn: "Portugal", flagg: "🇵🇹", gruppe: "K" },
  { id: "dr-kongo", navn: "DR Kongo", flagg: "🇨🇩", gruppe: "K" },
  { id: "usbekistan", navn: "Usbekistan", flagg: "🇺🇿", gruppe: "K" },
  { id: "colombia", navn: "Colombia", flagg: "🇨🇴", gruppe: "K" },
  // Gruppe L
  { id: "england", navn: "England", flagg: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", gruppe: "L" },
  { id: "kroatia", navn: "Kroatia", flagg: "🇭🇷", gruppe: "L" },
  { id: "ghana", navn: "Ghana", flagg: "🇬🇭", gruppe: "L" },
  { id: "panama", navn: "Panama", flagg: "🇵🇦", gruppe: "L" },
];

export function lagIGruppe(gruppe: Gruppe): Lag[] {
  return lag.filter((l) => l.gruppe === gruppe);
}

export function finnLag(id: string): Lag | undefined {
  return lag.find((l) => l.id === id);
}

// --- Sluttspill ---

export type RundeType =
  | "16-delsfinale"
  | "8-delsfinale"
  | "kvartfinale"
  | "semifinale"
  | "bronsefinale"
  | "finale";

// En plass i sluttspillet refererer enten til en gruppeplassering,
// en av de 8 beste treerne (med tillatte grupper), eller vinner/taper
// av en tidligere sluttspillkamp.
export type Plassreferanse =
  | { type: "gruppe"; plassering: 1 | 2; gruppe: Gruppe }
  | { type: "treer"; muligeGrupper: Gruppe[] }
  | { type: "vinner"; kamp: number }
  | { type: "taper"; kamp: number };

export type Sluttspillkamp = {
  nummer: number;
  runde: RundeType;
  hjemme: Plassreferanse;
  borte: Plassreferanse;
};

const g = (plassering: 1 | 2, gruppe: Gruppe): Plassreferanse => ({
  type: "gruppe",
  plassering,
  gruppe,
});
const treer = (...muligeGrupper: Gruppe[]): Plassreferanse => ({
  type: "treer",
  muligeGrupper,
});
const v = (kamp: number): Plassreferanse => ({ type: "vinner", kamp });
const t = (kamp: number): Plassreferanse => ({ type: "taper", kamp });

export const sluttspill: Sluttspillkamp[] = [
  // 16-delsfinale (kamp 73-88)
  { nummer: 73, runde: "16-delsfinale", hjemme: g(2, "A"), borte: g(2, "B") },
  { nummer: 74, runde: "16-delsfinale", hjemme: g(1, "E"), borte: treer("A", "B", "C", "D", "F") },
  { nummer: 75, runde: "16-delsfinale", hjemme: g(1, "F"), borte: g(2, "C") },
  { nummer: 76, runde: "16-delsfinale", hjemme: g(1, "C"), borte: g(2, "F") },
  { nummer: 77, runde: "16-delsfinale", hjemme: g(1, "I"), borte: treer("C", "D", "F", "G", "H") },
  { nummer: 78, runde: "16-delsfinale", hjemme: g(2, "E"), borte: g(2, "I") },
  { nummer: 79, runde: "16-delsfinale", hjemme: g(1, "A"), borte: treer("C", "E", "F", "H", "I") },
  { nummer: 80, runde: "16-delsfinale", hjemme: g(1, "L"), borte: treer("E", "H", "I", "J", "K") },
  { nummer: 81, runde: "16-delsfinale", hjemme: g(1, "D"), borte: treer("B", "E", "F", "I", "J") },
  { nummer: 82, runde: "16-delsfinale", hjemme: g(1, "G"), borte: treer("A", "E", "H", "I", "J") },
  { nummer: 83, runde: "16-delsfinale", hjemme: g(2, "K"), borte: g(2, "L") },
  { nummer: 84, runde: "16-delsfinale", hjemme: g(1, "H"), borte: g(2, "J") },
  { nummer: 85, runde: "16-delsfinale", hjemme: g(1, "B"), borte: treer("E", "F", "G", "I", "J") },
  { nummer: 86, runde: "16-delsfinale", hjemme: g(1, "J"), borte: g(2, "H") },
  { nummer: 87, runde: "16-delsfinale", hjemme: g(1, "K"), borte: treer("D", "E", "I", "J", "L") },
  { nummer: 88, runde: "16-delsfinale", hjemme: g(2, "D"), borte: g(2, "G") },

  // 8-delsfinale (kamp 89-96)
  { nummer: 89, runde: "8-delsfinale", hjemme: v(73), borte: v(75) },
  { nummer: 90, runde: "8-delsfinale", hjemme: v(74), borte: v(77) },
  { nummer: 91, runde: "8-delsfinale", hjemme: v(76), borte: v(78) },
  { nummer: 92, runde: "8-delsfinale", hjemme: v(79), borte: v(80) },
  { nummer: 93, runde: "8-delsfinale", hjemme: v(83), borte: v(84) },
  { nummer: 94, runde: "8-delsfinale", hjemme: v(81), borte: v(82) },
  { nummer: 95, runde: "8-delsfinale", hjemme: v(86), borte: v(88) },
  { nummer: 96, runde: "8-delsfinale", hjemme: v(85), borte: v(87) },

  // Kvartfinale (kamp 97-100)
  { nummer: 97, runde: "kvartfinale", hjemme: v(89), borte: v(90) },
  { nummer: 98, runde: "kvartfinale", hjemme: v(93), borte: v(94) },
  { nummer: 99, runde: "kvartfinale", hjemme: v(91), borte: v(92) },
  { nummer: 100, runde: "kvartfinale", hjemme: v(95), borte: v(96) },

  // Semifinale (kamp 101-102)
  { nummer: 101, runde: "semifinale", hjemme: v(97), borte: v(98) },
  { nummer: 102, runde: "semifinale", hjemme: v(99), borte: v(100) },

  // Bronsefinale (kamp 103)
  { nummer: 103, runde: "bronsefinale", hjemme: t(101), borte: t(102) },

  // Finale (kamp 104)
  { nummer: 104, runde: "finale", hjemme: v(101), borte: v(102) },
];

export function finnKamp(nummer: number): Sluttspillkamp | undefined {
  return sluttspill.find((k) => k.nummer === nummer);
}

// Poeng per riktig tippet lag, mer jo lenger ut i sluttspillet.
export const poengPerRunde: Record<RundeType | "gruppe", number> = {
  gruppe: 1, // riktig lag videre fra gruppespill (1.- eller 2.-plass)
  "16-delsfinale": 2,
  "8-delsfinale": 3,
  kvartfinale: 5,
  semifinale: 8,
  bronsefinale: 10,
  finale: 15,
};

// Bonus per lag man har riktig i finalen (opptil to lag).
export const finalistBonus = 5;
