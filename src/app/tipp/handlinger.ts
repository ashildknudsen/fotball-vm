"use server";

import { revalidatePath } from "next/cache";
import { lagServerKlient } from "@/lib/supabase/server";
import { lagAdminKlient } from "@/lib/supabase/admin";
import {
  type TippData,
  kampLåstMedReåpning,
  sanérSluttspill,
  sluttspillErLåst,
  tippingErLåst,
} from "@/lib/tipp";
import { erGjenåpnet } from "@/lib/profil";
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

  // Gruppespill-fasen: én felles tippefrist.
  if (FASE !== "sluttspill") {
    if (tippingErLåst()) {
      return { ok: false, melding: "Fristen har gått ut – tipsene er låst." };
    }
    return await lagre(supabase, user.id, data, levert);
  }

  // Sluttspill-fasen: alt låses ved den felles sluttfristen (30. juni 16:00).
  // Utvalgte deltakere (GJENAPNE_EPOSTER) har fått gjenåpnet 8-delsfinale og
  // utover – de kan fortsatt lagre selv om fristen har gått ut.
  const gjenåpnet = erGjenåpnet(user.email ?? "");
  if (sluttspillErLåst() && !gjenåpnet) {
    return { ok: false, melding: "Sluttspillfristen har gått ut – tipsene er låst." };
  }

  const { data: lagretRad } = await supabase
    .from("tipp")
    .select("data")
    .eq("bruker_id", user.id)
    .maybeSingle();
  const lagret = (lagretRad?.data as TippData) ?? {};
  const gamleVinnere = lagret.vinnere ?? {};
  const gammelTid = lagret.vinnereTid ?? {};
  const nå = new Date().toISOString();

  // Fasiten trengs til per-kamp-låsing og server-side sanering.
  const { data: fasitRad } = await lagAdminKlient()
    .from("fasit")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const fasit = (fasitRad?.data as TippData) ?? {};

  // Håndhev per-kamp-låsing server-side: for kamper som er låst for denne
  // brukeren (16-delsfinalene alltid, og startede 89+-kamper for gjenåpnede)
  // beholdes den lagrede verdien – klientens forsøk på å endre dem ignoreres.
  const vinnere: Record<string, string> = { ...(data.vinnere ?? {}) };
  for (const kamp of sluttspill) {
    const nr = String(kamp.nummer);
    if (kampLåstMedReåpning(kamp.nummer, fasit, gjenåpnet, lagret)) {
      if (gamleVinnere[nr]) vinnere[nr] = gamleVinnere[nr];
      else delete vinnere[nr];
    }
  }

  // Tidsstempel per vinner-valg settes SERVER-SIDE (klientens vinnereTid
  // ignoreres, så det ikke kan forfalskes). Uendrede valg beholder sitt gamle
  // stempel; nye/endrede valg stemples nå. Eldre valg uten stempel (lagt inn da
  // kampen var låst etter avspark) forblir uten stempel = «i tide».
  const vinnereTid: Record<string, string> = {};
  for (const [nr, lag] of Object.entries(vinnere)) {
    if (gamleVinnere[nr] === lag) {
      if (gammelTid[nr]) vinnereTid[nr] = gammelTid[nr];
    } else {
      vinnereTid[nr] = nå;
    }
  }

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
