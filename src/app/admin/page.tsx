import Link from "next/link";
import { redirect } from "next/navigation";
import { hentEllerOpprettProfil, erAdmin } from "@/lib/profil";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { type TippData } from "@/lib/tipp";
import TippeSkjema from "@/app/tipp/TippeSkjema";
import OppdaterFraApi from "./OppdaterFraApi";
import { lagreFasit } from "./handlinger";

export default async function AdminSide() {
  const profil = await hentEllerOpprettProfil();
  if (!erAdmin(profil.epost)) {
    redirect("/");
  }

  const admin = lagAdminKlient();
  const { data: rad } = await admin
    .from("fasit")
    .select("data")
    .eq("id", 1)
    .maybeSingle();

  const fasit: TippData = (rad?.data as TippData) ?? {};

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Tilbake
      </Link>
      <div>
        <h1 className="text-2xl font-bold">⚙️ Admin: fasit</h1>
        <p className="text-sm text-zinc-500">
          Fyll inn de faktiske resultatene etter hvert som de blir klare.
          Poengene på resultattavlen oppdateres automatisk.
        </p>
      </div>

      <OppdaterFraApi />

      <TippeSkjema
        startTipp={fasit}
        erLevert={false}
        låst={false}
        påLagre={lagreFasit}
        modus="fasit"
      />
    </main>
  );
}
