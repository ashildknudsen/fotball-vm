import "server-only";

// Resultatkilde: football-data.org (v4). Ekte API som oppdateres fortløpende.
// Krever miljøvariabelen FOOTBALL_DATA_API_KEY (gratis token).
// Normaliserer svaret til interne typer slik at byggFasit.ts er kilde-uavhengig.

const BASE = "https://api.football-data.org/v4";
const VM = "WC";

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

// ── Rå football-data.org-typer (kun det vi bruker) ──
type RåLag = { name?: string; shortName?: string; tla?: string };
type RåKamp = {
  id: number;
  stage: string;
  group: string | null;
  status: string;
  utcDate: string;
  homeTeam: RåLag;
  awayTeam: RåLag;
  score: { winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null };
};
type RåStandingRad = {
  position: number;
  team: RåLag;
  playedGames: number;
  points: number;
  goalsFor: number;
  goalDifference: number;
};
type RåStanding = {
  type?: string;
  group: string | null;
  table: RåStandingRad[];
};

async function hent<T>(sti: string): Promise<T> {
  const nøkkel = process.env.FOOTBALL_DATA_API_KEY;
  if (!nøkkel) throw new Error("FOOTBALL_DATA_API_KEY mangler.");
  const res = await fetch(`${BASE}${sti}`, {
    headers: { "X-Auth-Token": nøkkel },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data.org svarte ${res.status} for ${sti}`);
  }
  return (await res.json()) as T;
}

export async function hentVMKamper(): Promise<ApiKamp[]> {
  const data = await hent<{ matches: RåKamp[] }>(
    `/competitions/${VM}/matches`,
  );
  return (data.matches ?? []).map((m) => ({
    id: m.id,
    stage: m.stage,
    group: m.group,
    status: m.status,
    utcDate: m.utcDate,
    homeTeam: { name: m.homeTeam?.name, shortName: m.homeTeam?.shortName, tla: m.homeTeam?.tla },
    awayTeam: { name: m.awayTeam?.name, shortName: m.awayTeam?.shortName, tla: m.awayTeam?.tla },
    score: { winner: m.score?.winner ?? null },
  }));
}

export async function hentVMTabeller(): Promise<ApiGruppetabell[]> {
  const data = await hent<{ standings: RåStanding[] }>(
    `/competitions/${VM}/standings`,
  );
  // Bruk gruppetabellene (TOTAL der det finnes en gruppe).
  return (data.standings ?? [])
    .filter((s) => s.group && (!s.type || s.type === "TOTAL"))
    .map((s) => ({
      group: s.group,
      table: (s.table ?? []).map((r) => ({
        position: r.position,
        team: { name: r.team?.name, shortName: r.team?.shortName, tla: r.team?.tla },
        poeng: r.points ?? 0,
        mf: r.goalDifference ?? 0,
        scoret: r.goalsFor ?? 0,
        spilt: r.playedGames ?? 0,
      })),
    }));
}
