import type {
  ExperimentSurfaceGraphPaneV2,
  ExperimentSurfaceGraphTraceColorV2,
  ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import type { AppThemeId } from "@/appTheme";

export const WORKBENCH_SCENARIO_COLOR_PALETTE_V3 = Object.freeze([
  "#ff5f73",
  "#39c2ff",
  "#8b76d1",
  "#2f9e7d",
  "#e0a645",
  "#ce6ca8",
] as const);

export type WorkbenchGraphRendererV3 =
  | "sweep"
  | "xy"
  | "pressure-volume"
  | "structural-return"
  | "cycle-waveform";

export type WorkbenchResolvedGraphTraceStyleV3 = Readonly<{
  color: string;
}>;

const WORKBENCH_SINGLE_SCENARIO_ITEM_PALETTE_V3: Readonly<
  Record<string, Readonly<Record<AppThemeId, string>>>
> = Object.freeze({
  LVP: Object.freeze({ light: "#a12bc7", dark: "#e07ce8" }),
  LV: Object.freeze({ light: "#a12bc7", dark: "#e07ce8" }),
  LAP: Object.freeze({ light: "#0068a3", dark: "#39c2ff" }),
  LA: Object.freeze({ light: "#0068a3", dark: "#39c2ff" }),
  AoP: Object.freeze({ light: "#c22347", dark: "#ff5f73" }),
  ABP: Object.freeze({ light: "#8f5b00", dark: "#f6bd3f" }),
  SAP: Object.freeze({ light: "#8f5b00", dark: "#f6bd3f" }),
  AoV: Object.freeze({ light: "#c22347", dark: "#ff5f73" }),
  RAP: Object.freeze({ light: "#00786f", dark: "#2fd0b2" }),
  RA: Object.freeze({ light: "#00786f", dark: "#2fd0b2" }),
  RVP: Object.freeze({ light: "#4740c6", dark: "#8f9bff" }),
  RV: Object.freeze({ light: "#4740c6", dark: "#8f9bff" }),
  PAP: Object.freeze({ light: "#a2431d", dark: "#ff8a5c" }),
  PV: Object.freeze({ light: "#4740c6", dark: "#8f9bff" }),
  MV: Object.freeze({ light: "#a12bc7", dark: "#e07ce8" }),
  TV: Object.freeze({ light: "#00786f", dark: "#2fd0b2" }),
});

/*
 * Released Article/Snapshot content stores automatic colors. Reinterpret the
 * former semantic seeds through the current theme palette instead of treating
 * them as arbitrary custom colors; authored custom colors remain untouched.
 */
const WORKBENCH_LEGACY_SEMANTIC_COLOR_PALETTE_V3 = Object.freeze([
  Object.freeze({ legacyDark: "#ff5a78", light: "#c22347", dark: "#ff5f73" }),
  Object.freeze({ legacyDark: "#b78bfa", light: "#a12bc7", dark: "#e07ce8" }),
  Object.freeze({ legacyDark: "#33b1ff", light: "#0068a3", dark: "#39c2ff" }),
  Object.freeze({ legacyDark: "#2dd4bf", light: "#00786f", dark: "#2fd0b2" }),
  Object.freeze({ legacyDark: "#7c83fd", light: "#4740c6", dark: "#8f9bff" }),
  Object.freeze({ legacyDark: "#fbbf24", light: "#8f5b00", dark: "#f6bd3f" }),
] as const);

/** Stable semantic seed used only when a single-Scenario trace is allocated. */
export function workbenchSemanticItemColorV3(seriesId: string): string {
  return workbenchSemanticItemColorOrNullV3(seriesId) ?? "#66717b";
}

function workbenchSemanticItemColorOrNullV3(seriesId: string): string | null {
  return WORKBENCH_SINGLE_SCENARIO_ITEM_PALETTE_V3[seriesId]?.dark ?? null;
}

export function workbenchDefaultScenarioColorV3(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) {
    return WORKBENCH_SCENARIO_COLOR_PALETTE_V3[0];
  }
  return WORKBENCH_SCENARIO_COLOR_PALETTE_V3[
    index % WORKBENCH_SCENARIO_COLOR_PALETTE_V3.length
  ]!;
}

/** Scenario color is an allocation seed, not a live graph theme token. */
export function workbenchScenarioColorSeedV3(input: Readonly<{
  surface: ExperimentSurfaceV2;
  scenarioId: string;
  scenarioIndex: number;
}>): string {
  return input.surface.scenarioColorSeeds?.find(({ scenarioId }) =>
    scenarioId === input.scenarioId)?.colorHex
    ?? workbenchDefaultScenarioColorV3(input.scenarioIndex);
}

/** Deterministic fallback used before a missing trace has been materialized. */
export function deriveWorkbenchScenarioItemColorV3(
  baseColorHex: string,
  itemIndex: number,
): string {
  if (!Number.isSafeInteger(itemIndex) || itemIndex <= 0) {
    return canonicalColorHexV3(baseColorHex);
  }
  const [lightness, chroma, hue] = rgbToOklchV3(
    hexToRgbV3(canonicalColorHexV3(baseColorHex)),
  );
  const hueOffsets = Object.freeze([0, 95, -95, 170, -170]);
  const lightnessOffsets = Object.freeze([0, 0.07, -0.04, 0.03, -0.02]);
  return oklchToHexV3([
    clampV3(
      lightness + lightnessOffsets[itemIndex % lightnessOffsets.length]!,
      0.66,
      0.82,
    ),
    clampV3(Math.max(chroma, 0.14), 0.12, 0.18),
    (hue + hueOffsets[itemIndex % hueOffsets.length]! + 360) % 360,
  ]);
}

/** Perceptual distance used by the automatic solid-line color allocator. */
export function workbenchPerceptualColorDistanceV3(
  leftColorHex: string,
  rightColorHex: string,
): number {
  const left = rgbToOklabV3(
    hexToRgbV3(canonicalColorHexV3(leftColorHex)),
  );
  const right = rgbToOklabV3(
    hexToRgbV3(canonicalColorHexV3(rightColorHex)),
  );
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  );
}

export function resolveWorkbenchGraphTraceStyleV3(input: Readonly<{
  pane: ExperimentSurfaceGraphPaneV2;
  surface: ExperimentSurfaceV2;
  renderer: WorkbenchGraphRendererV3;
  authoredScenarioCount: number;
  scenarioId: string;
  scenarioIndex: number;
  seriesId: string | null;
  seriesIndex?: number;
  appTheme?: AppThemeId;
}>): WorkbenchResolvedGraphTraceStyleV3 {
  const materialized = input.pane.traceColors?.find((trace) =>
    trace.scenarioId === input.scenarioId
    && trace.seriesId === input.seriesId);
  const baseColor = workbenchScenarioColorSeedV3(input);
  const fallbackColor = input.renderer === "sweep"
      && input.authoredScenarioCount <= 1
      && input.seriesId !== null
    ? workbenchSemanticItemColorV3(input.seriesId)
    : deriveWorkbenchScenarioItemColorV3(baseColor, input.seriesIndex ?? 0);
  const customColor = materialized?.customColorHex;
  if (customColor !== undefined) {
    return Object.freeze({ color: canonicalColorHexV3(customColor) });
  }
  const automaticColor = materialized?.automaticColorHex ?? fallbackColor;
  return Object.freeze({
    color: resolveWorkbenchAutomaticGraphColorV3({
      colorHex: automaticColor,
      appTheme: input.appTheme ?? "dark",
    }),
  });
}

export function resolveWorkbenchAutomaticGraphColorV3(input: Readonly<{
  colorHex: string;
  appTheme: AppThemeId;
}>): string {
  const canonical = canonicalColorHexV3(input.colorHex);
  const semantic = Object.values(
    WORKBENCH_SINGLE_SCENARIO_ITEM_PALETTE_V3,
  ).find((candidate) => candidate.dark === canonical);
  if (semantic !== undefined) return semantic[input.appTheme];
  const legacySemantic = WORKBENCH_LEGACY_SEMANTIC_COLOR_PALETTE_V3.find(
    (candidate) => candidate.legacyDark === canonical,
  );
  if (legacySemantic !== undefined) return legacySemantic[input.appTheme];
  return ensureWorkbenchGraphContrastV3(input.colorHex, input.appTheme);
}

/**
 * Adds stable Scenario base seeds and materializes every missing graph trace.
 * Existing automatic and custom colors are retained byte-for-byte.
 */
export function reconcileWorkbenchGraphColorsV3(
  surface: ExperimentSurfaceV2,
  scenarios: readonly Readonly<{ scenarioId: string }>[],
): ExperimentSurfaceV2 {
  const allowed = new Set(scenarios.map(({ scenarioId }) => scenarioId));
  const currentById = new Map(
    (surface.scenarioColorSeeds ?? []).map((seed) => [seed.scenarioId, seed]),
  );
  const usedColors = new Set(
    [...currentById.values()]
      .filter(({ scenarioId }) => allowed.has(scenarioId))
      .map(({ colorHex }) => colorHex),
  );
  const scenarioColorSeeds = scenarios.map(({ scenarioId }, index) => {
    const current = currentById.get(scenarioId);
    if (current !== undefined) return current;
    const preferred = workbenchDefaultScenarioColorV3(index);
    const colorHex = !usedColors.has(preferred)
      ? preferred
      : WORKBENCH_SCENARIO_COLOR_PALETTE_V3.find((color) =>
          !usedColors.has(color)) ?? preferred;
    usedColors.add(colorHex);
    return Object.freeze({ scenarioId, colorHex });
  });
  const baseById = new Map(scenarioColorSeeds.map((seed) => [
    seed.scenarioId,
    seed.colorHex,
  ]));
  let panesChanged = false;
  const graphPanes = surface.graphPanes.map((pane) => {
    const next = reconcilePaneTraceColorsV3(
      pane,
      scenarios,
      baseById,
    );
    if (next !== pane) panesChanged = true;
    return next;
  });
  const currentSeeds = surface.scenarioColorSeeds ?? [];
  const seedsChanged = currentSeeds.length !== scenarioColorSeeds.length
    || scenarioColorSeeds.some((seed, index) =>
      currentSeeds[index]?.scenarioId !== seed.scenarioId
      || currentSeeds[index]?.colorHex !== seed.colorHex);
  if (!seedsChanged && !panesChanged) return surface;
  return Object.freeze({
    ...surface,
    scenarioColorSeeds: Object.freeze(scenarioColorSeeds),
    graphPanes: panesChanged ? Object.freeze(graphPanes) : surface.graphPanes,
  });
}

export function updateWorkbenchScenarioBaseColorV3(
  surface: ExperimentSurfaceV2,
  scenarioId: string,
  colorHex: string,
): ExperimentSurfaceV2 {
  const canonical = canonicalColorHexV3(colorHex);
  let found = false;
  const scenarioColorSeeds = (surface.scenarioColorSeeds ?? []).map((seed) => {
    if (seed.scenarioId !== scenarioId) return seed;
    found = true;
    return seed.colorHex === canonical
      ? seed
      : Object.freeze({ ...seed, colorHex: canonical });
  });
  if (!found) return surface;
  return Object.freeze({
    ...surface,
    scenarioColorSeeds: Object.freeze(scenarioColorSeeds),
  });
}

function reconcilePaneTraceColorsV3(
  pane: ExperimentSurfaceGraphPaneV2,
  scenarios: readonly Readonly<{ scenarioId: string }>[],
  baseById: ReadonlyMap<string, string>,
): ExperimentSurfaceGraphPaneV2 {
  const targetSeriesIds = pane.series.length === 0
    ? [null]
    : pane.series.map(({ seriesId }) => seriesId);
  const targetKeys = new Set(scenarios.flatMap(({ scenarioId }) =>
    targetSeriesIds.map((seriesId) => traceColorKeyV3(scenarioId, seriesId))));
  const currentByKey = new Map(
    (pane.traceColors ?? [])
      .filter(({ scenarioId, seriesId }) =>
        targetKeys.has(traceColorKeyV3(scenarioId, seriesId)))
      .map((trace) => [traceColorKeyV3(trace.scenarioId, trace.seriesId), trace]),
  );
  const usedColors = new Set(
    [...currentByKey.values()].map(
      ({ automaticColorHex, customColorHex }) =>
        canonicalColorHexV3(customColorHex ?? automaticColorHex),
    ),
  );
  const traceColors: ExperimentSurfaceGraphTraceColorV2[] = [];
  const adaptiveMultiItemPane = targetSeriesIds.length > 1;
  scenarios.forEach(({ scenarioId }, scenarioIndex) => {
    targetSeriesIds.forEach((seriesId, itemIndex) => {
      const key = traceColorKeyV3(scenarioId, seriesId);
      const current = currentByKey.get(key);
      if (current !== undefined) {
        traceColors.push(current);
        return;
      }
      const base = baseById.get(scenarioId) ?? workbenchDefaultScenarioColorV3(0);
      const semanticColor = seriesId === null
        ? null
        : workbenchSemanticItemColorOrNullV3(seriesId);
      const automaticColorHex = !adaptiveMultiItemPane
        ? canonicalColorHexV3(base)
        : scenarioIndex === 0 && semanticColor !== null
        ? semanticColor
        : allocateAdaptiveWorkbenchTraceColorV3({
            baseColorHex: base,
            preferredIndex:
              scenarioIndex * targetSeriesIds.length + itemIndex,
            usedColorHexes: [...usedColors],
          });
      const trace = Object.freeze({
        scenarioId,
        seriesId,
        automaticColorHex,
      } satisfies ExperimentSurfaceGraphTraceColorV2);
      traceColors.push(trace);
      usedColors.add(automaticColorHex);
    });
  });
  const current = pane.traceColors ?? [];
  const changed = current.length !== traceColors.length
    || traceColors.some((trace, index) => current[index] !== trace);
  if (!changed) return pane;
  return Object.freeze({
    ...pane,
    traceColors: Object.freeze(traceColors),
  });
}

function allocateAdaptiveWorkbenchTraceColorV3(input: Readonly<{
  baseColorHex: string;
  preferredIndex: number;
  usedColorHexes: readonly string[];
}>): string {
  const [, , baseHue] = rgbToOklchV3(
    hexToRgbV3(canonicalColorHexV3(input.baseColorHex)),
  );
  const candidates: string[] = [];
  const candidateKeys = new Set<string>();
  const goldenAngleDeg = 137.50776405003785;
  const lightnessTiers = Object.freeze([0.74, 0.82, 0.67]);
  for (const lightness of lightnessTiers) {
    for (let index = 0; index < 48; index += 1) {
      const hue = (
        baseHue +
        (input.preferredIndex + index) * goldenAngleDeg
      ) % 360;
      const candidate = ensureWorkbenchGraphContrastV3(
        oklchToHexV3([lightness, lightness === 0.82 ? 0.13 : 0.17, hue]),
        "dark",
      );
      if (candidateKeys.has(candidate)) continue;
      candidateKeys.add(candidate);
      candidates.push(candidate);
    }
  }
  if (input.usedColorHexes.length === 0) {
    return candidates[0] ?? canonicalColorHexV3(input.baseColorHex);
  }
  let winner = candidates[0] ?? canonicalColorHexV3(input.baseColorHex);
  let winnerDistance = -1;
  for (const candidate of candidates) {
    const nearestDistance = Math.min(
      ...(["dark", "light"] as const).flatMap((appTheme) => {
        const resolvedCandidate = resolveWorkbenchAutomaticGraphColorV3({
          colorHex: candidate,
          appTheme,
        });
        return input.usedColorHexes.map((usedColor) =>
          workbenchPerceptualColorDistanceV3(
            resolvedCandidate,
            resolveWorkbenchAutomaticGraphColorV3({
              colorHex: usedColor,
              appTheme,
            }),
          ));
      }),
    );
    if (nearestDistance > winnerDistance) {
      winner = candidate;
      winnerDistance = nearestDistance;
    }
  }
  return winner;
}

function traceColorKeyV3(scenarioId: string, seriesId: string | null): string {
  return `${scenarioId}\u001f${seriesId ?? ""}`;
}

function canonicalColorHexV3(value: string): string {
  const candidate = value.toLowerCase();
  return /^#[0-9a-f]{6}$/.test(candidate) ? candidate : "#ff5f73";
}

type RgbV3 = readonly [number, number, number];
type HslV3 = readonly [number, number, number];
type OklabV3 = readonly [number, number, number];
type OklchV3 = readonly [number, number, number];

function hexToRgbV3(value: string): RgbV3 {
  return Object.freeze([
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ]);
}

function rgbToHexV3([red, green, blue]: RgbV3): string {
  return `#${[red, green, blue].map((channel) =>
    Math.round(clampV3(channel, 0, 255)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHslV3([redByte, greenByte, blueByte]: RgbV3): HslV3 {
  const red = redByte / 255;
  const green = greenByte / 255;
  const blue = blueByte / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;
  if (delta !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const saturation = delta === 0
    ? 0
    : delta / (1 - Math.abs(2 * lightness - 1));
  return Object.freeze([hue, saturation * 100, lightness * 100]);
}

function hslToRgbV3([hue, saturationPercent, lightnessPercent]: HslV3): RgbV3 {
  const saturation = saturationPercent / 100;
  const lightness = lightnessPercent / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const component = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const [red, green, blue]: RgbV3 = hue < 60
    ? [chroma, component, 0]
    : hue < 120
      ? [component, chroma, 0]
      : hue < 180
        ? [0, chroma, component]
        : hue < 240
          ? [0, component, chroma]
          : hue < 300
            ? [component, 0, chroma]
            : [chroma, 0, component];
  return Object.freeze([
    (red + match) * 255,
    (green + match) * 255,
    (blue + match) * 255,
  ]);
}

function rgbToOklabV3([redByte, greenByte, blueByte]: RgbV3): OklabV3 {
  const [red, green, blue] = [redByte, greenByte, blueByte].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(
    0.4122214708 * red! + 0.5363325363 * green! + 0.0514459929 * blue!,
  );
  const m = Math.cbrt(
    0.2119034982 * red! + 0.6806995451 * green! + 0.1073969566 * blue!,
  );
  const s = Math.cbrt(
    0.0883024619 * red! + 0.2817188376 * green! + 0.6299787005 * blue!,
  );
  return Object.freeze([
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]);
}

function rgbToOklchV3(rgb: RgbV3): OklchV3 {
  const [lightness, a, b] = rgbToOklabV3(rgb);
  const hueRadians = Math.atan2(b, a);
  return Object.freeze([
    lightness,
    Math.hypot(a, b),
    (hueRadians * 180 / Math.PI + 360) % 360,
  ]);
}

function oklchToHexV3([lightness, requestedChroma, hue]: OklchV3): string {
  const radians = hue * Math.PI / 180;
  for (let chroma = requestedChroma; chroma >= 0; chroma -= 0.004) {
    const rgb = oklabToSrgbV3([
      lightness,
      chroma * Math.cos(radians),
      chroma * Math.sin(radians),
    ]);
    if (rgb.every((channel) => channel >= 0 && channel <= 255)) {
      return rgbToHexV3(rgb);
    }
  }
  const neutral = oklabToSrgbV3([lightness, 0, 0]);
  return rgbToHexV3([
    clampV3(neutral[0], 0, 255),
    clampV3(neutral[1], 0, 255),
    clampV3(neutral[2], 0, 255),
  ]);
}

function oklabToSrgbV3([lightness, a, b]: OklabV3): RgbV3 {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = Object.freeze([
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]);
  const encode = (channel: number) => {
    const value = channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * channel ** (1 / 2.4) - 0.055;
    return value * 255;
  };
  return Object.freeze([
    encode(linear[0]!),
    encode(linear[1]!),
    encode(linear[2]!),
  ]);
}

function ensureWorkbenchGraphContrastV3(
  colorHex: string,
  appTheme: AppThemeId,
): string {
  const canonical = canonicalColorHexV3(colorHex);
  const background = appTheme === "dark" ? "#0a141d" : "#ffffff";
  if (contrastRatioV3(canonical, background) >= 4.5) return canonical;
  const [hue, saturation, initialLightness] = rgbToHslV3(
    hexToRgbV3(canonical),
  );
  for (let offset = 1; offset <= 70; offset += 1) {
    const lightness = appTheme === "dark"
      ? clampV3(initialLightness + offset, 0, 88)
      : clampV3(initialLightness - offset, 18, 100);
    const candidate = rgbToHexV3(hslToRgbV3([
      hue,
      Math.max(48, saturation),
      lightness,
    ]));
    if (contrastRatioV3(candidate, background) >= 4.5) return candidate;
  }
  return appTheme === "dark" ? "#edf4fa" : "#1f2933";
}

function contrastRatioV3(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminanceV3(hexToRgbV3(foreground));
  const backgroundLuminance = relativeLuminanceV3(hexToRgbV3(background));
  return (
    Math.max(foregroundLuminance, backgroundLuminance) + 0.05
  ) / (
    Math.min(foregroundLuminance, backgroundLuminance) + 0.05
  );
}

function relativeLuminanceV3([red, green, blue]: RgbV3): number {
  const linear = [red, green, blue].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function clampV3(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
