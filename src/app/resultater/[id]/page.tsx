import Link from "next/link";
import { Check, PencilLine } from "lucide-react";
import { notFound } from "next/navigation";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { type TippData, beregnPoeng } from "@/lib/tipp";
import { type Gruppe, grupper, finnLag } from "@/data/turnering";
import Sluttspilltre from "@/components/Sluttspilltre";
import { FASE } from "@/lib/fase";

export default async function DeltakerSide({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await hentEllerOpprettProfil();
  const db = lagAdminKlient();

  const [{ data: profil }, { data: tippRad }, { data: fasitRad }] =
    await Promise.all([
      db.from("profil").select("visningsnavn").eq("id", id).maybeSingle(),
      db.from("tipp").select("data, levert").eq("bruker_id", id).maybeSingle(),
      db.from("fasit").select("data").eq("id", 1).maybeSingle(),
    ]);

  if (!profil) notFound();

  const tipp: TippData = (tippRad?.data as TippData) ?? {};
  const fasit: TippData = (fasitRad?.data as TippData) ?? {};
  const poeng = beregnPoeng(tipp, fasit);
  const harTippet = Boolean(tippRad);
  const erLevert = tippRad?.levert ?? false;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <Link
        href="/resultater"
        className="text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Til resultattavlen
      </Link>

      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{profil.visningsnavn}</h1>
          {harTippet &&
            (erLevert ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                Levert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ddd8fe] px-2.5 py-1 text-xs font-medium text-[#5239ba]">
                <PencilLine className="h-3.5 w-3.5" />
                Kladd
              </span>
            ))}
        </div>
        <span className="shrink-0 text-lg font-bold tabular-nums">
          {poeng}
          <span className="ml-1 text-sm font-normal text-zinc-400">poeng</span>
        </span>
      </header>

      {!harTippet ? (
        <p className="rounded-lg bg-zinc-50 px-4 py-3 text-zinc-500">
          Denne deltakeren har ikke levert noe tips ennå.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Videre fra gruppene</h2>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {grupper.map((gruppe) => (
                <Gruppekort key={gruppe} gruppe={gruppe} tipp={tipp} />
              ))}
            </div>
          </section>

          {FASE === "sluttspill" && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">Sluttspill</h2>
              <Sluttspilltre tipp={tipp} />
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Gruppekort({ gruppe, tipp }: { gruppe: Gruppe; tipp: TippData }) {
  const g = tipp.gruppe?.[gruppe];
  const vinner = g?.vinner ? finnLag(g.vinner) : undefined;
  const toer = g?.toer ? finnLag(g.toer) : undefined;
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <h3 className="mb-1 text-xs font-semibold text-zinc-400">
        Gruppe {gruppe}
      </h3>
      <ol className="flex flex-col gap-1 text-sm">
        <li className="flex items-center gap-2">
          <span className="text-zinc-400">1.</span>
          <span>{vinner ? `${vinner.flagg} ${vinner.navn}` : "—"}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="text-zinc-400">2.</span>
          <span>{toer ? `${toer.flagg} ${toer.navn}` : "—"}</span>
        </li>
      </ol>
    </div>
  );
}
