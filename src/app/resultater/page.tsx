import Link from "next/link";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { type TippData, beregnPoeng } from "@/lib/tipp";

type Rad = {
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
  const harFasit =
    Object.keys(fasit.gruppe ?? {}).length > 0 ||
    Object.keys(fasit.vinnere ?? {}).length > 0;

  const rader: Rad[] = (tippRader ?? [])
    .map((t) => ({
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

      {!harFasit && (
        <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Fasit er ikke lagt inn ennå – poengene oppdateres så snart
          mesterskapet er i gang.
        </p>
      )}

      {rader.length === 0 ? (
        <p className="text-zinc-500">Ingen har levert tips ennå.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rader.map((r, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                r.erMeg ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-zinc-50"
              }`}
            >
              <span className="w-6 text-center text-sm font-bold text-zinc-400">
                {plassering(i)}
              </span>
              <span className="flex-1 font-medium">
                {r.navn}
                {r.erMeg && (
                  <span className="ml-2 text-xs text-emerald-600">(deg)</span>
                )}
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
