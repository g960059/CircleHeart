import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export type EditorSaveStatusV3 =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

export function ArticleEditorSaveStatusV3({
  persisted,
  status,
  onRetry,
}: Readonly<{
  persisted: boolean;
  status: EditorSaveStatusV3;
  onRetry: () => void;
}>) {
  const { t } = useTranslation();
  const label = status === "saving"
    ? t("articleEditor.status.saving")
    : status === "dirty"
      ? t("articleEditor.status.dirty")
      : status === "error"
        ? t("articleEditor.status.error")
        : persisted || status === "saved"
          ? t("articleEditor.status.saved")
          : "";
  return (
    <div
      role="status"
      data-testid="article-editor-status-v3"
      className={`flex min-w-0 shrink-0 items-center gap-1.5 px-1.5 text-[11px] ${status === "error" ? "text-wb-danger" : "text-wb-subtle"}`}
    >
      {status === "saving" && (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
      {status === "error" && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md px-1.5 py-0.5 font-semibold text-wb-accent transition-[background-color,transform] duration-150 hover:bg-wb-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
        >
          {t("articleEditor.status.retry")}
        </button>
      )}
    </div>
  );
}

export function ArticlePublishMenuV3({
  articleHref,
  disabled,
  open,
  saving,
  visibility,
  tags,
  onEditTags,
  onToggleOpen,
  onSetVisibility,
}: Readonly<{
  articleHref: string;
  disabled: boolean;
  open: boolean;
  saving: boolean;
  visibility: "draft" | "public";
  tags: readonly string[];
  onEditTags: () => void;
  onToggleOpen: () => void;
  onSetVisibility: (visibility: "draft" | "public") => void;
}>) {
  const { t } = useTranslation();
  const published = visibility === "public";
  return (
    <div className="relative shrink-0" data-article-block-menu>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggleOpen}
        data-testid="article-publish-button-v3"
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-[color,background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent ${published ? "text-wb-accent hover:bg-wb-accent-soft" : "bg-wb-primary text-white hover:bg-wb-primary-hover"}`}
      >
        {published ? (
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-wb-accent" />
        ) : (
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {published
          ? t("articleEditor.published")
          : t("articleEditor.publishMenu.label")}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t("articleEditor.publishMenu.label")}
          data-testid="article-publish-menu-v3"
          className="absolute right-0 top-10 z-50 w-72 rounded-xl bg-wb-panel p-4 shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-wb-line/70"
        >
          {published ? (
            <>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-wb-accent" />
                {t("articleEditor.publishMenu.publishedTitle")}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-wb-muted">
                {t("articleEditor.publishMenu.publishedDescription")}
              </p>
              <ArticlePublishTagsV3 tags={tags} onEditTags={onEditTags} />
              <a
                href={articleHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-wb-soft px-3 text-xs font-semibold text-wb-text transition-[background-color,transform] duration-150 hover:bg-wb-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
              >
                {t("articleEditor.publishMenu.view")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                disabled={saving}
                onClick={() => onSetVisibility("draft")}
                className="mt-2 inline-flex min-h-8 w-full items-center justify-center rounded-lg px-3 text-xs font-semibold text-wb-danger transition-[background-color,transform] duration-150 hover:bg-wb-danger-soft active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
              >
                {saving
                  ? t("articleEditor.status.saving")
                  : t("articleEditor.publishMenu.unpublish")}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">
                {t("articleEditor.publishMenu.draftTitle")}
              </p>
              <p className="mt-1.5 text-xs leading-5 text-wb-muted">
                {t("articleEditor.publishMenu.draftDescription")}
              </p>
              <ArticlePublishTagsV3 tags={tags} onEditTags={onEditTags} />
              <button
                type="button"
                disabled={saving}
                onClick={() => onSetVisibility("public")}
                className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-wb-primary px-3 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-wb-primary-hover active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                {saving
                  ? t("articleEditor.status.saving")
                  : t("articleEditor.publishMenu.publish")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Publication is where discoverability matters: show which tags readers will
 * find this Article under, or that it currently has none, before publishing.
 */
function ArticlePublishTagsV3({
  tags,
  onEditTags,
}: Readonly<{ tags: readonly string[]; onEditTags: () => void }>) {
  const { t } = useTranslation();
  return (
    <section className="article-publish-tags" data-testid="article-publish-tags">
      <div className="article-publish-tags-header">
        <p>{t("articleTags.label")}</p>
        <button type="button" onClick={onEditTags}>
          {tags.length === 0 ? t("articleTags.add") : t("articleTags.edit")}
        </button>
      </div>
      {tags.length === 0 ? (
        <p className="article-publish-tags-empty">
          {t("articleTags.publishEmpty")}
        </p>
      ) : (
        <>
          <ul aria-label={t("articleTags.label")}>
            {tags.map((tag) => (
              <li key={tag} className="article-tag article-tag-compact">
                <span aria-hidden="true">#</span>
                {tag}
              </li>
            ))}
          </ul>
          <p className="article-publish-tags-note">{t("articleTags.publishNote")}</p>
        </>
      )}
    </section>
  );
}
