import React from "react";
import {
  BookOpenText,
  ChevronDown,
  FlaskConical,
  LogIn,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Search,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { isContentManagementRouteV1 } from "@/components/management/ContentManagementV1";
import { useAppTheme } from "@/appTheme";
import {
  accountSettingsHref,
  homeHref,
  loginHref,
  myArticlesHref,
  myExperimentsHref,
  newArticleEditorHref,
  newExperimentHref,
} from "@/homeLinks";
import {
  type Locale,
  localeFromPathname,
  setPreferredLocale,
  switchLocalePath,
} from "@/localeRouting";
import { useHomeSearchV1 } from "../home/HomeSearchV1";
import { CircleHeartLogoV1 } from "./CircleHeartLogoV1";
import { SiteAccountPendingV3 } from "./SiteAccountPendingV3";
import { useSiteAccountSessionV3 } from "./SiteAccountSessionV3";

const LANGUAGE_ITEMS_V3: readonly Readonly<{
  locale: Locale;
  shortLabel: string;
}>[] = Object.freeze([
  Object.freeze({ locale: "ja", shortLabel: "JA" }),
  Object.freeze({ locale: "en", shortLabel: "EN" }),
]);

export function SiteHeaderV3() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);
  const { appTheme, setAppTheme } = useAppTheme();
  const accountSession = useSiteAccountSessionV3();
  const isHome = /^\/(ja|en)\/?$/.test(location.pathname);
  const isArticle = /^\/(ja|en)\/articles(?:\/|$)/.test(location.pathname);
  const search = useHomeSearchV1();

  React.useEffect(() => {
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    setPreferredLocale(locale);
  }, [i18n, locale]);

  return (
    <header
      className={`${isHome ? "home-site-header " : isContentManagementRouteV1(location.pathname) ? "management-site-header " : isArticle ? "article-site-header " : ""}site-header z-50 flex h-[62px] shrink-0 items-center gap-1 bg-wb-header/95 px-3 shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--wb-border)_72%,transparent)] backdrop-blur-xl sm:gap-4 sm:px-5`}
      data-testid="site-header-v3"
    >
      <Link
        to={homeHref(locale)}
        onClick={() => {
          if (isHome)
            document.querySelector(".home-page")?.scrollTo({ top: 0 });
        }}
        className="site-brand-link rounded-md"
        aria-label={t("siteHeader.home")}
      >
        <CircleHeartLogoV1 />
      </Link>

      <span className="min-w-0 flex-1" />
      {isHome && (
        <button
          type="button"
          className="home-header-search"
          aria-label={locale === "ja" ? "コンテンツを検索" : "Search content"}
          aria-haspopup="dialog"
          onClick={search?.open}
        >
          <Search aria-hidden="true" />
          <span>{locale === "ja" ? "検索" : "Search"}</span>
          <kbd>⌘K</kbd>
        </button>
      )}

      {!accountSession.loading && accountSession.account === null && (
        <nav
          className="flex items-center rounded-lg bg-wb-soft p-0.5"
          aria-label={t("siteHeader.language")}
          data-testid="anonymous-language-switch-v3"
        >
          {LANGUAGE_ITEMS_V3.map((item) => {
            const active = item.locale === locale;
            return (
              <Link
                key={item.locale}
                to={switchLocalePath(
                  location.pathname,
                  location.search,
                  location.hash,
                  item.locale,
                )}
                onClick={() => setPreferredLocale(item.locale)}
                aria-current={active ? "true" : undefined}
                aria-label={t("common.language.switchTo", {
                  language: t(`common.language.${item.locale}`),
                })}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent ${
                  active
                    ? "bg-wb-panel text-wb-text shadow-sm"
                    : "text-wb-subtle hover:text-wb-text"
                }`}
              >
                {item.shortLabel}
              </Link>
            );
          })}
        </nav>
      )}

      <button
        type="button"
        onClick={() => setAppTheme(appTheme === "light" ? "dark" : "light")}
        aria-label={t("common.theme.toggle")}
        title={t("common.theme.toggle")}
        data-testid="site-theme-toggle-v3"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
      >
        {appTheme === "light" ? (
          <Moon className="h-[23px] w-[23px]" aria-hidden="true" />
        ) : (
          <Sun className="h-[23px] w-[23px]" aria-hidden="true" />
        )}
      </button>

      {accountSession.loading ? (
        <SiteAccountPendingV3 createLabel={t("siteHeader.create")} />
      ) : accountSession.account === null ? (
        <>
          <Link
            to={newExperimentHref(locale)}
            aria-label={t("siteHeader.startSimulation")}
            data-testid="site-start-simulation-v3"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-wb-primary px-2 text-[13.5px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-wb-primary-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent sm:h-9 sm:px-3 sm:text-[15px]"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">
              {t("siteHeader.startSimulation")}
            </span>
          </Link>
          <Link
            to={loginHref(locale)}
            aria-label={t("siteHeader.login")}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[13.5px] font-semibold text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent sm:h-9 sm:min-w-20 sm:text-[15px]"
          >
            <LogIn className="h-4 w-4 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">{t("siteHeader.login")}</span>
          </Link>
        </>
      ) : (
        <>
          <SiteCreateMenuV3 locale={locale} />
          <SiteProfileMenuV3 locale={locale} />
        </>
      )}
    </header>
  );
}

function SiteCreateMenuV3({ locale }: Readonly<{ locale: Locale }>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("siteHeader.create")}
        title={t("siteHeader.create")}
        data-testid="site-create-trigger-v3"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center gap-1.5 rounded-lg bg-wb-primary text-[13.5px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-wb-primary-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent min-[400px]:w-auto min-[400px]:px-3 sm:h-9 sm:text-[15px]"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden min-[400px]:inline">{t("siteHeader.create")}</span>
        <ChevronDown
          className={`hidden h-4 w-4 transition-transform duration-150 motion-reduce:transition-none min-[400px]:block ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("siteHeader.create")}
          data-testid="site-create-menu-v3"
          className="absolute right-0 top-11 z-[70] w-64 max-w-[calc(100vw-4rem)] origin-top-right rounded-xl border border-wb-line bg-wb-panel p-1.5 shadow-2xl"
        >
          <SiteCreateMenuLinkV3
            to={newExperimentHref(locale)}
            icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}
            title={t("siteHeader.newSimulation")}
            onSelect={() => setOpen(false)}
          />
          <SiteCreateMenuLinkV3
            to={`/${locale}/courses/new`}
            icon={<BookOpenText className="h-4 w-4" aria-hidden="true" />}
            title={locale === "ja" ? "新しいコース" : "New course"}
            onSelect={() => setOpen(false)}
          />
          <SiteCreateMenuLinkV3
            to={newArticleEditorHref(locale)}
            icon={<BookOpenText className="h-4 w-4" aria-hidden="true" />}
            title={t("siteHeader.newArticle")}
            onSelect={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

function SiteCreateMenuLinkV3({
  icon,
  onSelect,
  title,
  to,
}: Readonly<{
  icon: React.ReactNode;
  onSelect(): void;
  title: string;
  to: string;
}>) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onSelect}
      className="flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-wb-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-wb-soft text-wb-accent">
        {icon}
      </span>
      <span className="min-w-0 text-[13px] font-semibold text-wb-text">{title}</span>
    </Link>
  );
}

function SiteProfileMenuV3({ locale }: Readonly<{ locale: Locale }>) {
  const { t } = useTranslation();
  const { account, signOut } = useSiteAccountSessionV3();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (account === null) return null;
  const initial =
    account.displayName.trim().charAt(0).toLocaleUpperCase() ||
    account.accountId.charAt(0).toLocaleUpperCase();

  return (
    <div ref={rootRef} className="relative flex shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("siteHeader.profile")}
        data-testid="site-profile-trigger-v3"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-wb-soft text-xs font-semibold text-wb-text transition-[background-color,transform] duration-150 hover:bg-wb-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
      >
        {account.avatarUrl === undefined ? (
          <span aria-hidden="true">{initial}</span>
        ) : (
          <img
            src={account.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-[70] w-60 origin-top-right rounded-xl border border-wb-line bg-wb-panel p-1.5 shadow-2xl"
          data-testid="site-profile-menu-v3"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-xs font-semibold text-wb-text">
              {account.displayName}
            </p>
          </div>
          <ProfileMenuLinkV3
            to={myExperimentsHref(locale)}
            icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}
            onSelect={() => setOpen(false)}
          >
            {t("siteHeader.manageExperiments")}
          </ProfileMenuLinkV3>
          <ProfileMenuLinkV3
            to={`/${locale}/me/courses`}
            icon={<BookOpenText className="h-4 w-4" aria-hidden="true" />}
            onSelect={() => setOpen(false)}
          >
            {t("management.manageCourses")}
          </ProfileMenuLinkV3>
          <ProfileMenuLinkV3
            to={myArticlesHref(locale)}
            icon={<BookOpenText className="h-4 w-4" aria-hidden="true" />}
            onSelect={() => setOpen(false)}
          >
            {t("siteHeader.manageArticles")}
          </ProfileMenuLinkV3>
          <div className="my-1 h-px bg-wb-line" />
          <ProfileMenuLinkV3
            to={accountSettingsHref(locale)}
            icon={<Settings className="h-4 w-4" aria-hidden="true" />}
            onSelect={() => setOpen(false)}
          >
            {t("siteHeader.accountSettings")}
          </ProfileMenuLinkV3>
          {signOut !== undefined && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-xs font-medium text-wb-muted hover:bg-wb-hover hover:text-wb-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t("siteHeader.logout")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileMenuLinkV3({
  children,
  icon,
  onSelect,
  to,
}: Readonly<{
  children: React.ReactNode;
  icon: React.ReactNode;
  onSelect(): void;
  to: string;
}>) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onSelect}
      className="flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-xs font-medium text-wb-muted hover:bg-wb-hover hover:text-wb-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
    >
      {icon}
      {children}
    </Link>
  );
}
