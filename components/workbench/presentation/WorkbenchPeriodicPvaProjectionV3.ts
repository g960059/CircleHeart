import type { MainWirePeriodicPvaV1 } from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import type { MainWirePeriodicPvaDerivationV1 } from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import type { StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import { structuralReturnOrientationFromPayloadV3 } from "./GuytonStarlingOrientationCanvasV3";

// Live frames change frequently; the immutable formal analysis does not.
// Share its derived PV geometry across Reader/Workbench graphs and outputs.
// New analyses (including progress) and pinned methods get independent entries.
const PERIODIC_PVA_CACHE_V3 = new WeakMap<
  StudioSimulationAnalysisV2,
  Map<string, MainWirePeriodicPvaV1 | null>
>();

export function periodicPvaFromAnalysisV3(
  analysis: StudioSimulationAnalysisV2 | undefined,
  side: "left" | "right",
  derivation: MainWirePeriodicPvaDerivationV1 | null,
): MainWirePeriodicPvaV1 | undefined {
  if (analysis === undefined || derivation === null) return undefined;
  const cacheKey = `${derivation.methodId}\u0000${side}`;
  const cached = PERIODIC_PVA_CACHE_V3.get(analysis)?.get(cacheKey);
  if (cached !== undefined) return cached ?? undefined;
  const orientation = structuralReturnOrientationFromPayloadV3(
    analysis.payload,
    side,
  );
  let pva: MainWirePeriodicPvaV1 | null = null;
  try {
    if (orientation !== null) {
      pva = derivation.build(
        orientation.starlingLocus,
        side === "left" ? "LV" : "RV",
      );
    }
  } catch {
    pva = null;
  }
  const analysisCache = PERIODIC_PVA_CACHE_V3.get(analysis) ?? new Map();
  analysisCache.set(cacheKey, pva);
  PERIODIC_PVA_CACHE_V3.set(analysis, analysisCache);
  return pva ?? undefined;
}
