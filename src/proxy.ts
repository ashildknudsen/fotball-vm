import { type NextRequest } from "next/server";
import { oppdaterSesjon } from "@/lib/supabase/middleware";

// Next.js 16 «proxy» (tidligere «middleware») – kjører før hver forespørsel.
export async function proxy(request: NextRequest) {
  return await oppdaterSesjon(request);
}

export const config = {
  matcher: [
    // Kjør på alle ruter unntatt statiske filer og bilder.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
