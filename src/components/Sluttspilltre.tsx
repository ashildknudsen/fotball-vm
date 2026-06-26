import {
  finnLag,
  kampstart,
  sluttspillKolonner,
} from "@/data/turnering";
import {
  type TippData,
  deltakerePåKamp,
  deltakerePåKampSluttspill,
} from "@/lib/tipp";

type Medaljer = { vinner?: string; taper?: string };

// Avsparkstid på formen "28.6. Kl. 21:00" – samme som i tippeskjemaet.
function kampstartTekst(iso: string): string {
  const dato = new Date(iso);
  const dag = new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "numeric",
    timeZone: "Europe/Oslo",
  }).format(dato);
  const tid = new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(dato);
  return `${dag} Kl. ${tid}`;
}

// Tegner et sluttspill-tre (read-only) i NØYAKTIG samme bracket-oppsett som
// tippeskjemaet: kolonner i delt rekkefølge (`sluttspillKolonner`), connector-
// linjer mellom rundene og en egen finale-kolonne. Hvis `fasit` er gitt (fase 2)
// seedes 16-delsfinalen med de ekte lagene derfra.
export default function Sluttspilltre({
  tipp,
  fasit,
}: {
  tipp: TippData;
  fasit?: TippData;
}) {
  const mester = tipp.vinnere?.["104"] ? finnLag(tipp.vinnere["104"]) : undefined;

  function lagPåKamp(kampnummer: number) {
    return fasit
      ? deltakerePåKampSluttspill(kampnummer, tipp, fasit)
      : deltakerePåKamp(kampnummer, tipp);
  }

  function kortFor(
    kampnummer: number,
    opts?: { medaljer?: Medaljer; rundeNavn?: string },
  ) {
    const { hjemme, borte } = lagPåKamp(kampnummer);
    const iso = fasit?.kamptider?.[String(kampnummer)] ?? kampstart[kampnummer];
    const dato = iso ? kampstartTekst(iso) : undefined;
    const etikett = opts?.rundeNavn
      ? dato
        ? `${opts.rundeNavn} · ${dato}`
        : opts.rundeNavn
      : (dato ?? `Kamp ${kampnummer}`);
    return (
      <Kampkort
        hjemme={hjemme}
        borte={borte}
        vinner={tipp.vinnere?.[String(kampnummer)] ?? null}
        etikett={etikett}
        medaljer={opts?.medaljer}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mester && (
        <p className="rounded-lg bg-emerald-100 px-4 py-3 text-center font-semibold text-emerald-900">
          🏆 Verdensmester: {mester.flagg} {mester.navn}
        </p>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch">
          {sluttspillKolonner.map((kolonne) => (
            <div key={kolonne.tittel} className="flex items-stretch">
              <div className="flex w-44 flex-col sm:w-52">
                <Kolonnetittel>{kolonne.tittel}</Kolonnetittel>
                <div className="flex flex-1 flex-col">
                  {kolonne.kamper.map((nr) => (
                    <div
                      key={nr}
                      className="flex flex-1 items-center justify-center px-1.5 py-1"
                    >
                      {kortFor(nr)}
                    </div>
                  ))}
                </div>
              </div>
              <Kobling antallPar={kolonne.kamper.length / 2} />
            </div>
          ))}

          {/* Finaler: finale (gull/sølv) + bronsefinale (bronse). */}
          <div className="flex w-44 flex-col sm:w-52">
            <Kolonnetittel>Finaler</Kolonnetittel>
            <div className="flex flex-1 flex-col justify-center gap-3 px-1.5">
              {kortFor(104, { medaljer: { vinner: "🥇", taper: "🥈" }, rundeNavn: "Finale" })}
              {kortFor(103, { medaljer: { vinner: "🥉" }, rundeNavn: "Bronsefinale" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kolonnetittel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 px-1.5 text-center text-xs font-semibold text-zinc-400">
      {children}
    </h4>
  );
}

// Connector-linjene mellom to runder – identisk med tippeskjemaet.
function Kobling({ antallPar }: { antallPar: number }) {
  return (
    <div className="flex w-6 flex-col sm:w-8">
      <Kolonnetittel>
        <span className="opacity-0">.</span>
      </Kolonnetittel>
      <div className="flex flex-1 flex-col">
        {Array.from({ length: antallPar }, (_, i) => (
          <div key={i} className="relative flex-1">
            <span className="absolute left-0 top-1/4 h-0.5 w-1/2 bg-zinc-300" />
            <span className="absolute left-0 top-3/4 h-0.5 w-1/2 bg-zinc-300" />
            <span className="absolute left-1/2 top-1/4 h-1/2 w-0.5 bg-zinc-300" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-1/2 bg-zinc-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Kampkort({
  hjemme,
  borte,
  vinner,
  etikett,
  medaljer,
}: {
  hjemme: string | null;
  borte: string | null;
  vinner: string | null;
  etikett: string;
  medaljer?: Medaljer;
}) {
  const medalje = (lagId: string | null, vant: boolean): string | undefined => {
    if (!medaljer || !vinner || !lagId) return undefined;
    return vant ? medaljer.vinner : medaljer.taper;
  };

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-1.5">
      <div className="mb-1 px-0.5 text-[10px] leading-tight text-zinc-400">
        {etikett}
      </div>
      <div className="flex flex-col gap-1">
        <Lagrad
          lagId={hjemme}
          vinner={vinner !== null && vinner === hjemme}
          medalje={medalje(hjemme, vinner === hjemme)}
        />
        <Lagrad
          lagId={borte}
          vinner={vinner !== null && vinner === borte}
          medalje={medalje(borte, vinner === borte)}
        />
      </div>
    </div>
  );
}

function Lagrad({
  lagId,
  vinner,
  medalje,
}: {
  lagId: string | null;
  vinner: boolean;
  medalje?: string;
}) {
  const lag = lagId ? finnLag(lagId) : undefined;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm ${
        vinner
          ? "border-emerald-500 bg-emerald-50 font-semibold"
          : "border-zinc-200"
      }`}
    >
      {medalje && <span>{medalje}</span>}
      <span className="text-sm">{lag?.flagg ?? "🛡️"}</span>
      <span className="flex-1 truncate">{lag?.navn ?? "Ubestemt"}</span>
    </div>
  );
}