import "server-only";

import { type Gruppe, grupper, sluttspill } from "@/data/turnering";
import { type GruppeTipp, type TippData, deltakerePåKamp } from "@/lib/tipp";
import {
  type ApiGruppetabell,
  type ApiKamp,
} from "@/lib/resultater/footballData";
import { finnLagId } from "@/lib/resultater/lagnavn";

type KnockoutKamp = {
  id: number;
  homeId: string | null;
  awayId: string | null;
  vinnerId: string | null;
  dato: string;
};

export type ByggResultat = {
  fasit: TippData;
  logg: string[];
};

function gruppebokstav(apiGruppe: string | null): Gruppe | null {
  if (!apiGruppe) return null;
  const b = apiGruppe.replace(/^GROUP_?/i, "").trim().toUpperCase();
  return (grupper as string[]).includes(b) ? (b as Gruppe) : null;
}

// Utleder en fasit-kupong fra API-ets tabeller og kamper. Setter kun det som
// trygt kan utledes – resten lar vi være (admin kan fylle inn manuelt).
export function byggFasit(
  tabeller: ApiGruppetabell[],
  kamper: ApiKamp[],
): ByggResultat {
  const logg: string[] = [];
  const fasit: TippData = { gruppe: {}, vinnere: {} };

  // Forbered alle knockout-kamper der begge lag er kjent (sortert på dato).
  const knockout: KnockoutKamp[] = kamper
    .filter((k) => k.stage && k.stage.toUpperCase() !== "GROUP_STAGE")
    .map((k) => {
      const homeId = finnLagId(k.homeTeam.name, k.homeTeam.shortName);
      const awayId = finnLagId(k.awayTeam.name, k.awayTeam.shortName);
      const vinnerId =
        k.status === "FINISHED" && k.score.winner === "HOME_TEAM"
          ? homeId
          : k.status === "FINISHED" && k.score.winner === "AWAY_TEAM"
            ? awayId
            : null;
      return { id: k.id, homeId, awayId, vinnerId, dato: k.utcDate };
    })
    .filter((k) => k.homeId && k.awayId)
    .sort((a, b) => a.dato.localeCompare(b.dato));

  // Lag som er med i sluttspillet (brukes til å se hvilke treere gikk videre).
  const iSluttspill = new Set<string>();
  for (const k of knockout) {
    if (k.homeId) iSluttspill.add(k.homeId);
    if (k.awayId) iSluttspill.add(k.awayId);
  }

  // 1) Gruppespill: 1.- og 2.-plass, samt treer (3.-plass som gikk videre).
  for (const tabell of tabeller) {
    const gruppe = gruppebokstav(tabell.group);
    if (!gruppe) continue;
    const sortert = [...tabell.table].sort((a, b) => a.position - b.position);
    const vinner = finnLagId(sortert[0]?.team.name, sortert[0]?.team.shortName);
    const toer = finnLagId(sortert[1]?.team.name, sortert[1]?.team.shortName);
    const treer = finnLagId(sortert[2]?.team.name, sortert[2]?.team.shortName);
    if (vinner && toer) {
      const g: GruppeTipp = { vinner, toer };
      if (treer && iSluttspill.has(treer)) g.treer = treer;
      fasit.gruppe![gruppe] = g;
    }
  }

  // 2) Sluttspill-vinnere. Treer-kamper løses via gruppevinneren (hjemmelaget),
  // siden treernes eksakte plass-tildeling ikke trengs for å finne vinneren.
  const brukt = new Set<number>();
  for (const kamp of sluttspill) {
    const { hjemme, borte } = deltakerePåKamp(kamp.nummer, fasit);
    const erTreer = kamp.borte.type === "treer";

    let m: KnockoutKamp | undefined;
    if (erTreer) {
      if (!hjemme) continue;
      m = knockout.find(
        (k) => !brukt.has(k.id) && (k.homeId === hjemme || k.awayId === hjemme),
      );
    } else {
      if (!hjemme || !borte) continue;
      m = knockout.find(
        (k) =>
          !brukt.has(k.id) &&
          ((k.homeId === hjemme && k.awayId === borte) ||
            (k.homeId === borte && k.awayId === hjemme)),
      );
    }
    if (!m) continue;
    brukt.add(m.id);
    if (m.vinnerId) fasit.vinnere![String(kamp.nummer)] = m.vinnerId;
  }

  const antallTreere = Object.values(fasit.gruppe!).filter(
    (g) => g?.treer,
  ).length;
  logg.push(`Grupper utledet: ${Object.keys(fasit.gruppe!).length}/12`);
  logg.push(`Treere utledet: ${antallTreere}/8`);
  logg.push(
    `Sluttspill-vinnere utledet: ${Object.keys(fasit.vinnere!).length}/${sluttspill.length}`,
  );

  return { fasit, logg };
}
