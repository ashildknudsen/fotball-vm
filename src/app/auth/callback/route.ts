import { NextResponse } from "next/server";
import { lagServerKlient } from "@/lib/supabase/server";

// Domenet som får logge inn. Kan overstyres med env-variabel.
const TILLATT_DOMENE = process.env.TILLATT_DOMENE ?? "fiken.no";

// Google OAuth sender brukeren hit etter innlogging. Vi veksler inn
// koden mot en sesjon og sjekker at e-posten tilhører riktig domene.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const neste = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/feil`);
  }

  const supabase = await lagServerKlient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/feil`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const epost = user?.email ?? "";
  if (!epost.toLowerCase().endsWith(`@${TILLATT_DOMENE}`)) {
    // Feil domene – logg ut igjen og vis feilmelding.
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/feil?grunn=domene`);
  }

  return NextResponse.redirect(`${origin}${neste}`);
}
