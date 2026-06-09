"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import {
  type RundeType,
  type Sluttspillkamp,
  finnLag,
  sluttspill,
} from "@/data/turnering";
import { type TippData, deltakerePåKampSluttspill, sanérSluttspill } from "@/lib/tipp";
import { type LagreResultat } from "./TippeSkjema";

const rundeRekkefølge: RundeType[] = [
  "16-delsfinale",
  "8-delsfinale",
  "kvartfinale",
  "semifinale",
  "bronsefinale",
  "finale",
];

const rundeTittel: Record<RundeType, string> = {
  "16-delsfinale": "16-delsfinale",
  "8-delsfinale": "Åttendelsfinale",
  kvartfinale: "Kvartfinale",
  semifinale: "Semifinale",
  bronsefinale: "Bronsefinale",
  finale: "Finale",
};

export default function SluttspillSkjema({
  startTipp,
  fasit,
  erLevert,
  låst,
  påLagre,
}: {
  startTipp: TippData;
  fasit: TippData;
  erLevert: boolean;
  låst: boolean;
  påLagre: (data: TippData, levert: boolean) => Promise<LagreResultat>;
}) {
  const [tipp, setTipp] = useState<TippData>(() =>
    sanérSluttspill(startTipp, fasit),
  );
  const [levert, setLevert] = useState(erLevert);
  const [melding, setMelding] = useState<string | null>(null);
  const [venter, start] = useTransition();
  const kanEndre = !låst;

  function velgVinner(kampnummer: number, lagId: string) {
    if (!kanEndre) return;
    setTipp((forrige) => {
      const klone: TippData = structuredClone(forrige);
      klone.vinnere ??= {};
      klone.vinnere[String(kampnummer)] = lagId;
      return sanérSluttspill(klone, fasit);
    });
    setMelding(null);
  }

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

  function lagre(somLevert: boolean) {
    start(async () => {
      const res = await påLagre(tipp, somLevert);
      setMelding(res.melding);
      if (res.ok) {
        setLevert(somLevert);
        const mester = somLevert ? finnLag(tipp.vinnere?.["104"] ?? "") : undefined;
        if (mester) feirVerdensmester(mester.flagg);
      }
    });
  }

  const antallVinnere = sluttspill.filter(
    (k) => tipp.vinnere?.[String(k.nummer)],
  ).length;
  const mester = tipp.vinnere?.["104"] ? finnLag(tipp.vinnere["104"]) : undefined;

  return (
    <div className="flex flex-col gap-6 pb-32">
      {mester && (
        <p className="rounded-lg bg-emerald-100 px-4 py-3 text-center font-semibold text-emerald-900">
          🏆 Din verdensmester: {mester.flagg} {mester.navn}
        </p>
      )}

      {rundeRekkefølge.map((runde) => (
        <div key={runde} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-zinc-500">
            {rundeTittel[runde]}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {sluttspill
              .filter((k) => k.runde === runde)
              .map((kamp) => (
                <Kampkort
                  key={kamp.nummer}
                  kamp={kamp}
                  tipp={tipp}
                  fasit={fasit}
                  kanEndre={kanEndre}
                  påVelg={velgVinner}
                />
              ))}
          </div>
        </div>
      ))}

      {kanEndre && (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="text-sm text-zinc-500">
              {melding ??
                (levert
                  ? `Levert · ${antallVinnere}/${sluttspill.length}`
                  : `Ikke levert · ${antallVinnere}/${sluttspill.length}`)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => lagre(false)}
                disabled={venter}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-50"
              >
                {venter ? "Lagrer…" : "Lagre kladd"}
              </button>
              <button
                type="button"
                onClick={() => lagre(true)}
                disabled={venter}
                className="rounded-lg bg-[#5239ba] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#43309c] disabled:opacity-50"
              >
                Jeg er fornøyd, send inn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kampkort({
  kamp,
  tipp,
  fasit,
  kanEndre,
  påVelg,
}: {
  kamp: Sluttspillkamp;
  tipp: TippData;
  fasit: TippData;
  kanEndre: boolean;
  påVelg: (kampnummer: number, lagId: string) => void;
}) {
  const { hjemme, borte } = deltakerePåKampSluttspill(kamp.nummer, tipp, fasit);
  const vinner = tipp.vinnere?.[String(kamp.nummer)] ?? null;
  const beggeKlare = Boolean(hjemme && borte);

  return (
    <div className="rounded-xl border border-zinc-200 p-2">
      <div className="mb-1 px-1 text-[11px] text-zinc-400">Kamp {kamp.nummer}</div>
      <div className="flex flex-col gap-1">
        <Lagrad
          lagId={hjemme}
          valgt={vinner === hjemme && hjemme !== null}
          deaktivert={!kanEndre || !beggeKlare}
          påKlikk={() => hjemme && påVelg(kamp.nummer, hjemme)}
        />
        <Lagrad
          lagId={borte}
          valgt={vinner === borte && borte !== null}
          deaktivert={!kanEndre || !beggeKlare}
          påKlikk={() => borte && påVelg(kamp.nummer, borte)}
        />
      </div>
    </div>
  );
}

function Lagrad({
  lagId,
  valgt,
  deaktivert,
  påKlikk,
}: {
  lagId: string | null;
  valgt: boolean;
  deaktivert: boolean;
  påKlikk: () => void;
}) {
  const lag = lagId ? finnLag(lagId) : undefined;
  return (
    <button
      type="button"
      disabled={deaktivert}
      onClick={påKlikk}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition ${
        valgt
          ? "border-emerald-500 bg-emerald-50 font-semibold"
          : "border-zinc-200"
      } ${deaktivert ? "opacity-70" : "hover:border-zinc-300"}`}
    >
      {lag ? (
        <>
          <span className="text-base">{lag.flagg}</span>
          <span className="flex-1">{lag.navn}</span>
          {valgt && <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />}
        </>
      ) : (
        <span className="flex-1 text-zinc-400">Ubestemt</span>
      )}
    </button>
  );
}
