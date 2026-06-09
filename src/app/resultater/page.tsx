import Link from "next/link";
import { Lock, PencilLine } from "lucide-react";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { type TippData, beregnPoeng, tippingErLåst } from "@/lib/tipp";

type Rad = {
  id: string;
  navn: string;
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
    .map((t) => ({
      id: t.bruker_id as string,
      navn: navnFor.get(t.bruker_id as string) ?? "Ukjent",
      poeng: beregnPoeng(t.data as TippData, fasit),
      levert: Boolean(t.levert),
      erMeg: t.bruker_id === profil.id,
    }))
    .sort((a, b) => b.poeng - a.poeng || a.navn.localeCompare(b.navn));

  // Andres oppsett kan først åpnes når tippefristen har gått ut.
  const kanSeAndres = tippingErLåst();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Tilbake
      </Link>
      <h1 className="text-2xl font-bold">🏆 Resultattavle</h1>

      <div className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <p className="font-semibold">Slik får du poeng</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            <strong>Gruppespill:</strong> 1 poeng for hvert lag du har riktig
            videre (1.- eller 2.-plass), og 1 poeng for hver riktig treer.
          </li>
          <li>
            <strong>Sluttspill:</strong> poeng for hver riktig tippet kampvinner
            – flere poeng jo lenger ut: 16-delsfinale 2 poeng, åttendelsfinale 3
            poeng, kvartfinale 5 poeng, semifinale 8 poeng, bronsefinale 10
            poeng, finale 15 poeng.
          </li>
          <li>
            <strong>Bonus:</strong> +5 poeng for hvert lag du har riktig i
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
                <span className="flex flex-1 items-center gap-2 font-medium">
                  {r.navn}
                  {!r.levert && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ddd8fe] px-2 py-0.5 text-xs font-medium text-[#5239ba]">
                      <PencilLine className="h-3 w-3" />
                      Kladd
                    </span>
                  )}
                </span>
                <span className="text-lg font-bold tabular-nums">
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
    </main>
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
