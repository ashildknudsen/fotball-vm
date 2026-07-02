import { redirect } from "next/navigation";
import { lagServerKlient } from "@/lib/supabase/server";

export type Profil = {
  id: string;
  epost: string;
  visningsnavn: string;
};

// Henter innlogget bruker og sørger for at det finnes en profil-rad.
// Oppretter profilen ved første innlogging. Sender til /logg-inn hvis
// brukeren ikke er innlogget.
export async function hentEllerOpprettProfil(): Promise<Profil> {
  const supabase = await lagServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/logg-inn");
  }

  const { data: eksisterende } = await supabase
    .from("profil")
    .select("id, epost, visningsnavn")
    .eq("id", user.id)
    .maybeSingle();

  if (eksisterende) {
    return eksisterende as Profil;
  }

  // Førstegangs innlogging – utled visningsnavn fra Google-metadata.
  const meta = user.user_metadata ?? {};
  const visningsnavn =
    meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Deltaker";

  const nyProfil = {
    id: user.id,
    epost: user.email ?? "",
    visningsnavn,
  };

  await supabase.from("profil").insert(nyProfil);
  return nyProfil;
}

// Er den innloggede brukeren admin? Basert på ADMIN_EPOSTER (env).
export function erAdmin(epost: string): boolean {
  return iEpostliste(process.env.ADMIN_EPOSTER, epost);
}

// Er brukeren blant de utvalgte som har fått gjenåpnet sluttspill-tippingen
// (8-delsfinale og utover)? Basert på GJENAPNE_EPOSTER (env), samme mønster som
// erAdmin. Tom/uten variabel = ingen gjenåpning.
export function erGjenåpnet(epost: string): boolean {
  return iEpostliste(process.env.GJENAPNE_EPOSTER, epost);
}

function iEpostliste(liste: string | undefined, epost: string): boolean {
  const eposter = (liste ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return eposter.includes(epost.toLowerCase());
}
