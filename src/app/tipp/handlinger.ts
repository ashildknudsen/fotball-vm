"use server";

import { revalidatePath } from "next/cache";
import { lagServerKlient } from "@/lib/supabase/server";
import { lagAdminKlient } from "@/lib/supabase/admin";
import {
  type TippData,
  sanérSluttspill,
  sluttspillErLåst,
  tippingErLåst,
} from "@/lib/tipp";
import { FASE } from "@/lib/fase";

export type LagreResultat = { ok: boolean; melding: string };

// Lagrer (eller oppdaterer) den innloggede brukerens tippekupong.
export async function lagreTipp(
  data: TippData,
  levert: boolean,
): Promise<LagreResultat> {
  const supabase = await lagServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, melding: "Du er ikke innlogget." };
  }

  // Gruppespill-fasen: én felles tippefrist.
  if (FASE !== "sluttspill") {
    if (tippingErLåst()) {
      return { ok: false, melding: "Fristen har gått ut – tipsene er låst." };
    }
    return await lagre(supabase, user.id, data, levert);
  }

  // Sluttspill-fasen: alt låses ved den felles sluttfristen (30. juni 16:00).
  // Enkeltkamper låses IKKE ved avspark – de kan fortsatt tippes (men en kamp
  // tippet etter avspark gir minuspoeng, se beregnPoengDetaljer).
  if (sluttspillErLåst()) {
    return { ok: false, melding: "Sluttspillfristen har gått ut – tipsene er låst." };
  }

  // Tidsstempel per vinner-valg settes SERVER-SIDE (klientens vinnereTid
  // ignoreres, så det ikke kan forfalskes). Uendrede valg beholder sitt gamle
  // stempel; nye/endrede valg stemples nå. Eldre valg uten stempel (lagt inn da
  // kampen var låst etter avspark) forblir uten stempel = «i tide».
  const { data: lagretRad } = await supabase
    .from("tipp")
    .select("data")
    .eq("bruker_id", user.id)
    .maybeSingle();
  const lagret = (lagretRad?.data as TippData) ?? {};
  const gamleVinnere = lagret.vinnere ?? {};
  const gammelTid = lagret.vinnereTid ?? {};
  const nå = new Date().toISOString();

  const vinnere = data.vinnere ?? {};
  const vinnereTid: Record<string, string> = {};
  for (const [nr, lag] of Object.entries(vinnere)) {
    if (gamleVinnere[nr] === lag) {
      if (gammelTid[nr]) vinnereTid[nr] = gammelTid[nr];
    } else {
      vinnereTid[nr] = nå;
    }
  }

  // Fasiten trengs til server-side sanering (rydder vekk vinnere som ikke lenger
  // er deltakere i kampen).
  const { data: fasitRad } = await lagAdminKlient()
    .from("fasit")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const fasit = (fasitRad?.data as TippData) ?? {};

  const trygt = sanérSluttspill({ ...data, vinnere, vinnereTid }, fasit);
  return await lagre(supabase, user.id, trygt, levert);
}

async function lagre(
  supabase: Awaited<ReturnType<typeof lagServerKlient>>,
  brukerId: string,
  data: TippData,
  levert: boolean,
): Promise<LagreResultat> {
  const { error } = await supabase.from("tipp").upsert(
    {
      bruker_id: brukerId,
      data,
      levert,
      oppdatert: new Date().toISOString(),
    },
    { onConflict: "bruker_id" },
  );

  if (error) {
    return { ok: false, melding: `Kunne ikke lagre: ${error.message}` };
  }

  revalidatePath("/tipp");
  revalidatePath("/");
  return {
    ok: true,
    melding: levert ? "Tipset er levert! ✅" : "Lagret som kladd 💾",
  };
}
