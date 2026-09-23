import {
  STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
  type StudioArticleAccordionContentBlockV2,
  type StudioArticleBlockV2,
  type StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import {
  validateExperimentPlacementV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import {
  cloneAndFreezeStudioJson,
} from "@/domain/json/CanonicalJson";
import { assertArticleTagsV1 } from "@/studio/application/article/StudioArticleTagsV1";

const PORTABLE_ID_V2 = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,255}$/;

export class StudioArticleDataValidationErrorV2 extends Error {
  constructor(path: string, message: string) {
    super(`Studio Article V2 rejected ${path}: ${message}`);
    this.name = "StudioArticleDataValidationErrorV2";
  }
}

/** Validates, detaches, and deeply freezes one mutable Article draft. */
export function validateStudioArticleDraftV2(value: unknown): StudioArticleDraftV2 {
  const draft = cloneAndFreezeStudioJson<StudioArticleDraftV2>(value) as
    StudioArticleDraftV2;
  exactKeysV2(draft, [
    "schemaId",
    "articleId",
    "draftVersion",
    "visibility",
    "locale",
    "title",
    "tags",
    "blocks",
  ], "$.article");
  if (draft.schemaId !== STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID) {
    failV2("$.article.schemaId", "schema identity mismatch");
  }
  portableIdV2(draft.articleId, "$.article.articleId");
  nonnegativeIntegerV2(draft.draftVersion, "$.article.draftVersion");
  if (draft.visibility !== "draft" && draft.visibility !== "public") {
    failV2("$.article.visibility", "must be draft or public");
  }
  trimmedNonemptyV2(draft.locale, "$.article.locale", 64);
  authoredStringV2(draft.title, "$.article.title", 240);
  try {
    assertArticleTagsV1(draft.tags, "$.article.tags");
  } catch (error) {
    throw new StudioArticleDataValidationErrorV2(
      "$.article.tags",
      error instanceof Error ? error.message : String(error),
    );
  }
  if (!Array.isArray(draft.blocks)) {
    failV2("$.article.blocks", "must be an array");
  }
  const blockIds = new Set<string>();
  const placementIds = new Set<string>();
  draft.blocks.forEach((block, index) => {
    const path = `$.article.blocks[${index}]`;
    assertArticleBlockV2(block, path);
    registerBlockIdV2(block.blockId, path, blockIds);
    if (block.kind === "accordion") {
      if (block.blocks.length > 100) {
        failV2(`${path}.blocks`, "must contain at most 100 blocks");
      }
      block.blocks.forEach((nested, nestedIndex) => {
        const nestedPath = `${path}.blocks[${nestedIndex}]`;
        assertAccordionContentBlockV2(nested, nestedPath);
        registerBlockIdV2(nested.blockId, nestedPath, blockIds);
      });
    }
    if (block.kind === "experiment") {
      const placement = validateExperimentPlacementV2(block.placement);
      if (placementIds.has(placement.placementId)) {
        failV2(`${path}.placement.placementId`, "duplicate Placement ID");
      }
      placementIds.add(placement.placementId);
    }
  });
  return draft;
}

function registerBlockIdV2(
  blockId: string,
  path: string,
  blockIds: Set<string>,
): void {
  if (blockIds.has(blockId)) failV2(`${path}.blockId`, "duplicate block ID");
  blockIds.add(blockId);
}

function assertAccordionContentBlockV2(
  block: StudioArticleAccordionContentBlockV2,
  path: string,
): void {
  recordV2(block, path);
  const candidate = block as StudioArticleBlockV2;
  if (candidate.kind === "experiment" || candidate.kind === "accordion") {
    failV2(`${path}.kind`, "experiments and nested accordions are not allowed here");
  }
  assertArticleBlockV2(candidate, path);
}

function assertArticleBlockV2(block: StudioArticleBlockV2, path: string): void {
  recordV2(block, path);
  if (block.kind === "heading") {
    exactKeysV2(block, ["blockId", "kind", "level", "text"], path);
    portableIdV2(block.blockId, `${path}.blockId`);
    if (block.level !== 2 && block.level !== 3) {
      failV2(`${path}.level`, "must be 2 or 3");
    }
    authoredStringV2(block.text, `${path}.text`, 500);
    return;
  }
  if (block.kind === "paragraph") {
    exactKeysV2(block, ["blockId", "kind", "text"], path);
    portableIdV2(block.blockId, `${path}.blockId`);
    authoredStringV2(block.text, `${path}.text`, 20_000);
    return;
  }
  if (block.kind === "equation") {
    exactKeysV2(block, ["blockId", "expression", "kind"], path);
    portableIdV2(block.blockId, `${path}.blockId`);
    authoredStringV2(block.expression, `${path}.expression`, 5_000);
    return;
  }
  if (block.kind === "image") {
    exactKeysV2(block, [
      "altText",
      "blockId",
      "caption",
      "kind",
      "url",
    ], path, ["title", "credit"]);
    portableIdV2(block.blockId, `${path}.blockId`);
    articleImageUrlV2(block.url, `${path}.url`);
    authoredStringV2(block.altText, `${path}.altText`, 1_000);
    authoredStringV2(block.caption, `${path}.caption`, 2_000);
    if (block.title !== undefined) authoredStringV2(block.title, `${path}.title`, 500);
    if (block.credit !== undefined) {
      exactKeysV2(block.credit, ["text", "licenseLabel", "licenseHref"], `${path}.credit`);
      authoredStringV2(block.credit.text, `${path}.credit.text`, 2_000);
      authoredStringV2(block.credit.licenseLabel, `${path}.credit.licenseLabel`, 240);
      articleLinkHrefV2(block.credit.licenseHref, `${path}.credit.licenseHref`);
    }
    return;
  }
  if (block.kind === "divider") {
    exactKeysV2(block, ["blockId", "kind"], path);
    portableIdV2(block.blockId, `${path}.blockId`);
    return;
  }
  if (block.kind === "link") {
    exactKeysV2(block, ["blockId", "description", "href", "kind", "label"], path, ["imageUrl", "iconUrl", "siteName", "role"]);
    portableIdV2(block.blockId, `${path}.blockId`);
    articleLinkHrefV2(block.href, `${path}.href`);
    authoredStringV2(block.label, `${path}.label`, 500);
    authoredStringV2(block.description, `${path}.description`, 2_000);
    if (block.imageUrl !== undefined) articleImageUrlV2(block.imageUrl, `${path}.imageUrl`);
    if (block.iconUrl !== undefined) articleImageUrlV2(block.iconUrl, `${path}.iconUrl`);
    if (block.role !== undefined && block.role !== "reference" && block.role !== "card") failV2(`${path}.role`, "must be reference");
    if (block.siteName !== undefined) authoredStringV2(block.siteName, `${path}.siteName`, 240);
    return;
  }
  if (block.kind === "quiz") {
    exactKeysV2(block, [
      "blockId",
      "choices",
      "correctChoiceId",
      "explanation",
      "kind",
      "question",
    ], path);
    portableIdV2(block.blockId, `${path}.blockId`);
    authoredStringV2(block.question, `${path}.question`, 2_000);
    authoredStringV2(block.explanation, `${path}.explanation`, 10_000);
    if (!Array.isArray(block.choices) || block.choices.length < 2 || block.choices.length > 8) {
      failV2(`${path}.choices`, "must contain between 2 and 8 choices");
    }
    const choiceIds = new Set<string>();
    block.choices.forEach((choice, index) => {
      const choicePath = `${path}.choices[${index}]`;
      exactKeysV2(choice, ["choiceId", "label"], choicePath);
      portableIdV2(choice.choiceId, `${choicePath}.choiceId`);
      authoredStringV2(choice.label, `${choicePath}.label`, 1_000);
      if (choiceIds.has(choice.choiceId)) {
        failV2(`${choicePath}.choiceId`, "duplicate choice ID");
      }
      choiceIds.add(choice.choiceId);
    });
    portableIdV2(block.correctChoiceId, `${path}.correctChoiceId`);
    if (!choiceIds.has(block.correctChoiceId)) {
      failV2(`${path}.correctChoiceId`, "must identify one of the choices");
    }
    return;
  }
  if (block.kind === "accordion") {
    exactKeysV2(block, ["blockId", "blocks", "kind", "title"], path, ["role"]);
    if (block.role !== undefined && block.role !== "note" && block.role !== "disclosure") failV2(`${path}.role`, "must be note");
    portableIdV2(block.blockId, `${path}.blockId`);
    authoredStringV2(block.title, `${path}.title`, 500);
    if (!Array.isArray(block.blocks)) {
      failV2(`${path}.blocks`, "must be an array");
    }
    return;
  }
  if (block.kind === "experiment") {
    exactKeysV2(block, ["blockId", "kind", "placement"], path);
    portableIdV2(block.blockId, `${path}.blockId`);
    validateExperimentPlacementV2(block.placement);
    return;
  }
  failV2(`${path}.kind`, "has an invalid block kind");
}

function exactKeysV2(value: unknown, expected: readonly string[], path: string, optional: readonly string[] = []): void {
  recordV2(value, path);
  const actual = Object.keys(value).filter((key) => !optional.includes(key)).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    failV2(path, `keys must be exactly ${sorted.join(", ")}`);
  }
}

function recordV2(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failV2(path, "must be an object");
  }
}

function portableIdV2(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !PORTABLE_ID_V2.test(value)) {
    failV2(path, "must be a portable opaque ID");
  }
}

function nonnegativeIntegerV2(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || Object.is(value, -0)) {
    failV2(path, "must be a nonnegative safe integer");
  }
}

function trimmedNonemptyV2(value: unknown, path: string, maximum: number): void {
  trimmedV2(value, path, maximum);
  if ((value as string).length === 0) failV2(path, "must not be empty");
}

function trimmedV2(value: unknown, path: string, maximum: number): void {
  if (
    typeof value !== "string"
    || value.trim() !== value
    || value.length > maximum
  ) {
    failV2(path, `must be a trimmed string of at most ${maximum} characters`);
  }
}

/**
 * Mutable Article text is an exact authoring value, not normalized metadata.
 * In particular, autosave must preserve a trailing space while the author
 * pauses between words and empty blocks while they are still being edited.
 */
function authoredStringV2(value: unknown, path: string, maximum: number): void {
  if (typeof value !== "string" || value.length > maximum) {
    failV2(path, `must be a string of at most ${maximum} characters`);
  }
}

function articleImageUrlV2(value: unknown, path: string): void {
  authoredStringV2(value, path, 4_096);
  if (value === "") return;
  let url: URL;
  try {
    url = new URL(value as string);
  } catch {
    failV2(path, "must be an HTTPS URL or a loopback HTTP URL");
  }
  if (url.protocol === "https:") return;
  if (
    url.protocol === "http:"
    && (url.hostname === "127.0.0.1" || url.hostname === "localhost")
  ) return;
  failV2(path, "must be an HTTPS URL or a loopback HTTP URL");
}

function articleLinkHrefV2(value: unknown, path: string): void {
  authoredStringV2(value, path, 4_096);
  if (typeof value !== "string" || value.length === 0) return;
  if (
    value.startsWith("/")
    && !value.startsWith("//")
    && !/[\\\u0000-\u001f\u007f]/.test(value)
  ) return;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    failV2(path, "must be an app-relative path, HTTPS URL, or loopback HTTP URL");
  }
  if (url.protocol === "https:") return;
  if (
    url.protocol === "http:"
    && (url.hostname === "127.0.0.1" || url.hostname === "localhost")
  ) return;
  failV2(path, "must be an app-relative path, HTTPS URL, or loopback HTTP URL");
}

function failV2(path: string, message: string): never {
  throw new StudioArticleDataValidationErrorV2(path, message);
}
