import Link from "next/link";

export default async function FeilSide({
  searchParams,
}: {
  searchParams: Promise<{ grunn?: string }>;
}) {
  const { grunn } = await searchParams;

  const melding =
    grunn === "domene"
      ? "Du må logge inn med en @fiken.no-konto for å delta."
      : "Noe gikk galt under innloggingen. Prøv igjen.";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-bold">Innlogging feilet</h1>
      <p className="max-w-sm text-zinc-500">{melding}</p>
      <Link
        href="/logg-inn"
        className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white transition hover:bg-zinc-700"
      >
        Tilbake til innlogging
      </Link>
    </main>
  );
}
