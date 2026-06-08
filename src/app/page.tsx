import Link from "next/link";
import { hentEllerOpprettProfil, erAdmin } from "@/lib/profil";
import { tippingErLåst } from "@/lib/tipp";

export default async function Hjemmeside() {
  const profil = await hentEllerOpprettProfil();
  const admin = erAdmin(profil.epost);
  const låst = tippingErLåst();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6 sm:p-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚽ VM-tipping 2026</h1>
          <p className="text-sm text-zinc-500">Hei, {profil.visningsnavn}!</p>
        </div>
        <form action="/logg-ut" method="post">
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          >
            Logg ut
          </button>
        </form>
      </header>

      {låst ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tippefristen har gått ut – tipsene er låst. Følg med på resultattavlen!
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Tippingen er åpen. Lever ditt tips før mesterskapet starter!
        </p>
      )}

      <nav className="grid gap-4 sm:grid-cols-2">
        <Kort
          href="/tipp"
          tittel="Mitt tips"
          beskrivelse="Tipp hvem som går videre fra gruppene og hele veien til finalen."
          emoji="📝"
        />
        <Kort
          href="/resultater"
          tittel="Resultattavle"
          beskrivelse="Se hvem som leder konkurransen."
          emoji="🏆"
        />
        {admin && (
          <Kort
            href="/admin"
            tittel="Admin: fasit"
            beskrivelse="Legg inn faktiske resultater underveis."
            emoji="⚙️"
          />
        )}
      </nav>
    </main>
  );
}

function Kort({
  href,
  tittel,
  beskrivelse,
  emoji,
}: {
  href: string;
  tittel: string;
  beskrivelse: string;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-5 transition hover:border-zinc-400 hover:shadow-sm"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-semibold">{tittel}</span>
      <span className="text-sm text-zinc-500">{beskrivelse}</span>
    </Link>
  );
}
