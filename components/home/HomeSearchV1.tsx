import React from "react";
import {
  BookOpen,
  BookOpenText,
  FlaskConical,
  Search,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { localeFromPathname } from "@/localeRouting";
import { HomeLinkV1 } from "./HomeLinkV1";
import type { StudioPublicHomeBootstrapV1 } from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import {
  HOME_FILTER_V1,
  homeItemsV1,
  selectHomeItemsV1,
} from "./HomeDiscoveryV1";

const HomeSearchContextV1 = React.createContext<{
  open: () => void;
  publish: (data: StudioPublicHomeBootstrapV1 | null) => void;
} | null>(null);
export const useHomeSearchV1 = () => React.useContext(HomeSearchContextV1);

/** Reuses Home's summary projection; opening search never fetches full articles or snapshots. */
export function HomeSearchProviderV1({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname),
    ja = locale === "ja";
  const isHome = /^\/(ja|en)\/?$/.test(location.pathname);
  const [data, publish] = React.useState<StudioPublicHomeBootstrapV1 | null>(
    null,
  );
  const [opened, setOpened] = React.useState(false),
    [query, setQuery] = React.useState("");
  const dialog = React.useRef<HTMLDialogElement>(null),
    input = React.useRef<HTMLInputElement>(null);
  const trigger = React.useRef<HTMLElement | null>(null);
  const open = React.useCallback(() => {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setQuery("");
    setOpened(true);
  }, []);
  const context = React.useMemo(() => ({ open, publish }), [open]);
  const close = React.useCallback(() => setOpened(false), []);
  React.useEffect(() => {
    close();
  }, [location.pathname, close]);
  React.useEffect(() => {
    if (!isHome) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (opened) close();
        else open();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [isHome, opened, close, open]);
  React.useEffect(() => {
    if (opened) {
      dialog.current?.showModal();
      input.current?.focus();
    } else if (dialog.current?.open) {
      dialog.current.close();
      if (trigger.current?.isConnected) trigger.current.focus();
    }
  }, [opened]);
  const items = React.useMemo(
    () => (data?.locale === locale ? homeItemsV1(data) : []),
    [data, locale],
  );
  const results = React.useMemo(
    () => selectHomeItemsV1(items, { ...HOME_FILTER_V1, query }),
    [items, query],
  );
  const icons = {
    course: BookOpen,
    article: BookOpenText,
    experiment: FlaskConical,
  };
  const labels = ja
    ? { course: "コース", article: "記事", experiment: "シミュレーション" }
    : { course: "Course", article: "Article", experiment: "Simulation" };
  return (
    <HomeSearchContextV1.Provider value={context}>
      {children}
      <dialog
        ref={dialog}
        className="home-search-dialog"
        aria-labelledby="home-search-title"
        onCancel={close}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
      >
        <div
          className="home-search-panel"
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
            const links = Array.from(
              dialog.current?.querySelectorAll<HTMLAnchorElement>(
                ".home-search-results a",
              ) ?? [],
            );
            if (!links.length) return;
            const index = links.indexOf(
              document.activeElement as HTMLAnchorElement,
            );
            e.preventDefault();
            if (e.key === "ArrowUp" && index <= 0) input.current?.focus();
            else
              links[
                Math.min(
                  links.length - 1,
                  Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)),
                )
              ]?.focus();
          }}
        >
          <h2 id="home-search-title" className="sr-only">
            {ja ? "コンテンツを検索" : "Search content"}
          </h2>
          <div className="home-search-input-row">
            <Search aria-hidden="true" />
            <input
              ref={input}
              aria-label={ja ? "検索キーワード" : "Search query"}
              placeholder={
                ja
                  ? "コース・記事・シミュレーション・#タグを検索"
                  : "Search courses, articles, simulations and #tags"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing)
                  dialog.current
                    ?.querySelector<HTMLAnchorElement>(".home-search-results a")
                    ?.click();
              }}
            />
            <button
              type="button"
              aria-label={ja ? "検索を閉じる" : "Close search"}
              onClick={close}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="home-search-status" role="status">
            {!data
              ? ja
                ? "読み込み中…"
                : "Loading…"
              : query.trim()
                ? `${results.length}${ja ? "件の検索結果" : " results"}`
                : ja
                  ? "コンテンツを探す"
                  : "Explore content"}
          </p>
          <ul className="home-search-results">
            {results.map((item) => {
              const Icon = icons[item.kind];
              return (
                <li key={item.key}>
                  <HomeLinkV1 href={item.href} onClick={close}>
                    <span className="home-search-kind">
                      <Icon aria-hidden="true" />
                    </span>
                    <span>
                      <small>
                        {labels[item.kind]}
                        {item.author?.official
                          ? ja
                            ? " · 公式"
                            : " · Official"
                          : ""}
                      </small>
                      <strong>{item.title}</strong>
                      {item.author?.displayName && (
                        <span className="home-search-author">
                          {item.author.displayName}
                        </span>
                      )}
                      {item.tags.length > 0 && (
                        <span className="home-search-tags">
                          {item.tags.map((tag) => "#" + tag).join(" ")}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                  </HomeLinkV1>
                </li>
              );
            })}
          </ul>
          {data && results.length === 0 && (
            <p className="home-search-empty">
              {ja
                ? "見つかりませんでした。別の言葉で検索してください。"
                : "No results. Try a different search."}
            </p>
          )}
          <div className="home-search-footer">
            <span>
              {ja ? "↑↓で移動 · Enterで開く" : "↑↓ to navigate · Enter to open"}
            </span>
            <span>Esc {ja ? "で閉じる" : "to close"}</span>
          </div>
        </div>
      </dialog>
    </HomeSearchContextV1.Provider>
  );
}
