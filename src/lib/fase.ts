// Hvilken fase konkurransen er i.
//  - "gruppespill": deltakerne tipper hvem som går videre fra gruppene.
//  - "sluttspill":  åpnes etter gruppespillet, med ekte lag i sluttspill-treet.
// Endre denne når fase 2 skal åpnes.
export type Fase = "gruppespill" | "sluttspill";

export const FASE: Fase = "gruppespill";
