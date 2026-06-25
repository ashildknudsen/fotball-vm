"use server";

import { revalidatePath } from "next/cache";
import { lagServerKlient } from "@/lib/supabase/server";
import { lagAdminKlient } from "@/lib/supabase/admin";
import {
  type TippData,
  kampLåst,
  sanérSluttspill,
  sluttspillErLåst,
  tippingErLåst,
} from "@/lib/tipp";
import { sluttspill } from "@/data/turnering";
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

  // I gruppespill-fasen gjelder én felles tippefrist.
  if (FASE !== "sluttspill") {
    if (tippingErLåst()) {
      return { ok: false, melding: "Fristen har gått ut – tipsene er låst." };
    }
    return await lagre(supabase, user.id, data, levert);
  }

  // Sluttspill-fasen: hele treet låses ved den felles sluttfristen.
  if (sluttspillErLåst()) {
    return { ok: false, melding: "Sluttspillfristen har gått ut – tipsene er låst." };
  }

  // Per-kamp-låsing: for kamper som alt er låst (avspark passert) beholder vi
  // den lagrede verdien og ignorerer klientens forsøk på å endre dem.
  const { data: fasitRad } = await lagAdminKlient()
    .from("fasit")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const fasit = (fasitRad?.data as TippData) ?? {};

  const { data: lagretRad } = await supabase
    .from("tipp")
    .select("data")
    .eq("bruker_id", user.id)
    .maybeSingle();
  const lagretVinnere = (lagretRad?.data as TippData)?.vinnere ?? {};

  const vinnere: Record<string, string> = { ...(data.vinnere ?? {}) };
  for (const kamp of sluttspill) {
    const nøkkel = String(kamp.nummer);
    if (kampLåst(kamp.nummer, fasit)) {
      if (lagretVinnere[nøkkel]) vinnere[nøkkel] = lagretVinnere[nøkkel];
      else delete vinnere[nøkkel];
    }
  }

  const trygt = sanérSluttspill({ ...data, vinnere }, fasit);
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
