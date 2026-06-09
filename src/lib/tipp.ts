import {
  type Gruppe,
  type Plassreferanse,
  type Sluttspillkamp,
  finalistBonus,
  finnKamp,
  grupper,
  lagIGruppe,
  poengPerRunde,
  sluttspill,
} from "@/data/turnering";

// Antall treere som går videre til sluttspillet.
export const MAKS_TREERE = 8;

// Formen på en tippekupong (lagres som JSON i databasen).
// Per gruppe velger man 1.-plass (vinner), 2.-plass (toer) og evt. en treer
// (kun 8 grupper kan ha en treer – de 8 som går videre).
export type GruppeTipp = { vinner?: string; toer?: string; treer?: string };

export type TippData = {
  gruppe?: Partial<Record<Gruppe, GruppeTipp>>;
  // Rekkefølgen treerne ble prioritert i (1. = best). Styrer nummereringen
  // og hvilken sluttspill-plass hver treer havner på.
  treerrekkefolge?: Gruppe[];
  // Tippet vinner av hver sluttspillkamp. Nøkkel = kampnummer.
  vinnere?: Record<string, string>;
};

// Gruppene med treer, i prioritert rekkefølge (1. = best). Bruker lagret
// rekkefølge der den finnes, og legger evt. nye bakerst.
export function treerGrupper(tipp: TippData): Gruppe[] {
  const medTreer = grupper.filter((g) => tipp.gruppe?.[g]?.treer);
  const rekkefolge = (tipp.treerrekkefolge ?? []).filter((g) =>
    medTreer.includes(g),
  );
  const resten = medTreer.filter((g) => !rekkefolge.includes(g));
  return [...rekkefolge, ...resten];
}

// Alle treer-plasser i sluttspillet (kamper der borte-laget er en treer),
// i kampnummer-rekkefølge.
export function treerPlasser(): Sluttspillkamp[] {
  return sluttspill.filter((k) => k.borte.type === "treer");
}

// Tildeler de markerte treerne til sluttspill-plassene i fast rekkefølge.
// Returnerer kampnummer -> lag-id.
export function treerTildeling(tipp: TippData): Record<string, string> {
  const plasser = treerPlasser();
  const lag = treerGrupper(tipp)
    .map((g) => tipp.gruppe![g]!.treer!)
    .slice(0, plasser.length);
  const tildeling: Record<string, string> = {};
  lag.forEach((lagId, i) => {
    tildeling[String(plasser[i].nummer)] = lagId;
  });
  return tildeling;
}

// Slår opp hvilket lag-id en plassreferanse peker på, gitt en tippekupong.
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
      // Håndteres i deltakerePåKamp der vi kjenner kampnummeret.
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

  const tildeling = treerTildeling(tipp);
  const løs = (ref: Plassreferanse): string | null => {
    if (ref.type === "treer") return tildeling[String(kampnummer)] ?? null;
    return løsReferanse(ref, tipp);
  };

  return { hjemme: løs(kamp.hjemme), borte: løs(kamp.borte) };
}

// Rydder vekk ugyldige valg: treere som ikke hører til gruppa eller alt er
// 1./2., treere ut over maksgrensen, og kampvinnere som ikke lenger er en
// av deltakerne i kampen.
export function sanérTipp(input: TippData): TippData {
  const tipp: TippData = {
    gruppe: Object.fromEntries(
      Object.entries(input.gruppe ?? {}).map(([g, v]) => [g, { ...v }]),
    ),
    treerrekkefolge: input.treerrekkefolge ? [...input.treerrekkefolge] : undefined,
    vinnere: { ...(input.vinnere ?? {}) },
  };

  let antallTreere = 0;
  for (const gruppe of grupper) {
    const g = tipp.gruppe![gruppe];
    if (!g?.treer) continue;
    const iGruppa = lagIGruppe(gruppe).some((l) => l.id === g.treer);
    const erAlleredeVidere = g.treer === g.vinner || g.treer === g.toer;
    if (!iGruppa || erAlleredeVidere || antallTreere >= MAKS_TREERE) {
      delete g.treer;
    } else {
      antallTreere++;
    }
  }

  // Oppdater prioritert treer-rekkefølge (behold rekkefølge, dropp ugyldige).
  tipp.treerrekkefolge = treerGrupper(tipp);

  // Vinnere behandles i kampnummer-rekkefølge slik at de er ryddet før de
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

  for (const gruppe of Object.keys(fasit.gruppe ?? {}) as Gruppe[]) {
    // Gruppespill: poeng per lag riktig videre (1.- eller 2.-plass).
    const fasitLag = new Set(
      [fasit.gruppe?.[gruppe]?.vinner, fasit.gruppe?.[gruppe]?.toer].filter(
        Boolean,
      ) as string[],
    );
    for (const lag of [
      tipp.gruppe?.[gruppe]?.vinner,
      tipp.gruppe?.[gruppe]?.toer,
    ]) {
      if (lag && fasitLag.has(lag)) poeng += poengPerRunde.gruppe;
    }

    // Treer: poeng hvis riktig lag er markert som treer i gruppa.
    const fasitTreer = fasit.gruppe?.[gruppe]?.treer;
    if (fasitTreer && tipp.gruppe?.[gruppe]?.treer === fasitTreer) {
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

  // Bonus: per lag man har riktig i finalen.
  const fasitFinale = deltakerePåKamp(104, fasit);
  const fasitFinalister = new Set(
    [fasitFinale.hjemme, fasitFinale.borte].filter(Boolean) as string[],
  );
  if (fasitFinalister.size > 0) {
    const tippFinale = deltakerePåKamp(104, tipp);
    for (const lag of [tippFinale.hjemme, tippFinale.borte]) {
      if (lag && fasitFinalister.has(lag)) poeng += finalistBonus;
    }
  }

  return poeng;
}

// Tippefristen som dato. Settes via env (ISO-dato), default kickoff 2026.
export function tippefrist(): Date {
  return new Date(process.env.TIPPEFRIST ?? "2026-06-11T19:00:00Z");
}

// Er tippefristen passert?
export function tippingErLåst(): boolean {
  return new Date() >= tippefrist();
}

// Tippefristen som lesbar norsk tekst, f.eks. "11. juni 2026 kl. 21:00".
export function tippefristTekst(): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Oslo",
  }).format(tippefrist());
}
