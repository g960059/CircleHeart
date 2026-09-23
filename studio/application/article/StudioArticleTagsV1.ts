/**
 * Article tags are authored discovery metadata stored with each immutable
 * Article content revision. The database owns the same canonical contract
 * (`studio.valid_article_tags_v1`); this module mirrors it so every client
 * can normalize while typing and reject what the backend would reject.
 *
 * Stored tags keep the author's casing. Discovery groups tags by a
 * case-insensitive key so "PV loop" and "pv loop" meet on one tag page.
 */
export const STUDIO_ARTICLE_TAG_LIMIT_V1 = 5;
export const STUDIO_ARTICLE_TAG_MAX_LENGTH_V1 = 32;

const FORBIDDEN_TAG_CHARACTER_V1 =
  /[#,\u3001\u0000-\u001f\u007f-\u009f\u1680\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;
const INVISIBLE_TAG_CHARACTERS_V1 = /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;
const TAG_SEPARATORS_V1 = /[#,\u3001\s\u0000-\u001f\u007f-\u009f\u1680\u2028\u2029]+/gu;

export type StudioArticleTagCountV1 = Readonly<{
  /** Most common authored spelling among the grouped tags. */
  tag: string;
  key: string;
  count: number;
}>;

/** Canonical form of one typed tag. Returns "" when nothing remains. */
export function normalizeArticleTagV1(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(INVISIBLE_TAG_CHARACTERS_V1, "")
    .replace(TAG_SEPARATORS_V1, " ")
    .trim();
}

/** Splits pasted or typed text on tag separators (commas, ideographic commas, line breaks). */
export function parseArticleTagInputV1(raw: string): readonly string[] {
  return raw
    .normalize("NFKC")
    .split(/[,\u3001\n\r]+/u)
    .map(normalizeArticleTagV1)
    .filter((tag) => tag.length > 0);
}

export function articleTagLengthV1(tag: string): number {
  return [...tag].length;
}

export function isCanonicalArticleTagV1(tag: unknown): tag is string {
  return typeof tag === "string"
    && tag.length > 0
    && articleTagLengthV1(tag) <= STUDIO_ARTICLE_TAG_MAX_LENGTH_V1
    && tag === tag.normalize("NFKC")
    && tag === tag.trim()
    && !tag.includes("  ")
    && !FORBIDDEN_TAG_CHARACTER_V1.test(tag);
}

/** Validation shared by drafts, published projections and summaries. */
export function assertArticleTagsV1(
  value: unknown,
  path: string,
): asserts value is readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  if (value.length > STUDIO_ARTICLE_TAG_LIMIT_V1) {
    throw new Error(
      `${path} must contain at most ${STUDIO_ARTICLE_TAG_LIMIT_V1} tags`,
    );
  }
  value.forEach((tag, index) => {
    if (!isCanonicalArticleTagV1(tag)) {
      throw new Error(
        `${path}[${index}] must be a canonical tag of 1-${STUDIO_ARTICLE_TAG_MAX_LENGTH_V1} characters`,
      );
    }
  });
  if (new Set(value).size !== value.length) {
    throw new Error(`${path} must not repeat a tag`);
  }
}

export function articleTagsV1(value: unknown, path: string): readonly string[] {
  assertArticleTagsV1(value, path);
  return Object.freeze([...value]);
}

/** Case-insensitive identity used for grouping and tag-page matching. */
export function articleTagKeyV1(tag: string): string {
  return normalizeArticleTagV1(tag).toLowerCase();
}

export function articleHasTagV1(tags: readonly string[], tag: string): boolean {
  const key = articleTagKeyV1(tag);
  return key.length > 0 && tags.some((candidate) => articleTagKeyV1(candidate) === key);
}

/**
 * Adds typed tags to an authored list. Existing spellings win, the limit is
 * never exceeded, and text that cannot become a tag is reported back.
 */
export function addArticleTagsV1(
  current: readonly string[],
  raw: string,
): Readonly<{ tags: readonly string[]; rejected: readonly string[] }> {
  const next = [...current];
  const rejected: string[] = [];
  for (const tag of parseArticleTagInputV1(raw)) {
    if (articleHasTagV1(next, tag)) continue;
    if (
      next.length >= STUDIO_ARTICLE_TAG_LIMIT_V1
      || !isCanonicalArticleTagV1(tag)
    ) {
      rejected.push(tag);
      continue;
    }
    next.push(tag);
  }
  return Object.freeze({
    tags: next.length === current.length ? current : Object.freeze(next),
    rejected: Object.freeze(rejected),
  });
}

/**
 * Groups tag lists into counts, most used first, then by display text. Each
 * group is shown in its most common spelling.
 */
export function countArticleTagsV1(
  lists: Iterable<readonly string[]>,
  locale?: string,
): readonly StudioArticleTagCountV1[] {
  const groups = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const tags of lists) {
    for (const key of new Set(tags.map(articleTagKeyV1))) {
      const group = groups.get(key) ?? { count: 0, spellings: new Map() };
      group.count += 1;
      groups.set(key, group);
    }
    for (const tag of tags) {
      const group = groups.get(articleTagKeyV1(tag))!;
      group.spellings.set(tag, (group.spellings.get(tag) ?? 0) + 1);
    }
  }
  const collator = new Intl.Collator(locale);
  return Object.freeze([...groups.entries()].map(([key, group]) => {
    // Stable sort: equally common spellings keep the first one seen, which
    // is the newest for newest-first public lists.
    const [tag] = [...group.spellings.entries()]
      .sort((left, right) => right[1] - left[1])[0]!;
    return Object.freeze({ tag, key, count: group.count });
  }).sort((left, right) =>
    right.count - left.count || collator.compare(left.tag, right.tag)));
}

/** The requested tag of a tag page, normalized; null when absent or unusable. */
export function articleTagFromSearchV1(search: string | URLSearchParams): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const raw = params.get("tag");
  if (raw === null) return null;
  const tag = normalizeArticleTagV1(raw);
  return isCanonicalArticleTagV1(tag) ? tag : null;
}
