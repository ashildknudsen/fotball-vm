import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Ruter som er åpne uten innlogging.
// /api/oppdater-fasit beskytter seg selv (cron-token eller admin), så den må
// slippe forbi proxy-en – ellers blir cron-kall uten sesjon redirectet.
const åpneRuter = [
  "/logg-inn",
  "/auth/callback",
  "/auth/feil",
  "/api/oppdater-fasit",
];

// Oppdaterer Supabase-sesjonen og beskytter ruter mot uinnloggede brukere.
export async function oppdaterSesjon(request: NextRequest) {
  let svar = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesSomSkalSettes) {
          cookiesSomSkalSettes.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          svar = NextResponse.next({ request });
          cookiesSomSkalSettes.forEach(({ name, value, options }) =>
            svar.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sti = request.nextUrl.pathname;
  const erÅpenRute = åpneRuter.some((rute) => sti.startsWith(rute));

  if (!user && !erÅpenRute) {
    const url = request.nextUrl.clone();
    url.pathname = "/logg-inn";
    return NextResponse.redirect(url);
  }

  return svar;
}
