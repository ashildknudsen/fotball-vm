"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import {
  type Gruppe,
  type Plassreferanse,
  type RundeType,
  type Sluttspillkamp,
  finnLag,
  grupper,
  lagIGruppe,
  sluttspill,
} from "@/data/turnering";
import {
  type TippData,
  MAKS_TREERE,
  deltakerePåKamp,
  sanérTipp,
  treerGrupper,
} from "@/lib/tipp";
import { genererTilfeldig, genererFraRanking } from "@/lib/generator";
import { FASE } from "@/lib/fase";

export type LagreResultat = { ok: boolean; melding: string };

const visSluttspill = FASE === "sluttspill";

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
  "8-delsfinale": "8-delsfinale",
  kvartfinale: "Kvartfinale",
  semifinale: "Semifinale",
  bronsefinale: "Bronsefinale",
  finale: "Finale",
};

export default function TippeSkjema({
  startTipp,
  erLevert,
  låst,
  påLagre,
  modus = "tipp",
}: {
  startTipp: TippData;
  erLevert: boolean;
  låst: boolean;
  påLagre: (data: TippData, levert: boolean) => Promise<LagreResultat>;
  modus?: "tipp" | "fasit";
}) {
  const [tipp, setTipp] = useState<TippData>(() => sanérTipp(startTipp));
  const [levert, setLevert] = useState(erLevert);
  const [melding, setMelding] = useState<string | null>(null);
  const [venter, start] = useTransition();

  const kanEndre = !låst;
  const erFasit = modus === "fasit";

  function oppdater(endre: (t: TippData) => void) {
    if (!kanEndre) return;
    setTipp((forrige) => {
      const klone: TippData = structuredClone(forrige);
      endre(klone);
      return sanérTipp(klone);
    });
    setMelding(null);
  }

  function settHeleTipp(ny: TippData, beskjed: string) {
    if (!kanEndre) return;
    // I gruppespill-fasen tipper vi ikke sluttspill ennå.
    const data = visSluttspill ? ny : { ...ny, vinnere: {} };
    setTipp(sanérTipp(data));
    setMelding(beskjed);
  }

  // Easter egg: liten konfetti i rødt/hvitt/blått når Norge velges. 🇳🇴
  async function feirNorge(lagId: string) {
    if (lagId !== "norge") return;
    const konfetti = (await import("canvas-confetti")).default;
    konfetti({
      particleCount: 70,
      spread: 75,
      origin: { y: 0.7 },
      colors: ["#ef2b2d", "#ffffff", "#002868"],
    });
  }

  // Stort easter egg: når man sender inn, skytes flagget til den tippede
  // verdensmesteren opp fra bunnen av siden. 🏆
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

  function velgIGruppe(gruppe: Gruppe, lagId: string) {
    const g = tipp.gruppe?.[gruppe];
    const erValgt =
      g?.vinner === lagId || g?.toer === lagId || g?.treer === lagId;
    const antallTreereNå = treerGrupper(tipp).length;
    const harLedigPlass =
      !g?.vinner || !g?.toer || (!g?.treer && antallTreereNå < MAKS_TREERE);
    if (!erValgt && harLedigPlass) feirNorge(lagId);

    oppdater((t) => {
      t.gruppe ??= {};
      const gg = (t.gruppe[gruppe] ??= {});
      if (gg.vinner === lagId) delete gg.vinner;
      else if (gg.toer === lagId) delete gg.toer;
      else if (gg.treer === lagId) delete gg.treer;
      else if (!gg.vinner) gg.vinner = lagId;
      else if (!gg.toer) gg.toer = lagId;
      else if (!gg.treer && antallTreereNå < MAKS_TREERE) gg.treer = lagId;
      // Ellers (alt fylt / 8 treere brukt): klikket ignoreres.
    });
  }

  function velgVinner(kampnummer: number, lagId: string) {
    feirNorge(lagId);
    oppdater((t) => {
      t.vinnere ??= {};
      t.vinnere[String(kampnummer)] = lagId;
    });
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

  // Fremdrift
  const antallGruppe = grupper.filter(
    (g) => tipp.gruppe?.[g]?.vinner && tipp.gruppe?.[g]?.toer,
  ).length;
  const antallTreere = treerGrupper(tipp).length;
  const antallVinnere = sluttspill.filter(
    (k) => tipp.vinnere?.[String(k.nummer)],
  ).length;
  const mester = tipp.vinnere?.["104"]
    ? finnLag(tipp.vinnere["104"])
    : undefined;

  return (
    <div className="flex flex-col gap-10 pb-32">
      {/* ── Generator ── */}
      {kanEndre && !erFasit && (
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div>
            <h2 className="font-semibold">Få et ferdig forslag</h2>
            <p className="text-sm text-zinc-500">
              La oss fylle ut hele kupongen for deg – så kan du justere etterpå.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                settHeleTipp(
                  genererTilfeldig(),
                  "Lykken er gjort – hele kupongen er fylt ut. Juster gjerne før du sender inn.",
                )
              }
              className="flex flex-1 flex-col items-start gap-0.5 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-left transition hover:bg-zinc-50"
            >
              <span className="text-sm font-semibold">Prøv lykken</span>
              <span className="text-xs text-zinc-500">
                Vi plukker lag helt på slump
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                settHeleTipp(
                  genererFraRanking(),
                  "Nesten vitenskapelig kupong generert – juster gjerne før du sender inn.",
                )
              }
              className="flex flex-1 flex-col items-start gap-0.5 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-left transition hover:bg-zinc-50"
            >
              <span className="text-sm font-semibold">Nesten vitenskapelig</span>
              <span className="text-xs text-zinc-500">
                Basert på FIFA-ranking, med litt rom for overraskelser
              </span>
            </button>
          </div>
        </section>
      )}

      {/* ── Gruppespill ── */}
      <section className="flex flex-col gap-4">
        <Seksjonstittel
          tittel="1 · Gruppespill"
          undertittel={`Velg 1.- og 2.-plass, og marker treere (${antallTreere}/${MAKS_TREERE}) · ${antallGruppe}/12 grupper`}
        />
        {!erFasit && (
          <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Marker også de 8 treerne du tror går videre. Selve sluttspillet
            tipper du etter at gruppespillet er ferdig – da med de ekte lagene.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {grupper.map((gruppe) => {
            const g = tipp.gruppe?.[gruppe];
            return (
              <div key={gruppe} className="rounded-xl border border-zinc-200 p-3">
                <h3 className="mb-2 text-sm font-semibold text-zinc-500">
                  Gruppe {gruppe}
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {lagIGruppe(gruppe).map((l) => {
                    const erVinner = g?.vinner === l.id;
                    const erToer = g?.toer === l.id;
                    const erTreer = g?.treer === l.id;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          disabled={!kanEndre}
                          onClick={() => velgIGruppe(gruppe, l.id)}
                          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            erVinner || erToer
                              ? "border-emerald-500 bg-emerald-50 font-medium"
                              : erTreer
                                ? "border-[#5239ba] bg-[#5239ba]/10 font-medium"
                                : "border-zinc-200 hover:border-zinc-300"
                          } ${kanEndre ? "" : "cursor-default opacity-90"}`}
                        >
                          <span className="text-lg">{l.flagg}</span>
                          <span className="flex-1">{l.navn}</span>
                          {(erVinner || erToer) && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                              {erVinner ? 1 : 2}
                            </span>
                          )}
                          {erTreer && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5239ba] text-white">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Sluttspill (kun i sluttspill-fasen) ── */}
      {visSluttspill && (
      <section className="flex flex-col gap-4">
        <Seksjonstittel
          tittel="2 · Sluttspill"
          undertittel={`Klikk vinneren i hver kamp · ${antallVinnere}/${sluttspill.length}`}
        />
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
                    kanEndre={kanEndre}
                    påVelg={velgVinner}
                  />
                ))}
            </div>
          </div>
        ))}
      </section>
      )}

      {/* ── Sluttspill kommer (gruppespill-fasen) ── */}
      {!visSluttspill && !erFasit && (
        <section className="flex flex-col gap-4">
          <Seksjonstittel
            tittel="2 · Sluttspill"
            undertittel="Åpner når gruppespillet er ferdig"
          />
          <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Sluttspillet åpner <strong>27. juni</strong> – da fyller du ut treet
            med de ekte lagene som gikk videre fra gruppespillet.
          </p>
        </section>
      )}

      {/* ── Lagre-linje ── */}
      {kanEndre && (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="text-sm text-zinc-500">
              {melding ??
                (erFasit
                  ? "Lagre fasit etter hvert som resultatene blir klare"
                  : levert
                    ? "Levert – kan fortsatt endres"
                    : "Ikke levert ennå")}
            </span>
            <div className="flex gap-2">
              {erFasit ? (
                <button
                  type="button"
                  onClick={() => lagre(false)}
                  disabled={venter}
                  className="rounded-lg bg-[#5239ba] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#43309c] disabled:opacity-50"
                >
                  {venter ? "Lagrer…" : "Lagre fasit"}
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Seksjonstittel({
  tittel,
  undertittel,
}: {
  tittel: string;
  undertittel: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">{tittel}</h2>
      <p className="text-sm text-zinc-500">{undertittel}</p>
    </div>
  );
}

function Kampkort({
  kamp,
  tipp,
  kanEndre,
  påVelg,
}: {
  kamp: Sluttspillkamp;
  tipp: TippData;
  kanEndre: boolean;
  påVelg: (kampnummer: number, lagId: string) => void;
}) {
  const { hjemme, borte } = deltakerePåKamp(kamp.nummer, tipp);
  const vinner = tipp.vinnere?.[String(kamp.nummer)] ?? null;
  const beggeKlare = Boolean(hjemme && borte);

  return (
    <div className="rounded-xl border border-zinc-200 p-2">
      <div className="mb-1 px-1 text-[11px] text-zinc-400">
        Kamp {kamp.nummer}
      </div>
      <div className="flex flex-col gap-1">
        <Lagvalg
          lagId={hjemme}
          referanse={kamp.hjemme}
          valgt={vinner === hjemme && hjemme !== null}
          deaktivert={!kanEndre || !beggeKlare}
          påKlikk={() => hjemme && påVelg(kamp.nummer, hjemme)}
        />
        <Lagvalg
          lagId={borte}
          referanse={kamp.borte}
          valgt={vinner === borte && borte !== null}
          deaktivert={!kanEndre || !beggeKlare}
          påKlikk={() => borte && påVelg(kamp.nummer, borte)}
        />
      </div>
    </div>
  );
}

function Lagvalg({
  lagId,
  referanse,
  valgt,
  deaktivert,
  påKlikk,
}: {
  lagId: string | null;
  referanse: Plassreferanse;
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
          {valgt && (
            <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
          )}
        </>
      ) : (
        <span className="flex-1 text-zinc-400">{beskrivReferanse(referanse)}</span>
      )}
    </button>
  );
}

// Lesbar plassholdertekst når et lag ikke er bestemt ennå.
function beskrivReferanse(ref: Plassreferanse): string {
  switch (ref.type) {
    case "gruppe":
      return `${ref.plassering}. plass gruppe ${ref.gruppe}`;
    case "treer":
      return "Beste treer";
    case "vinner":
      return `Vinner kamp ${ref.kamp}`;
    case "taper":
      return `Taper kamp ${ref.kamp}`;
  }
}
