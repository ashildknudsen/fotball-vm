import "server-only";

import { type Gruppe, grupper, lagIGruppe, sluttspill } from "@/data/turnering";
import { type TippData, deltakerePåKamp } from "@/lib/tipp";
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
  const fasit: TippData = {
    gruppe: {},
    vinnere: {},
    sluttspilloppsett: {},
    kamptider: {},
    tabeller: {},
  };

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

  // 1) Gruppespill: full tabell per gruppe (alle 4 lag), 1.- og 2.-plass, og
  // de 8 beste treerne ut fra LØPENDE stilling (foreløpig under gruppespillet).
  type TreerKandidat = {
    gruppe: Gruppe;
    lag: string;
    poeng: number;
    mf: number;
    scoret: number;
  };
  const treerKandidater: TreerKandidat[] = [];

  for (const gruppe of grupper) {
    const tabell = tabeller.find((t) => gruppebokstav(t.group) === gruppe);
    // Statistikk per lag fra football-data.org (kun lag som har spilt finnes der).
    const stats = new Map<
      string,
      { poeng: number; mf: number; scoret: number; spilt: number }
    >();
    for (const r of tabell?.table ?? []) {
      const id = finnLagId(r.team.name, r.team.shortName);
      if (id) stats.set(id, { poeng: r.poeng, mf: r.mf, scoret: r.scoret, spilt: r.spilt });
    }

    // Alle 4 lag i gruppa, med stats (0 hvis ikke spilt), sortert.
    const rader = lagIGruppe(gruppe)
      .map((l) => ({
        lag: l.id,
        ...(stats.get(l.id) ?? { poeng: 0, mf: 0, scoret: 0, spilt: 0 }),
      }))
      .sort((a, b) => b.poeng - a.poeng || b.mf - a.mf || b.scoret - a.scoret);

    fasit.tabeller![gruppe] = rader.map((r) => ({
      lag: r.lag,
      poeng: r.poeng,
      mf: r.mf,
      spilt: r.spilt,
    }));

    // Sett 1./2.-plass kun når gruppa har startet (minst én kamp spilt).
    const harSpilt = rader.some((r) => r.spilt > 0);
    if (harSpilt) {
      fasit.gruppe![gruppe] = { vinner: rader[0].lag, toer: rader[1].lag };
      treerKandidater.push({
        gruppe,
        lag: rader[2].lag,
        poeng: rader[2].poeng,
        mf: rader[2].mf,
        scoret: rader[2].scoret,
      });
    }
  }

  // De 8 beste treerne (rangert på tvers av gruppene) markeres som videre.
  treerKandidater
    .sort((a, b) => b.poeng - a.poeng || b.mf - a.mf || b.scoret - a.scoret)
    .slice(0, 8)
    .forEach((k) => {
      const g = fasit.gruppe![k.gruppe];
      if (g) g.treer = k.lag;
    });

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

    // Lagre avsparkstidspunktet, slik at kampen kan låses for tipping når den
    // starter (kampLåst i tipp.ts). Settes så snart begge lag er kjent.
    if (m.dato) fasit.kamptider![String(kamp.nummer)] = m.dato;

    // Lagre den ekte 16-delsfinale-oppstillingen (til seeding av fase 2).
    if (kamp.runde === "16-delsfinale" && m.homeId && m.awayId) {
      fasit.sluttspilloppsett![String(kamp.nummer)] = {
        hjemme: m.homeId,
        borte: m.awayId,
      };
    }
  }

  const antallTreere = Object.values(fasit.gruppe!).filter(
    (g) => g?.treer,
  ).length;
  logg.push(`Grupper utledet: ${Object.keys(fasit.gruppe!).length}/12`);
  logg.push(`Treere utledet: ${antallTreere}/8`);
  logg.push(
    `16-delsfinale-oppstilling: ${Object.keys(fasit.sluttspilloppsett!).length}/16`,
  );
  logg.push(
    `Sluttspill-vinnere utledet: ${Object.keys(fasit.vinnere!).length}/${sluttspill.length}`,
  );

  return { fasit, logg };
}
