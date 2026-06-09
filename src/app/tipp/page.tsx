import Link from "next/link";
import { Check, PencilLine } from "lucide-react";
import { hentEllerOpprettProfil } from "@/lib/profil";
import { lagServerKlient } from "@/lib/supabase/server";
import { type TippData, tippingErLåst } from "@/lib/tipp";
import TippeSkjema from "./TippeSkjema";
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
  const låst = tippingErLåst();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Tilbake
        </Link>
        {erLevert ? (
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
        )}
      </div>

      <h1 className="text-2xl font-bold">Velg hvilke lag du tror vil vinne</h1>

      {låst ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tippefristen har gått ut – du kan se tipset ditt, men ikke endre det.
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          Velg hvem som går videre fra hver gruppe, fyll inn de åtte beste
          treerne, og tipp deg helt fram til finalen. Du kan lagre underveis og
          endre fram til mesterskapet starter.
        </p>
      )}

      <TippeSkjema
        startTipp={eksisterende}
        erLevert={erLevert}
        låst={låst}
        påLagre={lagreTipp}
      />
    </main>
  );
}
