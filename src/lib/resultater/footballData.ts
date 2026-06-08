import "server-only";

// Tynn klient mot football-data.org sitt API (gratis-tier dekker VM, kode "WC").
// Krever miljøvariabelen FOOTBALL_DATA_API_KEY.

const BASE = "https://api.football-data.org/v4";
const VM = "WC";

export type ApiLag = {
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
};

export type ApiKamp = {
  id: number;
  stage: string; // GROUP_STAGE, LAST_16, LAST_32, QUARTER_FINALS, ...
  group: string | null; // "GROUP_A" e.l.
  status: string; // FINISHED, IN_PLAY, TIMED, ...
  utcDate: string;
  homeTeam: ApiLag;
  awayTeam: ApiLag;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  };
};

export type ApiTabellrad = {
  position: number;
  team: ApiLag;
};

export type ApiGruppetabell = {
  group: string | null; // "GROUP_A"
  table: ApiTabellrad[];
};

async function hent<T>(sti: string): Promise<T> {
  const nøkkel = process.env.FOOTBALL_DATA_API_KEY;
  if (!nøkkel) {
    throw new Error("FOOTBALL_DATA_API_KEY mangler.");
  }
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
  const data = await hent<{ matches: ApiKamp[] }>(
    `/competitions/${VM}/matches`,
  );
  return data.matches ?? [];
}

export async function hentVMTabeller(): Promise<ApiGruppetabell[]> {
  const data = await hent<{ standings: ApiGruppetabell[] }>(
    `/competitions/${VM}/standings`,
  );
  return data.standings ?? [];
}
