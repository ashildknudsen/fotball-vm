import "server-only";

// Klient mot API-FOOTBALL (API-SPORTS, v3). Gratis-tier dekker VM 2026.
// Krever miljøvariabelen API_FOOTBALL_KEY.
//
// Vi normaliserer API-ets svar til et internt format (ApiKamp/ApiGruppetabell)
// slik at byggFasit.ts er uavhengig av hvilken leverandør vi bruker.

const BASE = "https://v3.football.api-sports.io";
const LIGA = process.env.API_FOOTBALL_LIGA ?? "1"; // 1 = World Cup
const SESONG = process.env.API_FOOTBALL_SESONG ?? "2026";

// ── Interne (leverandør-uavhengige) typer ──
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

export type ApiTabellrad = { position: number; team: ApiLag };
export type ApiGruppetabell = { group: string | null; table: ApiTabellrad[] };

// ── Rå API-FOOTBALL-typer (kun det vi bruker) ──
type RåLag = { id: number; name: string; winner: boolean | null };
type RåFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: { home: RåLag; away: RåLag };
};
type RåStandingRad = { rank: number; team: { id: number; name: string }; group: string };

const FERDIG = new Set(["FT", "AET", "PEN"]);

async function hent<T>(sti: string): Promise<T> {
  const nøkkel = process.env.API_FOOTBALL_KEY;
  if (!nøkkel) throw new Error("API_FOOTBALL_KEY mangler.");
  const res = await fetch(`${BASE}${sti}`, {
    headers: { "x-apisports-key": nøkkel },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API-FOOTBALL svarte ${res.status} for ${sti}`);
  }
  const json = (await res.json()) as { response: T; errors?: unknown };
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-FOOTBALL-feil: ${JSON.stringify(json.errors)}`);
  }
  return json.response;
}

export async function hentVMKamper(): Promise<ApiKamp[]> {
  const fixtures = await hent<RåFixture[]>(
    `/fixtures?league=${LIGA}&season=${SESONG}`,
  );
  return fixtures.map((f) => {
    const runde = f.league.round ?? "";
    const erGruppe = /group/i.test(runde);
    const kort = f.fixture.status.short;
    const winner = f.teams.home.winner
      ? "HOME_TEAM"
      : f.teams.away.winner
        ? "AWAY_TEAM"
        : null;
    return {
      id: f.fixture.id,
      stage: erGruppe ? "GROUP_STAGE" : runde.toUpperCase(),
      group: erGruppe ? runde : null,
      status: FERDIG.has(kort) ? "FINISHED" : kort,
      utcDate: f.fixture.date,
      homeTeam: { name: f.teams.home.name },
      awayTeam: { name: f.teams.away.name },
      score: { winner },
    };
  });
}

export async function hentVMTabeller(): Promise<ApiGruppetabell[]> {
  // standings-svaret: response[0].league.standings = [ [gruppe-rader], ... ]
  const respons = await hent<
    { league: { standings: RåStandingRad[][] } }[]
  >(`/standings?league=${LIGA}&season=${SESONG}`);

  const grupper = respons[0]?.league?.standings ?? [];
  return grupper.map((rader) => ({
    group: rader[0]?.group ?? null,
    table: rader.map((r) => ({
      position: r.rank,
      team: { name: r.team.name },
    })),
  }));
}
