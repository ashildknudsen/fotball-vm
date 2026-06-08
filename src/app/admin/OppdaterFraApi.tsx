"use client";

import { useState } from "react";

export default function OppdaterFraApi() {
  const [henter, setHenter] = useState(false);
  const [logg, setLogg] = useState<string[] | null>(null);
  const [feil, setFeil] = useState<string | null>(null);

  async function oppdater() {
    setHenter(true);
    setFeil(null);
    setLogg(null);
    try {
      const res = await fetch("/api/oppdater-fasit", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setLogg(data.logg ?? []);
      } else {
        setFeil(data.feil ?? "Ukjent feil");
      }
    } catch (e) {
      setFeil(e instanceof Error ? e.message : "Nettverksfeil");
    } finally {
      setHenter(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Hent resultater automatisk</p>
          <p className="text-sm text-zinc-500">
            Henter fra football-data.org og fyller inn fasit. Oppdateres også
            automatisk hver time.
          </p>
        </div>
        <button
          type="button"
          onClick={oppdater}
          disabled={henter}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50"
        >
          {henter ? "Henter…" : "Oppdater nå"}
        </button>
      </div>

      {logg && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p className="font-medium">Oppdatert ✅ – last siden på nytt for å se.</p>
          <ul className="mt-1 list-inside list-disc">
            {logg.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
      {feil && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Feil: {feil}
        </p>
      )}
    </div>
  );
}
