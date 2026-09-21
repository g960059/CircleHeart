import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  describeStudioAuthoringProtocolV1,
  executeStudioAuthoringCommandV1,
  type StudioAuthoringModelPortV1,
  validateStudioAuthoringCommandV1,
} from "@/studio/application/authoring/StudioAuthoringCommandV1";
import {
  StudioArticleDataValidationErrorV2,
} from "@/studio/application/authoring/StudioArticleDataV2";
import {
  StudioSupabaseModelReleaseResolverV1,
  type StudioModelReleaseRpcPortV1,
} from "@/studio/infrastructure/model/StudioSupabaseModelReleaseResolverV1";
import {
  StudioSupabaseModelSurfaceResolverV1,
  type StudioModelSurfaceRpcPortV1,
} from "@/studio/infrastructure/model/StudioSupabaseModelSurfaceResolverV1";
import {
  composeModelSurfacePresentationBundleV1,
} from "@/studio/application/modelSurface/ModelSurfacePresentationBundleV1";
import {
  resolveRegisteredAnalysisMethodsV1,
} from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import {
  inspectModelAnalysisV1,
} from "@/studio/application/authoring/PreparedModelAnalysisV1";
import {
  StudioSupabaseContentRepositoryV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import {
  DEFAULT_STUDIO_AUTHORING_PROFILE_V1,
  establishStudioAuthoringSessionV1,
  FileStudioAuthoringProfileStoreV1,
  MacOSKeychainAuthoringRefreshTokenStoreV1,
  requireStudioAuthoringProfileNameV1,
  resolveStudioAuthoringProjectV1,
  withStudioAuthoringProfileLockV1,
} from "@/studio/infrastructure/auth/StudioLocalAuthoringCredentialsV1";
import {
  createDefaultExperimentSurfaceV3,
  reconcileWorkbenchPressureVolumeCapabilityV3,
  reconcileWorkbenchSurfaceScenariosV3,
} from "@/components/workbench/WorkbenchSurfaceV3";
import {
  LocalTrustedAuthoringRuntimeLoaderV1,
} from "./LocalTrustedAuthoringRuntimeLoaderV1";
import { resolveRegisteredModelLaunchDefaultsV1 } from
  "@/studio/registry/RegisteredModelLaunchBaselineV1";
import { beginFittingSourceSnapshotV1 } from "../scientific/FittingSourceSnapshotV1";
import { writeFittingRunJsonV1 } from "../scientific/FittingRunFilesV1";
import { exportPreparedSnapshotAnalysesV1 } from "./PrepareSnapshotAnalysisAssetsV1";
import type { analyzeStudioSnapshotV1 } from "@/studio/application/authoring/StudioSnapshotAnalysisV1";

let commandContextV1: Readonly<{
  commandId: string | null;
  action: string | null;
  phase: StudioAuthoringCliPhaseV1;
  mutation: boolean;
}> = Object.freeze({
  commandId: null,
  action: null,
  phase: "input",
  mutation: false,
});

type StudioAuthoringCliPhaseV1 =
  | "input"
  | "authentication"
  | "execution"
  | "output";

const AUTHORING_MUTATION_ACTIONS_V1 = new Set([
  "course.save", "course.publish", "course.delete",
  "experiment.apply",
  "experiment.presentation.save",
  "snapshot.seal",
  "article.briefing.place",
  "article.blocks.patch",
  "experiment.publish",
  "article.save",
  "article.publish",
]);

const PREPARED_ASSETS_HOST_OPTION_V1 = {
  "--prepare-assets <new-directory>": "For snapshot.analyze with includeAnalysis:true. Requires an output outside the repository and stable source during execution. Writes analysis.json, capture-addressed assets, source archive and prepared-assets.json (promoteTo paths); stdout contains assessments only. Install the assets at promoteTo and rebuild the app for deployment.",
};

if (
  process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    await main();
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      schemaId: "circleheart-studio-authoring-command-error-v1",
      ok: false,
      commandId: commandContextV1.commandId,
      action: commandContextV1.action,
      error: classifyAuthoringErrorV1(error, commandContextV1),
    })}\n`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = parseStudioAuthoringContentArgumentsV1(process.argv.slice(2));
  if (args.mode === "list-actions") {
    const description = describeStudioAuthoringProtocolV1();
    process.stdout.write(`${JSON.stringify({
      schemaId: "circleheart-studio-authoring-action-index-v1",
      commandSchemaId: description.commandSchemaId,
      discovery: "--describe <action> returns its complete command and result schemas",
      actions: description.actions.map(({ action, mutation }) => ({ action, mutation })),
      protocol: description.protocol,
      hostOptions: PREPARED_ASSETS_HOST_OPTION_V1,
    }, null, 2)}\n`);
    return;
  }
  if (args.mode === "describe") {
    process.stdout.write(`${JSON.stringify(
      { ...describeStudioAuthoringProtocolV1(args.action), hostOptions: PREPARED_ASSETS_HOST_OPTION_V1 },
      null,
      2,
    )}\n`);
    return;
  }
  const command = validateStudioAuthoringCommandV1(
    JSON.parse(readFileSync(args.commandPath, "utf8")) as unknown,
  );
  if (args.prepareAssetsDirectory !== undefined
    && (command.action !== "snapshot.analyze" || !command.input.includeAnalysis))
    throw new Error("--prepare-assets requires snapshot.analyze with includeAnalysis: true");
  if (args.prepareAssetsDirectory) assertPreparedAssetsOutputDirectoryV1(args.prepareAssetsDirectory);
  commandContextV1 = Object.freeze({
    commandId: command.commandId,
    action: command.action,
    phase: "authentication",
    mutation: AUTHORING_MUTATION_ACTIONS_V1.has(command.action),
  });
  const profiles = new FileStudioAuthoringProfileStoreV1();
  const refreshTokens = new MacOSKeychainAuthoringRefreshTokenStoreV1();
  const authenticated = await withStudioAuthoringProfileLockV1({
    profileName: args.profileName,
    environment: process.env,
  }, async () => {
    // Treat profile metadata and its Keychain credential as one local
    // authority record. Reading either side outside this lock lets a
    // concurrent login replace the profile between the read and a refresh,
    // which can rotate and then discard the replacement credential.
    const storedProfile = profiles.read(args.profileName);
    const configuration = resolveStudioAuthoringProjectV1({
      environment: process.env,
      storedProfile,
      allowProfileReplacement: false,
    });
    const client = createClient(
      configuration.url,
      configuration.publishableKey,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
    await establishStudioAuthoringSessionV1({
      auth: client.auth,
      environment: process.env,
      profileName: args.profileName,
      storedProfile,
      refreshTokens,
    });
    return Object.freeze({ client, configuration });
  });
  const { client, configuration } = authenticated;
  commandContextV1 = Object.freeze({ ...commandContextV1, phase: "execution" });
  const repository = new StudioSupabaseContentRepositoryV1(client, {
      fixedMutationOperationId: command.commandId,
    });
  const models = createAuthoringModelPortV1(client, configuration.url);
  const output = args.prepareAssetsDirectory;
  if (output) {
    await mkdir(path.dirname(output), { recursive: true });
    await mkdir(output); // Refuse to overwrite a prior preparation run.
  }
  const preparationSource = output ? await beginFittingSourceSnapshotV1(path.join(output, "execution")) : null;
  const result = await executeStudioAuthoringCommandV1(
    repository,
    models,
    command,
    undefined,
    { onSnapshotAnalysisProgress: progress => process.stderr.write(`${JSON.stringify({
      schemaId: "circleheart-studio-snapshot-analysis-progress-v1", commandId: command.commandId, ...progress,
    })}\n`) },
  );
  let preparedAssets;
  if (output && preparationSource && command.action === "snapshot.analyze") {
    const rawFile = await writeFittingRunJsonV1(output, "analysis.json", result);
    const snapshot = await repository.readSnapshot(command.input.snapshotId);
    if (!snapshot) throw new Error("Snapshot is unavailable");
    const release = await models.resolveAnalysisModel({ modelId: snapshot.content.modelId,
      surfaceSeriesId: snapshot.content.surfaceSeriesId, surfaceReleaseId: snapshot.surfaceReleaseId });
    preparedAssets = await exportPreparedSnapshotAnalysesV1({ snapshot, release,
      result: result as Awaited<ReturnType<typeof analyzeStudioSnapshotV1>>,
      preparationSourceSha256: preparationSource.sourceSha256, output });
    const report = await writeFittingRunJsonV1(output, "prepared-assets.json", preparedAssets);
    await preparationSource.finish([rawFile, report, ...preparedAssets.rows.flatMap(row => row.file ? [row.file] : [])]);
  }
  commandContextV1 = Object.freeze({ ...commandContextV1, phase: "output" });
  process.stdout.write(`${JSON.stringify({
    schemaId: "circleheart-studio-authoring-command-result-v1",
    ok: true,
    commandId: command.commandId,
    action: command.action,
    // Full measured data is in analysis.json and the portable asset, not repeated
    // in the AI-facing command response. Assessment remains visible on stdout.
    result: preparedAssets ? { ...result as Awaited<ReturnType<typeof analyzeStudioSnapshotV1>>,
      scenarios: (result as Awaited<ReturnType<typeof analyzeStudioSnapshotV1>>).scenarios.map(entry => ({ ...entry, analysis: null })),
    } : result,
    ...(preparedAssets ? { preparedAssets, analysisFile: path.join(output!, "analysis.json") } : {}),
  }, null, 2)}\n`);
}

export function assertPreparedAssetsOutputDirectoryV1(directory: string, repository = process.cwd()): void {
  const relative = path.relative(path.resolve(repository), path.resolve(directory));
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)))
    throw new Error("--prepare-assets output must be outside the repository so source sealing excludes generated assets");
}

function createAuthoringModelPortV1(
  client: SupabaseClient,
  supabaseOrigin: string,
): StudioAuthoringModelPortV1 {
  const callRpc = async (
    functionName: string,
    parameters: Readonly<Record<string, string>>,
  ) => {
    const result = await client.rpc(functionName, parameters);
    return Object.freeze({
      data: result.data,
      error: result.error === null
        ? null
        : Object.freeze({ message: result.error.message }),
    });
  };
  const modelRpc: StudioModelReleaseRpcPortV1 = Object.freeze({
    async call(functionName: string, parameters: Readonly<Record<string, string>>) {
      return callRpc(functionName, parameters);
    },
  });
  const surfaceRpc: StudioModelSurfaceRpcPortV1 = Object.freeze({
    async call(functionName, parameters) {
      return callRpc(functionName, parameters);
    },
  });
  const exactModels = new StudioSupabaseModelReleaseResolverV1({
    rpc: modelRpc,
    supabaseOrigin,
    surfaceResolver: new StudioSupabaseModelSurfaceResolverV1({
      rpc: surfaceRpc,
    }),
  });
  const runtimes = new LocalTrustedAuthoringRuntimeLoaderV1();
  const ownNumerical = async (
    release: Awaited<ReturnType<
      StudioSupabaseModelReleaseResolverV1["resolveActiveBundle"]
    >>,
  ) => {
    const analysis = resolveRegisteredAnalysisMethodsV1(
      release.ticket.surfaceRelease,
    );
    const modelSurface = composeModelSurfacePresentationBundleV1({
      kernel: release.ticket.manifest,
      surfaceRelease: release.ticket.surfaceRelease,
      stage: release.surfaceStage,
      analysis,
    });
    return Object.freeze({
      contract: modelSurface.contract,
      ...resolveRegisteredModelLaunchDefaultsV1(release),
      periodicPvaSupported:
        modelSurface.analysis.periodicPvaDerivation !== null,
      runtime: await runtimes.load(release.ticket),
      surfaceReleaseId: modelSurface.identity.surfaceReleaseId,
      surfaceSeriesId: modelSurface.identity.surfaceSeriesId,
    });
  };
  return Object.freeze({
    async resolveAnalysisModel(input) {
      // Registry validation binds model, artifact and Surface. The registered executor
      // uses reviewed local analysis code; no remote ESM enters this authenticated process.
      const { ticket } = await exactModels.resolveExactModel(input.modelId, {
        kind: "release" as const, surfaceSeriesId: input.surfaceSeriesId, surfaceReleaseId: input.surfaceReleaseId,
      });
      return { modelId: ticket.modelId, artifactRevisionId: ticket.artifactRevisionId, surfaceRelease: ticket.surfaceRelease };
    },
    // Host-owned display completeness: the Workbench decoder plus the pinned derivation.
    assessAnalysis: inspectModelAnalysisV1,
    async resolveModel(input) {
      const release = await exactModels.resolveExactModel(
        input.modelId,
        {
          kind: "release" as const,
          surfaceSeriesId: input.surfaceSeriesId,
          surfaceReleaseId: input.surfaceReleaseId,
        },
      );
      const analysis = resolveRegisteredAnalysisMethodsV1(
        release.ticket.surfaceRelease,
      );
      return composeModelSurfacePresentationBundleV1({
        kernel: release.ticket.manifest,
        surfaceRelease: release.ticket.surfaceRelease,
        stage: release.surfaceStage,
        analysis,
      }).contract;
    },
    async resolveActiveNumericalModel() {
      return ownNumerical(await exactModels.resolveActiveBundle());
    },
    async resolveLatestNumericalModel(input) {
      return ownNumerical(await exactModels.resolveExactModel(
        input.modelId,
        {
          kind: "series" as const,
          surfaceSeriesId: input.surfaceSeriesId,
        },
      ));
    },
    async resolveExactNumericalModel(input) {
      return ownNumerical(await exactModels.resolveExactModel(
        input.modelId,
        {
          kind: "release" as const,
          surfaceSeriesId: input.surfaceSeriesId,
          surfaceReleaseId: input.surfaceReleaseId,
        },
      ));
    },
    prepareSurface(input) {
      if (input.presentation.mode === "preserve" && input.currentSurface === null) {
        throw new Error("A new Experiment cannot preserve a missing Surface");
      }
      const initial = input.presentation.mode === "preserve"
        ? input.currentSurface!
        : createDefaultExperimentSurfaceV3(
            input.contract,
            input.scenarioIds[0],
            { periodicPvaSupported: input.periodicPvaSupported },
          );
      const capabilitySurface = reconcileWorkbenchPressureVolumeCapabilityV3(
        initial,
        input.contract,
        input.periodicPvaSupported,
      );
      const reconciled = reconcileWorkbenchSurfaceScenariosV3(
        capabilitySurface,
        input.scenarioIds.map((scenarioId) => Object.freeze({ scenarioId })),
      );
      return Object.freeze({
        ...reconciled,
        note: Object.freeze({ text: input.presentation.note }),
      });
    },
  });
}

export function classifyAuthoringErrorV1(
  error: unknown,
  context: Readonly<{
    phase: StudioAuthoringCliPhaseV1;
    mutation: boolean;
  }> = Object.freeze({ phase: "execution", mutation: true }),
): Readonly<{
  code: string;
  category:
    | "validation"
    | "conflict"
    | "authentication"
    | "authorization"
    | "not-found"
    | "quota"
    | "numerical"
    | "transport"
    | "internal";
  retryable: boolean;
  commitState: "none" | "unknown" | "confirmed";
  recovery:
    | "fix-command"
    | "mint-new-command-id"
    | "refresh-authority-state"
    | "login"
    | "request-access"
    | "refresh-headless-token"
    | "reduce-work-or-wait"
    | "retry-same-command"
    | "inspect-operation-then-retry-same-command"
    | "read-authority-state"
    | "report-bug";
  message: string;
}> {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  const sqlState = authoringSqlStateV1(error);
  if (
    authoringConfirmedCommitV1(error)
    || (context.phase === "output" && context.mutation)
  ) {
    return Object.freeze({
      code: "AUTHORING_COMMIT_CONFIRMED_RESPONSE_INVALID",
      category: "internal",
      retryable: false,
      commitState: "confirmed",
      recovery: "read-authority-state",
      message,
    });
  }
  if (error instanceof StudioArticleDataValidationErrorV2) {
    return Object.freeze({
      code: "AUTHORING_VALIDATION_FAILED",
      category: "validation",
      retryable: false,
      commitState: "none",
      recovery: "fix-command",
      message,
    });
  }
  if (/operation_id was already used for a different request|unbound content operation/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_OPERATION_ID_CONFLICT",
      category: "conflict",
      retryable: false,
      commitState: "unknown",
      recovery: "read-authority-state",
      message,
    });
  }
  if (/already bound|different authoring command/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_COMMAND_ID_CONFLICT",
      category: "conflict",
      retryable: false,
      commitState: "none",
      recovery: "mint-new-command-id",
      message,
    });
  }
  if (sqlState === "23505") {
    return Object.freeze({
      code: "AUTHORING_UNIQUE_VALUE_CONFLICT",
      category: "conflict",
      retryable: false,
      commitState: "none",
      recovery: "fix-command",
      message,
    });
  }
  if (sqlState === "23514") {
    return Object.freeze({
      code: "AUTHORING_CONSTRAINT_VALIDATION_FAILED",
      category: "validation",
      retryable: false,
      commitState: "none",
      recovery: "fix-command",
      message,
    });
  }
  if (sqlState === "40001" || /version conflict/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_VERSION_CONFLICT",
      category: "conflict",
      retryable: false,
      commitState: "none",
      recovery: "refresh-authority-state",
      message,
    });
  }
  if (sqlState === "28000") {
    return Object.freeze({
      code: "AUTHORING_AUTHENTICATION_REQUIRED",
      category: "authentication",
      retryable: false,
      commitState: "none",
      recovery: "login",
      message,
    });
  }
  if (sqlState === "42501") {
    return Object.freeze({
      code: "AUTHORING_AUTHORIZATION_DENIED",
      category: "authorization",
      retryable: false,
      commitState: "none",
      recovery: "request-access",
      message,
    });
  }
  if (sqlState === "P0002") {
    return Object.freeze({
      code: "AUTHORING_RESOURCE_NOT_FOUND",
      category: "not-found",
      retryable: false,
      commitState: "none",
      recovery: "refresh-authority-state",
      message,
    });
  }
  if (/\b(?:experiment|snapshot|article(?: snapshot)?)\b.*\bis unavailable\b/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_RESOURCE_NOT_FOUND",
      category: "not-found",
      retryable: false,
      commitState: "none",
      recovery: "refresh-authority-state",
      message,
    });
  }
  if (sqlState === "54000" || (sqlState !== null && /^53/.test(sqlState))) {
    return Object.freeze({
      code: "AUTHORING_QUOTA_EXCEEDED",
      category: "quota",
      retryable: true,
      commitState: "none",
      recovery: "reduce-work-or-wait",
      message,
    });
  }
  if (/authoring profile .* is busy in another process/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_PROFILE_BUSY",
      category: "conflict",
      retryable: true,
      commitState: "none",
      recovery: "retry-same-command",
      message,
    });
  }
  if (sqlState !== null && /^22/.test(sqlState)) {
    return Object.freeze({
      code: "AUTHORING_VALIDATION_FAILED",
      category: "validation",
      retryable: false,
      commitState: "none",
      recovery: "fix-command",
      message,
    });
  }
  if (
    /authoring numerical execution exceeded|maxpresentationsteps|wallclocktimeoutms|execution budget/.test(lower)
  ) {
    return Object.freeze({
      code: "AUTHORING_NUMERICAL_BUDGET_EXCEEDED",
      category: "numerical",
      retryable: false,
      commitState: "none",
      recovery: "reduce-work-or-wait",
      message,
    });
  }
  if (
    sqlState === "55000"
    || /operation is already running|authoring operation is already running/.test(lower)
  ) {
    return Object.freeze({
      code: "AUTHORING_OPERATION_UNCERTAIN",
      category: "transport",
      retryable: true,
      commitState: "unknown",
      recovery: "inspect-operation-then-retry-same-command",
      message,
    });
  }
  if (
    (sqlState !== null && (/^08/.test(sqlState) || sqlState === "57014"))
    || /failed to fetch|network|econn|enotfound|socket|connection reset|connection refused|fetch failed|response timeout/.test(lower)
  ) {
    const mutationMayHaveReachedAuthority = context.mutation
      && context.phase === "execution";
    return Object.freeze({
      code: mutationMayHaveReachedAuthority
        ? "AUTHORING_OPERATION_UNCERTAIN"
        : "AUTHORING_TRANSPORT_UNAVAILABLE",
      category: "transport",
      retryable: true,
      commitState: mutationMayHaveReachedAuthority ? "unknown" : "none",
      recovery: mutationMayHaveReachedAuthority
        ? "inspect-operation-then-retry-same-command"
        : "retry-same-command",
      message,
    });
  }
  if (/headless authoring.*access token|headless token pair/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_HEADLESS_TOKEN_REFRESH_REQUIRED",
      category: "authentication",
      retryable: false,
      commitState: "none",
      recovery: "refresh-headless-token",
      message,
    });
  }
  if (
    /authentication|required sign-in|signed out|\bsession\b|credential|keychain|unauthorized|forbidden/.test(lower)
  ) {
    return Object.freeze({
      code: "AUTHORING_AUTHENTICATION_REQUIRED",
      category: "authentication",
      retryable: false,
      commitState: "none",
      recovery: "login",
      message,
    });
  }
  if (/numerical|checkpoint|capture|snapshot|simulation|model/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_NUMERICAL_REJECTED",
      category: "numerical",
      retryable: false,
      commitState: "none",
      recovery: "fix-command",
      message,
    });
  }
  if (/must|required|unsupported|unexpected|invalid|unavailable/.test(lower)) {
    return Object.freeze({
      code: "AUTHORING_VALIDATION_FAILED",
      category: "validation",
      retryable: false,
      commitState: "none",
      recovery: "fix-command",
      message,
    });
  }
  const commitState = context.mutation && context.phase === "execution"
    ? "unknown" as const
    : "none" as const;
  return Object.freeze({
    code: "AUTHORING_INTERNAL_ERROR",
    category: "internal",
    retryable: false,
    commitState,
    recovery: commitState === "unknown"
      ? "inspect-operation-then-retry-same-command"
      : "report-bug",
    message,
  });
}

function authoringConfirmedCommitV1(error: unknown): boolean {
  return error !== null
    && typeof error === "object"
    && "authoringCommitState" in error
    && (error as { authoringCommitState?: unknown }).authoringCommitState
      === "confirmed";
}

function authoringSqlStateV1(error: unknown): string | null {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)
    ? code
    : null;
}

export type StudioAuthoringContentArgumentsV1 =
  | Readonly<{ mode: "describe"; action?: string }>
  | Readonly<{ mode: "list-actions" }>
  | Readonly<{
      mode: "execute";
      commandPath: string;
      profileName: string;
      prepareAssetsDirectory?: string;
    }>;

export function parseStudioAuthoringContentArgumentsV1(
  args: readonly string[],
): StudioAuthoringContentArgumentsV1 {
  let commandPath: string | null = null;
  let profileName: string = DEFAULT_STUDIO_AUTHORING_PROFILE_V1;
  let sawProfile = false;
  let prepareAssetsDirectory: string | undefined;
  let describe = false;
  let action: string | undefined;
  if (args.length === 1 && args[0] === "--list-actions") {
    return Object.freeze({ mode: "list-actions" as const });
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--prepare-assets" && prepareAssetsDirectory === undefined) {
      const candidate = args[++index];
      if (candidate === undefined || candidate.startsWith("--")) throw contentUsageV1();
      prepareAssetsDirectory = path.resolve(process.cwd(), candidate);
      continue;
    }
    if (arg === "--describe" && !describe && commandPath === null) {
      describe = true;
      const candidate = args[index + 1];
      if (candidate !== undefined && !candidate.startsWith("--")) {
        action = candidate;
        index += 1;
      }
      continue;
    }
    if (arg === "--command" && commandPath === null) {
      const candidate = args[index + 1];
      if (candidate === undefined || candidate.startsWith("--")) {
        throw contentUsageV1();
      }
      commandPath = path.resolve(process.cwd(), candidate);
      index += 1;
      continue;
    }
    if (arg === "--profile" && !sawProfile) {
      const candidate = args[index + 1];
      if (candidate === undefined) throw contentUsageV1();
      profileName = requireStudioAuthoringProfileNameV1(candidate);
      sawProfile = true;
      index += 1;
      continue;
    }
    throw contentUsageV1();
  }
  if (describe) {
    if (commandPath !== null || sawProfile || prepareAssetsDirectory !== undefined) throw contentUsageV1();
    return Object.freeze({ mode: "describe" as const, ...(action === undefined ? {} : { action }) });
  }
  if (commandPath === null) throw contentUsageV1();
  return Object.freeze({
    mode: "execute" as const,
    commandPath,
    profileName,
    ...(prepareAssetsDirectory === undefined ? {} : { prepareAssetsDirectory }),
  });
}

function contentUsageV1(): Error {
  return new Error(
    "Usage: --list-actions | --describe [action] | --command <command.json> [--profile <name>] [--prepare-assets <new-directory>] (snapshot.analyze, includeAnalysis: true)",
  );
}
