import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  STUDIO_ARTICLE_TAG_LIMIT_V1,
  STUDIO_ARTICLE_TAG_MAX_LENGTH_V1,
  addArticleTagsV1,
  articleHasTagV1,
  articleTagKeyV1,
  articleTagLengthV1,
  countArticleTagsV1,
  normalizeArticleTagV1,
} from "@/studio/application/article/StudioArticleTagsV1";
import { articleEditorInputIsComposingV3 } from "@/components/article/editor/ArticleEditorPolicy";

/** One known tag the author may reuse; shared spelling reduces fragmentation. */
export type ArticleEditorTagSuggestionV1 = Readonly<{
  tag: string;
  key: string;
  /** Live public Articles in the draft's language carrying this tag. */
  publicCount: number;
  /** The author already used it in one of their own Articles. */
  mine: boolean;
}>;

const SUGGESTION_LIMIT_V1 = 8;

/** Moves the author to the tag field, including when it is at the tag limit. */
export type ArticleEditorTagsHandleV1 = Readonly<{ focus: () => void }>;

/**
 * Joins the public vocabulary (distinct live Articles per case-insensitive
 * tag) with the author's own tags. Should a key still repeat (database and
 * browser lowercasing can differ for rare scripts), counts are not additive:
 * one Article may carry both spellings. The first (most used) spelling and
 * the larger count win.
 */
export function mergeArticleTagSuggestionsV1(
  publicTags: readonly Readonly<{ tag: string; articleCount: number }>[],
  ownTagLists: Iterable<readonly string[]>,
  locale: string,
): readonly ArticleEditorTagSuggestionV1[] {
  const merged = new Map<string, ArticleEditorTagSuggestionV1>();
  for (const entry of publicTags) {
    const key = articleTagKeyV1(entry.tag);
    const existing = merged.get(key);
    merged.set(key, existing === undefined
      ? { tag: entry.tag, key, publicCount: entry.articleCount, mine: false }
      : { ...existing, publicCount: Math.max(existing.publicCount, entry.articleCount) });
  }
  for (const entry of countArticleTagsV1(ownTagLists, locale)) {
    const existing = merged.get(entry.key);
    merged.set(entry.key, existing === undefined
      ? { tag: entry.tag, key: entry.key, publicCount: 0, mine: true }
      : { ...existing, mine: true });
  }
  return Object.freeze([...merged.values()]);
}

export function selectArticleTagSuggestionsV1(
  suggestions: readonly ArticleEditorTagSuggestionV1[],
  selected: readonly string[],
  text: string,
): readonly ArticleEditorTagSuggestionV1[] {
  const query = articleTagKeyV1(text);
  return suggestions
    .filter((entry) => !articleHasTagV1(selected, entry.tag))
    .filter((entry) => query.length === 0 || entry.key.includes(query))
    .sort((left, right) =>
      Number(right.key.startsWith(query)) - Number(left.key.startsWith(query))
      || Number(right.mine) - Number(left.mine)
      || right.publicCount - left.publicCount
      || left.tag.localeCompare(right.tag))
    .slice(0, SUGGESTION_LIMIT_V1);
}

/**
 * Inline tag field under the Article title. Tags are part of the draft
 * revision, so they autosave with the text and reach readers only through
 * the same publication pointer as the rest of the Article.
 */
export const ArticleEditorTagsV1 = React.forwardRef<
  ArticleEditorTagsHandleV1,
  Readonly<{
    tags: readonly string[];
    suggestions: readonly ArticleEditorTagSuggestionV1[];
    disabled?: boolean;
    onChange: (tags: readonly string[]) => void;
  }>
>(function ArticleEditorTagsV1({ tags, suggestions, disabled, onChange }, ref) {
  const { t } = useTranslation();
  const listId = React.useId();
  const hintId = React.useId();
  const [text, setText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  // With an empty field, Enter adds a suggestion only after the author moved to it.
  const [navigated, setNavigated] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const full = tags.length >= STUDIO_ARTICLE_TAG_LIMIT_V1;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const focusInputAfterRemoveRef = React.useRef(false);
  // At the limit there is no input; the last tag's remove control is the
  // next editing step, so "edit tags" always lands on something actionable.
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      const target = inputRef.current
        ?? rootRef.current?.querySelector<HTMLButtonElement>(".article-editor-tag:last-child button")
        ?? null;
      rootRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      target?.focus({ preventScroll: true });
    },
  }), []);
  React.useEffect(() => {
    // Removing a chip unmounts its focused button; continue in the input.
    if (!focusInputAfterRemoveRef.current) return;
    focusInputAfterRemoveRef.current = false;
    inputRef.current?.focus();
  }, [tags]);
  const normalizedText = normalizeArticleTagV1(text);
  const tooLong = articleTagLengthV1(normalizedText) > STUDIO_ARTICLE_TAG_MAX_LENGTH_V1;
  const matches = selectArticleTagSuggestionsV1(suggestions, tags, text);
  const exact = matches.some((entry) => entry.key === articleTagKeyV1(normalizedText));
  const options: readonly Readonly<{ tag: string; suggestion: ArticleEditorTagSuggestionV1 | null }>[] = [
    ...(normalizedText.length > 0 && !exact && !tooLong
      && !articleHasTagV1(tags, normalizedText)
      ? [{ tag: normalizedText, suggestion: null }]
      : []),
    ...matches.map((suggestion) => ({ tag: suggestion.tag, suggestion })),
  ];
  const expanded = open && !full && options.length > 0;
  const active = expanded ? options[Math.min(activeIndex, options.length - 1)] : undefined;

  const commit = (raw: string) => {
    const result = addArticleTagsV1(tags, raw);
    if (result.tags !== tags) onChange(result.tags);
    setText("");
    setActiveIndex(0);
    setNavigated(false);
    setMessage(
      result.rejected.length === 0
        ? null
        : result.tags.length >= STUDIO_ARTICLE_TAG_LIMIT_V1
          ? t("articleTags.limitReached", { limit: STUDIO_ARTICLE_TAG_LIMIT_V1 })
          : t("articleTags.tooLong", { max: STUDIO_ARTICLE_TAG_MAX_LENGTH_V1 }),
    );
  };
  const applyTypedValue = (value: string) => {
    // Pasted or typed separators finish every complete tag at once.
    const lastSeparator = Math.max(
      value.lastIndexOf(","),
      value.lastIndexOf("、"),
      value.lastIndexOf("，"),
    );
    if (lastSeparator >= 0) {
      commit(value.slice(0, lastSeparator));
      setText(value.slice(lastSeparator + 1).trimStart());
      return;
    }
    setText(value);
  };
  const remove = (tag: string) => {
    focusInputAfterRemoveRef.current = true;
    onChange(Object.freeze(tags.filter((candidate) => candidate !== tag)));
    setMessage(null);
  };

  return (
    <div
      ref={rootRef}
      className="article-editor-tags"
      data-testid="article-editor-tags"
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setOpen(false);
        // Leaving the field keeps a finished word rather than discarding it.
        if (normalizedText.length > 0 && !tooLong) commit(text);
      }}
    >
      <ul className="article-editor-tag-list" aria-label={t("articleTags.label")}>
        {tags.map((tag) => (
          <li key={tag} className="article-editor-tag">
            <span aria-hidden="true">#</span>
            <span>{tag}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={t("articleTags.remove", { tag })}
              title={t("articleTags.remove", { tag })}
              onClick={() => remove(tag)}
            >
              <X aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {full ? (
        <span className="article-editor-tags-note">
          {t("articleTags.limitReached", { limit: STUDIO_ARTICLE_TAG_LIMIT_V1 })}
        </span>
      ) : (
        <div className="article-editor-tag-input">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            value={text}
            disabled={disabled}
            enterKeyHint="done"
            autoComplete="off"
            spellCheck={false}
            aria-label={t("articleTags.inputLabel")}
            aria-describedby={hintId}
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? listId : undefined}
            aria-activedescendant={active ? `${listId}-${options.indexOf(active)}` : undefined}
            aria-invalid={tooLong || undefined}
            placeholder={tags.length === 0 ? t("articleTags.placeholderEmpty") : t("articleTags.placeholder")}
            data-testid="article-editor-tag-input"
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setOpen(true);
              setActiveIndex(0);
              setNavigated(false);
              setMessage(null);
              // An IME may show "、" before the author confirms the phrase.
              if ((event.nativeEvent as InputEvent).isComposing) {
                setText(value);
                return;
              }
              applyTypedValue(value);
            }}
            onCompositionEnd={(event) => applyTypedValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (articleEditorInputIsComposingV3(event.nativeEvent)) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                if (options.length === 0) return;
                event.preventDefault();
                setOpen(true);
                setNavigated(true);
                setActiveIndex((index) =>
                  (index + (event.key === "ArrowDown" ? 1 : -1) + options.length)
                    % options.length);
                return;
              }
              if (event.key === "Escape") {
                if (expanded) {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                }
                return;
              }
              if (event.key === "Enter" || (event.key === "Tab" && text.trim().length > 0)) {
                if (text.trim().length === 0 && !navigated) return;
                const choice = expanded ? active?.tag : normalizedText;
                if (!choice) return;
                event.preventDefault();
                if (tooLong && choice === normalizedText) {
                  setMessage(t("articleTags.tooLong", { max: STUDIO_ARTICLE_TAG_MAX_LENGTH_V1 }));
                  return;
                }
                commit(choice);
                return;
              }
              if (event.key === "Backspace" && text.length === 0 && tags.length > 0) {
                event.preventDefault();
                remove(tags[tags.length - 1]!);
              }
            }}
          />
          {expanded && (
            <ul id={listId} role="listbox" className="article-editor-tag-options" aria-label={t("articleTags.suggestions")}>
              {options.map((option, index) => (
                <li
                  key={option.suggestion?.key ?? `new:${option.tag}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option === active}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => commit(option.tag)}
                  onPointerMove={() => {
                    setActiveIndex(index);
                    setNavigated(true);
                  }}
                >
                  <span className="article-editor-tag-option-label">
                    {option.suggestion === null
                      ? t("articleTags.createTag", { tag: option.tag })
                      : `#${option.tag}`}
                  </span>
                  {option.suggestion !== null && (
                    <small>
                      {option.suggestion.publicCount > 0
                        ? t("articleTags.publicCount", { count: option.suggestion.publicCount })
                        : t("articleTags.ownTag")}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <span
        id={hintId}
        className={`article-editor-tags-hint ${message !== null || tooLong ? "is-error" : ""}`}
        aria-live="polite"
      >
        {message
          ?? (tooLong
            ? t("articleTags.tooLong", { max: STUDIO_ARTICLE_TAG_MAX_LENGTH_V1 })
            : text.length > 0
              ? t("articleTags.hint", { limit: STUDIO_ARTICLE_TAG_LIMIT_V1 })
              : "")}
      </span>
    </div>
  );
});
