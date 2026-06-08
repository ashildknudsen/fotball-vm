// Engangsskript for å legge inn (eller fjerne) test-deltakere i databasen.
//   npx tsx scripts/seed-test.ts seed    -> oppretter test-deltakere
//   npx tsx scripts/seed-test.ts clean   -> sletter alle test-deltakere
//
// Test-brukere får e-post @vmtest.local, så de er lette å rydde bort.
// NB: databasen er delt med produksjon – husk å kjøre "clean" før lansering.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { grupper, lagIGruppe } from "../src/data/turnering";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const navn = [
  "Kari Nordmann",
  "Ola Hansen",
  "Ingrid Berg",
  "Lars Olsen",
  "Nora Lie",
  "Emil Dahl",
];

async function seed() {
  for (let i = 0; i < navn.length; i++) {
    const epost = `vmtest-${i + 1}@vmtest.local`;
    const { data: u, error } = await admin.auth.admin.createUser({
      email: epost,
      email_confirm: true,
    });
    if (error || !u.user) {
      console.log(`Hoppet over ${epost}: ${error?.message}`);
      continue;
    }
    const id = u.user.id;
    await admin.from("profil").insert({ id, epost, visningsnavn: navn[i] });

    // Tilfeldige gruppevalg (1.- og 2.-plass).
    const gruppe: Record<string, { vinner: string; toer: string }> = {};
    for (const g of grupper) {
      const stokket = [...lagIGruppe(g)].sort(() => Math.random() - 0.5);
      gruppe[g] = { vinner: stokket[0].id, toer: stokket[1].id };
    }
    await admin.from("tipp").insert({ bruker_id: id, data: { gruppe }, levert: true });
    console.log(`Opprettet ${navn[i]}`);
  }
}

async function clean() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users) {
    if (u.email?.endsWith("@vmtest.local")) {
      await admin.auth.admin.deleteUser(u.id);
      console.log(`Slettet ${u.email}`);
    }
  }
}

async function main() {
  const kommando = process.argv[2];
  if (kommando === "clean") await clean();
  else await seed();
}

main();
