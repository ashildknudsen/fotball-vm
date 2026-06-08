import { lag } from "@/data/turnering";

// Kobler lagnavn fra openfootball (engelske navn) til våre lag-IDer.
// Vi normaliserer bort store/små bokstaver, aksenter og spesialtegn, og
// matcher mot en liste aliaser + det norske navnet vårt.

const aliaser: Record<string, string[]> = {
  mexico: ["mexico"],
  "sor-korea": ["south korea", "korea republic", "republic of korea", "korea"],
  tsjekkia: ["czech republic", "czechia"],
  "sor-afrika": ["south africa"],
  canada: ["canada"],
  qatar: ["qatar"],
  sveits: ["switzerland"],
  "bosnia-hercegovina": ["bosnia and herzegovina", "bosnia herzegovina"],
  brasil: ["brazil"],
  haiti: ["haiti"],
  skottland: ["scotland"],
  marokko: ["morocco"],
  usa: ["united states", "usa", "united states of america", "us"],
  paraguay: ["paraguay"],
  australia: ["australia"],
  tyrkia: ["turkey", "turkiye"],
  tyskland: ["germany"],
  curacao: ["curacao"],
  elfenbenskysten: ["ivory coast", "cote divoire", "cote d ivoire"],
  ecuador: ["ecuador"],
  nederland: ["netherlands", "holland"],
  japan: ["japan"],
  sverige: ["sweden"],
  tunisia: ["tunisia"],
  belgia: ["belgium"],
  egypt: ["egypt"],
  iran: ["iran", "ir iran", "islamic republic of iran"],
  "new-zealand": ["new zealand"],
  spania: ["spain"],
  "kapp-verde": ["cape verde", "cabo verde"],
  "saudi-arabia": ["saudi arabia"],
  uruguay: ["uruguay"],
  frankrike: ["france"],
  senegal: ["senegal"],
  irak: ["iraq"],
  norge: ["norway"],
  argentina: ["argentina"],
  algerie: ["algeria"],
  osterrike: ["austria"],
  jordan: ["jordan"],
  portugal: ["portugal"],
  "dr-kongo": [
    "dr congo",
    "congo dr",
    "democratic republic of congo",
    "congo democratic republic",
    "drc",
  ],
  usbekistan: ["uzbekistan"],
  colombia: ["colombia"],
  england: ["england"],
  kroatia: ["croatia"],
  ghana: ["ghana"],
  panama: ["panama"],
};

function normaliser(tekst: string): string {
  return tekst
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Oppslagstabell: normalisert navn -> lag-id. Bygges én gang.
const oppslag = new Map<string, string>();
for (const l of lag) {
  oppslag.set(normaliser(l.navn), l.id);
  for (const alias of aliaser[l.id] ?? []) {
    oppslag.set(normaliser(alias), l.id);
  }
}

// Finner lag-id fra ett eller flere mulige navn (f.eks. name + shortName).
// Returnerer null hvis ingen match – da hopper vi heller over enn å gjette.
export function finnLagId(
  ...kandidater: (string | null | undefined)[]
): string | null {
  for (const kandidat of kandidater) {
    if (!kandidat) continue;
    const treff = oppslag.get(normaliser(kandidat));
    if (treff) return treff;
  }
  return null;
}
