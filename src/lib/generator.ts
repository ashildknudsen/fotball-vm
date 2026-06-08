import { grupper, lagIGruppe, sluttspill } from "@/data/turnering";
import {
  type TippData,
  deltakerePåKamp,
  gyldigeTreereForKamp,
  sanérTipp,
  treerPlasser,
} from "@/lib/tipp";

// Genererer en komplett tippekupong. `nøkkel` gir hvert lag et tall som
// avgjør hvem som vinner – jo høyere, jo bedre. Funksjonen kalles på nytt
// for hvert valg, så den må inneholde tilfeldighet (slik blir to kjøringer
// aldri like).
function generer(nøkkel: (lagId: string) => number): TippData {
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

  // Gruppespill: sorter lagene etter nøkkel, topp 2 går videre.
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

// Helt tilfeldig oppsett – ren slump, ranking ignoreres.
export function genererTilfeldig(): TippData {
  return generer(() => Math.random());
}

// Oppsett basert på FIFA-ranking, med additiv slump (±150 poeng) så det blir
// rom for overraskelser uten at favorittene drukner.
export function genererFraRanking(): TippData {
  return generer(
    (id) => (fifaPoeng[id] ?? 1300) + (Math.random() - 0.5) * 300,
  );
}

// Offisiell FIFA/Coca-Cola World Ranking per 1. april 2026 (poeng).
const fifaPoeng: Record<string, number> = {
  // Gruppe A
  mexico: 1687.48, "sor-korea": 1591.63, tsjekkia: 1505.74, "sor-afrika": 1428.38,
  // Gruppe B
  canada: 1559.48, qatar: 1450.31, sveits: 1650.06, "bosnia-hercegovina": 1387.22,
  // Gruppe C
  brasil: 1765.86, haiti: 1293.10, skottland: 1503.34, marokko: 1755.10,
  // Gruppe D
  usa: 1671.23, paraguay: 1505.35, australia: 1579.34, tyrkia: 1605.73,
  // Gruppe E
  tyskland: 1735.77, curacao: 1294.77, elfenbenskysten: 1540.87, ecuador: 1598.52,
  // Gruppe F
  nederland: 1751.10, japan: 1661.58, sverige: 1509.79, tunisia: 1476.41,
  // Gruppe G
  belgia: 1742.24, egypt: 1562.37, iran: 1619.58, "new-zealand": 1275.58,
  // Gruppe H
  spania: 1873.01, "kapp-verde": 1371.11, "saudi-arabia": 1421.54, uruguay: 1673.07,
  // Gruppe I
  frankrike: 1869.43, senegal: 1686.41, irak: 1451.15, norge: 1557.44,
  // Gruppe J
  argentina: 1876.12, algerie: 1571.03, osterrike: 1597.40, jordan: 1387.74,
  // Gruppe K
  portugal: 1766.18, "dr-kongo": 1479.68, usbekistan: 1461.21, colombia: 1698.35,
  // Gruppe L
  england: 1827.05, kroatia: 1714.87, ghana: 1346.88, panama: 1539.16,
};
