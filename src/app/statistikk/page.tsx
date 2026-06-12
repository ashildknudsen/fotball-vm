import Link from "next/link";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { type TippData } from "@/lib/tipp";
import { type Gruppe, grupper, finnLag } from "@/data/turnering";

export default async function StatistikkSide() {
  await hentEllerOpprettProfil();
  const db = lagAdminKlient();
  const { data: tippRader } = await db.from("tipp").select("data");

  const tipps = (tippRader ?? [])
    .map((t) => t.data as TippData)
    .filter((t) => t.gruppe && Object.keys(t.gruppe).length > 0);
  const antall = tipps.length;

  const inc = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) ?? 0) + 1);
  const vinnerTeller = new Map<string, number>();
  const videreTeller = new Map<string, number>();
  const treerTeller = new Map<string, number>();
  const perGruppe = new Map<Gruppe, Map<string, number>>();
  grupper.forEach((g) => perGruppe.set(g, new Map()));

  for (const t of tipps) {
    for (const g of grupper) {
      const gt = t.gruppe?.[g];
      if (!gt) continue;
      if (gt.vinner) {
        inc(vinnerTeller, gt.vinner);
        inc(videreTeller, gt.vinner);
        inc(perGruppe.get(g)!, gt.vinner);
      }
      if (gt.toer) inc(videreTeller, gt.toer);
      if (gt.treer) {
        inc(videreTeller, gt.treer);
        inc(treerTeller, gt.treer);
      }
    }
  }

  const topp = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  const toppVinnere = topp(vinnerTeller, 5);
  const toppTreere = topp(treerTeller, 5);
  const alleVidere = [...videreTeller.entries()]
    .filter(([, c]) => antall > 0 && c === antall)
    .map(([id]) => id);
  const norgeVidere = videreTeller.get("norge") ?? 0;
  const norgePst = antall > 0 ? Math.round((norgeVidere / antall) * 100) : 0;
  const favoritter = grupper.map((g) => {
    const beste = [...perGruppe.get(g)!.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    return { gruppe: g, lag: beste?.[0], antall: beste?.[1] ?? 0 };
  });
  const toppfavoritt = toppVinnere[0]
    ? finnLag(toppVinnere[0][0])
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 sm:p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Tilbake
      </Link>
      <div>
        <h1 className="text-2xl font-bold">📊 Fikens statistikk</h1>
        <p className="text-sm text-zinc-500">
          Hvordan har Fiken tippet gruppespillet?
        </p>
      </div>

      {antall === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-4 py-3 text-zinc-500">
          Ingen har tippet ennå – statistikken dukker opp så snart folk er i
          gang.
        </p>
      ) : (
        <>
          {/* Stat-kort */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatKort
              ikon="👑"
              tittel="Toppfavoritt"
              verdi={
                toppfavoritt
                  ? `${toppfavoritt.flagg} ${toppfavoritt.navn}`
                  : "—"
              }
              litenVerdi
              undertekst={
                toppfavoritt ? `${toppVinnere[0][1]} stemmer` : ""
              }
            />
            <StatKort
              ikon="🤝"
              tittel="Enige om"
              verdi={
                alleVidere.length > 0 ? (
                  <div className="flex flex-col gap-0.5 leading-snug">
                    {alleVidere.map((id) => {
                      const l = finnLag(id);
                      return (
                        <span key={id}>
                          {l?.flagg} {l?.navn}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  "—"
                )
              }
              litenVerdi
              undertekst={
                alleVidere.length > 0 ? "valgt videre av alle" : "ingen ennå"
              }
            />
            <StatKort
              ikon="👥"
              tittel="Deltakere"
              verdi={String(antall)}
              undertekst="har tippet"
            />
          </div>

          {/* Norge fremhevet */}
          <section className="flex items-center gap-4 rounded-xl border border-[#5239ba]/30 bg-[#5239ba]/5 p-5">
            <span className="text-4xl sm:text-5xl">🇳🇴</span>
            <div className="flex-1">
              <h2 className="font-bold">Alt for Norge!</h2>
              <p className="text-sm text-zinc-600">
                <strong>{norgeVidere}</strong> av {antall} har Norge videre fra
                gruppespillet.
              </p>
              <div className="mt-2 h-2.5 w-full rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#5239ba]"
                  style={{ width: `${norgePst}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-[#5239ba] sm:text-3xl">
              {norgePst}%
            </span>
          </section>

          <Seksjon tittel="👑 Mest valgte gruppevinnere">
            <ol className="flex flex-col gap-3">
              {toppVinnere.map(([id, c]) => (
                <LagStolpe key={id} lagId={id} antall={c} total={antall} />
              ))}
            </ol>
          </Seksjon>

          <Seksjon tittel="🥉 Mest valgte treere">
            {toppTreere.length === 0 ? (
              <p className="text-sm text-zinc-500">Ingen treere valgt ennå.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {toppTreere.map(([id, c]) => (
                  <LagStolpe key={id} lagId={id} antall={c} total={antall} />
                ))}
              </ol>
            )}
          </Seksjon>

          <Seksjon tittel="📋 Favoritt i hver gruppe">
            <div className="grid gap-2 sm:grid-cols-2">
              {favoritter.map((f) => {
                const lag = f.lag ? finnLag(f.lag) : undefined;
                const pst =
                  antall > 0 ? Math.round((f.antall / antall) * 100) : 0;
                return (
                  <div
                    key={f.gruppe}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-xs font-bold text-zinc-500">
                      {f.gruppe}
                    </span>
                    <span className="flex-1 truncate">
                      {lag ? `${lag.flagg} ${lag.navn}` : "—"}
                    </span>
                    <span className="text-xs text-zinc-400">{pst}%</span>
                  </div>
                );
              })}
            </div>
          </Seksjon>
        </>
      )}
    </main>
  );
}

function Seksjon({
  tittel,
  children,
}: {
  tittel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">{tittel}</h2>
      {children}
    </section>
  );
}

function StatKort({
  ikon,
  tittel,
  verdi,
  enhet,
  prosent,
  undertekst,
  litenVerdi = false,
}: {
  ikon: string;
  tittel: string;
  verdi: React.ReactNode;
  enhet?: string;
  prosent?: number;
  undertekst?: React.ReactNode;
  litenVerdi?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5239ba]/10 text-base">
          {ikon}
        </span>
        <span className="text-sm font-semibold">{tittel}</span>
      </div>
      <div
        className={`font-bold tabular-nums ${litenVerdi ? "text-lg" : "text-2xl"}`}
      >
        {verdi}
        {enhet && (
          <span className="ml-1 text-sm font-normal text-zinc-400">{enhet}</span>
        )}
      </div>
      {prosent !== undefined && (
        <div className="h-1.5 w-full rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[#5239ba]"
            style={{ width: `${prosent}%` }}
          />
        </div>
      )}
      {undertekst && <p className="text-xs text-zinc-400">{undertekst}</p>}
    </div>
  );
}

function LagStolpe({
  lagId,
  antall,
  total,
}: {
  lagId: string;
  antall: number;
  total: number;
}) {
  const lag = finnLag(lagId);
  const prosent = total > 0 ? Math.round((antall / total) * 100) : 0;
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-base">{lag?.flagg}</span>
        <span className="flex-1 font-medium">{lag?.navn}</span>
        <span className="font-semibold tabular-nums">
          {prosent}%
          <span className="ml-1 text-xs font-normal text-zinc-400">
            ({antall})
          </span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-[#5239ba]"
          style={{ width: `${prosent}%` }}
        />
      </div>
    </li>
  );
}
