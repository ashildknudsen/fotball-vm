import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { lagServerKlient } from "@/lib/supabase/server";
import { lagAdminKlient } from "@/lib/supabase/admin";
import { erAdmin } from "@/lib/profil";
import { type TippData, sanérTipp } from "@/lib/tipp";
import { hentVMKamper, hentVMTabeller } from "@/lib/resultater/footballData";
import { byggFasit } from "@/lib/resultater/byggFasit";

// Henter resultater fra ESPN Public API og oppdaterer fasit.
// Kalles enten av Vercel Cron (med Bearer CRON_SECRET) eller manuelt av en
// innlogget admin (via knappen på admin-siden).
export async function GET(request: Request) {
  const tillatt = await harTilgang(request);
  if (!tillatt) {
    return NextResponse.json({ ok: false, feil: "Ikke tilgang" }, { status: 401 });
  }

  try {
    const [tabeller, kamper] = await Promise.all([
      hentVMTabeller(),
      hentVMKamper(),
    ]);
    const { fasit: utledet, logg } = byggFasit(tabeller, kamper);

    const admin = lagAdminKlient();
    const { data: rad } = await admin
      .from("fasit")
      .select("data")
      .eq("id", 1)
      .maybeSingle();
    const eksisterende: TippData = (rad?.data as TippData) ?? {};

    // Flett: utledede verdier overstyrer, men admin-verdier for kamper som
    // ennå ikke er utledet beholdes.
    const flettet = sanérTipp({
      gruppe: { ...(eksisterende.gruppe ?? {}), ...(utledet.gruppe ?? {}) },
      vinnere: { ...(eksisterende.vinnere ?? {}), ...(utledet.vinnere ?? {}) },
      sluttspilloppsett: {
        ...(eksisterende.sluttspilloppsett ?? {}),
        ...(utledet.sluttspilloppsett ?? {}),
      },
      kamptider: {
        ...(eksisterende.kamptider ?? {}),
        ...(utledet.kamptider ?? {}),
      },
      tabeller: utledet.tabeller ?? eksisterende.tabeller,
    });

    const { error } = await admin.from("fasit").upsert({
      id: 1,
      data: flettet,
      oppdatert: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    revalidatePath("/tipp");
    revalidatePath("/resultater");
    return NextResponse.json({ ok: true, logg });
  } catch (feil) {
    const melding = feil instanceof Error ? feil.message : "Ukjent feil";
    return NextResponse.json({ ok: false, feil: melding }, { status: 500 });
  }
}

async function harTilgang(request: Request): Promise<boolean> {
  // 1) Vercel Cron sender Authorization: Bearer <CRON_SECRET>.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${cronSecret}`) return true;
  }

  // 2) Ellers: innlogget admin.
  const supabase = await lagServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user && erAdmin(user.email ?? ""));
}
