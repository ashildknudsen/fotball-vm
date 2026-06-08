import { NextResponse } from "next/server";
import { lagServerKlient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await lagServerKlient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/logg-inn`, { status: 303 });
}
