"use server";

import { revalidatePath } from "next/cache";
import { lagServerKlient } from "@/lib/supabase/server";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { erAdmin } from "@/lib/profil";
import { type TippData } from "@/lib/tipp";
import { type LagreResultat } from "@/app/tipp/TippeSkjema";

// Lagrer fasit. Kun admin (jf. ADMIN_EPOSTER) får skrive.
// Signaturen matcher TippeSkjema sin påLagre – «levert» brukes ikke for fasit.
export async function lagreFasit(
  data: TippData,
  _levert: boolean,
): Promise<LagreResultat> {
  void _levert;
  const supabase = await lagServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !erAdmin(user.email ?? "")) {
    return { ok: false, melding: "Bare admin kan lagre fasit." };
  }

  const admin = lagAdminKlient();

  // Bevar den ekte 16-delsfinale-oppstillingen (settes av auto-hentingen),
  // siden admin-skjemaet ikke sender den med.
  const { data: rad } = await admin
    .from("fasit")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const eksisterende = (rad?.data as TippData) ?? {};
  const lagret: TippData = {
    ...data,
    sluttspilloppsett: data.sluttspilloppsett ?? eksisterende.sluttspilloppsett,
  };

  const { error } = await admin.from("fasit").upsert({
    id: 1,
    data: lagret,
    oppdatert: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, melding: `Kunne ikke lagre: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/resultater");
  return { ok: true, melding: "Fasit lagret ✅" };
}
