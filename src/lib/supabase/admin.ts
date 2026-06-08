import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase-klient med service-role-nøkkel. Omgår Row Level
// Security – brukes KUN til poengberegning (lese alle tips) og admin-fasit.
// Må aldri importeres i klientkode.
export function lagAdminKlient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
