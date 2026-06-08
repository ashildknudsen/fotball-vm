"use client";

import { useEffect, useState } from "react";

// Live nedtelling til et tidspunkt (ms). Teller ned hvert sekund.
export default function Nedtelling({ frist }: { frist: number }) {
  const [nå, setNå] = useState<number | null>(null);

  useEffect(() => {
    setNå(Date.now());
    const id = setInterval(() => setNå(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = nå === null ? null : Math.max(0, frist - nå);

  const dager = diff === null ? null : Math.floor(diff / 86_400_000);
  const timer = diff === null ? null : Math.floor((diff % 86_400_000) / 3_600_000);
  const min = diff === null ? null : Math.floor((diff % 3_600_000) / 60_000);
  const sek = diff === null ? null : Math.floor((diff % 60_000) / 1_000);

  // Når fristen er ute forsvinner nedtellingen helt.
  if (diff !== null && diff <= 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-start gap-2 sm:gap-3">
        <Boks tall={dager} enhet="dager" />
        <Boks tall={timer} enhet="timer" />
        <Boks tall={min} enhet="min" />
        <Boks tall={sek} enhet="sek" />
      </div>
    </div>
  );
}

function Boks({ tall, enhet }: { tall: number | null; enhet: string }) {
  return (
    <div className="flex w-16 flex-col items-center rounded-lg bg-[#5239ba] px-2 py-2 text-white">
      <span className="text-2xl font-bold tabular-nums">
        {tall === null ? "–" : String(tall).padStart(2, "0")}
      </span>
      <span className="text-[11px] text-white/80">{enhet}</span>
    </div>
  );
}
