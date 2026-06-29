import Link from "next/link";
import { Check, PencilLine } from "lucide-react";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagServerKlient } from "@/lib/supabase/server";
import { lagAdminKlient } from "@/lib/supabase/admin";
import {
  type TippData,
  tippingErLåst,
  sluttspillErLåst,
  kampLåst,
  kampStart,
  sluttspillfristTekst,
} from "@/lib/tipp";
import { sluttspill } from "@/data/turnering";
import { FASE } from "@/lib/fase";
import TippeSkjema from "./TippeSkjema";
import SluttspillSkjema from "./SluttspillSkjema";
import { lagreTipp } from "./handlinger";

export default async function TippSide() {
  await hentEllerOpprettProfil();
  const supabase = await lagServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rad } = await supabase
    .from("tipp")
    .select("data, levert")
    .eq("bruker_id", user!.id)
    .maybeSingle();

  const eksisterende: TippData = (rad?.data as TippData) ?? {};
  const erLevert = rad?.levert ?? false;
  const harTipp = Boolean(rad);
  const erSluttspill = FASE === "sluttspill";

  // I sluttspill-fasen trenger vi fasiten (ekte oppstilling) til å seede treet.
  let fasit: TippData = {};
  if (erSluttspill) {
    const { data: fasitRad } = await lagAdminKlient()
      .from("fasit")
      .select("data")
      .eq("id", 1)
      .maybeSingle();
    fasit = (fasitRad?.data as TippData) ?? {};
  }

  // Per-kamp-låsing: hver sluttspillkamp låses ved sitt eget avspark, og alt
  // låses senest ved den felles sluttfristen. I gruppespill-fasen gjelder kun
  // den ene tippefristen.
  const låsteKamper: Record<string, boolean> = {};
  // Kamper som alt har startet (avspark passert), men fristen ikke gått ut:
  // tippes de nå blir det minuspoeng. Brukes til å varsle i skjemaet.
  const startetKamper: Record<string, boolean> = {};
  if (erSluttspill) {
    const nå = new Date();
    const fristPassert = sluttspillErLåst();
    for (const kamp of sluttspill) {
      const nøkkel = String(kamp.nummer);
      låsteKamper[nøkkel] = kampLåst(kamp.nummer, fasit);
      const start = kampStart(kamp.nummer, fasit);
      startetKamper[nøkkel] =
        !fristPassert && start !== null && nå >= start;
    }
  }
  const altLåst = erSluttspill ? sluttspillErLåst() : tippingErLåst();

  const tittel = erSluttspill
    ? "Tipp sluttspillet"
    : "Velg hvilke lag du tror vil vinne";

  return (
    <main
      className={`mx-auto flex w-full flex-col gap-6 p-4 sm:p-8 ${
        erSluttspill ? "max-w-7xl" : "max-w-3xl"
      }`}
    >
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Tilbake
        </Link>
        {/* «Levert/Kladd»-status gjelder kun gruppespillet. I sluttspillet
            tipper man kamp for kamp etter hvert som de åpner, så det finnes
            ingen enkelt innlevering. */}
        {!erSluttspill &&
          (erLevert ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Levert
            </span>
          ) : (
            harTipp && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ddd8fe] px-3 py-1 text-xs font-medium text-[#5239ba]">
                <PencilLine className="h-3.5 w-3.5" />
                Kladd
              </span>
            )
          ))}
      </div>

      <h1 className="text-2xl font-bold">{tittel}</h1>

      {altLåst ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Fristen har gått ut – du kan se tipset ditt, men ikke endre det.
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          {erSluttspill
            ? `Tipp vinneren av hver sluttspillkamp – fra de ekte 16-delsfinale-lagene og helt til finalen. Hver kamp åpnes når begge lag er klare. Felles frist: ${sluttspillfristTekst()}. Kamper som alt har startet kan du fortsatt tippe, men da gir kampen −3 poeng. Lag som ikke er avklart ennå står som «Ubestemt».`
            : "Velg hvem som går videre fra hver gruppe og marker de åtte beste treerne. Du kan lagre underveis og endre fram til fristen."}
        </p>
      )}

      {erSluttspill ? (
        <SluttspillSkjema
          startTipp={eksisterende}
          fasit={fasit}
          erLevert={erLevert}
          låsteKamper={låsteKamper}
          startetKamper={startetKamper}
          altLåst={altLåst}
          påLagre={lagreTipp}
        />
      ) : (
        <TippeSkjema
          startTipp={eksisterende}
          erLevert={erLevert}
          låst={altLåst}
          påLagre={lagreTipp}
        />
      )}
    </main>
  );
}
