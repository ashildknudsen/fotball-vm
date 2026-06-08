import Link from "next/link";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { type TippData, beregnPoeng } from "@/lib/tipp";

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
            – mer jo lenger ut: 16-delsfinale 2, åttendelsfinale 3, kvartfinale
            5, semifinale 8, bronsefinale 10, finale 15.
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
          {rader.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/resultater/${r.id}`}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition ${radKlasse(
                  i,
                )} ${r.erMeg ? "ring-1 ring-[#5239ba]/70" : ""}`}
              >
                <span className="w-6 text-center text-sm font-bold text-zinc-400">
                  {plassering(i)}
                </span>
                <span className="flex-1 font-medium">
                  {r.navn}
                  {!r.levert && (
                    <span className="ml-2 text-xs text-zinc-400">kladd</span>
                  )}
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {r.poeng}
                  <span className="ml-1 text-xs font-normal text-zinc-400">
                    p
                  </span>
                </span>
                <span className="text-zinc-300">›</span>
              </Link>
            </li>
          ))}
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
  if (indeks <= 2) return "bg-[#5239ba]/5 hover:bg-[#5239ba]/15";
  return "bg-zinc-50";
}
