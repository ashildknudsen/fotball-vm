-- Databaseskjema for VM-tipping 2026.
-- Kjør dette i Supabase SQL Editor (eller via migrasjon) på et nytt prosjekt.
--
-- De statiske turneringsdataene (lag, grupper, sluttspill-stige) ligger i
-- koden (src/data/turnering.ts) og lagres IKKE her. Databasen holder kun
-- på brukerprofiler, tips og fasit.

-- ── Profil ──────────────────────────────────────────────────────────────
-- Én rad per innlogget bruker, koblet til Supabase Auth.
create table if not exists public.profil (
  id           uuid primary key references auth.users (id) on delete cascade,
  epost        text not null,
  visningsnavn text not null,
  opprettet    timestamptz not null default now()
);

alter table public.profil enable row level security;

-- Alle innloggede kan se profiler (brukes til navn på resultattavlen).
drop policy if exists "profil_les_alle" on public.profil;
create policy "profil_les_alle"
  on public.profil for select
  to authenticated
  using (true);

-- En bruker kan opprette og oppdatere sin egen profil.
drop policy if exists "profil_skriv_egen" on public.profil;
create policy "profil_skriv_egen"
  on public.profil for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profil_oppdater_egen" on public.profil;
create policy "profil_oppdater_egen"
  on public.profil for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Tipp ────────────────────────────────────────────────────────────────
-- Én rad per bruker. Hele tippekupongen lagres som JSON:
--   {
--     "gruppe":   { "A": { "vinner": "mexico", "toer": "tsjekkia" }, ... },
--     "treere":   { "74": "haiti", "77": "irak", ... },   // kampnr -> lag-id
--     "vinnere":  { "73": "mexico", "89": "brasil", ..., "104": "argentina" }
--   }
create table if not exists public.tipp (
  bruker_id uuid primary key references public.profil (id) on delete cascade,
  data      jsonb not null default '{}'::jsonb,
  levert    boolean not null default false,
  oppdatert timestamptz not null default now()
);

alter table public.tipp enable row level security;

-- En bruker ser og endrer kun sitt eget tipp. Resultattavlen og poeng
-- beregnes server-side med service-role-nøkkelen (omgår RLS), slik at
-- andres tips holdes private fram til de evt. vises samlet.
drop policy if exists "tipp_les_eget" on public.tipp;
create policy "tipp_les_eget"
  on public.tipp for select
  to authenticated
  using (auth.uid() = bruker_id);

drop policy if exists "tipp_skriv_eget" on public.tipp;
create policy "tipp_skriv_eget"
  on public.tipp for insert
  to authenticated
  with check (auth.uid() = bruker_id);

drop policy if exists "tipp_oppdater_eget" on public.tipp;
create policy "tipp_oppdater_eget"
  on public.tipp for update
  to authenticated
  using (auth.uid() = bruker_id)
  with check (auth.uid() = bruker_id);

-- ── Fasit ───────────────────────────────────────────────────────────────
-- Én enkelt rad (id = 1) med de faktiske resultatene, fylt inn av admin
-- underveis i mesterskapet. Samme JSON-form som tipp.data.
-- RLS er på uten policies: kun service-role (server/admin) kan lese/skrive.
create table if not exists public.fasit (
  id        integer primary key default 1 check (id = 1),
  data      jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

alter table public.fasit enable row level security;

insert into public.fasit (id, data)
  values (1, '{}'::jsonb)
  on conflict (id) do nothing;
