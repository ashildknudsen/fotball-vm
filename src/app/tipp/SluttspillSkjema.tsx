"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Lock } from "lucide-react";
import {
  type RundeType,
  finnKamp,
  finnLag,
  kampstart,
  sluttspillKolonner,
} from "@/data/turnering";
import {
  type TippData,
  deltakerePåKampSluttspill,
  sanérSluttspill,
} from "@/lib/tipp";
import { type LagreResultat } from "./TippeSkjema";

type Medaljer = { vinner?: string; taper?: string };

// Rundene i stacket (mobil) rekkefølge – numerisk, med egne seksjoner for
// finale og bronsefinale.
const STACK_RUNDER: { tittel: string; kamper: number[]; medaljer?: Medaljer }[] = [
  { tittel: "16-delsfinale", kamper: range(73, 88) },
  { tittel: "8-delsfinale", kamper: range(89, 96) },
  { tittel: "Kvartfinale", kamper: range(97, 100) },
  { tittel: "Semifinale", kamper: [101, 102] },
  { tittel: "Finale", kamper: [104], medaljer: { vinner: "🥇", taper: "🥈" } },
  { tittel: "Bronsefinale", kamper: [103], medaljer: { vinner: "🥉" } },
];

const RUNDE_NAVN: Record<RundeType, string> = {
  "16-delsfinale": "16-delsfinale",
  "8-delsfinale": "8-delsfinale",
  kvartfinale: "Kvartfinale",
  semifinale: "Semifinale",
  bronsefinale: "Bronsefinale",
  finale: "Finale",
};

function range(fra: number, til: number): number[] {
  return Array.from({ length: til - fra + 1 }, (_, i) => fra + i);
}

function rundeNavn(kampnummer: number): string {
  const kamp = finnKamp(kampnummer);
  return kamp ? RUNDE_NAVN[kamp.runde] : `Kamp ${kampnummer}`;
}

// Avsparkstid på formen "28.6. Kl. 21:00".
function kampstartTekst(iso: string): string {
  const dato = new Date(iso);
  const dag = new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "numeric",
    timeZone: "Europe/Oslo",
  }).format(dato);
  const tid = new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(dato);
  return `${dag} Kl. ${tid}`;
}

export default function SluttspillSkjema({
  startTipp,
  fasit,
  erLevert,
  låsteKamper,
  startetKamper,
  altLåst,
  påLagre,
}: {
  startTipp: TippData;
  fasit: TippData;
  erLevert: boolean;
  låsteKamper: Record<string, boolean>;
  startetKamper: Record<string, boolean>;
  altLåst: boolean;
  påLagre: (data: TippData, levert: boolean) => Promise<LagreResultat>;
}) {
  const [tipp, setTipp] = useState<TippData>(() =>
    sanérSluttspill(startTipp, fasit),
  );
  const [levert, setLevert] = useState(erLevert);
  const [lagreStatus, setLagreStatus] =
    useState<"" | "lagrer" | "lagret" | "sendt" | "feil">("");
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const førsteRender = useRef(true);
  // Auto-lagringen leser innsendt-status via ref, så den ikke trigges på nytt
  // når man trykker «Send inn» (men beholder innsendt-statusen ved senere endring).
  const levertRef = useRef(erLevert);
  useEffect(() => {
    levertRef.current = levert;
  }, [levert]);

  function velgVinner(kampnummer: number, lagId: string) {
    if (låsteKamper[String(kampnummer)]) return;
    setLagreStatus("lagrer");
    setTipp((forrige) => {
      const klone: TippData = structuredClone(forrige);
      klone.vinnere ??= {};
      klone.vinnere[String(kampnummer)] = lagId;
      return sanérSluttspill(klone, fasit);
    });
  }

  function sendInn() {
    setLevert(true);
    setLagreStatus("lagrer");
    påLagre(tipp, true).then((res) => {
      setLagreStatus(res.ok ? "sendt" : "feil");
      setFeilmelding(res.ok ? null : res.melding);
    });
    const mester = finnLag(tipp.vinnere?.["104"] ?? "");
    if (mester) feirVerdensmester(mester.flagg);
  }

  // Auto-lagring: hver endring lagres etter en kort pause (debounce), slik at
  // tipsene aldri går tapt og man kan komme tilbake etter hvert som flere kamper
  // åpner. Beholder innsendt-status. Per-kamp-låsing håndheves på serveren.
  useEffect(() => {
    if (førsteRender.current) {
      førsteRender.current = false;
      return;
    }
    if (altLåst) return;
    const id = setTimeout(() => {
      påLagre(tipp, levertRef.current).then((res) => {
        setLagreStatus(res.ok ? (levertRef.current ? "sendt" : "lagret") : "feil");
        setFeilmelding(res.ok ? null : res.melding);
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [tipp, altLåst, påLagre]);

  async function feirVerdensmester(flaggEmoji: string) {
    const konfetti = (await import("canvas-confetti")).default;
    const flagg = konfetti.shapeFromText({ text: flaggEmoji, scalar: 3 });
    const skyt = (x: number) =>
      konfetti({
        particleCount: 18,
        startVelocity: 60,
        gravity: 0.8,
        spread: 55,
        angle: 90,
        origin: { x, y: 1.2 },
        shapes: [flagg],
        scalar: 3,
        ticks: 300,
      });
    [0.15, 0.4, 0.6, 0.85].forEach((x) => skyt(x));
  }

  const alleKamper = [...range(73, 104)];
  const antallVinnere = alleKamper.filter((nr) => tipp.vinnere?.[String(nr)]).length;
  const mester = tipp.vinnere?.["104"] ? finnLag(tipp.vinnere["104"]) : undefined;

  // Lager et kort for en gitt kamp. `medaljer` brukes for finale/bronse, og
  // `visRundeNavn` viser rundenavnet på selve kortet (i den samlede
  // «Finaler»-kolonnen på desktop, der to ulike finaler står sammen).
  function kortFor(
    kampnummer: number,
    opts?: { medaljer?: Medaljer; visRundeNavn?: boolean },
  ) {
    const { hjemme, borte } = deltakerePåKampSluttspill(kampnummer, tipp, fasit);
    const iso = fasit.kamptider?.[String(kampnummer)] ?? kampstart[kampnummer];
    const dato = iso ? kampstartTekst(iso) : undefined;
    const etikett = opts?.visRundeNavn
      ? dato
        ? `${rundeNavn(kampnummer)} · ${dato}`
        : rundeNavn(kampnummer)
      : (dato ?? rundeNavn(kampnummer));
    return (
      <Kampkort
        kampnummer={kampnummer}
        hjemme={hjemme}
        borte={borte}
        vinner={tipp.vinnere?.[String(kampnummer)] ?? null}
        låst={Boolean(låsteKamper[String(kampnummer)])}
        startet={Boolean(startetKamper[String(kampnummer)])}
        etikett={etikett}
        medaljer={opts?.medaljer}
        påVelg={velgVinner}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-32">
      {mester && (
        <p className="rounded-lg bg-emerald-100 px-4 py-3 text-center font-semibold text-emerald-900">
          🏆 Din verdensmester: {mester.flagg} {mester.navn}
        </p>
      )}

      {/* Mobil/nettbrett: stacket liste, én runde av gangen. */}
      <div className="flex flex-col gap-6 lg:hidden">
        {STACK_RUNDER.map((runde) => (
          <section key={runde.tittel} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-zinc-700">{runde.tittel}</h3>
            <div className="flex flex-col gap-2">
              {runde.kamper.map((nr) => (
                <div key={nr}>{kortFor(nr, { medaljer: runde.medaljer })}</div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop: bracket-tre med connector-linjer. */}
      <div className="hidden overflow-x-auto pb-4 lg:block">
        <div className="flex min-w-max items-stretch">
          {sluttspillKolonner.map((kolonne) => (
            <div key={kolonne.tittel} className="flex items-stretch">
              <div className="flex w-44 flex-col">
                <Kolonnetittel>{kolonne.tittel}</Kolonnetittel>
                <div className="flex flex-1 flex-col">
                  {kolonne.kamper.map((nr) => (
                    <div
                      key={nr}
                      className="flex flex-1 items-center justify-center px-1.5 py-1"
                    >
                      {kortFor(nr)}
                    </div>
                  ))}
                </div>
              </div>
              {/* Koblings-kolonne: ett «brace» per kamp i NESTE runde.
                  Etter semifinalen (1 brace) kobler den til finale-kolonnen. */}
              <Kobling antallPar={kolonne.kamper.length / 2} />
            </div>
          ))}

          {/* Finaler: finale (gull/sølv) + bronsefinale (bronse). */}
          <div className="flex w-44 flex-col">
            <Kolonnetittel>Finaler</Kolonnetittel>
            <div className="flex flex-1 flex-col justify-center gap-3 px-1.5">
              {kortFor(104, { medaljer: { vinner: "🥇", taper: "🥈" }, visRundeNavn: true })}
              {kortFor(103, { medaljer: { vinner: "🥉" }, visRundeNavn: true })}
            </div>
          </div>
        </div>
      </div>

      {!altLåst && (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="text-sm text-zinc-500">
              {antallVinnere}/{alleKamper.length} kamper tippet
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm">
                {lagreStatus === "lagrer" && (
                  <span className="text-zinc-500">Lagrer…</span>
                )}
                {lagreStatus === "lagret" && (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                    Lagret <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                )}
                {lagreStatus === "sendt" && (
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                    Sendt inn <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                )}
                {lagreStatus === "feil" && (
                  <span className="font-medium text-red-600">
                    {feilmelding ?? "Kunne ikke lagre"}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={sendInn}
                disabled={lagreStatus === "lagrer"}
                className="rounded-lg bg-[#5239ba] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#43309c] disabled:opacity-50"
              >
                {levert ? "Oppdater innsending" : "Send inn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kolonnetittel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 px-1.5 text-center text-xs font-semibold text-zinc-600">
      {children}
    </h4>
  );
}

// Connector-linjene mellom to runder. Ett brace per par av kamper: to vannrette
// streker inn til feeder-kortene (ved 25 % og 75 % av brace-høyden), en loddrett
// strek som binder dem, og en vannrett strek ut til neste rundes kort (50 %).
// Tittelhøyden speiles med en usynlig tittel så flex-områdene flukter.
function Kobling({ antallPar }: { antallPar: number }) {
  return (
    <div className="flex w-6 flex-col">
      <Kolonnetittel>
        <span className="opacity-0">.</span>
      </Kolonnetittel>
      <div className="flex flex-1 flex-col">
        {Array.from({ length: antallPar }, (_, i) => (
          <div key={i} className="relative flex-1">
            <span className="absolute left-0 top-1/4 h-0.5 w-1/2 bg-zinc-300" />
            <span className="absolute left-0 top-3/4 h-0.5 w-1/2 bg-zinc-300" />
            <span className="absolute left-1/2 top-1/4 h-1/2 w-0.5 bg-zinc-300" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-1/2 bg-zinc-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Kampkort({
  kampnummer,
  hjemme,
  borte,
  vinner,
  låst,
  startet,
  etikett,
  medaljer,
  påVelg,
}: {
  kampnummer: number;
  hjemme: string | null;
  borte: string | null;
  vinner: string | null;
  låst: boolean;
  startet: boolean;
  etikett: string;
  medaljer?: Medaljer;
  påVelg: (kampnummer: number, lagId: string) => void;
}) {
  const beggeKlare = Boolean(hjemme && borte);
  const kanEndre = !låst && beggeKlare;
  // Sen-varsel vises bare for dem som faktisk pådrar seg straff: kampen har
  // startet, man kan tippe den (begge lag klare), men har ikke valgt vinner
  // ennå. Har man alt tippet i tide, eller kan ikke tippe (Ubestemt), vises
  // ingenting.
  const varsleSen = startet && beggeKlare && !vinner;

  const medalje = (lagId: string | null, vant: boolean): string | undefined => {
    if (!medaljer || !vinner || !lagId) return undefined;
    return vant ? medaljer.vinner : medaljer.taper;
  };

  return (
    <div
      className={`w-full rounded-xl border p-1.5 ${
        låst
          ? "border-zinc-200 bg-zinc-50"
          : varsleSen
            ? "border-amber-300 bg-amber-50/40"
            : "border-zinc-200 bg-white"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-1 px-0.5 text-[10px] leading-tight text-zinc-500">
        <span className="truncate">{etikett}</span>
        {låst ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-zinc-500">
            <Lock className="h-2.5 w-2.5" />
            Låst
          </span>
        ) : varsleSen ? (
          <span
            className="inline-flex shrink-0 items-center font-semibold text-amber-600"
            title="Kampen har startet – tipper du nå gir den −3 poeng"
          >
            startet · −3
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <Lagrad
          lagId={hjemme}
          valgt={vinner !== null && vinner === hjemme}
          medalje={medalje(hjemme, vinner === hjemme)}
          deaktivert={!kanEndre}
          påKlikk={() => hjemme && påVelg(kampnummer, hjemme)}
        />
        <Lagrad
          lagId={borte}
          valgt={vinner !== null && vinner === borte}
          medalje={medalje(borte, vinner === borte)}
          deaktivert={!kanEndre}
          påKlikk={() => borte && påVelg(kampnummer, borte)}
        />
      </div>
    </div>
  );
}

function Lagrad({
  lagId,
  valgt,
  medalje,
  deaktivert,
  påKlikk,
}: {
  lagId: string | null;
  valgt: boolean;
  medalje?: string;
  deaktivert: boolean;
  påKlikk: () => void;
}) {
  const lag = lagId ? finnLag(lagId) : undefined;
  return (
    <button
      type="button"
      disabled={deaktivert}
      onClick={påKlikk}
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-xs transition ${
        valgt
          ? "border-emerald-500 bg-emerald-50 font-semibold"
          : "border-zinc-200"
      } ${deaktivert ? "opacity-70" : "hover:border-zinc-300"}`}
    >
      {lag ? (
        <>
          {medalje && <span>{medalje}</span>}
          <span className="text-sm">{lag.flagg}</span>
          <span className="flex-1 truncate">{lag.navn}</span>
          {valgt && !medalje && (
            <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} />
          )}
        </>
      ) : (
        <span className="flex-1 text-zinc-400">Ubestemt</span>
      )}
    </button>
  );
}