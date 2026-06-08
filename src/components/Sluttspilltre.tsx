import {
  type RundeType,
  type Sluttspillkamp,
  finnKamp,
  finnLag,
  sluttspill,
} from "@/data/turnering";
import { type TippData, deltakerePåKamp } from "@/lib/tipp";

// De ordinære kolonnene. Finale + bronsefinale samles i en egen "Finaler"-kolonne.
const kolonner: { runde: RundeType; tittel: string }[] = [
  { runde: "16-delsfinale", tittel: "16-delsfinale" },
  { runde: "8-delsfinale", tittel: "Åttendelsfinale" },
  { runde: "kvartfinale", tittel: "Kvartfinale" },
  { runde: "semifinale", tittel: "Semifinale" },
];

type Medaljer = { vinner?: string; taper?: string };

// Tegner et sluttspill-tre ut fra et oppsett. Read-only.
export default function Sluttspilltre({ tipp }: { tipp: TippData }) {
  const mester = tipp.vinnere?.["104"] ? finnLag(tipp.vinnere["104"]) : undefined;
  const finale = finnKamp(104);
  const bronse = finnKamp(103);

  return (
    <div className="flex flex-col gap-4">
      {mester && (
        <p className="rounded-lg bg-emerald-100 px-4 py-3 text-center font-semibold text-emerald-900">
          🏆 Verdensmester: {mester.flagg} {mester.navn}
        </p>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-2 sm:gap-3">
          {kolonner.map(({ runde, tittel }) => (
            <div key={runde} className="flex flex-col">
              <h4 className="mb-2 text-center text-xs font-semibold text-zinc-400">
                {tittel}
              </h4>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {sluttspill
                  .filter((k) => k.runde === runde)
                  .map((kamp) => (
                    <Kampkort key={kamp.nummer} kamp={kamp} tipp={tipp} />
                  ))}
              </div>
            </div>
          ))}

          {/* Finaler: finale (gull/sølv) + bronsefinale (bronse) */}
          <div className="flex flex-col">
            <h4 className="mb-2 text-center text-xs font-semibold text-zinc-400">
              Finaler
            </h4>
            <div className="flex flex-1 flex-col justify-center gap-2">
              {finale && (
                <Kampkort
                  kamp={finale}
                  tipp={tipp}
                  medaljer={{ vinner: "🥇", taper: "🥈" }}
                />
              )}
              {bronse && (
                <Kampkort kamp={bronse} tipp={tipp} medaljer={{ vinner: "🥉" }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kampkort({
  kamp,
  tipp,
  medaljer,
}: {
  kamp: Sluttspillkamp;
  tipp: TippData;
  medaljer?: Medaljer;
}) {
  const { hjemme, borte } = deltakerePåKamp(kamp.nummer, tipp);
  const vinner = tipp.vinnere?.[String(kamp.nummer)] ?? null;

  const medalje = (lagId: string | null, vant: boolean): string | undefined => {
    if (!medaljer || !vinner || !lagId) return undefined;
    return vant ? medaljer.vinner : medaljer.taper;
  };

  return (
    <div className="w-32 rounded-lg border border-zinc-200 p-1.5 sm:w-36">
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
      className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
        vinner ? "bg-emerald-50 font-semibold text-zinc-900" : "text-zinc-400"
      }`}
    >
      {medalje && <span>{medalje}</span>}
      <span className="text-base">{lag?.flagg ?? "🛡️"}</span>
      <span className="flex-1 truncate">{lag?.navn ?? "Ubestemt"}</span>
    </div>
  );
}
