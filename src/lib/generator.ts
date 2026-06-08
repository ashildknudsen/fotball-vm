import { grupper, lagIGruppe, sluttspill } from "@/data/turnering";
import {
  type TippData,
  deltakerePåKamp,
  gyldigeTreereForKamp,
  sanérTipp,
  treerPlasser,
} from "@/lib/tipp";

// Genererer en komplett tippekupong. `verdi` gir hvert lag en "styrke";
// hvert valg får i tillegg en tilfeldig slump, så to kjøringer aldri blir like.
function generer(verdi: (lagId: string) => number): TippData {
  // Tilfeldig nøkkel per lag: styrke ganget med en slump i [0.5, 1.5].
  const nøkkel = (lagId: string) => verdi(lagId) * (0.5 + Math.random());

  const velgHøyeste = (ider: string[]): string => {
    let beste = ider[0];
    let besteNøkkel = nøkkel(beste);
    for (const id of ider.slice(1)) {
      const k = nøkkel(id);
      if (k > besteNøkkel) {
        beste = id;
        besteNøkkel = k;
      }
    }
    return beste;
  };

  const tipp: TippData = { gruppe: {}, treere: {}, vinnere: {} };

  // Gruppespill: sorter lagene etter tilfeldig nøkkel, topp 2 går videre.
  for (const gruppe of grupper) {
    const sortert = lagIGruppe(gruppe)
      .map((l) => ({ id: l.id, k: nøkkel(l.id) }))
      .sort((a, b) => b.k - a.k);
    tipp.gruppe![gruppe] = { vinner: sortert[0].id, toer: sortert[1].id };
  }

  // Treer-plasser: velg ett gyldig (ubrukt) lag per plass.
  const brukteTreere = new Set<string>();
  for (const plass of treerPlasser()) {
    const kandidater = gyldigeTreereForKamp(plass.nummer, tipp).filter(
      (id) => !brukteTreere.has(id),
    );
    if (kandidater.length === 0) continue;
    const valgt = velgHøyeste(kandidater);
    tipp.treere![String(plass.nummer)] = valgt;
    brukteTreere.add(valgt);
  }

  // Sluttspill: velg vinner i hver kamp (i rekkefølge, så senere kamper løses).
  for (const kamp of sluttspill) {
    const { hjemme, borte } = deltakerePåKamp(kamp.nummer, tipp);
    if (!hjemme || !borte) continue;
    tipp.vinnere![String(kamp.nummer)] = velgHøyeste([hjemme, borte]);
  }

  return sanérTipp(tipp);
}

// Helt tilfeldig oppsett (alle lag like sterke – ren slump).
export function genererTilfeldig(): TippData {
  return generer(() => 1);
}

// Oppsett basert på (omtrentlig) FIFA-ranking, med tilfeldig slump.
export function genererFraRanking(): TippData {
  return generer((id) => fifaStyrke[id] ?? 50);
}

// Omtrentlig styrke per lag basert på FIFA-ranking (høyere = sterkere).
// Trenger ikke være helt presist – brukes bare til å vekte generatoren.
const fifaStyrke: Record<string, number> = {
  // Gruppe A
  mexico: 72, "sor-korea": 64, tsjekkia: 66, "sor-afrika": 50,
  // Gruppe B
  canada: 62, qatar: 52, sveits: 78, "bosnia-hercegovina": 58,
  // Gruppe C
  brasil: 93, haiti: 30, skottland: 60, marokko: 80,
  // Gruppe D
  usa: 70, paraguay: 56, australia: 63, tyrkia: 68,
  // Gruppe E
  tyskland: 86, curacao: 28, elfenbenskysten: 65, ecuador: 69,
  // Gruppe F
  nederland: 90, japan: 74, sverige: 61, tunisia: 59,
  // Gruppe G
  belgia: 88, egypt: 67, iran: 66, "new-zealand": 40,
  // Gruppe H
  spania: 96, "kapp-verde": 35, "saudi-arabia": 48, uruguay: 81,
  // Gruppe I
  frankrike: 97, senegal: 76, irak: 45, norge: 73,
  // Gruppe J
  argentina: 98, algerie: 64, osterrike: 71, jordan: 42,
  // Gruppe K
  portugal: 92, "dr-kongo": 54, usbekistan: 49, colombia: 79,
  // Gruppe L
  england: 94, kroatia: 82, ghana: 62, panama: 44,
};
