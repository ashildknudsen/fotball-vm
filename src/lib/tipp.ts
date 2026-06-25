import {
  type Gruppe,
  type Plassreferanse,
  type Sluttspillkamp,
  finalistBonus,
  finnKamp,
  grupper,
  kampstart,
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
  // Kun på fasit: den ekte 16-delsfinale-oppstillingen (kampnr -> lagene),
  // som sluttspill-tippingen (fase 2) seedes fra. Fylles av auto-henting/admin.
  sluttspilloppsett?: Record<string, { hjemme: string; borte: string }>;
  // Kun på fasit: avsparkstidspunkt (ISO) per sluttspillkamp (kampnr -> dato).
  // Brukes til å låse hver kamp for tipping når den starter. Fylles av
  // auto-hentingen fra football-data.org når lagene i kampen er kjent.
  kamptider?: Record<string, string>;
  // Kun på fasit: løpende gruppetabeller (til visning på resultatsiden).
  tabeller?: Partial<
    Record<Gruppe, { lag: string; poeng: number; mf: number; spilt: number }[]>
  >;
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

// Fase 2: deltakerne på en sluttspillkamp når 16-delsfinalen seedes med EKTE
// lag (fra fasit), og brukeren tipper seg oppover treet med egne valg.
// R16+ løses fra brukerens vinnere; 16-delsfinalen fra fasitens oppstilling.
export function deltakerePåKampSluttspill(
  kampnummer: number,
  brukerTipp: TippData,
  fasit: TippData,
): { hjemme: string | null; borte: string | null } {
  const kamp = finnKamp(kampnummer);
  if (!kamp) return { hjemme: null, borte: null };

  // 16-delsfinalen seedes KUN fra den ekte oppstillingen (fasit.sluttspilloppsett),
  // som fylles av resultathentingen når lagene faktisk er trukket. Er den ikke
  // klar ennå, står kampen som «Ubestemt» – vi gjetter ikke ut fra (uferdige
  // eller foreløpige) gruppetabeller.
  const oppsett = fasit.sluttspilloppsett?.[String(kampnummer)];
  if (oppsett) {
    return { hjemme: oppsett.hjemme ?? null, borte: oppsett.borte ?? null };
  }

  // En gruppe regnes som ferdig når alle fire lag har spilt sine 3 kamper.
  // Først da er 1.-/2.-plass låst og trygg å bruke til R16-seeding.
  const gruppeErFerdig = (gruppe: Gruppe): boolean => {
    const tabell = fasit.tabeller?.[gruppe];
    return Boolean(
      tabell && tabell.length >= 4 && tabell.every((r) => r.spilt >= 3),
    );
  };

  // Senere runder løses fra brukerens egne vinner-valg oppover i treet.
  const løs = (ref: Plassreferanse): string | null => {
    switch (ref.type) {
      case "gruppe":
        // Entydig så snart gruppa er ferdigspilt – da kan kampen tippes selv om
        // API-et ennå ikke har publisert det offisielle R16-oppsettet.
        return gruppeErFerdig(ref.gruppe) ? løsReferanse(ref, fasit) : null;
      case "treer":
        // Treer-slottene krever FIFAs offisielle fordeling av de 8 beste 3.-
        // plassene. Seedes kun fra ekte oppsett (over) – ellers «Ubestemt».
        return null;
      case "vinner":
        return brukerTipp.vinnere?.[String(ref.kamp)] ?? null;
      case "taper": {
        const { hjemme, borte } = deltakerePåKampSluttspill(
          ref.kamp,
          brukerTipp,
          fasit,
        );
        const v = brukerTipp.vinnere?.[String(ref.kamp)] ?? null;
        if (!v) return null;
        if (hjemme && v !== hjemme) return hjemme;
        if (borte && v !== borte) return borte;
        return null;
      }
    }
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
    sluttspilloppsett: input.sluttspilloppsett,
    kamptider: input.kamptider,
    tabeller: input.tabeller,
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

// Fase 2: rydder vekk kampvinnere som ikke lenger er deltakere i kampen, der
// treet seedes fra fasit (ekte lag). Lar gruppe-tipsene være urørt.
export function sanérSluttspill(
  brukerTipp: TippData,
  fasit: TippData,
): TippData {
  const tipp: TippData = {
    ...brukerTipp,
    vinnere: { ...(brukerTipp.vinnere ?? {}) },
  };
  for (const kamp of sluttspill) {
    const nøkkel = String(kamp.nummer);
    const vinner = tipp.vinnere![nøkkel];
    if (!vinner) continue;
    const { hjemme, borte } = deltakerePåKampSluttspill(
      kamp.nummer,
      tipp,
      fasit,
    );
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

  // Bonus: per lag man har riktig i finalen. Finalistene er vinnerne av de to
  // semifinalene (kamp 101 og 102).
  const fasitFinalister = new Set(
    [fasit.vinnere?.["101"], fasit.vinnere?.["102"]].filter(Boolean) as string[],
  );
  if (fasitFinalister.size > 0) {
    for (const lag of [tipp.vinnere?.["101"], tipp.vinnere?.["102"]]) {
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

// Felles sluttfrist for sluttspillet (fase 2): siste sjanse til å tippe hele
// treet. Default: tirsdag 30. juni 2026 kl. 16 (norsk tid = 14:00 UTC).
// Enkeltkamper som starter FØR denne fristen låses likevel ved sitt eget
// avspark – se kampLåst(). Kan overstyres med SLUTTSPILLFRIST (ISO 8601).
export function sluttspillfrist(): Date {
  return new Date(process.env.SLUTTSPILLFRIST ?? "2026-06-30T14:00:00Z");
}

// Er den felles sluttfristen passert? Da er HELE sluttspillet låst.
export function sluttspillErLåst(): boolean {
  return new Date() >= sluttspillfrist();
}

// Avsparkstidspunktet for en sluttspillkamp. Bruker den ekte fixture-tiden fra
// fasiten når lagene er kjent, ellers det hardkodede FIFA-oppsettet.
export function kampStart(kampnummer: number, fasit: TippData): Date | null {
  const iso = fasit.kamptider?.[String(kampnummer)] ?? kampstart[kampnummer];
  return iso ? new Date(iso) : null;
}

// Er en enkelt sluttspillkamp låst for tipping? Den låses ved det FØRSTE av:
//  - kampens eget avspark (så man aldri kan tippe en kamp som er i gang), eller
//  - den felles sluttfristen (som låser alt som ikke alt er låst).
export function kampLåst(kampnummer: number, fasit: TippData): boolean {
  if (sluttspillErLåst()) return true;
  const start = kampStart(kampnummer, fasit);
  return start !== null && new Date() >= start;
}

export function sluttspillfristTekst(): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Oslo",
  }).format(sluttspillfrist());
}

// Tippefristen som lesbar norsk tekst, f.eks. "11. juni 2026 kl. 21:00".
export function tippefristTekst(): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Oslo",
  }).format(tippefrist());
}
