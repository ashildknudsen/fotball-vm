import "server-only";

// Resultatkilde: ESPN Public API (uten autentisering).
// Byttet fra football-data.org 2026-06-27: football-data.org returnerte null for
// begge lag i alle 32 knockout-kamper etter at gruppespillet ble avsluttet.
// ESPN har korrekte lag og tidspunkter for hele turneringen, uten nøkkel.

const BASE_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const BASE_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";
const LEAGUE = "fifa.world";

// ── Interne (kilde-uavhengige) typer ──
export type ApiLag = {
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
};

export type ApiKamp = {
  id: number;
  stage: string; // "GROUP_STAGE" eller en sluttspill-runde
  group: string | null;
  status: string; // "FINISHED" når kampen er ferdig
  utcDate: string;
  homeTeam: ApiLag;
  awayTeam: ApiLag;
  score: { winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null };
};

export type ApiTabellrad = {
  position: number;
  team: ApiLag;
  poeng: number;
  mf: number;
  scoret: number;
  spilt: number;
};
export type ApiGruppetabell = { group: string | null; table: ApiTabellrad[] };

// ── Rå ESPN-typer (kun det vi bruker) ──
type EspnCompetitor = {
  homeAway: "home" | "away";
  winner?: boolean | null;
  team: { displayName: string; shortDisplayName?: string; abbreviation?: string };
};
type EspnCompetition = {
  status: { type: { name: string; completed: boolean } };
  competitors: EspnCompetitor[];
};
type EspnEvent = {
  id: string;
  date: string;
  season: { slug: string } | null;
  competitions: EspnCompetition[];
};
type EspnStandingEntry = {
  team: { displayName: string; abbreviation?: string };
  stats: Array<{ name: string; value: number | null }>;
};
type EspnGroup = {
  abbreviation: string;
  standings: { entries: EspnStandingEntry[] };
};

function getStat(
  stats: Array<{ name: string; value: number | null }>,
  name: string,
): number {
  return stats.find((s) => s.name === name)?.value ?? 0;
}

async function hent<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN svarte ${res.status} for ${url}`);
  return (await res.json()) as T;
}

export async function hentVMKamper(): Promise<ApiKamp[]> {
  // Henter knockout-kamper for VM 2026 (fra 28. juni og ut turneringen).
  const url = `${BASE_SITE}/${LEAGUE}/scoreboard?dates=20260628-20260719&limit=200`;
  const data = await hent<{ events: EspnEvent[] }>(url);

  return (data.events ?? []).map((e) => {
    const comp = e.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");

    const completed = comp?.status?.type?.completed ?? false;

    let winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null = null;
    if (completed) {
      if (home?.winner === true) winner = "HOME_TEAM";
      else if (away?.winner === true) winner = "AWAY_TEAM";
      else winner = "DRAW";
    }

    // Konverter ESPN season slug til stage-streng. Viktig: alt unntatt
    // "GROUP_STAGE" behandles som knockout av byggFasit.ts.
    const slug = e.season?.slug ?? "unknown";
    const stage = slug.toUpperCase().replace(/-/g, "_"); // "ROUND_OF_32" osv.

    return {
      id: parseInt(e.id, 10),
      stage,
      group: null,
      status: completed ? "FINISHED" : "TIMED",
      utcDate: e.date,
      homeTeam: {
        name: home?.team?.displayName ?? null,
        shortName: home?.team?.shortDisplayName ?? null,
        tla: home?.team?.abbreviation ?? null,
      },
      awayTeam: {
        name: away?.team?.displayName ?? null,
        shortName: away?.team?.shortDisplayName ?? null,
        tla: away?.team?.abbreviation ?? null,
      },
      score: { winner },
    };
  });
}

export async function hentVMTabeller(): Promise<ApiGruppetabell[]> {
  const url = `${BASE_V2}/${LEAGUE}/standings`;
  const data = await hent<{ children: EspnGroup[] }>(url);

  return (data.children ?? []).map((g) => ({
    // "Group A" → gruppebokstav() stripper "Group " og gir "A"
    group: g.abbreviation,
    table: (g.standings?.entries ?? []).map((e, j) => ({
      position: j + 1,
      team: {
        name: e.team?.displayName ?? null,
        shortName: null,
        tla: e.team?.abbreviation ?? null,
      },
      poeng: getStat(e.stats, "points"),
      mf: getStat(e.stats, "pointDifferential"),
      scoret: getStat(e.stats, "pointsFor"),
      spilt: getStat(e.stats, "gamesPlayed"),
    })),
  }));
}

/*
// ── KOMMENTERT UT: football-data.org v4 (byttes til ESPN 2026-06-27) ──
// Årsak: returnerte null for begge lag i alle 32 knockout-kamper etter at
// gruppespillet ble avsluttet. ESPN dekker turneringen korrekt og er gratis.
// Gjenaktiver ved å kommentere inn igjen og oppdatere kallene i oppdater-fasit.

// const BASE_FD = "https://api.football-data.org/v4";
// const VM_FD = "WC";
//
// type RåLag = { name?: string; shortName?: string; tla?: string };
// type RåKamp = {
//   id: number;
//   stage: string;
//   group: string | null;
//   status: string;
//   utcDate: string;
//   homeTeam: RåLag;
//   awayTeam: RåLag;
//   score: { winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null };
// };
// type RåStandingRad = {
//   position: number;
//   team: RåLag;
//   playedGames: number;
//   points: number;
//   goalsFor: number;
//   goalDifference: number;
// };
// type RåStanding = {
//   type?: string;
//   group: string | null;
//   table: RåStandingRad[];
// };
//
// async function hentFD<T>(sti: string): Promise<T> {
//   const nøkkel = process.env.FOOTBALL_DATA_API_KEY;
//   if (!nøkkel) throw new Error("FOOTBALL_DATA_API_KEY mangler.");
//   const res = await fetch(`${BASE_FD}${sti}`, {
//     headers: { "X-Auth-Token": nøkkel },
//     cache: "no-store",
//   });
//   if (!res.ok) throw new Error(`football-data.org svarte ${res.status} for ${sti}`);
//   return (await res.json()) as T;
// }
//
// export async function hentVMKamperFD(): Promise<ApiKamp[]> {
//   const data = await hentFD<{ matches: RåKamp[] }>(`/competitions/${VM_FD}/matches`);
//   return (data.matches ?? []).map((m) => ({
//     id: m.id,
//     stage: m.stage,
//     group: m.group,
//     status: m.status,
//     utcDate: m.utcDate,
//     homeTeam: { name: m.homeTeam?.name, shortName: m.homeTeam?.shortName, tla: m.homeTeam?.tla },
//     awayTeam: { name: m.awayTeam?.name, shortName: m.awayTeam?.shortName, tla: m.awayTeam?.tla },
//     score: { winner: m.score?.winner ?? null },
//   }));
// }
//
// export async function hentVMTabellerFD(): Promise<ApiGruppetabell[]> {
//   const data = await hentFD<{ standings: RåStanding[] }>(`/competitions/${VM_FD}/standings`);
//   return (data.standings ?? [])
//     .filter((s) => s.group && (!s.type || s.type === "TOTAL"))
//     .map((s) => ({
//       group: s.group,
//       table: (s.table ?? []).map((r) => ({
//         position: r.position,
//         team: { name: r.team?.name, shortName: r.team?.shortName, tla: r.team?.tla },
//         poeng: r.points ?? 0,
//         mf: r.goalDifference ?? 0,
//         scoret: r.goalsFor ?? 0,
//         spilt: r.playedGames ?? 0,
//       })),
//     }));
// }
*/