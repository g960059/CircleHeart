import { validateDisplayNameV1, validatePublicAuthorV1, validateMyProfileV1, type PublicAuthorV1, type MyProfileV1 } from "@/studio/application/profile/StudioPublicProfileV1";
import { validateCourseContentV1, validateCourseDraftV1, validatePublicCourseV1, type CourseContentV1, type CourseDraftV1, type PublicCourseV1 } from "@/studio/application/course/StudioCourseV1";
import { assertArticleReadingReadyV1, stripArticleReadingMarkupV1 } from "@/studio/application/article/StudioArticleReadingV1";
import { articleTagsV1, isCanonicalArticleTagV1 } from "@/studio/application/article/StudioArticleTagsV1";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  validateStudioArticleDraftV2,
} from "@/studio/application/authoring/StudioArticleDataV2";
import {
  validateExperimentContentV2,
  validateExperimentSnapshotV2,
  validateExperimentV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import {
  type StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import {
  type StudioPublishedArticleV1,
  validateStudioPublishedArticleV1,
} from "@/studio/application/publication/StudioPublishedArticleV1";
import type {
  StudioPublicArticleSummaryV1,
  StudioPublicExperimentSummaryV1,
} from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import {
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
  type ExperimentContentV2,
  type ExperimentSnapshotV2,
  type ExperimentV2,
} from "@/studio/contracts/v2/content";
import {
  studioCanonicalJsonStringify,
} from "@/domain/json/CanonicalJson";
import {
  assertStudioAdmittedSnapshotCommitV1,
  type StudioAdmittedSnapshotCommitV1,
} from "@/studio/application/authoring/StudioAdmittedSnapshotCommitV1";
import {
  assertStudioSimulationWorkerAdmittedSnapshotCommitV2,
  type StudioSimulationWorkerAdmittedSnapshotCommitV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";
import { ensureStudioAuthenticatedForSaveV1 } from "./StudioSupabaseAuthV1";
import { studioSupabaseClientV1 } from "./StudioSupabaseClientV1";

export type StudioRemoteExperimentResourceV1 = Readonly<{
  experiment: ExperimentV2;
  title: string;
  createdAt: string;
  updatedAt: string;
  publishedSnapshotId: string | null;
  publicSlug: string | null;
  publishedVersion?: number | null;
  publishedAt?: string | null;
}>;

export type StudioSummaryCursorV1 = Readonly<{
  timestamp: string;
  id: string;
}>;

export type StudioSummaryPageV1<T> = Readonly<{
  items: readonly T[];
  nextCursor: StudioSummaryCursorV1 | null;
}>;

export type StudioSummaryPageRequestV1 = Readonly<{
  limit?: number;
  cursor?: StudioSummaryCursorV1 | null;
}>;

export type StudioAuthoringOperationReceiptV1 = Readonly<{
  operationId: string;
  operationKind: string;
  status: "running" | "committed";
  result: Readonly<Record<string, unknown>> | null;
  createdAt: string;
  completedAt: string | null;
}>;

export type StudioRemoteExperimentSummaryV1 = Readonly<{
  experimentId: string;
  version: number;
  modelId: string;
  surfaceSeriesId: string;
  title: string;
  scenarioCount: number;
  createdAt: string;
  updatedAt: string;
  publishedSnapshotId: string | null;
  publicSlug: string | null;
}>;

export type StudioRemoteSnapshotSummaryV1 = Readonly<{
  snapshotId: string;
  modelId: string;
  surfaceSeriesId: string;
  surfaceReleaseId: string;
  title: string;
  scenarioCount: number;
  paneCount: number;
  createdAt: string;
}>;

export type StudioRemoteArticleSummaryV1 = Readonly<{
  articleId: string;
  version: number;
  visibility: "draft" | "public";
  locale: string;
  title: string;
  /** Tags of the current draft revision (the live revision when public). */
  tags: readonly string[];
  createdAt: string;
  updatedAt: string;
  publicSlug: string | null;
}>;

/** One entry of the shared public tag vocabulary for a locale. */
export type StudioPublicArticleTagCountV1 = Readonly<{
  tag: string;
  articleCount: number;
}>;

/**
 * Every Article owned by the signed-in author. Management filters and the
 * editor's own-tag vocabulary must see older Articles too, not one page.
 */
export async function listAllMyArticleSummariesV1(
  repository: Pick<StudioSupabaseContentRepositoryV1, "listMyArticles">,
): Promise<readonly StudioRemoteArticleSummaryV1[]> {
  const items: StudioRemoteArticleSummaryV1[] = [];
  let cursor: StudioSummaryCursorV1 | null = null;
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const page = await repository.listMyArticles({ limit: 100, cursor });
    items.push(...page.items);
    if (page.nextCursor === null) return Object.freeze(items);
    cursor = page.nextCursor;
  }
  throw new Error("Owned Article listing exceeded 10,000 entries");
}

export function createStudioSupabaseContentRepositoryV1():
  StudioSupabaseContentRepositoryV1 | null {
  const client = studioSupabaseClientV1();
  return client === null ? null : new StudioSupabaseContentRepositoryV1(client);
}

export type StudioSupabaseContentRepositoryOptionsV1 = Readonly<{
  /** Fixed semantic operation UUID for a one-command Node/AI process. */
  fixedMutationOperationId?: string;
}>;

/**
 * The backend acknowledged a mutation, but the returned/read-back value did
 * not satisfy the local contract. AI callers must treat the commit as durable
 * and recover by reading authority state, never by minting another mutation.
 */
export class StudioSupabaseMutationAcknowledgedErrorV1 extends Error {
  readonly authoringCommitState = "confirmed" as const;

  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "StudioSupabaseMutationAcknowledgedErrorV1";
  }
}

export class StudioSupabaseContentRepositoryV1 {
  readonly #client: SupabaseClient;
  readonly #pendingOperationIds = new Map<string, string>();
  readonly #fixedMutationOperationId?: string;
  #fixedMutationRequest: string | undefined;

  constructor(
    client: SupabaseClient | null = studioSupabaseClientV1(),
    options: StudioSupabaseContentRepositoryOptionsV1 = {},
  ) {
    if (client === null) throw new Error("Supabase is not configured");
    this.#client = client;
    if (
      options.fixedMutationOperationId !== undefined
      && !isUuidV1(options.fixedMutationOperationId)
    ) {
      throw new Error("Fixed mutation operation ID must be a UUID");
    }
    this.#fixedMutationOperationId = options.fixedMutationOperationId;
  }

  async readMyProfile(): Promise<MyProfileV1 | null> {
    const data = await this.#rpc("read_my_profile_v1", {});
    return data === null ? null : validateMyProfileV1(data);
  }
  async saveMyProfile(input: { userId: string; expectedVersion: number; displayName: string }): Promise<MyProfileV1> {
    await ensureStudioAuthenticatedForSaveV1(this.#client);
    const data = await this.#mutationRpc("save_my_profile_v1", {
      p_expected_user_id: input.userId,
      p_expected_version: input.expectedVersion,
      p_display_name: validateDisplayNameV1(input.displayName),
    });
    return parseAcknowledgedMutationResultV1("Saved profile response failed validation", () => validateMyProfileV1(data));
  }
  async readPublicResourceAuthor(kind: "article" | "snapshot", resourceId: string): Promise<PublicAuthorV1 | null> {
    const data = await this.#rpc("read_public_resource_author_v1", { p_kind: kind, p_resource_id: resourceId });
    return data === null ? null : validatePublicAuthorV1(data);
  }

  async saveExperiment(input: Readonly<{
    experimentId: string | null;
    expectedVersion: number | null;
    title: string;
    content: ExperimentContentV2;
  }>): Promise<ExperimentV2> {
    await ensureStudioAuthenticatedForSaveV1(this.#client);
    const content = validateExperimentContentV2(input.content);
    const data = await this.#mutationRpc("save_experiment_v1", {
      p_experiment_id: input.experimentId,
      p_expected_version: input.expectedVersion,
      p_title: requiredTrimmedV1(input.title, "Experiment title"),
      p_model_id: content.modelId,
      p_content: content,
    });
    return parseAcknowledgedMutationResultV1(
      "Saved Experiment response failed local validation",
      () => {
        const result = recordV1(data, "save_experiment_v1 result");
        return validateExperimentV2({
          schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
          experimentId: requiredStringV1(result.experimentId, "experimentId"),
          version: nonnegativeIntegerV1(result.version, "version"),
          content,
        });
      },
    );
  }

  async commitSnapshot(input: Readonly<{
    admitted:
      | StudioAdmittedSnapshotCommitV1
      | StudioSimulationWorkerAdmittedSnapshotCommitV2;
    sourceExperiment?: Readonly<{
      experimentId: string;
      expectedVersion: number;
    }>;
  }>): Promise<ExperimentSnapshotV2> {
    await ensureStudioAuthenticatedForSaveV1(this.#client);
    try {
      assertStudioAdmittedSnapshotCommitV1(input.admitted);
    } catch {
      assertStudioSimulationWorkerAdmittedSnapshotCommitV2(input.admitted);
    }
    const candidate = input.admitted.snapshot;
    const data = await this.#mutationRpc(
      "commit_admitted_experiment_snapshot_v1",
      {
        // Persistence owns durable identity; the Worker's ID seals admission
        // correlation only and is intentionally not reused as a database key.
        p_snapshot_id: null,
        p_model_id: candidate.content.modelId,
        p_content: candidate.content,
        p_surface_release_id: candidate.surfaceReleaseId,
        // Keep the previous canonical retry key when there is no cache.
        ...(candidate.readerPreview === undefined ? {} : { p_reader_preview: candidate.readerPreview }),
        p_source_experiment_id: input.sourceExperiment?.experimentId ?? null,
        p_expected_experiment_version:
          input.sourceExperiment?.expectedVersion ?? null,
      },
    );
    return parseAcknowledgedMutationResultV1(
      "Committed Snapshot response failed local validation",
      () => {
        const result = recordV1(
          data,
          "commit_admitted_experiment_snapshot_v1 result",
        );
        return validateExperimentSnapshotV2({
          schemaId: requiredStringV1(result.schemaId, "schemaId"),
          snapshotId: requiredStringV1(result.snapshotId, "snapshotId"),
          content: candidate.content,
          createdAt: isoTimestampV1(result.createdAt, "createdAt"),
          surfaceReleaseId: candidate.surfaceReleaseId,
          ...(candidate.readerPreview === undefined ? {} : { readerPreview: candidate.readerPreview }),
        });
      },
    );
  }

  async saveArticle(input: Readonly<{
    articleId: string | null;
    expectedVersion: number | null;
    article: StudioArticleDraftV2;
  }>): Promise<StudioArticleDraftV2> {
    await ensureStudioAuthenticatedForSaveV1(this.#client);
    const article = validateStudioArticleDraftV2(input.article);
    const data = await this.#mutationRpc("save_article_v1", {
      p_article_id: input.articleId,
      p_expected_version: input.expectedVersion,
      p_locale: article.locale,
      p_title: article.title,
      p_blocks: article.blocks,
      p_tags: article.tags,
    });
    try {
      const result = recordV1(data, "save_article_v1 result");
      const articleId = requiredStringV1(result.articleId, "articleId");
      nonnegativeIntegerV1(result.version, "version");
      // Publication state is backend authority. In particular, an AI-authored
      // payload must not make the command result claim `public` when the
      // Article has only been saved as a private draft.
      const saved = await this.readArticle(articleId);
      if (saved === null) {
        throw new Error("Saved Article could not be read from authority");
      }
      return saved;
    } catch (error) {
      throw acknowledgedMutationErrorV1(
        "Saved Article could not be read back from authority",
        error,
      );
    }
  }

  /**
   * Stores an immutable, publicly readable Article image under the owner's
   * namespace. Public URLs keep Reader rendering independent of an auth
   * session; overwrite is intentionally disabled because published Article
   * versions may continue to reference the original object.
   */
  async uploadArticleImage(file: File): Promise<string> {
    const session = await ensureStudioAuthenticatedForSaveV1(this.#client);
    if (session.user.is_anonymous === true) {
      throw new Error("Sign in before uploading an Article image");
    }
    const extension = articleImageExtensionV1(file.type);
    if (extension === null) {
      throw new Error("Article images must be PNG, JPEG, WebP, GIF, or AVIF");
    }
    if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
      throw new Error("Article images must be between 1 byte and 8 MB");
    }
    const objectPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
    const uploaded = await this.#client.storage
      .from("article-images")
      .upload(objectPath, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });
    if (uploaded.error !== null) throw uploaded.error;
    const publicUrl = this.#client.storage
      .from("article-images")
      .getPublicUrl(objectPath).data.publicUrl;
    if (!publicUrl.startsWith("https://")) {
      throw new Error("Article image storage returned an invalid public URL");
    }
    return publicUrl;
  }

  async publishExperiment(input: Readonly<{
    experimentId: string;
    expectedVersion: number;
    snapshotId: string;
    publicSlug: string;
  }>): Promise<void> {
    await this.#mutationRpc("publish_experiment_v1", {
      p_experiment_id: input.experimentId,
      p_expected_version: input.expectedVersion,
      p_snapshot_id: input.snapshotId,
      p_public_slug: input.publicSlug,
    });
  }

  async publishArticle(input: Readonly<{
    articleId: string;
    expectedVersion: number;
    publicSlug: string;
  }>): Promise<void> {
    const draft = await this.readArticle(input.articleId);
    if (draft === null) throw new Error("Article was not found");
    if (draft.draftVersion !== input.expectedVersion) throw new Error("Article version changed before publication");
    assertArticleReadingReadyV1(draft.blocks);
    await this.#mutationRpc("publish_article_v1", {
      p_article_id: input.articleId,
      p_expected_version: input.expectedVersion,
      p_public_slug: input.publicSlug,
    });
  }

  async unpublishExperiment(experimentId: string, expectedVersion: number): Promise<void> {
    await this.#mutationRpc("unpublish_experiment_v1", {
      p_experiment_id: experimentId,
      p_expected_version: expectedVersion,
    });
  }

  async unpublishArticle(articleId: string, expectedVersion: number): Promise<void> {
    await this.#mutationRpc("unpublish_article_v1", {
      p_article_id: articleId,
      p_expected_version: expectedVersion,
    });
  }

  async deleteExperiment(experimentId: string, expectedVersion: number): Promise<void> {
    await this.#mutationRpc("delete_experiment_v1", {
      p_experiment_id: experimentId,
      p_expected_version: expectedVersion,
    });
  }

  async deleteArticle(articleId: string, expectedVersion: number): Promise<void> {
    await this.#mutationRpc("delete_article_v1", {
      p_article_id: articleId,
      p_expected_version: expectedVersion,
    });
  }

  async listMyExperiments(
    request: StudioSummaryPageRequestV1 = {},
  ): Promise<StudioSummaryPageV1<StudioRemoteExperimentSummaryV1>> {
    const session = await this.#client.auth.getSession();
    if (session.error !== null) throw session.error;
    if (session.data.session === null) return emptySummaryPageV1();
    const data = await this.#rpc("list_my_experiment_summaries_v1", {
      p_limit: summaryPageLimitV1(request.limit),
      p_before_updated_at: request.cursor?.timestamp ?? null,
      p_before_id: request.cursor?.id ?? null,
    });
    return validateSummaryPageV1(
      data,
      "Experiment summary page",
      validateExperimentSummaryV1,
    );
  }

  async readMyExperiment(experimentId: string): Promise<StudioRemoteExperimentResourceV1 | null> {
    const session = await this.#client.auth.getSession();
    if (session.error !== null) throw session.error;
    if (session.data.session === null) return null;
    const data = await this.#rpc("read_my_experiment_v1", {
      p_experiment_id: experimentId,
    });
    return data === null ? null : validateExperimentResourceV1(data);
  }

  async listMySnapshots(
    request: StudioSummaryPageRequestV1 = {},
  ): Promise<StudioSummaryPageV1<StudioRemoteSnapshotSummaryV1>> {
    const session = await this.#client.auth.getSession();
    if (session.error !== null) throw session.error;
    if (session.data.session === null) return emptySummaryPageV1();
    const data = await this.#rpc("list_my_snapshot_summaries_v1", {
      p_limit: summaryPageLimitV1(request.limit),
      p_before_created_at: request.cursor?.timestamp ?? null,
      p_before_id: request.cursor?.id ?? null,
    });
    return validateSummaryPageV1(
      data,
      "Snapshot summary page",
      validateSnapshotSummaryV1,
    );
  }

  async readPublicExperimentSnapshot(publicSlug: string): Promise<ExperimentSnapshotV2 | null> {
    const data = await this.#rpc("read_public_experiment_v1", { p_public_slug: publicSlug });
    return data === null ? null : validateExperimentSnapshotV2(recordV1(data, "Public Experiment").snapshot);
  }

  async readSnapshot(snapshotId: string): Promise<ExperimentSnapshotV2 | null> {
    const data = await this.#rpc("read_experiment_snapshot_v1", {
      p_snapshot_id: snapshotId,
    });
    return data === null ? null : validateExperimentSnapshotV2(data);
  }

  async saveCourse(input: {courseId: string | null; expectedVersion: number | null; content: CourseContentV1}): Promise<CourseDraftV1> {
    await ensureStudioAuthenticatedForSaveV1(this.#client);
    const data=await this.#mutationRpc("save_course_v1", {p_course_id:input.courseId,p_expected_version:input.expectedVersion,p_content:validateCourseContentV1(input.content)});
    return parseAcknowledgedMutationResultV1("Saved Course response invalid",()=>validateCourseDraftV1(data));
  }

  async publishCourse(input: {courseId: string; expectedVersion: number; publish: boolean}): Promise<CourseDraftV1> {
    const data=await this.#mutationRpc("publish_course_v1",{p_course_id:input.courseId,p_expected_version:input.expectedVersion,p_publish:input.publish});
    return parseAcknowledgedMutationResultV1("Published Course response invalid",()=>validateCourseDraftV1(data));
  }

  async deleteCourse(input:{courseId:string;expectedVersion:number}):Promise<void> {
    await this.#mutationRpc("delete_course_v1",{p_course_id:input.courseId,p_expected_version:input.expectedVersion});
  }

  async readMyCourse(courseId: string): Promise<CourseDraftV1 | null> {
    const data=await this.#rpc("read_my_course_v1",{p_course_id:courseId});
    return data===null?null:validateCourseDraftV1(data);
  }

  async readPublicCourse(courseId: string): Promise<PublicCourseV1 | null> {
    const data=await this.#rpc("read_public_course_v1",{p_course_id:courseId});
    return data===null?null:validatePublicCourseV1(data);
  }

  async listPublicCourses(input: {locale?: string; featured?: boolean; articleId?: string; offset?: number}={}): Promise<readonly PublicCourseV1[]> {
    const data=await this.#rpc("list_courses_v1",{p_scope:input.featured?"featured":"public",p_locale:input.locale??"ja",p_article_id:input.articleId??null,p_offset:input.offset??0});
    if(!Array.isArray(data)) throw new Error("Invalid Course list");
    return data.map(validatePublicCourseV1);
  }

  async listMyCourses(input: {locale?: string; offset?: number}={}): Promise<readonly CourseDraftV1[]> {
    const data=await this.#rpc("list_courses_v1",{p_scope:"mine",p_locale:input.locale??"ja",p_offset:input.offset??0});
    if(!Array.isArray(data)) throw new Error("Invalid Course list");
    return data.map(validateCourseDraftV1);
  }

  async readPublicSnapshotTitle(snapshotId: string): Promise<string | null> {
    const data = await this.#rpc("read_public_snapshot_title_v1", { p_snapshot_id: snapshotId });
    return data === null ? null : requiredStringV1(data, "Snapshot title");
  }

  async listMyArticles(
    request: StudioSummaryPageRequestV1 = {},
  ): Promise<StudioSummaryPageV1<StudioRemoteArticleSummaryV1>> {
    const session = await this.#client.auth.getSession();
    if (session.error !== null) throw session.error;
    if (session.data.session === null) return emptySummaryPageV1();
    const data = await this.#rpc("list_my_article_summaries_v1", {
      p_limit: summaryPageLimitV1(request.limit),
      p_before_updated_at: request.cursor?.timestamp ?? null,
      p_before_id: request.cursor?.id ?? null,
    });
    return validateSummaryPageV1(
      data,
      "Article summary page",
      validateArticleSummaryV1,
    );
  }

  async readArticle(articleId: string): Promise<StudioArticleDraftV2 | null> {
    const data = await this.#rpc("read_article_v1", { p_article_id: articleId });
    return data === null ? null : validateStudioArticleDraftV2(data);
  }

  /** Resolves either the canonical public slug or a legacy public UUID route. */
  async readPublishedArticle(
    routeKey: string,
  ): Promise<StudioPublishedArticleV1 | null> {
    const data = await this.#rpc("read_public_article_route_v1", {
      p_article_route_key: routeKey,
    });
    return data === null ? null : validateStudioPublishedArticleV1(data);
  }

  async readMyAuthoringOperationReceipt(
    operationId: string,
  ): Promise<StudioAuthoringOperationReceiptV1 | null> {
    if (!isUuidV1(operationId)) {
      throw new Error("Authoring operation ID must be a UUID");
    }
    const data = await this.#rpc("read_my_authoring_operation_receipt_v1", {
      p_operation_id: operationId,
    });
    return parseAuthoringOperationReceiptV1(data);
  }

  async listPublicExperiments(
    request: StudioSummaryPageRequestV1 = {},
  ): Promise<StudioSummaryPageV1<StudioPublicExperimentSummaryV1>> {
    const data = await this.#rpc("list_public_experiment_summaries_v1", {
      p_limit: summaryPageLimitV1(request.limit),
      p_before_published_at: request.cursor?.timestamp ?? null,
      p_before_id: request.cursor?.id ?? null,
    });
    return validateSummaryPageV1(
      data,
      "Public Experiment summary page",
      validatePublicExperimentSummaryV1,
    );
  }

  /** Tags used by live publications of one locale, most used first. */
  async listPublicArticleTags(
    locale: "ja" | "en",
  ): Promise<readonly StudioPublicArticleTagCountV1[]> {
    const data = await this.#rpc("list_public_article_tags_v1", {
      p_locale: locale,
      p_limit: 100,
    });
    return Object.freeze(arrayV1(data, "Public Article tags").map((value) => {
      const record = recordV1(value, "Public Article tag");
      if (!isCanonicalArticleTagV1(record.tag)) {
        throw new Error("Public Article tag must be canonical");
      }
      return Object.freeze({
        tag: record.tag,
        articleCount: nonnegativeIntegerV1(record.articleCount, "articleCount"),
      });
    }));
  }

  async listPublicArticles(
    request: StudioSummaryPageRequestV1 = {},
  ): Promise<StudioSummaryPageV1<StudioPublicArticleSummaryV1>> {
    const data = await this.#rpc("list_public_article_summaries_v1", {
      p_limit: summaryPageLimitV1(request.limit),
      p_before_published_at: request.cursor?.timestamp ?? null,
      p_before_id: request.cursor?.id ?? null,
    });
    return validateSummaryPageV1(
      data,
      "Public Article summary page",
      validatePublicArticleSummaryV1,
    );
  }

  async #rpc(functionName: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.#client.rpc(functionName, args);
    if (result.error !== null) throw result.error;
    return result.data;
  }

  /**
   * Reuses one operation UUID for an exact semantic mutation until the
   * backend acknowledges a committed result. This covers the important
   * response-loss case: a user retry (including after a reload in the same
   * tab) reaches the operation receipt with the original UUID instead of
   * creating a duplicate immutable content row.
   */
  async #mutationRpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const canonicalRequest = studioCanonicalJsonStringify({
      functionName,
      args,
    });
    if (
      this.#fixedMutationRequest !== undefined
      && this.#fixedMutationRequest !== canonicalRequest
    ) {
      throw new Error(
        "A fixed-operation repository may execute only one semantic mutation",
      );
    }
    if (this.#fixedMutationOperationId !== undefined) {
      this.#fixedMutationRequest = canonicalRequest;
    }
    const storageKey = await pendingOperationStorageKeyV1(canonicalRequest);
    const operationId = this.#fixedMutationOperationId
      ?? this.#pendingOperationIds.get(canonicalRequest)
      ?? readPendingOperationIdV1(storageKey)
      ?? operationIdV1();
    this.#pendingOperationIds.set(canonicalRequest, operationId);
    writePendingOperationIdV1(storageKey, operationId);
    const data = await this.#rpc(functionName, {
      p_operation_id: operationId,
      ...args,
    });
    this.#pendingOperationIds.delete(canonicalRequest);
    removePendingOperationIdV1(storageKey, operationId);
    return data;
  }
}

function parseAuthoringOperationReceiptV1(
  value: unknown,
): StudioAuthoringOperationReceiptV1 | null {
  if (value === null) return null;
  const record = recordV1(value, "Authoring operation receipt");
  const status = requiredStringV1(record.status, "status");
  if (status !== "running" && status !== "committed") {
    throw new Error("Authoring operation receipt status is unsupported");
  }
  const result = record.result === null
    ? null
    : Object.freeze({ ...recordV1(record.result, "result") });
  if ((status === "committed") !== (result !== null)) {
    throw new Error("Authoring operation receipt result is inconsistent");
  }
  return Object.freeze({
    operationId: requiredStringV1(record.operationId, "operationId"),
    operationKind: requiredStringV1(record.operationKind, "operationKind"),
    status,
    result,
    createdAt: isoTimestampV1(record.createdAt, "createdAt"),
    completedAt: record.completedAt === null
      ? null
      : isoTimestampV1(record.completedAt, "completedAt"),
  });
}

function articleImageExtensionV1(mimeType: string): string | null {
  switch (mimeType) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/avif": return "avif";
    default: return null;
  }
}

function validateExperimentResourceV1(value: unknown): StudioRemoteExperimentResourceV1 {
  const record = recordV1(value, "Experiment resource");
  return Object.freeze({
    experiment: validateExperimentV2(record.experiment),
    title: requiredStringV1(record.title, "title"),
    createdAt: isoTimestampV1(record.createdAt, "createdAt"),
    updatedAt: isoTimestampV1(record.updatedAt, "updatedAt"),
    publishedSnapshotId: nullableStringV1(
      record.publishedSnapshotId,
      "publishedSnapshotId",
    ),
    publicSlug: nullableStringV1(record.publicSlug, "publicSlug"),
    publishedVersion: record.publishedVersion == null ? null : nonnegativeIntegerV1(record.publishedVersion, "publishedVersion"),
    publishedAt: record.publishedAt == null ? null : isoTimestampV1(record.publishedAt, "publishedAt"),
  });
}

function validateExperimentSummaryV1(
  value: unknown,
): StudioRemoteExperimentSummaryV1 {
  const record = recordV1(value, "Experiment summary");
  return Object.freeze({
    experimentId: requiredStringV1(record.experimentId, "experimentId"),
    version: nonnegativeIntegerV1(record.version, "version"),
    modelId: requiredStringV1(record.modelId, "modelId"),
    surfaceSeriesId: requiredStringV1(
      record.surfaceSeriesId,
      "surfaceSeriesId",
    ),
    title: requiredStringV1(record.title, "title"),
    scenarioCount: nonnegativeIntegerV1(record.scenarioCount, "scenarioCount"),
    createdAt: isoTimestampV1(record.createdAt, "createdAt"),
    updatedAt: isoTimestampV1(record.updatedAt, "updatedAt"),
    publishedSnapshotId: nullableStringV1(
      record.publishedSnapshotId,
      "publishedSnapshotId",
    ),
    publicSlug: nullableStringV1(record.publicSlug, "publicSlug"),
  });
}

function validateSnapshotSummaryV1(
  value: unknown,
): StudioRemoteSnapshotSummaryV1 {
  const record = recordV1(value, "Snapshot summary");
  return Object.freeze({
    snapshotId: requiredStringV1(record.snapshotId, "snapshotId"),
    modelId: requiredStringV1(record.modelId, "modelId"),
    surfaceSeriesId: requiredStringV1(
      record.surfaceSeriesId,
      "surfaceSeriesId",
    ),
    surfaceReleaseId: requiredStringV1(
      record.surfaceReleaseId,
      "surfaceReleaseId",
    ),
    title: requiredStringV1(record.title, "title"),
    scenarioCount: nonnegativeIntegerV1(record.scenarioCount, "scenarioCount"),
    paneCount: nonnegativeIntegerV1(record.paneCount, "paneCount"),
    createdAt: isoTimestampV1(record.createdAt, "createdAt"),
  });
}

function validateArticleSummaryV1(
  value: unknown,
): StudioRemoteArticleSummaryV1 {
  const record = recordV1(value, "Article summary");
  const visibility = requiredStringV1(record.visibility, "visibility");
  if (visibility !== "draft" && visibility !== "public") {
    throw new Error("visibility must be draft or public");
  }
  return Object.freeze({
    articleId: requiredStringV1(record.articleId, "articleId"),
    version: nonnegativeIntegerV1(record.version, "version"),
    visibility,
    locale: requiredStringV1(record.locale, "locale"),
    title: requiredStringV1(record.title, "title"),
    tags: articleTagsV1(record.tags, "Article summary tags"),
    createdAt: isoTimestampV1(record.createdAt, "createdAt"),
    updatedAt: isoTimestampV1(record.updatedAt, "updatedAt"),
    publicSlug: nullableStringV1(record.publicSlug, "publicSlug"),
  });
}

function validatePublicExperimentSummaryV1(
  value: unknown,
): StudioPublicExperimentSummaryV1 {
  const record = recordV1(value, "Public Experiment summary");
  return Object.freeze({
    ...(record.author === undefined ? {} : { author: validatePublicAuthorV1(record.author) }),
    experimentId: requiredStringV1(record.experimentId, "experimentId"),
    title: requiredStringV1(record.title, "title"),
    publicSlug: requiredStringV1(record.publicSlug, "publicSlug"),
    publishedAt: isoTimestampV1(record.publishedAt, "publishedAt"),
    snapshotId: requiredStringV1(record.snapshotId, "snapshotId"),
    modelId: requiredStringV1(record.modelId, "modelId"),
    scenarioCount: nonnegativeIntegerV1(record.scenarioCount, "scenarioCount"),
  });
}

function validatePublicArticleSummaryV1(
  value: unknown,
): StudioPublicArticleSummaryV1 {
  const record = recordV1(value, "Public Article summary");
  return Object.freeze({
    ...(record.author === undefined ? {} : { author: validatePublicAuthorV1(record.author) }),
    articleId: requiredStringV1(record.articleId, "articleId"),
    locale: requiredStringV1(record.locale, "locale"),
    title: requiredStringV1(record.title, "title"),
    tags: articleTagsV1(record.tags, "Public Article summary tags"),
    excerpt: record.excerpt === null ? null : stripArticleReadingMarkupV1(nullableStringV1(record.excerpt, "excerpt") ?? ""),
    publicSlug: requiredStringV1(record.publicSlug, "publicSlug"),
    publishedAt: isoTimestampV1(record.publishedAt, "publishedAt"),
  });
}

function validateSummaryPageV1<T>(
  value: unknown,
  label: string,
  validateItem: (value: unknown) => T,
): StudioSummaryPageV1<T> {
  const record = recordV1(value, label);
  const items = Object.freeze(arrayV1(record.items, `${label}.items`).map(
    validateItem,
  ));
  const cursorValue = record.nextCursor;
  const nextCursor = cursorValue === null
    ? null
    : validateSummaryCursorV1(cursorValue, `${label}.nextCursor`);
  return Object.freeze({ items, nextCursor });
}

function validateSummaryCursorV1(
  value: unknown,
  label: string,
): StudioSummaryCursorV1 {
  const record = recordV1(value, label);
  return Object.freeze({
    timestamp: isoTimestampV1(record.timestamp, `${label}.timestamp`),
    id: requiredStringV1(record.id, `${label}.id`),
  });
}

function emptySummaryPageV1<T>(): StudioSummaryPageV1<T> {
  return Object.freeze({ items: Object.freeze([]), nextCursor: null });
}

function summaryPageLimitV1(value: number | undefined): number {
  if (value === undefined) return 50;
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new Error("Summary page limit must be an integer within [1, 100]");
  }
  return value;
}

function operationIdV1(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("This browser cannot create an idempotent operation ID");
  }
  return globalThis.crypto.randomUUID();
}

function isUuidV1(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const STUDIO_PENDING_OPERATION_PREFIX_V1 =
  "circleheart.studio.pending-operation.v1.";
const STUDIO_PENDING_OPERATION_MAXIMUM_AGE_MS_V1 = 24 * 60 * 60 * 1_000;

type PendingOperationStorageRecordV1 = Readonly<{
  operationId: string;
  createdAtMs: number;
}>;

async function pendingOperationStorageKeyV1(
  canonicalRequest: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalRequest);
  const subtle = globalThis.crypto?.subtle;
  if (subtle !== undefined) {
    const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
    return `${STUDIO_PENDING_OPERATION_PREFIX_V1}${Array.from(
      digest,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("")}`;
  }
  // Old WebViews without SubtleCrypto still receive stable retry behavior.
  // The server compares the complete request fingerprint before replaying, so
  // a local fallback collision fails closed instead of replaying other data.
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${STUDIO_PENDING_OPERATION_PREFIX_V1}fallback-${bytes.length}-${hash.toString(16)}`;
}

function readPendingOperationIdV1(storageKey: string): string | null {
  const storage = sessionStorageV1();
  if (storage === null) return null;
  try {
    const raw = storage.getItem(storageKey);
    if (raw === null) return null;
    const value = JSON.parse(raw) as Partial<PendingOperationStorageRecordV1>;
    if (
      typeof value.operationId !== "string"
      || typeof value.createdAtMs !== "number"
      || !Number.isFinite(value.createdAtMs)
      || Date.now() - value.createdAtMs
        > STUDIO_PENDING_OPERATION_MAXIMUM_AGE_MS_V1
    ) {
      storage.removeItem(storageKey);
      return null;
    }
    return value.operationId;
  } catch {
    try {
      storage.removeItem(storageKey);
    } catch {
      // Storage is only a reload acceleration; in-memory reuse remains valid.
    }
    return null;
  }
}

function writePendingOperationIdV1(
  storageKey: string,
  operationId: string,
): void {
  const storage = sessionStorageV1();
  if (storage === null) return;
  try {
    storage.setItem(storageKey, JSON.stringify({
      operationId,
      createdAtMs: Date.now(),
    } satisfies PendingOperationStorageRecordV1));
  } catch {
    // Private browsing/storage pressure must not disable durable saves.
  }
}

function removePendingOperationIdV1(
  storageKey: string,
  operationId: string,
): void {
  const storage = sessionStorageV1();
  if (storage === null) return;
  try {
    const raw = storage.getItem(storageKey);
    if (raw === null) return;
    const value = JSON.parse(raw) as Partial<PendingOperationStorageRecordV1>;
    if (value.operationId === operationId) storage.removeItem(storageKey);
  } catch {
    // A corrupt/blocked storage entry cannot affect an acknowledged mutation.
  }
}

function sessionStorageV1(): Storage | null {
  try {
    return typeof globalThis.sessionStorage === "undefined"
      ? null
      : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function parseAcknowledgedMutationResultV1<T>(
  message: string,
  parse: () => T,
): T {
  try {
    return parse();
  } catch (error) {
    throw acknowledgedMutationErrorV1(message, error);
  }
}

function acknowledgedMutationErrorV1(
  message: string,
  cause: unknown,
): StudioSupabaseMutationAcknowledgedErrorV1 {
  return cause instanceof StudioSupabaseMutationAcknowledgedErrorV1
    ? cause
    : new StudioSupabaseMutationAcknowledgedErrorV1(message, cause);
}

function recordV1(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function arrayV1(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requiredStringV1(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function requiredTrimmedV1(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 240) {
    throw new Error(`${label} must contain 1–240 characters`);
  }
  return normalized;
}

function nullableStringV1(value: unknown, label: string): string | null {
  return value === null ? null : requiredStringV1(value, label);
}

function nonnegativeIntegerV1(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a nonnegative integer`);
  }
  return value as number;
}

function isoTimestampV1(value: unknown, label: string): string {
  const timestamp = requiredStringV1(value, label);
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
  return timestamp;
}
