import {
  type Gruppe,
  type Plassreferanse,
  type Sluttspillkamp,
  finnKamp,
  lagIGruppe,
  poengPerRunde,
  sluttspill,
} from "@/data/turnering";

// Formen på en tippekupong (lagres som JSON i databasen).
export type GruppeTipp = { vinner?: string; toer?: string };

export type TippData = {
  // Hvilke lag som går videre fra hver gruppe (1.- og 2.-plass).
  gruppe?: Partial<Record<Gruppe, GruppeTipp>>;
  // Valgt lag til hver treer-plass i 16-delsfinalen. Nøkkel = kampnummer.
  treere?: Record<string, string>;
  // Tippet vinner av hver sluttspillkamp. Nøkkel = kampnummer.
  vinnere?: Record<string, string>;
};

// Slår opp hvilket lag-id en plassreferanse peker på, gitt en tippekupong.
// Returnerer null hvis tipperen ikke har fylt ut det som trengs ennå.
export function løsReferanse(
  ref: Plassreferanse,
  tipp: TippData,
): string | null {
  switch (ref.type) {
    case "gruppe": {
      const g = tipp.gruppe?.[ref.gruppe];
      if (!g) return null;
      return (ref.plassering === 1 ? g.vinner : g.toer) ?? null;
    }
    case "treer":
      // Treer-plasser identifiseres av kampen de tilhører – håndteres
      // i deltakerePåKamp der vi kjenner kampnummeret.
      return null;
    case "vinner":
      return tipp.vinnere?.[String(ref.kamp)] ?? null;
    case "taper": {
      const { hjemme, borte } = deltakerePåKamp(ref.kamp, tipp);
      const vinner = tipp.vinnere?.[String(ref.kamp)] ?? null;
      if (!vinner) return null;
      if (hjemme && vinner !== hjemme) return hjemme;
      if (borte && vinner !== borte) return borte;
      return null;
    }
  }
}

// Finner de to lagene som møtes i en gitt sluttspillkamp ut fra kupongen.
export function deltakerePåKamp(
  kampnummer: number,
  tipp: TippData,
): { hjemme: string | null; borte: string | null } {
  const kamp = finnKamp(kampnummer);
  if (!kamp) return { hjemme: null, borte: null };

  const løs = (ref: Plassreferanse, erBorte: boolean): string | null => {
    if (ref.type === "treer") {
      return tipp.treere?.[String(kampnummer)] ?? null;
    }
    return løsReferanse(ref, tipp);
  };

  return {
    hjemme: løs(kamp.hjemme, false),
    borte: løs(kamp.borte, true),
  };
}

// Alle treer-plasser som må fylles ut (kamper der borte-laget er en treer).
export function treerPlasser(): Sluttspillkamp[] {
  return sluttspill.filter((k) => k.borte.type === "treer");
}

// Lag som lovlig kan velges til treer-plassen i en gitt kamp: lag fra de
// tillatte gruppene som tipperen ikke allerede har sendt videre som 1. eller
// 2. i sin egen gruppe.
export function gyldigeTreereForKamp(
  kampnummer: number,
  tipp: TippData,
): string[] {
  const kamp = finnKamp(kampnummer);
  if (!kamp || kamp.borte.type !== "treer") return [];

  const resultat: string[] = [];
  for (const gruppe of kamp.borte.muligeGrupper) {
    const valgt = tipp.gruppe?.[gruppe];
    for (const lag of lagIGruppe(gruppe)) {
      if (lag.id !== valgt?.vinner && lag.id !== valgt?.toer) {
        resultat.push(lag.id);
      }
    }
  }
  return resultat;
}

// Rydder vekk valg som er blitt ugyldige etter endringer lenger opp i treet:
// treere som ikke lenger er lovlige eller er valgt to ganger, og kampvinnere
// som ikke lenger er en av deltakerne i kampen.
export function sanérTipp(input: TippData): TippData {
  const tipp: TippData = {
    gruppe: { ...(input.gruppe ?? {}) },
    treere: { ...(input.treere ?? {}) },
    vinnere: { ...(input.vinnere ?? {}) },
  };

  const brukteTreere = new Set<string>();
  for (const plass of treerPlasser()) {
    const nøkkel = String(plass.nummer);
    const valgt = tipp.treere![nøkkel];
    if (!valgt) continue;
    const gyldige = gyldigeTreereForKamp(plass.nummer, tipp);
    if (!gyldige.includes(valgt) || brukteTreere.has(valgt)) {
      delete tipp.treere![nøkkel];
    } else {
      brukteTreere.add(valgt);
    }
  }

  // Behandles i kampnummer-rekkefølge slik at vinnere er ryddet før de
  // brukes til å løse ut senere kamper.
  for (const kamp of sluttspill) {
    const nøkkel = String(kamp.nummer);
    const vinner = tipp.vinnere![nøkkel];
    if (!vinner) continue;
    const { hjemme, borte } = deltakerePåKamp(kamp.nummer, tipp);
    if (vinner !== hjemme && vinner !== borte) {
      delete tipp.vinnere![nøkkel];
    }
  }

  return tipp;
}

// Beregner poeng for en kupong sammenlignet med fasit.
export function beregnPoeng(tipp: TippData, fasit: TippData): number {
  let poeng = 0;

  // Gruppespill: poeng per lag som er riktig tippet videre (uavhengig av
  // om det ble 1.- eller 2.-plass).
  for (const gruppe of Object.keys(fasit.gruppe ?? {}) as Gruppe[]) {
    const fasitLag = new Set(
      [fasit.gruppe?.[gruppe]?.vinner, fasit.gruppe?.[gruppe]?.toer].filter(
        Boolean,
      ) as string[],
    );
    const tippetLag = [
      tipp.gruppe?.[gruppe]?.vinner,
      tipp.gruppe?.[gruppe]?.toer,
    ].filter(Boolean) as string[];
    for (const lag of tippetLag) {
      if (fasitLag.has(lag)) poeng += poengPerRunde.gruppe;
    }
  }

  // Treer-plasser: poeng for riktig treer på riktig plass.
  for (const [kampnummer, fasitLag] of Object.entries(fasit.treere ?? {})) {
    if (tipp.treere?.[kampnummer] === fasitLag) {
      poeng += poengPerRunde.gruppe;
    }
  }

  // Sluttspill: poeng per riktig tippet kampvinner, skalert etter runde.
  for (const [kampnummer, fasitVinner] of Object.entries(fasit.vinnere ?? {})) {
    if (tipp.vinnere?.[kampnummer] === fasitVinner) {
      const kamp = finnKamp(Number(kampnummer));
      if (kamp) poeng += poengPerRunde[kamp.runde];
    }
  }

  return poeng;
}

// Er tippefristen passert? Settes via env (ISO-dato), default kickoff 2026.
export function tippingErLåst(): boolean {
  const frist = process.env.TIPPEFRIST ?? "2026-06-11T16:00:00Z";
  return new Date() >= new Date(frist);
}
