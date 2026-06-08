import Image from "next/image";
import Link from "next/link";
import { hentEllerOpprettProfil, erAdmin } from "@/lib/profil";
import { tippingErLåst, tippefristTekst } from "@/lib/tipp";

export default async function Hjemmeside() {
  const profil = await hentEllerOpprettProfil();
  const admin = erAdmin(profil.epost);
  const låst = tippingErLåst();
  const frist = tippefristTekst();

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
        <Image
          src="/fotball.svg"
          alt=""
          width={120}
          height={157}
          priority
          unoptimized
          className="h-auto w-40 sm:w-48"
        />
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Fikens VM-konkurranse 2026</h1>
          <p className="text-zinc-500">Hei, {profil.visningsnavn}!</p>
        </header>

        {låst ? (
          <p className="w-full rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tippefristen ({frist}) har gått ut – tipsene er låst. Følg med på
            resultattavlen!
          </p>
        ) : (
          <p className="w-full rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Konkurransen er åpen frem til <strong>{frist}</strong>. Bli med å
            tippe kampresultater før det! Premien for høyeste score er en
            valgfri landslagsdrakt (voksen/barn) fra Unisport.
          </p>
        )}

        <nav className="grid w-full gap-4 sm:grid-cols-2">
          <Kort
            href="/tipp"
            tittel="Bli med å tippe"
            beskrivelse="Tipp hvem som går videre fra gruppene og hele veien til finalen."
          />
          <Kort
            href="/resultater"
            tittel="Resultattavle"
            beskrivelse="Se hvem som leder konkurransen."
          />
          {admin && (
            <Kort
              href="/admin"
              tittel="Admin: fasit"
              beskrivelse="Legg inn faktiske resultater underveis."
            />
          )}
        </nav>
      </main>

      <footer className="p-6 text-center">
        <form action="/logg-ut" method="post">
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            Logg ut
          </button>
        </form>
      </footer>
    </div>
  );
}

function Kort({
  href,
  tittel,
  beskrivelse,
}: {
  href: string;
  tittel: string;
  beskrivelse: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-5 text-left transition hover:border-zinc-400 hover:shadow-sm"
    >
      <span className="font-semibold">{tittel}</span>
      <span className="text-sm text-zinc-500">{beskrivelse}</span>
    </Link>
  );
}
