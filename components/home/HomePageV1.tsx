import React from "react";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  BookOpenText,
  FlaskConical,
  Search,
  ChevronDown,
  X,
} from "lucide-react";
import type { StudioPublicHomeBootstrapV1 } from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import { courseArticleHrefV1 } from "@/studio/application/course/StudioCourseV1";
import { formatStudioPublicArticleDateV1 } from "@/studio/application/publication/StudioPublicArticlePresentationV1";
import {
  HOME_FILTER_V1,
  homeItemsV1,
  homeTopicsV1,
  selectHomeItemsV1,
  type HomeItemV1,
  type HomeFilterV1,
} from "./HomeDiscoveryV1";
import { articleTagHref } from "@/homeLinks";
import { articleTagKeyV1 } from "@/studio/application/article/StudioArticleTagsV1";
import { HomeHeroV1 } from "./HomeHeroV1";
import { HomeCoverArtV1, homeCoverSubjectV1 } from "./HomeCoverArtV1";
import { HomeLinkV1 } from "./HomeLinkV1";
export type HomePagePropsV1 = Readonly<{
  locale: "ja" | "en";
  data: StudioPublicHomeBootstrapV1 | null;
  filter?: HomeFilterV1;
  saved?: ReadonlySet<string>;
  limit?: number;
  error?: boolean;
  notice?: string;
  staticRender?: boolean;
  signedIn?: boolean;
  loginPrompt?: boolean;
  onDismissLogin?: () => void;
  onFilter?: (filter: HomeFilterV1) => void;
  onSave?: (item: HomeItemV1) => void;
  onMore?: () => void;
  onRetry?: () => void;
}>;
const kindLabels = {
  ja: {
    all: "すべて",
    course: "コース",
    article: "記事",
    experiment: "シミュレーション",
  },
  en: {
    all: "All",
    course: "Courses",
    article: "Articles",
    experiment: "Simulations",
  },
};
const kindIcons = {
  course: BookOpen,
  article: BookOpenText,
  experiment: FlaskConical,
};
export function HomePageV1(props: HomePagePropsV1) {
  const {
    locale,
    data,
    filter = HOME_FILTER_V1,
    saved = new Set<string>(),
    limit = 9,
  } = props;
  const ja = locale === "ja",
    items = data ? homeItemsV1(data) : [],
    savedCount = items.filter((item) => saved.has(item.key)).length,
    visible = selectHomeItemsV1(items, filter, saved);
  const set = (patch: Partial<HomeFilterV1>) =>
    props.onFilter?.({ ...filter, ...patch });
  const isDefault =
    filter.kind === "all" &&
    filter.sort === "recommended" &&
    !filter.savedOnly &&
    filter.tag === null &&
    !filter.query;
  const activeTagKey = filter.tag === null ? null : articleTagKeyV1(filter.tag);
  const topics = homeTopicsV1(items, locale);
  // A tag chosen from a card may be outside the most-used topics; keep it visible.
  const shownTopics =
    filter.tag !== null && !topics.some((topic) => topic.key === activeTagKey)
      ? [{ tag: filter.tag, key: activeTagKey!, count: items.filter((item) => item.tags.some((tag) => articleTagKeyV1(tag) === activeTagKey)).length }, ...topics]
      : topics;
  const showTopics =
    shownTopics.length > 0 && (filter.kind === "all" || filter.kind === "article");
  const selectTag = props.onFilter
    ? (tag: string) => {
        const next = activeTagKey === articleTagKeyV1(tag) ? null : tag;
        set({ tag: next });
        if (next !== null && typeof document !== "undefined") {
          document
            .getElementById("home-discovery")
            ?.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }
    : undefined;
  const featured = visible.find(
    (item) => item.featured && item.kind === "course",
  );
  return (
    <div
      className={
        "home-page" + (props.staticRender ? " public-static-shell" : "")
      }
      data-public-static-scroll-host="true"
    >
      <HomeLinkV1 className="home-skip-link" href="#home-discovery">
        {ja ? "コンテンツ一覧へ" : "Skip to content"}
      </HomeLinkV1>
      <main className="home-container">
        <section
          className="home-intro"
          aria-label={ja ? "はじめに" : "Introduction"}
        >
          <div className="home-intro-copy">
            <p className="home-eyebrow">
              {ja
                ? "循環動態の教育・研究プラットフォーム"
                : "A platform for hemodynamics education and research"}
            </p>
            <h1>
              {ja ? (
                <>
                  循環動態は、
                  <br />
                  <span className="home-hero-accent">動かす</span>と見えてくる。
                </>
              ) : (
                <>
                  See circulation.
                  <br />
                  <span className="home-hero-accent">Set it in motion.</span>
                </>
              )}
            </h1>
            <p className="home-lead">
              {ja
                ? "記事を読みながら、その場でシミュレーションを動かす。前負荷・後負荷・収縮性の変化を、説明できる理解へ。"
                : "Read an explanation, change the conditions, and see how pressure and volume respond. Turn observations into understanding."}
            </p>
            <div className="home-hero-actions">
              <HomeLinkV1 className="home-primary" href={`/${locale}/experiments/new`}>
                <FlaskConical aria-hidden="true" />
                {ja ? "シミュレーションを試す" : "Try a simulation"}
                <ArrowRight aria-hidden="true" />
              </HomeLinkV1>
            </div>
          </div>
          <HomeHeroV1 locale={locale} interactive={!props.staticRender} />
        </section>
        <section
          id="home-discovery"
          className="home-discovery"
          aria-labelledby="home-discovery-title"
        >
          <h2 id="home-discovery-title" className="sr-only">
            {ja ? "公開コンテンツ" : "Published content"}
          </h2>
          <div className="home-browse">
            <div
              className="home-kinds"
              role="group"
              aria-label={ja ? "コンテンツの種類" : "Content type"}
            >
              {(["all", "course", "article", "experiment"] as const).map(
                (kind) => (
                  <button
                    type="button"
                    key={kind}
                    disabled={!props.onFilter}
                    aria-pressed={filter.kind === kind}
                    onClick={() =>
                      set({
                        kind,
                        // Tags describe Articles; other kinds cannot match one.
                        ...(kind === "course" || kind === "experiment"
                          ? { tag: null }
                          : {}),
                      })
                    }
                  >
                    {kindLabels[locale][kind]}
                  </button>
                ),
              )}
            </div>
            <div className="home-sorts">
              {props.signedIn && (
                <button
                  className="home-saved-filter"
                  type="button"
                  disabled={!props.onFilter}
                  aria-pressed={filter.savedOnly}
                  onClick={() => set({ savedOnly: !filter.savedOnly })}
                >
                  <Bookmark aria-hidden="true" />
                  {ja ? "保存済み" : "Saved"}
                  {savedCount > 0 && <small>{savedCount}</small>}
                </button>
              )}
              <label className="home-sort-select">
                <span className="sr-only">{ja ? "並び順" : "Sort order"}</span>
                <select
                  value={filter.sort}
                  disabled={!props.onFilter}
                  onChange={(event) =>
                    set({
                      sort:
                        event.target.value === "new" ? "new" : "recommended",
                    })
                  }
                >
                  <option value="recommended">
                    {ja ? "おすすめ順" : "Recommended"}
                  </option>
                  <option value="new">{ja ? "新着順" : "Newest"}</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </label>
            </div>
          </div>
          {showTopics && (
            <div
              className="home-topics"
              role="group"
              aria-labelledby="home-topics-label"
            >
              <span id="home-topics-label" className="home-topics-label">
                {ja ? "トピック" : "Topics"}
              </span>
              <div className="home-topics-list">
                {shownTopics.map((topic) => {
                  const active = topic.key === activeTagKey;
                  const content = (
                    <>
                      <span aria-hidden="true">#</span>
                      {topic.tag}
                      <small>{topic.count}</small>
                    </>
                  );
                  return selectTag ? (
                    <button
                      type="button"
                      key={topic.key}
                      className="home-topic"
                      aria-pressed={active}
                      onClick={() => selectTag(topic.tag)}
                    >
                      {content}
                    </button>
                  ) : (
                    <HomeLinkV1
                      key={topic.key}
                      className="home-topic"
                      href={articleTagHref({ locale, tag: topic.tag })}
                    >
                      {content}
                    </HomeLinkV1>
                  );
                })}
              </div>
            </div>
          )}
          {filter.savedOnly && (
            <p className="home-catalog-note">
              {ja
                ? "保存はログイン中のアカウントごとに、このブラウザに保持されます。"
                : "Saved items are stored in this browser for your signed-in account."}
            </p>
          )}
          {data &&
            [
              data.articles.length,
              data.experiments.length,
              data.courses?.length ?? 0,
            ].some((count) => count >= 50) && (
              <p className="home-catalog-note">
                {ja
                  ? "トップページでは各種類の直近50件を検索できます。過去のコンテンツは各一覧へ。"
                  : "Search the 50 most recent items of each type here. Open a directory to browse older content."}
              </p>
            )}
          {!isDefault && (
            <p className="home-result-count" role="status">
              {visible.length}
              {ja ? "件" : " results"}{" "}
              {filter.tag !== null && (
                <HomeLinkV1
                  className="home-tag-page-link"
                  href={articleTagHref({ locale, tag: filter.tag })}
                >
                  {ja
                    ? `#${filter.tag} の記事をすべて見る`
                    : `All articles tagged #${filter.tag}`}
                  <ArrowRight aria-hidden="true" />
                </HomeLinkV1>
              )}
              <button
                type="button"
                onClick={() => props.onFilter?.(HOME_FILTER_V1)}
              >
                {ja ? "絞り込みを解除" : "Clear filters"}
              </button>
            </p>
          )}
          {data === null ? (
            <div className="home-loading" role="status">
              {ja
                ? "公開コンテンツを読み込んでいます…"
                : "Loading public content…"}
              <div className="home-skeleton" />
            </div>
          ) : props.error ? (
            <div className="home-empty" role="alert">
              <p>
                {ja
                  ? "公開コンテンツを読み込めませんでした。"
                  : "Public content could not be loaded."}
              </p>
              <button
                type="button"
                className="home-secondary"
                onClick={props.onRetry}
              >
                {ja ? "もう一度読み込む" : "Try again"}
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="home-empty">
              <Search aria-hidden="true" />
              <p>
                {filter.savedOnly
                  ? ja
                    ? "この一覧に保存済みのコンテンツはありません。"
                    : "No saved items in this selection."
                  : ja
                    ? "条件に合うコンテンツはありません。"
                    : "No content matches these filters."}
              </p>
              <button
                type="button"
                onClick={() => props.onFilter?.(HOME_FILTER_V1)}
              >
                {ja ? "すべて表示" : "Show all"}
              </button>
            </div>
          ) : (
            <div className="home-content-grid">
              {visible.slice(0, limit).map((item) => (
                <HomeCardV1
                  key={item.key}
                  item={item}
                  locale={locale}
                  wide={isDefault && item.key === featured?.key}
                  saved={saved.has(item.key)}
                  onSave={props.onSave}
                  activeTagKey={activeTagKey}
                  onTag={selectTag}
                />
              ))}
            </div>
          )}
          {visible.length > limit && (
            <button
              type="button"
              className="home-load-more"
              disabled={!props.onMore}
              onClick={props.onMore}
            >
              {ja ? "さらに表示" : "Show more"}
              <ChevronDown aria-hidden="true" />
            </button>
          )}
          <div className="home-directory-links">
            {(["course", "article", "experiment"] as const).map((k) => (
              <HomeLinkV1
                key={k}
                href={`/${locale}/${k === "course" ? "courses" : k === "article" ? "articles" : "experiments"}`}
              >
                {ja ? "すべての" : "All "}
                {kindLabels[locale][k]}
                <ArrowRight aria-hidden="true" />
              </HomeLinkV1>
            ))}
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <div className="home-container">
          <div>
            <strong>CircleHeart</strong>
            <span>
              {ja
                ? "循環動態を、動かして学ぶ。"
                : "Understand circulation by changing it."}
            </span>
          </div>
          <nav aria-label={ja ? "フッターナビゲーション" : "Footer navigation"}>
            <HomeLinkV1 href={`/${locale}/courses`}>{kindLabels[locale].course}</HomeLinkV1>
            <HomeLinkV1 href={`/${locale}/articles`}>{kindLabels[locale].article}</HomeLinkV1>
            <HomeLinkV1 href={`/${locale}/experiments`}>
              {kindLabels[locale].experiment}
            </HomeLinkV1>
            <HomeLinkV1 href={`/${locale}/models`}>
              {ja ? "数理モデル・プリセット" : "Models & presets"}
            </HomeLinkV1>
            <HomeLinkV1 href={`/${locale}/docs/authoring-cli`}>AI Authoring CLI</HomeLinkV1>
            <HomeLinkV1 href="https://github.com/g960059/0DSimDemo">GitHub</HomeLinkV1>
          </nav>
          <p>
            {ja
              ? "CircleHeartは教育・研究支援を目的としており、医療機器ではありません。デモは簡易モデルによるもので、本体の計算結果ではありません。モデルの前提と利用上の注意は数理モデルページをご確認ください。"
              : "CircleHeart supports education and research; it is not a medical device. The illustrative demo is not output from the full model. See the model documentation for assumptions and limitations."}
          </p>
        </div>
      </footer>
      {props.loginPrompt ? (
        <div className="home-toast" role="status">
          <span>
            {ja
              ? "ログインすると保存できます。"
              : "Sign in to save this for later."}
          </span>
          <HomeLinkV1 href={`/${locale}/login`}>{ja ? "ログイン" : "Sign in"}</HomeLinkV1>
          <button
            type="button"
            aria-label={ja ? "通知を閉じる" : "Dismiss notification"}
            onClick={props.onDismissLogin}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      ) : (
        props.notice && (
          <p className="home-toast" role="status">
            {props.notice}
          </p>
        )
      )}
    </div>
  );
}
function HomeCardV1({
  item,
  locale,
  wide,
  saved,
  onSave,
  activeTagKey,
  onTag,
}: {
  item: HomeItemV1;
  locale: "ja" | "en";
  wide: boolean;
  saved: boolean;
  onSave?: HomePagePropsV1["onSave"];
  activeTagKey: string | null;
  onTag?: (tag: string) => void;
}) {
  const ja = locale === "ja",
    Icon = kindIcons[item.kind],
    entries = item.course?.entries.filter((e) => e.available) ?? [];
  const date =
    Date.parse(item.publishedAt) > 0
      ? formatStudioPublicArticleDateV1(item.publishedAt, locale)
      : "";
  const name =
    item.author?.displayName ?? item.authorName ?? (ja ? "作者" : "Author");
  return (
    <article className={"home-card" + (wide ? " home-card-wide" : "")}>
      <HomeLinkV1
        className={"home-cover home-cover-" + item.kind}
        data-cover-subject={homeCoverSubjectV1(item)}
        href={item.href}
        aria-label={item.title}
        tabIndex={-1}
        aria-hidden="true"
      >
        <CoverV1 item={item} />
      </HomeLinkV1>
      <div className="home-card-body">
        <div className="home-card-type">
          <Icon aria-hidden="true" />
          {kindLabels[locale][item.kind]}
          {item.author?.official && (
            <span className="home-official">{ja ? "公式" : "Official"}</span>
          )}
        </div>
        <h3>
          <HomeLinkV1 href={item.href}>{item.title}</HomeLinkV1>
        </h3>
        {item.description && (
          <p className="home-card-description">{item.description}</p>
        )}
        {item.tags.length > 0 && (
          <HomeCardTagsV1
            tags={item.tags}
            locale={locale}
            activeTagKey={activeTagKey}
            onTag={onTag}
          />
        )}
        {!!item.course &&
          entries.length > 0 &&
          (wide ? (
            <ChapterListV1 item={item} />
          ) : (
            <details className="home-chapters">
              <summary>
                {entries.length}
                {ja ? "章を見る" : " chapters"}
                <ChevronDown aria-hidden="true" />
              </summary>
              <ChapterListV1 item={item} />
            </details>
          ))}
        <div className="home-card-bottom">
          <span className="home-author">
            <i className={item.author?.official ? "is-official" : ""}>
              {name.slice(0, 1)}
            </i>
            <span>{name}</span>
          </span>
          {date && <span className="home-item-meta">{date}</span>}
          {wide && entries.length > 0 && (
            <HomeLinkV1
              className="home-course-start"
              href={courseArticleHrefV1(item.course!, entries[0])}
            >
              {ja ? "読み始める" : "Start reading"}
              <ArrowRight aria-hidden="true" />
            </HomeLinkV1>
          )}
          <button
            type="button"
            className="home-bookmark"
            aria-label={
              (saved
                ? ja
                  ? "保存を解除: "
                  : "Unsave: "
                : ja
                  ? "保存: "
                  : "Save: ") + item.title
            }
            aria-pressed={saved}
            onClick={() => onSave?.(item)}
            disabled={!onSave}
          >
            <Bookmark aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
const HOME_CARD_TAG_LIMIT_V1 = 3;
function HomeCardTagsV1({
  tags,
  locale,
  activeTagKey,
  onTag,
}: {
  tags: readonly string[];
  locale: "ja" | "en";
  activeTagKey: string | null;
  onTag?: (tag: string) => void;
}) {
  const ja = locale === "ja";
  const hidden = tags.length - HOME_CARD_TAG_LIMIT_V1;
  return (
    <ul className="home-card-tags" aria-label={ja ? "タグ" : "Tags"}>
      {tags.slice(0, HOME_CARD_TAG_LIMIT_V1).map((tag) => (
        <li key={tag}>
          {onTag ? (
            <button
              type="button"
              className="home-card-tag"
              aria-pressed={articleTagKeyV1(tag) === activeTagKey}
              aria-label={ja ? `#${tag} で絞り込む` : `Filter by #${tag}`}
              onClick={() => onTag(tag)}
            >
              <span aria-hidden="true">#</span>
              {tag}
            </button>
          ) : (
            <HomeLinkV1
              className="home-card-tag"
              href={articleTagHref({ locale, tag })}
            >
              <span aria-hidden="true">#</span>
              {tag}
            </HomeLinkV1>
          )}
        </li>
      ))}
      {hidden > 0 && (
        <li className="home-card-tag-more" title={tags.slice(HOME_CARD_TAG_LIMIT_V1).map((tag) => "#" + tag).join(" ")}>
          +{hidden}
        </li>
      )}
    </ul>
  );
}
function ChapterListV1({ item }: { item: HomeItemV1 }) {
  return (
    <ol className="home-chapter-list">
      {item.course!.entries.map(
        (e, index) =>
          e.available && (
            <li key={e.articleId}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <HomeLinkV1 href={courseArticleHrefV1(item.course!, e)}>{e.title}</HomeLinkV1>
            </li>
          ),
      )}
    </ol>
  );
}
function CoverV1({ item }: { item: HomeItemV1 }) {
  return (
    <>
      <HomeCoverArtV1 item={item} />
      {item.course?.coverUrl && (
        <img
          src={item.course.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      )}
    </>
  );
}
