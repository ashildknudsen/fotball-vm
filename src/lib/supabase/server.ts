import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase-klient for bruk i serverkomponenter, route handlers og server actions.
export async function lagServerKlient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesSomSkalSettes) {
          try {
            cookiesSomSkalSettes.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll kalt fra en serverkomponent. Kan ignoreres når
            // middleware oppdaterer sesjonen for hver forespørsel.
          }
        },
      },
    },
  );
}
