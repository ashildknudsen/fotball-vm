import Link from "next/link";
import { Lock, PencilLine } from "lucide-react";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagAdminKlient } from "@/lib/supabase/admin";
import {
  type TippData,
  beregnPoengDetaljer,
  tippingErLåst,
  sluttspillErLåst,
} from "@/lib/tipp";
import { type Gruppe, grupper, finnLag } from "@/data/turnering";
import { FASE } from "@/lib/fase";

type Rad = {
  id: string;
  navn: string;
  gruppePoeng: number;
  sluttspillPoeng: number;
  poeng: number;
  levert: boolean;
  erMeg: boolean;
};

export default async function ResultatSide() {
  const profil = await hentEllerOpprettProfil();
  const db = lagAdminKlient();

  const [{ data: fasitRad }, { data: tippRader }, { data: profiler }] =
    await Promise.all([
      db.from("fasit").select("data").eq("id", 1).maybeSingle(),
      db.from("tipp").select("bruker_id, data, levert"),
      db.from("profil").select("id, visningsnavn"),
    ]);

  const fasit: TippData = (fasitRad?.data as TippData) ?? {};
  const navnFor = new Map(
    (profiler ?? []).map((p) => [p.id as string, p.visningsnavn as string]),
  );

  const rader: Rad[] = (tippRader ?? [])
    .map((t) => {
      const d = beregnPoengDetaljer(t.data as TippData, fasit);
      return {
        id: t.bruker_id as string,
        navn: navnFor.get(t.bruker_id as string) ?? "Ukjent",
        gruppePoeng: d.gruppe,
        sluttspillPoeng: d.sluttspill,
        poeng: d.total,
        levert: Boolean(t.levert),
        erMeg: t.bruker_id === profil.id,
      };
    })
    .sort((a, b) => b.poeng - a.poeng || a.navn.localeCompare(b.navn));

  // Andres oppsett kan først åpnes når fristen har gått ut – i sluttspillet
  // gjelder den felles sluttfristen (30. juni), ellers gruppespill-fristen.
  const kanSeAndres =
    FASE === "sluttspill" ? sluttspillErLåst() : tippingErLåst();

  // Gruppestilling + foreløpig/endelig.
  const tabeller = fasit.tabeller ?? {};
  const harStilling = Object.keys(tabeller).length > 0;
  const gruppespillFerdig =
    harStilling &&
    Object.values(tabeller).every((rader) =>
      (rader ?? []).every((r) => r.spilt >= 3),
    );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Tilbake
      </Link>
      <h1 className="text-2xl font-bold">🏆 Resultattavle</h1>

      {harStilling && !gruppespillFerdig && (
        <p className="rounded-lg bg-[#5239ba]/10 px-4 py-3 text-sm text-[#5239ba]">
          ⏱️ <strong>Foreløpige poeng</strong> – de regnes ut fra stillingen akkurat
          nå og endrer seg når flere gruppekamper spilles. Oppdateres hver morgen.
        </p>
      )}

      <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <p className="font-semibold">Slik får du poeng</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <strong>Gruppespill:</strong> 1 poeng for hvert lag du har riktig
            videre (1.- eller 2.-plass), og 1 poeng for hver riktig treer.
          </li>
          <li>
            <strong>Sluttspill:</strong> poeng for hver riktig tippet kampvinner
            – flere poeng jo lenger ut: 16-delsfinale 1 poeng, åttendelsfinale 2
            poeng, kvartfinale 4 poeng, semifinale 8 poeng, bronsefinale 4 poeng,
            finale 8 poeng.
          </li>
          <li>
            <strong>Bonus:</strong> +3 poeng for hvert lag du har riktig i
            finalen.
          </li>
        </ul>
      </div>

      {rader.length === 0 ? (
        <p className="text-zinc-500">Ingen har levert tips ennå.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rader.map((r, i) => {
            const åpen = r.erMeg || kanSeAndres;
            const klasse = `flex items-center gap-3 rounded-lg px-4 py-3 ${radKlasse(
              i,
            )} ${r.erMeg ? "ring-1 ring-[#5239ba]/70" : ""}`;
            const innhold = (
              <>
                <span className="w-6 text-center text-sm font-bold text-zinc-400">
                  {plassering(i)}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {r.navn}
                    {!r.levert && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#ddd8fe] px-2 py-0.5 text-xs font-medium text-[#5239ba]">
                        <PencilLine className="h-3 w-3" />
                        Kladd
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Gruppe {r.gruppePoeng} · Sluttspill {r.sluttspillPoeng}
                  </span>
                </span>
                <span className="text-right text-lg font-bold tabular-nums">
                  {r.poeng}
                  <span className="ml-1 text-xs font-normal text-zinc-400">
                    p
                  </span>
                </span>
                {åpen ? (
                  <span className="text-zinc-300">›</span>
                ) : (
                  <Lock className="h-4 w-4 text-zinc-300" />
                )}
              </>
            );
            return (
              <li key={r.id}>
                {åpen ? (
                  <Link
                    href={`/resultater/${r.id}`}
                    className={`${klasse} transition hover:brightness-95`}
                  >
                    {innhold}
                  </Link>
                ) : (
                  <div className={`${klasse} cursor-default`}>{innhold}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {harStilling && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-bold">Stilling i gruppene</h2>
            <p className="text-sm text-zinc-500">
              {gruppespillFerdig
                ? "Gruppespillet er ferdig. Videre (grønt) og beste treere (lilla)."
                : "Slik ligger gruppene an akkurat nå. Grønt = videre, lilla = beste treer (foreløpig)."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {grupper.map((g) => (
              <Gruppetabell
                key={g}
                gruppe={g}
                rader={tabeller[g] ?? []}
                videre={fasit.gruppe?.[g]}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Gruppetabell({
  gruppe,
  rader,
  videre,
}: {
  gruppe: Gruppe;
  rader: { lag: string; poeng: number; mf: number; spilt: number }[];
  videre?: { vinner?: string; toer?: string; treer?: string };
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3">
      <h3 className="mb-2 text-sm font-semibold text-zinc-500">Gruppe {gruppe}</h3>
      <ul className="flex flex-col gap-1">
        {rader.map((r, i) => {
          const lag = finnLag(r.lag);
          const erVidere = r.lag === videre?.vinner || r.lag === videre?.toer;
          const erTreer = r.lag === videre?.treer;
          return (
            <li
              key={r.lag}
              className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                erVidere
                  ? "bg-emerald-50"
                  : erTreer
                    ? "bg-[#5239ba]/10"
                    : ""
              }`}
            >
              <span className="w-4 text-center text-xs text-zinc-400">
                {i + 1}
              </span>
              <span>{lag?.flagg ?? "🏳️"}</span>
              <span className="flex-1 truncate">{lag?.navn ?? r.lag}</span>
              <span className="text-xs text-zinc-400">{r.spilt} sp</span>
              <span className="w-6 text-right font-semibold tabular-nums">
                {r.poeng}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function plassering(indeks: number): string {
  if (indeks === 0) return "🥇";
  if (indeks === 1) return "🥈";
  if (indeks === 2) return "🥉";
  return `${indeks + 1}.`;
}

// Bakgrunnsfarge per plassering: topp tre lyst lilla, resten grå.
// Mørkere på hover.
function radKlasse(indeks: number): string {
  return indeks <= 2 ? "bg-[#5239ba]/5" : "bg-zinc-50";
}
