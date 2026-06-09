"use server";

import { revalidatePath } from "next/cache";
import { lagServerKlient } from "@/lib/supabase/server";
import { type TippData, tippingErLåst, sluttspillErLåst } from "@/lib/tipp";
import { FASE } from "@/lib/fase";

export type LagreResultat = { ok: boolean; melding: string };

// Lagrer (eller oppdaterer) den innloggede brukerens tippekupong.
export async function lagreTipp(
  data: TippData,
  levert: boolean,
): Promise<LagreResultat> {
  const låst =
    FASE === "sluttspill" ? sluttspillErLåst() : tippingErLåst();
  if (låst) {
    return { ok: false, melding: "Fristen har gått ut – tipsene er låst." };
  }

  const supabase = await lagServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, melding: "Du er ikke innlogget." };
  }

  const { error } = await supabase.from("tipp").upsert(
    {
      bruker_id: user.id,
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
