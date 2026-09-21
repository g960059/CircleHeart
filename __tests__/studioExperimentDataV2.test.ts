import { describe, expect, it, vi } from "vitest";
import { readerPreviewSourceSha256V1, verifiedReaderPreviewV1 } from "@/studio/application/authoring/StudioReaderPreviewV1";
import { sha256StudioCanonicalJsonHex } from "@/domain/json/CanonicalJsonSha256";
import { buildReaderPreviewV1 } from "@/studio/workers/StudioReaderPreviewBuilderV1";
import type { RegisteredModelSimulationAdapterV2, StudioSimulationFrameV2 } from "@/studio/contracts/v2/simulation";

import {
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
  STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
} from "@/studio/contracts/v2/content";
import {
  assertExperimentContentMatchesModelV2,
  createScenarioPresetCaptureClonerV2,
  StudioExperimentDataValidationErrorV2,
  validateExperimentPlacementAgainstSnapshotV2,
  validateExperimentDesiredContentForModelV2,
  validateExperimentSnapshotV2,
  validateExperimentV2,
  validateScenarioPresetV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import type {
  ModelContractV2,
  RegisteredModelCaptureAdapterV2,
} from "@/studio/contracts/v2/model";

describe("Studio Experiment data V2", () => {
  it("round-trips finite display bounds without changing captures and rejects malformed ranges", () => {
    const input = experimentV2() as any;
    const capture = structuredClone(input.content.scenarios[0].capture);
    input.content.surface.graphPanes[0].axisRanges = { y: { minimum: -5, maximum: 180 } };
    const valid = validateExperimentV2(input);
    expect(valid.content.surface.graphPanes[0].axisRanges).toEqual(input.content.surface.graphPanes[0].axisRanges);
    expect(valid.content.scenarios[0].capture).toEqual(capture);
    expect(() => assertExperimentContentMatchesModelV2(valid.content, modelContractV2())).not.toThrow();
    for (const axisRanges of [null, { z: { minimum: 0, maximum: 1 } }, { y: null },
      { y: { minimum: 1, maximum: 1 } }, { y: { minimum: 5, maximum: 2 } },
      { y: { minimum: "0", maximum: 1 } }, { y: { minimum: 0 } },
      { y: { minimum: 0, maximum: Infinity } }]) {
      input.content.surface.graphPanes[0].axisRanges = axisRanges;
      expect(() => validateExperimentV2(input)).toThrow();
    }
    input.content.surface.graphPanes[0].axisRanges = { x: { minimum: 0, maximum: 1 } };
    expect(() => assertExperimentContentMatchesModelV2(validateExperimentV2(input).content, modelContractV2())).toThrow(/time window/);
  });
  it("detaches and deeply freezes a mutable experiment with an atomic Scenario capture", () => {
    const caller = experimentV2();
    const validated = validateExperimentV2(caller);

    caller.content.scenarios[0]!.label = "caller mutation";
    caller.content.scenarios[0]!.capture.fixture.controls.svr = 99;
    caller.content.scenarios[0]!.capture.checkpoint.payload.state[0] = 99;
    caller.content.surface.note.text = "caller note mutation";

    expect(validated).toMatchObject({
      experimentId: "experiment/afterload",
      version: 3,
      content: {
        modelId: "model/main-wire-v3",
        scenarios: [{
          scenarioId: "scenario/baseline",
          label: "Baseline",
          capture: {
            fixture: { controls: { svr: 1 } },
            checkpoint: {
              acceptedRevision: 1200,
              acceptedTimeSec: 2.4,
              payload: { state: [1, 2, 3] },
            },
          },
        }],
        surface: {
          note: {
            text: "Compare pressure and volume after the target changes.",
          },
        },
      },
    });
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated.content.scenarios[0]!.capture)).toBe(true);
    expect(Object.isFrozen(
      validated.content.scenarios[0]!.capture.checkpoint.payload,
    )).toBe(true);
    expect(validated.content.scenarios[0]!.capture.fixture).not.toBe(
      caller.content.scenarios[0]!.capture.fixture,
    );
    expect(validated.content.surface.note.text)
      .toBe("Compare pressure and volume after the target changes.");
  });

  it("owns checkpoint-free desired Save content without weakening durable captures", () => {
    const caller = desiredContentV2();
    const desired = validateExperimentDesiredContentForModelV2(
      caller,
      modelContractV2(),
    );

    expect(Object.keys(desired.scenarios[0]).sort()).toEqual([
      "fixture",
      "label",
      "scenarioId",
    ]);
    expect(JSON.stringify(desired)).not.toMatch(/capture|checkpoint/);
    expect(Object.isFrozen(desired)).toBe(true);
    expect(Object.isFrozen(desired.scenarios[0].fixture)).toBe(true);

    caller.scenarios[0].fixture.controls.svr = 9;
    expect((desired.scenarios[0].fixture as any).controls.svr).toBe(1);

    const smuggledCheckpoint = desiredContentV2() as Record<string, any>;
    smuggledCheckpoint.scenarios[0].checkpoint = captureV2().checkpoint;
    expect(() => validateExperimentDesiredContentForModelV2(
      smuggledCheckpoint,
      modelContractV2(),
    )).toThrow(/keys must be exactly/);
  });

  it("preserves five independent Scenarios through durable and desired content validation", () => {
    const experiment = experimentV2() as Record<string, any>;
    const baseline = experiment.content.scenarios[0];
    experiment.content.scenarios = Array.from(
      { length: 5 },
      (_, index) => ({
        ...baseline,
        scenarioId: index === 0 ? baseline.scenarioId : `scenario/${index + 1}`,
        label: `Scenario ${index + 1}`,
      }),
    );
    const validated = validateExperimentV2(experiment);
    expect(validated.content.scenarios).toHaveLength(5);
    expect(new Set(validated.content.scenarios.map(scenario => scenario.scenarioId)).size).toBe(5);
    expect(validated.content.scenarios[0].capture).not.toBe(validated.content.scenarios[1].capture);

    const desired = desiredContentV2() as Record<string, any>;
    const desiredBaseline = desired.scenarios[0];
    desired.scenarios = Array.from(
      { length: 5 },
      (_, index) => ({
        ...desiredBaseline,
        scenarioId: index === 0 ? desiredBaseline.scenarioId : `scenario/${index + 1}`,
        label: `Scenario ${index + 1}`,
      }),
    );
    expect(validateExperimentDesiredContentForModelV2(
      desired,
      modelContractV2(),
    ).scenarios).toHaveLength(5);
  });

  it("keeps immutable snapshot identity opaque and separate from Experiment version", () => {
    const snapshot = validateExperimentSnapshotV2(snapshotV2());

    expect(snapshot).toEqual(expect.objectContaining({
      snapshotId: "snapshot/3",
      createdAt: "2026-07-31T03:04:05.000Z",
      createdBy: "user/author",
    }));
    expect(Object.keys(snapshot)).not.toContain("revision");
    expect(Object.keys(snapshot)).not.toContain("hash");
    expect(Object.keys(snapshot)).not.toContain("modelRef");
    expect(Object.isFrozen(snapshot.content.surface)).toBe(true);

    const withoutActor = snapshotV2();
    delete withoutActor.createdBy;
    expect(validateExperimentSnapshotV2(withoutActor).createdBy).toBeUndefined();
  });

  it("rejects durable Standard content without exact Surface identity", () => {
    const withoutSeries = experimentV2() as Record<string, any>;
    delete withoutSeries.content.surfaceSeriesId;
    expect(() => validateExperimentV2(withoutSeries))
      .toThrow(/surfaceSeriesId|field set mismatch/);

    const withoutRelease = snapshotV2() as Record<string, any>;
    delete withoutRelease.surfaceReleaseId;
    expect(() => validateExperimentSnapshotV2(withoutRelease))
      .toThrow(/surfaceReleaseId|field set mismatch/);
  });

  it("models role panes, authored presentation metadata and exactly one note", () => {
    const validated = validateExperimentV2(experimentV2());
    expect(validated.content.surface).toEqual({
      graphPanes: [{
        paneId: "pane/pressure",
        role: "graph",
        label: "Pressure",
        order: 0,
        priority: 10,
        graphId: "catalog.graph/pressure",
        scenarioScope: { mode: "visible-scenarios" },
        excludedTraces: [],
        windowSec: 2,
        series: [{
          seriesId: "MAP",
          label: "MAP",
          order: 0,
        }],
      }],
      outputPanes: [{
        paneId: "pane/outputs",
        role: "output",
        label: "Outputs",
        order: 0,
        priority: 8,
        binding: { mode: "active-slot" },
        items: [{
          outputId: "catalog.output/map",
          label: "MAP",
          order: 0,
        }],
      }],
      controlPanes: [{
        paneId: "pane/controls",
        role: "control",
        label: "Controls",
        order: 0,
        priority: 9,
        binding: { mode: "active-slot" },
        items: [{
          controlId: "catalog.control/svr",
          label: "SVR",
          order: 0,
          presentation: { kind: "slider" },
        }],
      }],
      note: {
        text: "Compare pressure and volume after the target changes.",
      },
    });

    for (const forbidden of ["extent", "fullscreen", "layout", "geometry"]) {
      const candidate = experimentV2() as Record<string, any>;
      candidate.content.surface[forbidden] = {};
      expect(() => validateExperimentV2(candidate))
        .toThrow(/field set mismatch/);
    }

    const missingNote = experimentV2() as Record<string, any>;
    delete missingNote.content.surface.note;
    expect(() => validateExperimentV2(missingNote))
      .toThrow(/field set mismatch/);

    const noteArray = experimentV2() as Record<string, any>;
    noteArray.content.surface.note = [noteArray.content.surface.note];
    expect(() => validateExperimentV2(noteArray))
      .toThrow(/must be an object/);

    for (
      const role of ["graphPanes", "outputPanes", "controlPanes"] as const
    ) {
      const legacyPaneColor = experimentV2() as Record<string, any>;
      legacyPaneColor.content.surface[role][0].colorHex = "#3ea8ff";
      expect(() => validateExperimentV2(legacyPaneColor))
        .toThrow(/field set mismatch|keys must be exactly/);
    }

    for (const role of ["outputPanes", "controlPanes"] as const) {
      const legacyItemColor = experimentV2() as Record<string, any>;
      legacyItemColor.content.surface[role][0].items[0].colorHex = "#3ea8ff";
      expect(() => validateExperimentV2(legacyItemColor))
        .toThrow(/field set mismatch|keys must be exactly/);
    }
  });

  it("persists materialized automatic and optional custom trace colors", () => {
    const candidate = experimentV2() as Record<string, any>;
    candidate.content.surface.scenarioColorSeeds = [{
      scenarioId: "scenario/baseline",
      colorHex: "#167db8",
    }];
    candidate.content.surface.graphPanes[0].traceColors = [
      {
        scenarioId: "scenario/baseline",
        seriesId: null,
        automaticColorHex: "#a96c08",
      },
      {
        scenarioId: "scenario/baseline",
        seriesId: "MAP",
        automaticColorHex: "#167db8",
        customColorHex: "#db2777",
      },
    ];

    const validated = validateExperimentV2(candidate);
    expect(validated.content.surface.scenarioColorSeeds).toEqual([{
      scenarioId: "scenario/baseline",
      colorHex: "#167db8",
    }]);
    expect(validated.content.surface.graphPanes[0]?.traceColors)
      .toEqual(candidate.content.surface.graphPanes[0].traceColors);

    const unknownScenario = structuredClone(candidate);
    unknownScenario.content.surface.graphPanes[0].traceColors[0]
      .scenarioId = "scenario/missing";
    expect(() => validateExperimentV2(unknownScenario))
      .toThrow(/must reference a Scenario in the same Experiment/);

    const unknownItem = structuredClone(candidate);
    unknownItem.content.surface.graphPanes[0].traceColors[1].seriesId =
      "missing";
    expect(() => validateExperimentV2(unknownItem))
      .toThrow(/must reference a selected series in the same graph pane/);
  });

  it("stores one pane-level controller binding and rejects item-level targets", () => {
    const validated = validateExperimentV2(experimentV2());
    expect(validated.content.surface.controlPanes[0]?.items[0]).toEqual({
      controlId: "catalog.control/svr",
      label: "SVR",
      order: 0,
      presentation: { kind: "slider" },
    });
    expect(() => assertExperimentContentMatchesModelV2(
      validated.content,
      modelContractV2(),
    )).not.toThrow();

    const legacyTargets = experimentV2() as Record<string, any>;
    legacyTargets.content.surface.controlPanes[0].items[0].targetScenarioIds = [
      "scenario/baseline",
    ];
    expect(() => validateExperimentV2(legacyTargets))
      .toThrow(/keys must be exactly/);

    const fixed = experimentV2() as Record<string, any>;
    fixed.content.surface.controlPanes[0].binding = {
      mode: "fixed",
      scenarioIds: ["scenario/baseline"],
    };
    expect(validateExperimentV2(fixed).content.surface
      .controlPanes[0]?.binding).toEqual({
        mode: "fixed",
        scenarioIds: ["scenario/baseline"],
      });
  });

  it("stores exactly one pane-level Output binding", () => {
    const active = validateExperimentV2(experimentV2());
    expect(active.content.surface.outputPanes[0]?.binding).toEqual({
      mode: "active-slot",
    });

    const fixed = experimentV2() as Record<string, any>;
    fixed.content.surface.outputPanes[0].binding = {
      mode: "fixed",
      scenarioId: "scenario/baseline",
    };
    expect(validateExperimentV2(fixed).content.surface
      .outputPanes[0]?.binding).toEqual({
        mode: "fixed",
        scenarioId: "scenario/baseline",
      });

    const itemTarget = experimentV2() as Record<string, any>;
    itemTarget.content.surface.outputPanes[0].items[0].scenarioId =
      "scenario/baseline";
    expect(() => validateExperimentV2(itemTarget))
      .toThrow(/keys must be exactly/);

    const unknown = experimentV2() as Record<string, any>;
    unknown.content.surface.outputPanes[0].binding = {
      mode: "fixed",
      scenarioId: "scenario/missing",
    };
    expect(() => validateExperimentV2(unknown))
      .toThrow(/unknown Scenario scenario\/missing/);
  });

  it("stores slider or bounded absolute-value buttons on each control item", () => {
    const buttons = experimentV2() as Record<string, any>;
    buttons.content.surface.controlPanes[0].items[0].presentation = {
      kind: "buttons",
      options: [
        { label: "Low", value: 0.8 },
        { label: "High", value: 1.2 },
      ],
    };
    const validated = validateExperimentV2(buttons);
    expect(validated.content.surface.controlPanes[0]?.items[0]?.presentation)
      .toEqual(buttons.content.surface.controlPanes[0].items[0].presentation);
    expect(() => assertExperimentContentMatchesModelV2(
      validated.content,
      modelContractV2(),
    )).not.toThrow();

    const single = structuredClone(buttons);
    single.content.surface.controlPanes[0].items[0].presentation.options = [
      { label: "Only", value: 1 },
    ];
    expect(() => validateExperimentV2(single))
      .toThrow(/between 2 and 6 options/);

    const offLattice = structuredClone(buttons);
    offLattice.content.surface.controlPanes[0].items[0]
      .presentation.options[0].value = 0.81;
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(offLattice).content,
      modelContractV2(),
    )).toThrow(/step lattice/);
  });

  it("enforces renderer-specific selections against graph-owned series catalogs", () => {
    const emptySweep = experimentV2() as Record<string, any>;
    emptySweep.content.surface.graphPanes[0].series = [];
    const validatedEmptySweep = validateExperimentV2(emptySweep);
    expect(() => assertExperimentContentMatchesModelV2(
      validatedEmptySweep.content,
      modelContractV2(),
    )).toThrow(/sweep graphs must select at least one registered series/);

    const missingWindow = experimentV2() as Record<string, any>;
    delete missingWindow.content.surface.graphPanes[0].windowSec;
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(missingWindow).content,
      modelContractV2(),
    )).toThrow(/must configure an authored waveform window/);

    for (const invalidWindow of [0.5, 1.25, 12.5]) {
      const invalid = experimentV2() as Record<string, any>;
      invalid.content.surface.graphPanes[0].windowSec = invalidWindow;
      expect(() => validateExperimentV2(invalid))
        .toThrow(/must be 1–12 seconds in 0.5 second steps/);
    }
    const longWindow = experimentV2() as Record<string, any>;
    longWindow.content.surface.graphPanes[0].windowSec = 12;
    expect(() => assertExperimentContentMatchesModelV2(validateExperimentV2(longWindow).content, modelContractV2())).not.toThrow();

    const expandedModel = structuredClone(
      modelContractV2(),
    ) as Record<string, any>;
    expandedModel.outputCatalog.push({
      outputId: "catalog.output/temperature",
      kind: "signal",
      unit: "mmHg",
      shape: "scalar",
      sampling: "accepted-step",
    });
    expandedModel.graphCatalog[0].seriesCatalog.push({
      kind: "scalar",
      seriesId: "Temperature",
      outputId: "catalog.output/temperature",
    });

    const registeredSeriesSelection = experimentV2() as Record<string, any>;
    registeredSeriesSelection.content.surface.graphPanes[0].series[0].seriesId =
      "Temperature";
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(registeredSeriesSelection).content,
      expandedModel as ModelContractV2,
    )).not.toThrow();

    const unknownSeriesSelection = experimentV2() as Record<string, any>;
    unknownSeriesSelection.content.surface.graphPanes[0].series[0].seriesId =
      "Missing";
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(unknownSeriesSelection).content,
      expandedModel as ModelContractV2,
    )).toThrow(/unknown registered graph series Missing/);

    const hiddenOnlyTrace = experimentV2() as Record<string, any>;
    hiddenOnlyTrace.content.surface.graphPanes[0].excludedTraces = [{
      scenarioId: "scenario/baseline",
      seriesId: "MAP",
    }];
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(hiddenOnlyTrace).content,
      modelContractV2(),
    )).toThrow(/must leave at least one visible Scenario\/series trace/);

    const invalidWholeScenarioExclusion = experimentV2() as Record<string, any>;
    invalidWholeScenarioExclusion.content.surface.graphPanes[0]
      .excludedTraces = [{
        scenarioId: "scenario/baseline",
        seriesId: null,
      }];
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(invalidWholeScenarioExclusion).content,
      modelContractV2(),
    )).toThrow(/sweep exclusions must select an exact series/);

    const pressureVolumeModel = {
      ...modelContractV2(),
      graphCatalog: [{
        graphId: "hemodynamics.pressure-volume",
        renderer: "pressure-volume" as const,
        seriesCatalog: [{
          kind: "pressure-volume" as const,
          seriesId: "LV",
          volumeOutputId: "catalog.output/map",
          pressureOutputId: "catalog.output/map",
          pressureBasis: "transmural" as const,
          cyclePhaseOutputId: "catalog.output/map",
        }],
        defaultSeriesIds: ["LV"],
      }],
    };
    const pressureVolume = experimentV2() as Record<string, any>;
    pressureVolume.content.surface.graphPanes[0].graphId =
      "hemodynamics.pressure-volume";
    pressureVolume.content.surface.graphPanes[0].historyDepth = 1;
    pressureVolume.content.surface.graphPanes[0].pressureVolumeAnalysisMode =
      "responsive-preview";
    pressureVolume.content.surface.graphPanes[0].showPressureEnvelope = true;
    pressureVolume.content.surface.graphPanes[0].showPvaBoundary = true;
    pressureVolume.content.surface.graphPanes[0].series = [{
      seriesId: "LV",
      label: "LV",
      order: 0,
    }];
    const validatedPressureVolume = validateExperimentV2(
      pressureVolume,
    );
    expect(() => assertExperimentContentMatchesModelV2(
      validatedPressureVolume.content,
      pressureVolumeModel,
    )).toThrow(/must not configure a waveform window/);

    delete pressureVolume.content.surface.graphPanes[0].windowSec;
    for (const beats of [0, 2, 5]) {
      pressureVolume.content.surface.graphPanes[0].pvTrailBeats = beats;
      const roundTrip = validateExperimentV2(JSON.parse(JSON.stringify(pressureVolume)));
      expect(roundTrip.content.surface.graphPanes[0]?.pvTrailBeats).toBe(beats);
      expect(() => assertExperimentContentMatchesModelV2(roundTrip.content, pressureVolumeModel)).not.toThrow();
    }
    for (const invalid of [-1, 1.5, 6, "2"]) {
      pressureVolume.content.surface.graphPanes[0].pvTrailBeats = invalid;
      expect(() => validateExperimentV2(pressureVolume)).toThrow(/pvTrailBeats/);
    }
    delete pressureVolume.content.surface.graphPanes[0].pvTrailBeats;
    const nonPvTrails = experimentV2() as Record<string, any>;
    nonPvTrails.content.surface.graphPanes[0].pvTrailBeats = 2;
    expect(() => assertExperimentContentMatchesModelV2(validateExperimentV2(nonPvTrails).content, modelContractV2())).toThrow(/pvTrailBeats/);
    expect(validateExperimentV2(JSON.parse(JSON.stringify(pressureVolume))).content.surface.graphPanes[0]?.showPvaBoundary).toBe(true);
    const invalidEnergyView = structuredClone(pressureVolume);
    invalidEnergyView.content.surface.graphPanes[0].showPvaBoundary = "yes";
    expect(() => validateExperimentV2(invalidEnergyView)).toThrow(/showPvaBoundary/);
    expect(
      validateExperimentV2(pressureVolume).content.surface.graphPanes[0]
        ?.showPressureEnvelope,
    ).toBe(true);
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(pressureVolume).content,
      pressureVolumeModel,
    )).not.toThrow();

    const rawEnergyView = structuredClone(pressureVolume);
    rawEnergyView.content.surface.graphPanes[0].pressureVolumeAnalysisMode = "raw-exact-orbit";
    delete rawEnergyView.content.surface.graphPanes[0].showPressureEnvelope;
    expect(() => assertExperimentContentMatchesModelV2(validateExperimentV2(rawEnergyView).content, pressureVolumeModel)).toThrow(/showPvaBoundary/);
    const missingAnalysisMode = structuredClone(pressureVolume);
    delete missingAnalysisMode.content.surface.graphPanes[0]
      .pressureVolumeAnalysisMode;
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(missingAnalysisMode).content,
      pressureVolumeModel,
    )).toThrow(/pressure-volume graphs must configure an analysis mode/);

    const formalPressureVolume = structuredClone(pressureVolume);
    formalPressureVolume.content.surface.graphPanes[0]
      .pressureVolumeAnalysisMode = "formal-periodic";
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(formalPressureVolume).content,
      pressureVolumeModel,
    )).not.toThrow();

    const rawPressureVolume = structuredClone(pressureVolume);
    rawPressureVolume.content.surface.graphPanes[0]
      .pressureVolumeAnalysisMode = "raw-exact-orbit";
    delete rawPressureVolume.content.surface.graphPanes[0]
      .showPressureEnvelope;
    delete rawPressureVolume.content.surface.graphPanes[0].showPvaBoundary;
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(rawPressureVolume).content,
      pressureVolumeModel,
    )).not.toThrow();
    const rawPressureVolumeWithEnvelope = structuredClone(rawPressureVolume);
    rawPressureVolumeWithEnvelope.content.surface.graphPanes[0]
      .showPressureEnvelope = true;
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(rawPressureVolumeWithEnvelope).content,
      pressureVolumeModel,
    )).toThrow(/raw-exact-orbit.*must not configure an analysis envelope/);

    for (const invalidDepth of [-1, 1.5, 4]) {
      const invalid = structuredClone(pressureVolume);
      invalid.content.surface.graphPanes[0].historyDepth = invalidDepth;
      expect(() => validateExperimentV2(invalid))
        .toThrow(/must be an integer from 0 to 3/);
    }

    const sweepWithHistory = experimentV2() as Record<string, any>;
    sweepWithHistory.content.surface.graphPanes[0].historyDepth = 1;
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(sweepWithHistory).content,
      modelContractV2(),
    )).toThrow(/sweep graphs must not configure an explicit history depth/);

    const sweepWithEnvelope = experimentV2() as Record<string, any>;
    sweepWithEnvelope.content.surface.graphPanes[0].showPressureEnvelope = true;
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(sweepWithEnvelope).content,
      modelContractV2(),
    )).toThrow(/must not configure a pressure-volume envelope overlay/);

    pressureVolume.content.surface.graphPanes[0].series = [];
    expect(() => assertExperimentContentMatchesModelV2(
      validateExperimentV2(pressureVolume).content,
      pressureVolumeModel,
    )).toThrow(
      /pressure-volume graphs must select at least one registered series/,
    );
  });

  it("allows an empty role-pane surface and an empty note", () => {
    const candidate = experimentV2() as Record<string, any>;
    candidate.content.surface = {
      graphPanes: [],
      outputPanes: [],
      controlPanes: [],
      note: { text: "" },
    };

    const validated = validateExperimentV2(candidate);
    expect(validated.content.surface).toEqual(candidate.content.surface);
    expect(() => assertExperimentContentMatchesModelV2(
      validated.content,
      modelContractV2(),
    )).not.toThrow();
  });

  it("pins a placement and validates role-specific Reader briefing content", () => {
    const snapshot = validateExperimentSnapshotV2(snapshotV2());
    const all = validateExperimentPlacementAgainstSnapshotV2(
      placementV2(),
      snapshot,
    );
    expect(all).toEqual(placementV2());
    expect(all.briefing).toMatchObject({
      scenarioScope: {
        visibleScenarioIds: ["scenario/baseline"],
        initialFocusScenarioId: "scenario/baseline",
      },
      graphs: [{
        paneId: "pane/pressure",
        emphasis: "primary",
        overrides: {
          legend: "compact",
          windowSec: 3,
        },
      }],
      outputs: [{
        sourcePaneId: "pane/outputs",
        outputId: "catalog.output/map",
        scenarioId: "scenario/baseline",
      }],
      controls: [{
        controlId: "catalog.control/svr",
        presentation: {
          kind: "buttons",
          options: [
            { label: "Low", value: 0.8 },
            { label: "High", value: 1.2 },
          ],
        },
        binding: {
          mode: "fixed",
          scenarioIds: ["scenario/baseline"],
          application: "absolute",
        },
      }],
    });
    expect(Object.isFrozen(all.briefing)).toBe(true);
  });

  it("rejects a wrong snapshot and malformed or unknown briefing selections", () => {
    const snapshot = snapshotV2();
    const wrongSnapshot = placementV2();
    wrongSnapshot.snapshotId = "snapshot/other";
    expect(() =>
      validateExperimentPlacementAgainstSnapshotV2(wrongSnapshot, snapshot)
    ).toThrow(/does not match the pinned snapshot/);

    const malformed = placementV2() as Record<string, any>;
    malformed.briefing = { unknownProjection: [] };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      malformed,
      snapshot,
    ))
      .toThrow(/field set mismatch .*unknown: unknownProjection/);

    // Sealed reading form: layout density only, bound to selected graphs.
    const sealedForm = placementWithBriefingV2();
    const sealedPaneId = sealedForm.briefing.graphs[0].paneId;
    sealedForm.briefing.presentation = { extent: "peek", views: [{ paneIds: [sealedPaneId] }], analysisRecompute: "on-request" };
    expect(validateExperimentPlacementAgainstSnapshotV2(sealedForm, snapshot).briefing.presentation)
      .toEqual({ extent: "peek", views: [{ paneIds: [sealedPaneId] }], analysisRecompute: "on-request" });
    const minimalForm = placementWithBriefingV2();
    minimalForm.briefing.presentation = { extent: "full" };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(minimalForm, snapshot)).not.toThrow();
    const badExtent = placementWithBriefingV2();
    badExtent.briefing.presentation = { extent: "modal" };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(badExtent, snapshot)).toThrow(/inline, peek, or full/);
    const foreignView = placementWithBriefingV2();
    foreignView.briefing.presentation = { extent: "peek", views: [{ paneIds: ["pane/missing"] }] };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(foreignView, snapshot)).toThrow(/must select a Briefing graph/);
    const duplicateView = placementWithBriefingV2();
    duplicateView.briefing.presentation = { extent: "peek", views: [{ paneIds: [sealedPaneId] }, { paneIds: [sealedPaneId] }] };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(duplicateView, snapshot)).toThrow(/views\[1\]/);
    const tripleView = placementWithBriefingV2();
    tripleView.briefing.presentation = { extent: "peek", views: [{ paneIds: [sealedPaneId, "a", "b"] }] };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(tripleView, snapshot)).toThrow(/one or two graph panes/);
    const badRecompute = placementWithBriefingV2();
    badRecompute.briefing.presentation = { extent: "peek", analysisRecompute: "never" };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(badRecompute, snapshot)).toThrow(/on-request or automatic/);

    const unknownGraph = placementWithBriefingV2();
    unknownGraph.briefing.graphs[0].paneId = "pane/missing";
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      unknownGraph,
      snapshot,
    ))
      .toThrow(/unknown graph pane pane\/missing/);

    const unknownSeries = placementWithBriefingV2();
    unknownSeries.briefing.graphs[0].overrides.series[0].seriesId = "missing";
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      unknownSeries,
      snapshot,
    ))
      .toThrow(/unknown id missing/);

    const unknownOutput = placementWithBriefingV2();
    unknownOutput.briefing.outputs[0].outputId = "catalog.output/missing";
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      unknownOutput,
      snapshot,
    ))
      .toThrow(/output catalog.output\/missing is not present in source pane/);

    const unknownControl = placementWithBriefingV2();
    unknownControl.briefing.controls[0].controlId = "catalog.control/missing";
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      unknownControl,
      snapshot,
    ))
      .toThrow(/control catalog.control\/missing is not present in source pane/);
  });

  it("fails closed on briefing identity, order, labels, colors and button values", () => {
    const cases: Array<readonly [
      string,
      (briefing: Record<string, any>) => void,
      RegExp,
    ]> = [
      [
        "duplicate graph pane",
        (briefing) => {
          briefing.graphs.push({ ...briefing.graphs[0], order: 1 });
        },
        /duplicate id pane\/pressure/,
      ],
      [
        "negative graph order",
        (briefing) => {
          briefing.graphs[0].order = -1;
        },
        /nonnegative safe integer/,
      ],
      [
        "unknown emphasis",
        (briefing) => {
          briefing.graphs[0].emphasis = "hero";
        },
        /must be primary or supporting/,
      ],
      [
        "blank graph label",
        (briefing) => {
          briefing.graphs[0].overrides.label = " ";
        },
        /nonempty trimmed string/,
      ],
      [
        "noncanonical graph color",
        (briefing) => {
          briefing.graphs[0].overrides.traceColors[0].colorHex = "#3EA8FF";
        },
        /canonical lowercase #rrggbb color/,
      ],
      [
        "duplicate output",
        (briefing) => {
          briefing.outputs.push({ ...briefing.outputs[0], order: 1 });
        },
        /duplicate id pane\/outputs.*catalog.output\/map/,
      ],
      [
        "untrimmed output label",
        (briefing) => {
          briefing.outputs[0].label = " MAP";
        },
        /nonempty trimmed string/,
      ],
      [
        "duplicate control",
        (briefing) => {
          briefing.controls.push({ ...briefing.controls[0], order: 1 });
        },
        /duplicate id pane\/controls.*catalog.control\/svr/,
      ],
      [
        "invalid button value",
        (briefing) => {
          briefing.controls[0].presentation.options[0].value = "low";
        },
        /must be a finite number/,
      ],
      [
        "duplicate button value",
        (briefing) => {
          briefing.controls[0].presentation.options[1].value = 0.8;
        },
        /duplicate button value/,
      ],
      [
        "empty buttons",
        (briefing) => {
          briefing.controls[0].presentation.options = [];
        },
        /must contain between 2 and 6 options/,
      ],
      [
        "invalid fixed application",
        (briefing) => {
          briefing.controls[0].binding.application = "relative";
        },
        /must be absolute/,
      ],
    ];

    for (const [_name, mutate, pattern] of cases) {
      const placement = placementWithBriefingV2();
      mutate(placement.briefing);
      expect(() => validateExperimentPlacementAgainstSnapshotV2(
        placement,
        snapshotV2(),
      )).toThrow(pattern);
    }
  });

  it("fails closed on Reader scenario scope and control binding targets", () => {
    const duplicateVisible = placementWithBriefingV2();
    duplicateVisible.briefing.scenarioScope.visibleScenarioIds.push(
      "scenario/baseline",
    );
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      duplicateVisible,
      snapshotV2(),
    ))
      .toThrow(/duplicate id scenario\/baseline/);

    const emptyVisible = placementWithBriefingV2();
    emptyVisible.briefing.scenarioScope.visibleScenarioIds = [];
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      emptyVisible,
      snapshotV2(),
    ))
      .toThrow(/must contain at least one Scenario/);

    const focusOutsideScope = placementWithBriefingV2();
    focusOutsideScope.briefing.scenarioScope.initialFocusScenarioId =
      "scenario/comparison";
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      focusOutsideScope,
      snapshotV2(),
    ))
      .toThrow(/must be included in visibleScenarioIds/);

    const snapshot = snapshotV2() as Record<string, any>;
    snapshot.content.scenarios.push({
      ...structuredClone(snapshot.content.scenarios[0]),
      scenarioId: "scenario/comparison",
      label: "Comparison",
    });
    const hiddenFixedTarget = placementWithBriefingV2();
    hiddenFixedTarget.briefing.controls[0].binding.scenarioIds = [
      "scenario/comparison",
    ];
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      hiddenFixedTarget,
      snapshot,
    ))
      .toThrow(/unknown id scenario\/comparison/);

    const hiddenOutputTarget = placementWithBriefingV2();
    hiddenOutputTarget.briefing.outputs[0].scenarioId = "scenario/comparison";
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      hiddenOutputTarget,
      snapshot,
    ))
      .toThrow(/output target scenario\/comparison must be visible/);

    const readerFocus = placementWithBriefingV2();
    readerFocus.briefing.controls[0].binding = {
      mode: "reader-focus",
      allowedScenarioIds: ["scenario/baseline"],
    };
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      readerFocus,
      snapshotV2(),
    )).not.toThrow();

    readerFocus.briefing.controls[0].binding.allowedScenarioIds = [];
    expect(() => validateExperimentPlacementAgainstSnapshotV2(
      readerFocus,
      snapshotV2(),
    ))
      .toThrow(/must contain at least one Scenario/);
  });

  it("validates the only reusable named input/state object and applies it by copy", async () => {
    const caller = presetV2();
    const preset = validateScenarioPresetV2(caller);
    const cloner = createScenarioPresetCaptureClonerV2(
      exactRuntimeResolverV2(),
    );
    const applied = await cloner.clone(caller);

    expect(preset).toMatchObject({
      presetId: "preset/healthy",
      modelId: "model/main-wire-v3",
      title: "Healthy baseline",
      description: "A reusable starting state.",
    });
    expect(applied).toEqual(preset.capture);
    expect(applied).not.toBe(preset.capture);
    expect(applied.checkpoint).not.toBe(preset.capture.checkpoint);
    expect(applied.fixture).not.toBe(caller.capture.fixture);
    expect(Object.isFrozen(applied)).toBe(true);

    caller.capture.fixture.controls.svr = 4;
    expect((applied.fixture as { controls: { svr: number } }).controls.svr)
      .toBe(1);

    const qualified = presetV2() as Record<string, unknown>;
    qualified.qualification = "certified";
    expect(() => validateScenarioPresetV2(qualified))
      .toThrow(/keys must be exactly/);

    const wrongModel = presetV2();
    wrongModel.modelId = "model/other";
    await expect(cloner.clone(wrongModel)).rejects.toThrow(/not registered/);

    const wrongCodec = presetV2() as any;
    wrongCodec.capture.checkpoint.payload = { wrongCodec: true };
    await expect(cloner.clone(wrongCodec)).rejects.toThrow(/rejected capture/);

    const spoofedAdapter = {
      ...captureAdapterV2(),
      validateFixture() {},
      async validateCapture() {},
    };
    expect(Object.keys(cloner)).toEqual(["clone"]);
    expect(cloner).not.toHaveProperty("adapter");
    await expect((cloner.clone as any)(wrongCodec, spoofedAdapter))
      .rejects.toThrow(/rejected capture/);
  });

  it("fails closed on malformed checkpoints, duplicate identity, forbidden fields and non-JSON data", () => {
    const cases: Array<readonly [string, (candidate: Record<string, any>) => void, RegExp]> = [
      [
        "missing fixture",
        (candidate) => {
          delete candidate.content.scenarios[0].capture.fixture;
        },
        /keys must be exactly/,
      ],
      [
        "missing checkpoint",
        (candidate) => {
          delete candidate.content.scenarios[0].capture.checkpoint;
        },
        /keys must be exactly/,
      ],
      [
        "invalid accepted revision",
        (candidate) => {
          candidate.content.scenarios[0].capture.checkpoint.acceptedRevision =
            -1;
        },
        /nonnegative safe integer/,
      ],
      [
        "invalid accepted time",
        (candidate) => {
          candidate.content.scenarios[0].capture.checkpoint.acceptedTimeSec =
            Number.NaN;
        },
        /JSON number must be finite/,
      ],
      [
        "negative zero",
        (candidate) => {
          candidate.content.scenarios[0].capture.fixture.controls.svr = -0;
        },
        /negative zero/,
      ],
      [
        "redundant codec identity",
        (candidate) => {
          candidate.content.scenarios[0].capture.checkpoint.codecId =
            "checkpoint/main-wire-v4";
        },
        /keys must be exactly/,
      ],
      [
        "duplicate scenario",
        (candidate) => {
          candidate.content.scenarios.push(
            structuredClone(candidate.content.scenarios[0]),
          );
        },
        /duplicate id scenario\/baseline/,
      ],
      [
        "noncanonical graph trace color",
        (candidate) => {
          candidate.content.surface.graphPanes[0].traceColors = [{
            scenarioId: "scenario/baseline",
            seriesId: "MAP",
            automaticColorHex: "#FF6685",
          }];
        },
        /canonical lowercase #rrggbb color/,
      ],
      [
        "duplicate pane identity across roles",
        (candidate) => {
          candidate.content.surface.outputPanes[0].paneId = "pane/pressure";
        },
        /duplicate id pane\/pressure/,
      ],
      [
        "duplicate pane order within one role",
        (candidate) => {
          candidate.content.surface.graphPanes.push({
            ...structuredClone(candidate.content.surface.graphPanes[0]),
            paneId: "pane/pressure-secondary",
          });
        },
        /duplicate graph pane order 0/,
      ],
      [
        "duplicate item order",
        (candidate) => {
          candidate.content.surface.outputPanes[0].items.push({
            outputId: "catalog.output/other",
            label: "Other",
            order: 0,
          });
        },
        /duplicate order 0/,
      ],
      [
        "forbidden immutable-domain field",
        (candidate) => {
          candidate.content.assessment = {};
        },
        /field set mismatch/,
      ],
      [
        "function payload",
        (candidate) => {
          candidate.content.scenarios[0].capture.checkpoint.payload = () => 1;
        },
        /portable JSON/,
      ],
      [
        "unpaired Unicode surrogate",
        (candidate) => {
          candidate.content.surface.note.text = "\ud800";
        },
        /unpaired high surrogate/,
      ],
    ];

    for (const [_name, mutate, pattern] of cases) {
      const candidate = experimentV2() as Record<string, any>;
      mutate(candidate);
      expect(() => validateExperimentV2(candidate)).toThrow(pattern);
    }

    const forbiddenLineage = snapshotV2() as Record<string, unknown>;
    forbiddenLineage.parentSnapshotId = forbiddenLineage.snapshotId;
    expect(() => validateExperimentSnapshotV2(forbiddenLineage))
      .toThrow(/field set mismatch/);

    const forbiddenSnapshot = snapshotV2() as Record<string, unknown>;
    forbiddenSnapshot.revision = 4;
    expect(() => validateExperimentSnapshotV2(forbiddenSnapshot))
      .toThrow(/field set mismatch/);

    const normalizedInvalidDate = snapshotV2();
    normalizedInvalidDate.createdAt = "2026-02-31T00:00:00.000Z";
    expect(() => validateExperimentSnapshotV2(normalizedInvalidDate))
      .toThrow(/calendar-valid/);

    const cyclic = experimentV2() as Record<string, any>;
    cyclic.content.scenarios[0].capture.fixture.self =
      cyclic.content.scenarios[0].capture.fixture;
    expect(() => validateExperimentV2(cyclic))
      .toThrow(StudioExperimentDataValidationErrorV2);
    expect(() => validateExperimentV2(cyclic))
      .toThrow(/cyclic JSON/);
  });

});

describe("Disposable Snapshot reader preview", () => {
  it("isolates non-portable optional caches without relaxing mandatory Snapshot validation", () => {
    const snapshot = validateExperimentSnapshotV2(snapshotV2());
    const nested = Array.from({ length: 260 }).reduce<object>(child => ({ child }), {});
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const readerPreview of [JSON.parse('{"extra":-0}'), nested, cyclic]) {
      const result = validateExperimentSnapshotV2({ ...snapshot, readerPreview });
      expect(result).toEqual(snapshot);
      expect(Object.isFrozen(result)).toBe(true);
      expect(() => validateExperimentSnapshotV2({ ...snapshot, createdAt: "invalid", readerPreview })).toThrow();
    }
    const getter = vi.fn(() => { throw Error("must not invoke cache accessors"); });
    const withAccessor = Object.defineProperty({ ...snapshot }, "readerPreview", { enumerable: true, get: getter });
    expect(validateExperimentSnapshotV2(withAccessor)).toEqual(snapshot);
    expect(getter).not.toHaveBeenCalled();
    const invalidPrototype = Object.assign(Object.create({ inherited: true }), snapshot);
    expect(() => validateExperimentSnapshotV2(invalidPrototype)).toThrow(/plain objects/);
  });

  const previewFor = async (snapshot = validateExperimentSnapshotV2(snapshotV2())) => {
    const body = { schemaId: "circleheart-experiment-reader-preview-v1" as const,
      sourceSha256: await readerPreviewSourceSha256V1(snapshot),
      scenarios: snapshot.content.scenarios.map(s => ({ scenarioId: s.scenarioId,
        acceptedRevision: s.capture.checkpoint.acceptedRevision + 1,
        acceptedTimeSec: s.capture.checkpoint.acceptedTimeSec + 0.002,
        outputs: {}, analyses: [], samples: [{ acceptedRevision: s.capture.checkpoint.acceptedRevision + 1,
          acceptedTimeSec: s.capture.checkpoint.acceptedTimeSec + 0.002, values: { pressure: 100 } }] })),
    };
    return { ...body, previewSha256: await sha256StudioCanonicalJsonHex(body) };
  };
  it("binds the display cache to every exact capture and the Surface pin; rejects altered rows and out-of-source times", async () => {
    const snapshot = validateExperimentSnapshotV2(snapshotV2());
    const readerPreview = await previewFor(snapshot);
    const valid = validateExperimentSnapshotV2({ ...snapshot, readerPreview });
    expect(await verifiedReaderPreviewV1(valid)).toEqual(readerPreview);
    expect(valid.content).toEqual(snapshot.content);
    expect(verifiedReaderPreviewV1(valid)).toBe(verifiedReaderPreviewV1(valid));
    expect(await verifiedReaderPreviewV1({ ...valid, surfaceReleaseId: "surface/other" })).toBeNull();
    expect(await verifiedReaderPreviewV1({ ...valid, content: { ...valid.content, scenarios: valid.content.scenarios.map(s =>
      ({ ...s, capture: { ...s.capture, fixture: { changed: true } } })) } })).toBeNull();
    const changed = structuredClone(readerPreview);
    changed.scenarios[0]!.samples[0]!.values.pressure = 200;
    expect(await verifiedReaderPreviewV1({ ...valid, readerPreview: changed })).toBeNull();
    const { previewSha256: _, ...early } = structuredClone(readerPreview);
    early.scenarios[0]!.samples[0]!.acceptedTimeSec = 0;
    expect(await verifiedReaderPreviewV1({ ...valid, readerPreview: { ...early, previewSha256: await sha256StudioCanonicalJsonHex(early) } })).toBeNull();
    const fallback = validateExperimentSnapshotV2({ ...valid, readerPreview: { schemaId: "unknown" } });
    expect(fallback).toEqual(snapshot);
    expect(Object.isFrozen(fallback)).toBe(true);
    const oversized = { ...readerPreview, extra: "字".repeat(510_000) };
    expect(validateExperimentSnapshotV2({ ...valid, readerPreview: oversized })).toEqual(snapshot);
  });

  it("observes a detached session and preserves every accepted display row without starting a TBV sweep", async () => {
    const snapshot = validateExperimentSnapshotV2(snapshotV2());
    const original = JSON.stringify(snapshot);
    const source = snapshot.content.scenarios[0]!;
    let ordinal = 0, collected = 0, sessionId = "";
    const currentFrame = (): StudioSimulationFrameV2 => ({ modelId: snapshot.content.modelId, runtimeSessionId: sessionId,
      scenarioId: source.scenarioId, inputEpoch: 0, acceptedRevision: 1200 + ordinal, acceptedTimeSec: 2.4 + ordinal * 0.002,
      outputs: Object.fromEntries([["v", 144], ["p", 100], ["phase", (ordinal % 400) / 400]].map(([outputId, value]) =>
        [outputId, { outputId, value, availability: "available", quality: "authoritative-state" }])) as StudioSimulationFrameV2["outputs"],
    });
    const disposeSession = vi.fn();
    const requestAnalysis = vi.fn(() => { throw new Error("No TBV sweeping in a preview"); });
    const adapter = { currentFrame, disposeSession, requestAnalysis,
      advancePresentationBatch: async ({ stepCount, presentationOutputIds }: { stepCount: number; presentationOutputIds: readonly string[] }) => {
        const frames = Array.from({ length: stepCount }, () => { ordinal++; return currentFrame(); });
        return { outputIds: presentationOutputIds, acceptedTimesSec: Float64Array.from(frames.map(f => f.acceptedTimeSec)),
          acceptedRevisions: Float64Array.from(frames.map(f => f.acceptedRevision)), outputStates: new Uint8Array(frames.length * presentationOutputIds.length),
          outputValues: Float64Array.from(frames.flatMap(f => presentationOutputIds.map(id => f.outputs[id]!.value as number))),
          terminalFrame: frames.at(-1)! };
      },
    } as unknown as RegisteredModelSimulationAdapterV2;
    const contract: ModelContractV2 = { ...modelContractV2(), graphCatalog: [{ graphId: "catalog.graph/pressure", renderer: "pressure-volume",
      defaultSeriesIds: ["MAP"], seriesCatalog: [{ seriesId: "MAP", kind: "pressure-volume", volumeOutputId: "v", pressureOutputId: "p", cyclePhaseOutputId: "phase", pressureBasis: "transmural" }] }] };
    const createSession = vi.fn(async (id: string, scenario: typeof source) => { sessionId = id; expect(scenario.capture).toEqual(source.capture); });
    const preview = await buildReaderPreviewV1({ snapshot, contract, adapter, createSession,
      methods: [{ methodId: "method/display", requiredExactOutputIds: ["p"], create: () => ({ ingest: batch => { collected += batch.acceptedTimesSec.length; return undefined; } }) }],
    });
    expect(preview).toBeDefined();
    expect(collected).toBe(800);
    expect(preview!.scenarios[0]!.samples.length).toBe(800);
    expect(preview!.scenarios[0]!.samples.at(-1)!.acceptedRevision).toBe(2000);
    expect(await verifiedReaderPreviewV1({ ...snapshot, readerPreview: preview })).toEqual(preview);
    expect(JSON.stringify(snapshot)).toBe(original);
    expect(requestAnalysis).not.toHaveBeenCalled();
    expect(createSession).toHaveBeenCalledOnce();
    expect(disposeSession).toHaveBeenCalledWith(sessionId);
    expect(JSON.stringify(preview)).not.toContain(sessionId);
    await expect(buildReaderPreviewV1({ snapshot, contract, adapter, createSession: async () => { throw Error("fork failed"); }, methods: [] })).rejects.toThrow("fork failed");
    expect(disposeSession).toHaveBeenCalledTimes(2);
  });
});

function captureV2() {
  return {
    fixture: {
      controls: {
        svr: 1,
      },
    },
    checkpoint: {
      acceptedRevision: 1200,
      acceptedTimeSec: 2.4,
      payload: {
        state: [1, 2, 3],
      },
    },
  };
}

function contentV2() {
  return {
    modelId: "model/main-wire-v3",
    surfaceSeriesId: "surface-series/main-wire-standard",
    scenarios: [{
      scenarioId: "scenario/baseline",
      label: "Baseline",
      capture: captureV2(),
    }],
    surface: {
      graphPanes: [{
        paneId: "pane/pressure",
        role: "graph",
        label: "Pressure",
        order: 0,
        priority: 10,
        graphId: "catalog.graph/pressure",
        scenarioScope: { mode: "visible-scenarios" },
        excludedTraces: [],
        windowSec: 2,
        series: [{
          seriesId: "MAP",
          label: "MAP",
          order: 0,
        }],
      }],
      outputPanes: [{
        paneId: "pane/outputs",
        role: "output",
        label: "Outputs",
        order: 0,
        priority: 8,
        binding: { mode: "active-slot" },
        items: [{
          outputId: "catalog.output/map",
          label: "MAP",
          order: 0,
        }],
      }],
      controlPanes: [{
        paneId: "pane/controls",
        role: "control",
        label: "Controls",
        order: 0,
        priority: 9,
        binding: { mode: "active-slot" },
        items: [{
          controlId: "catalog.control/svr",
          label: "SVR",
          order: 0,
          presentation: { kind: "slider" },
        }],
      }],
      note: {
        text: "Compare pressure and volume after the target changes.",
      },
    },
  };
}

function desiredContentV2() {
  const content = contentV2();
  return {
    modelId: content.modelId,
    surfaceSeriesId: content.surfaceSeriesId,
    scenarios: content.scenarios.map((scenario) => ({
      scenarioId: scenario.scenarioId,
      label: scenario.label,
      fixture: scenario.capture.fixture,
    })),
    surface: content.surface,
  };
}

function experimentV2() {
  return {
    schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
    experimentId: "experiment/afterload",
    version: 3,
    content: contentV2(),
  };
}

function snapshotV2() {
  return {
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: "snapshot/3",
    surfaceReleaseId: "surface-release/main-wire-standard-r1",
    content: contentV2(),
    createdAt: "2026-07-31T03:04:05.000Z",
    createdBy: "user/author",
  };
}

function placementV2() {
  return {
    schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
    placementId: "placement/article-afterload",
    snapshotId: "snapshot/3",
    briefing: briefingV2(),
    titleOverride: null,
    caption: "Afterload experiment",
  };
}

function briefingV2() {
  return {
    defaultTitle: "Afterload experiment",
    scenarioScope: {
      visibleScenarioIds: ["scenario/baseline"],
      initialFocusScenarioId: "scenario/baseline",
    },
    graphs: [{
      paneId: "pane/pressure",
      order: 0,
      emphasis: "primary",
      overrides: {
        label: "Arterial pressure",
        legend: "compact",
        series: [{
          seriesId: "MAP",
          label: "MAP",
          order: 0,
        }],
        traceColors: [{
          scenarioId: "scenario/baseline",
          seriesId: "MAP",
          colorHex: "#3ea8ff",
        }],
        windowSec: 3,
      },
    }],
    outputs: [{
      sourcePaneId: "pane/outputs",
      outputId: "catalog.output/map",
      scenarioId: "scenario/baseline",
      label: "MAP",
      order: 0,
    }],
    controls: [{
      sourcePaneId: "pane/controls",
      controlId: "catalog.control/svr",
      label: "Afterload",
      order: 0,
      presentation: {
        kind: "buttons",
        options: [
          { label: "Low", value: 0.8 },
          { label: "High", value: 1.2 },
        ],
      },
      binding: {
        mode: "fixed",
        scenarioIds: ["scenario/baseline"],
        application: "absolute",
      },
    }],
  };
}

function placementWithBriefingV2() {
  return structuredClone(placementV2()) as Record<string, any>;
}

function presetV2() {
  return {
    schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
    presetId: "preset/healthy",
    modelId: "model/main-wire-v3",
    title: "Healthy baseline",
    description: "A reusable starting state.",
    capture: captureV2(),
  };
}

function modelContractV2(): ModelContractV2 {
  return {
    modelId: "model/main-wire-v3",
    modelFamilyId: "model/main-wire",
    displayName: "Main Wire V3",
    fixtureSchemaId: "fixture/main-wire-v3",
    checkpointCodecId: "checkpoint/main-wire-v4",
    snapshotGateId: "snapshot-gate/main-wire-v3",
    controlCatalog: [{
      controlId: "catalog.control/svr",
      valueType: "number",
      unit: "1",
      minimum: 0.5,
      maximum: 2,
      step: 0.05,
      defaultValue: 1,
      changeSemantics: "accepted-state-warm-start",
    }],
    outputCatalog: [{
      outputId: "catalog.output/map",
      kind: "metric",
      unit: "mmHg",
      shape: "scalar",
      scope: "beat",
      dependencies: [],
    }],
    graphCatalog: [{
      graphId: "catalog.graph/pressure",
      renderer: "sweep",
      seriesCatalog: [{
        kind: "scalar",
        seriesId: "MAP",
        outputId: "catalog.output/map",
      }],
      defaultSeriesIds: ["MAP"],
    }],
  };
}

function captureAdapterV2(): RegisteredModelCaptureAdapterV2 {
  return {
    modelId: "model/main-wire-v3",
    fixtureSchemaId: "fixture/main-wire-v3",
    checkpointCodecId: "checkpoint/main-wire-v4",
    validateFixture({ fixture }) {
      const svr = (fixture as any)?.controls?.svr;
      if (typeof svr !== "number") throw new Error("invalid fixture schema");
    },
    async validateCapture({ capture }) {
      if (!Array.isArray((capture.checkpoint.payload as any)?.state)) {
        throw new Error("invalid checkpoint codec");
      }
    },
  };
}

function exactRuntimeResolverV2() {
  const contract = modelContractV2();
  const captureAdapter = captureAdapterV2();
  return {
    resolveExactRuntime(modelId: string) {
      if (modelId !== contract.modelId) {
        throw new Error(`model ${modelId} is not registered`);
      }
      return {
        contract,
        exactContract: contract,
        captureAdapter,
        experimentCapture: {
          modelId: contract.modelId,
          fixtureSchemaId: contract.fixtureSchemaId,
          checkpointCodecId: contract.checkpointCodecId,
          captureAcceptedCandidate() {
            throw new Error("not used by Preset clone");
          },
        },
        snapshotGate: {
          modelId: contract.modelId,
          snapshotGateId: contract.snapshotGateId,
          admitFrozenCandidate() {
            throw new Error("not used by Preset clone");
          },
        },
        fixtureAdapter: {
          modelId: contract.modelId,
          fixtureSchemaId: contract.fixtureSchemaId,
          validateCompleteFixture() { return undefined; },
        },
        simulationAdapter: {
          modelId: contract.modelId,
          fixtureSchemaId: contract.fixtureSchemaId,
          checkpointCodecId: contract.checkpointCodecId,
          async createSession() {},
          disposeSession() {},
          currentFrame() {
            throw new Error("not used by Preset clone");
          },
          advanceOnePresentationStep() {
            throw new Error("not used by Preset clone");
          },
          advancePresentationBatch() {
            throw new Error("not used by Preset clone");
          },
          applyControl() {
            throw new Error("not used by Preset clone");
          },
          requestAnalysis() {
            throw new Error("not used by Preset clone");
          },
          async replaceFixture() {
            return 0;
          },
          currentInputEpoch() {
            return 0;
          },
        },
        executionPlan: {
          schemaId: "circleheart-registered-model-execution-plan-adapter-v1" as const,
          modelId: contract.modelId,
          descriptor: {},
          bind() {
            throw new Error("not used by Preset clone");
          },
          createSession() {
            throw new Error("not used by Preset clone");
          },
        },
      };
    },
  };
}
