# ⚽ VM-tipping 2026

Intern tippekonkurranse for Fotball-VM 2026. Deltakere logger inn med
Google (@fiken.no), tipper hvem som går videre fra hver gruppe og fyller ut
hele sluttspill-treet til finalen. Poeng gis per riktig lag, mer jo lenger
ut i sluttspillet.

**Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres + Google
Auth) · Tailwind · hostet på Vercel.

---

## Oppsett (engangsjobb)

### 1. Supabase-prosjekt

1. Opprett gratis konto + nytt prosjekt på [supabase.com](https://supabase.com).
2. Gå til **SQL Editor** og kjør hele `supabase/schema.sql`.
3. Hent nøkler under **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (hemmelig!)

### 2. Google-innlogging

1. I [Google Cloud Console](https://console.cloud.google.com): opprett et
   prosjekt → **APIs & Services → Credentials → Create OAuth client ID** →
   *Web application*.
2. **Authorized redirect URI:** `https://DITT-PROSJEKT.supabase.co/auth/v1/callback`
   (finnes ferdig i Supabase under Authentication → Providers → Google).
3. Kopier Client ID + Client Secret inn i Supabase under
   **Authentication → Providers → Google**, og skru på provideren.
4. Legg til både `http://localhost:3000` og Vercel-domenet under
   **Authentication → URL Configuration → Redirect URLs**.

### 3. Miljøvariabler

```bash
cp .env.local.example .env.local
# fyll inn verdiene
```

### 4. Kjør lokalt

```bash
npm install
npm run dev
# http://localhost:3000
```

---

## Deploy til Vercel

1. Push til GitHub og importer repoet i Vercel.
2. Legg inn de samme miljøvariablene under **Settings → Environment Variables**.
3. Legg Vercel-domenet til i Supabase **Redirect URLs** og Google OAuth.

---

## Turneringsdata

Lag, grupper og sluttspill-stige ligger i `src/data/turnering.ts` (bekreftet
mot NRK/Eurosport, FIFAs offisielle stige kamp 73–104). Databasen lagrer kun
profiler, tips og fasit.
