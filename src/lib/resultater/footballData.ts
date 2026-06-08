import "server-only";

// Resultatkilde: openfootball/worldcup.json (offentlig, ingen API-nøkkel).
// Vi henter kampoppsettet + resultatene, regner ut gruppetabeller fra
// scorene, og normaliserer til interne typer slik at byggFasit.ts er
// uavhengig av kilden.

const KILDE =
  process.env.OPENFOOTBALL_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

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

export type ApiTabellrad = { position: number; team: ApiLag };
export type ApiGruppetabell = { group: string | null; table: ApiTabellrad[] };

// ── openfootball-format (kun det vi bruker) ──
type OfScore = { ft?: number[]; ht?: number[]; et?: number[]; p?: number[] };
type OfKamp = {
  round?: string;
  date?: string;
  team1: string;
  team2: string;
  group?: string;
  score?: OfScore;
};

async function hentRåkamper(): Promise<OfKamp[]> {
  const res = await fetch(KILDE, { cache: "no-store" });
  if (!res.ok) throw new Error(`openfootball svarte ${res.status}`);
  const data = (await res.json()) as { matches?: OfKamp[] };
  return data.matches ?? [];
}

// Avgjør vinner ut fra score: straffer slår ekstraomganger slår ordinær tid.
function vinnerAv(score: OfScore | undefined): ApiKamp["score"]["winner"] {
  const par = score?.p ?? score?.et ?? score?.ft;
  if (!par || par.length < 2) return null;
  if (par[0] > par[1]) return "HOME_TEAM";
  if (par[1] > par[0]) return "AWAY_TEAM";
  return "DRAW";
}

export async function hentVMKamper(): Promise<ApiKamp[]> {
  const kamper = await hentRåkamper();
  return kamper.map((m, i) => {
    const erGruppe = Boolean(m.group);
    const ferdig = Boolean(m.score?.ft && m.score.ft.length >= 2);
    return {
      id: i + 1,
      stage: erGruppe ? "GROUP_STAGE" : (m.round ?? "").toUpperCase(),
      group: m.group ?? null,
      status: ferdig ? "FINISHED" : "SCHEDULED",
      utcDate: m.date ?? "",
      homeTeam: { name: m.team1 },
      awayTeam: { name: m.team2 },
      score: { winner: vinnerAv(m.score) },
    };
  });
}

// Regner ut gruppetabeller fra ferdigspilte gruppekamper (poeng, deretter
// målforskjell, deretter scorede mål). Forenklet ift. FIFAs fulle regelverk,
// men godt nok – admin kan overstyre i grensetilfeller.
export async function hentVMTabeller(): Promise<ApiGruppetabell[]> {
  const kamper = await hentRåkamper();

  type Rad = { navn: string; poeng: number; mf: number; scoret: number };
  const grupper = new Map<string, Map<string, Rad>>();

  const sørgForRad = (g: string, navn: string): Rad => {
    if (!grupper.has(g)) grupper.set(g, new Map());
    const tabell = grupper.get(g)!;
    if (!tabell.has(navn)) tabell.set(navn, { navn, poeng: 0, mf: 0, scoret: 0 });
    return tabell.get(navn)!;
  };

  for (const m of kamper) {
    if (!m.group || !m.score?.ft || m.score.ft.length < 2) continue;
    const [h, b] = m.score.ft;
    const hjemme = sørgForRad(m.group, m.team1);
    const borte = sørgForRad(m.group, m.team2);
    hjemme.scoret += h;
    borte.scoret += b;
    hjemme.mf += h - b;
    borte.mf += b - h;
    if (h > b) hjemme.poeng += 3;
    else if (b > h) borte.poeng += 3;
    else {
      hjemme.poeng += 1;
      borte.poeng += 1;
    }
  }

  return [...grupper.entries()].map(([group, tabell]) => {
    const sortert = [...tabell.values()].sort(
      (a, b) => b.poeng - a.poeng || b.mf - a.mf || b.scoret - a.scoret,
    );
    return {
      group,
      table: sortert.map((r, i) => ({
        position: i + 1,
        team: { name: r.navn },
      })),
    };
  });
}
