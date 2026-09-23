import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Home } from "@/components/Home";
import { HomePageV1 } from "@/components/home/HomePageV1";
import {
  homeItemsV1,
  homeTopicsV1,
  selectHomeItemsV1,
  HOME_FILTER_V1,
  readHomeBookmarksV1,
  writeHomeBookmarksV1,
} from "@/components/home/HomeDiscoveryV1";
import {
  validateStudioPublicHomeBootstrapV1,
  type StudioPublicHomeBootstrapV1,
} from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import { courseFixtureV1 } from "./fixtures/courseFixtureV1";
import {
  HOME_DEMO_BASE_V1,
  HOME_DEMO_PRESETS_V1,
  simulateHomeDemoV1,
} from "@/components/home/HomeDemoModelV1";
import { homeCoverSubjectV1 } from "@/components/home/HomeCoverArtV1";
import "@/i18n";
const author = {
  userId: courseFixtureV1.ownerId,
  displayName: "CircleHeart",
  official: true,
};
const course = {
  ...courseFixtureV1,
  author,
  entries: courseFixtureV1.entries.map((e) =>
    e.available ? { ...e, author } : e,
  ),
};
const otherAuthor = {
  userId: "b0000000-0000-4000-8000-000000000001",
  displayName: "Community",
  official: false,
};
const bootstrap: StudioPublicHomeBootstrapV1 = {
  schemaId: "circleheart-public-home-bootstrap-v1",
  locale: "ja",
  courses: [course],
  featuredCourseIds: [course.courseId],
  articles: [
    {
      articleId: course.entries[0].articleId,
      title: "一拍を読む",
      locale: "ja",
      excerpt: "前負荷とPVループ",
      tags: [],
      publicSlug: "read-a-beat",
      publishedAt: course.updatedAt,
      author,
    },
    {
      articleId: "community-article",
      title: "Community PV loop",
      locale: "ja",
      excerpt: null,
      tags: [],
      publicSlug: "community-pv-loop",
      publishedAt: course.updatedAt,
      author: otherAuthor,
    },
  ],
  experiments: [],
};
describe("Home discovery", () => {
  it("keeps loading readable and limits the lightweight illustration to its own data", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/ja"]}>
        <Home />
      </MemoryRouter>,
    );
    expect(html).toContain("公開コンテンツを読み込んでいます…");
    expect(html).not.toContain("条件に合うコンテンツはありません");
    expect(html).toContain("本体の計算結果ではありません");
    expect(html).toContain("数理モデル・プリセット");
  });
  it("groups only available same-author chapters in recommended All, preserving direct search and article tabs", () => {
    const items = homeItemsV1(bootstrap),
      chapter = items.find((i) => i.id === course.entries[0].articleId)!;
    expect(selectHomeItemsV1(items, HOME_FILTER_V1).map((i) => i.key)).toEqual([
      "course:" + course.courseId,
      "article:community-article",
    ]);
    expect(
      selectHomeItemsV1(items, { ...HOME_FILTER_V1, kind: "article" }),
    ).toContain(chapter);
    expect(
      selectHomeItemsV1(items, { ...HOME_FILTER_V1, query: "一拍" }),
    ).toContain(chapter);
    expect(
      selectHomeItemsV1(items, { ...HOME_FILTER_V1, sort: "new" }),
    ).toContain(chapter);
    expect(
      selectHomeItemsV1(
        items,
        { ...HOME_FILTER_V1, savedOnly: true },
        new Set([chapter.key]),
      ),
    ).toEqual([chapter]);
    const cross = homeItemsV1({
      ...bootstrap,
      courses: [
        {
          ...course,
          entries: course.entries.map((e) => ({
            ...e,
            author: e.available ? otherAuthor : undefined,
          })),
        },
      ],
    });
    expect(
      selectHomeItemsV1(cross, HOME_FILTER_V1).some(
        (i) => i.key === chapter.key,
      ),
    ).toBe(true);
  });
  it("keeps the canonical course/author distinction and escapes authored labels in SSR", () => {
    const html = renderToStaticMarkup(
      <HomePageV1
        locale="ja"
        data={{
          ...bootstrap,
          courses: [{ ...course, title: "<img src=x onerror=alert(1)>" }],
        }}
      />,
    );
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("Community");
    expect(html).toContain("home-card-wide");
    expect(html).toContain("?course=");
    expect(html).not.toContain("対象ユーザー");
  });
  it("combines saved-only filtering with either ordering without hiding saved chapters", () => {
    const items = homeItemsV1(bootstrap).map((item, index) => ({
      ...item,
      publishedAt: `2026-09-${10 + index}T00:00:00Z`,
    }));
    const saved = new Set(items.map((item) => item.key));
    const filter = { ...HOME_FILTER_V1, savedOnly: true };
    const recommended = selectHomeItemsV1(items, filter, saved);
    expect(recommended.map((item) => item.key)).toEqual([
      items[0].key,
      items[2].key,
      items[1].key,
    ]);
    expect(
      selectHomeItemsV1(items, { ...filter, sort: "new" }, saved).map(
        (item) => item.key,
      ),
    ).toEqual([items[2].key, items[1].key, items[0].key]);
    expect(
      selectHomeItemsV1(
        items,
        { ...filter, kind: "article", sort: "new" },
        new Set([items[0].key, items[1].key]),
      ).map((item) => item.key),
    ).toEqual([items[1].key]);
  });
  it("validates course promotion references", () => {
    expect(
      validateStudioPublicHomeBootstrapV1(bootstrap).featuredCourseIds,
    ).toEqual([course.courseId]);
    expect(() =>
      validateStudioPublicHomeBootstrapV1({
        ...bootstrap,
        featuredCourseIds: ["missing"],
      }),
    ).toThrow();
  });
  it("preserves editorial course order in Recommended while Newest remains chronological", () => {
    const older = { ...course, updatedAt: "2026-09-01T00:00:00Z" };
    const newer = { ...course, courseId: "second-course", updatedAt: "2026-09-17T00:00:00Z" };
    const items = homeItemsV1({
      ...bootstrap,
      courses: [older, newer],
      featuredCourseIds: [older.courseId, newer.courseId],
      articles: [],
    });
    expect(selectHomeItemsV1(items, HOME_FILTER_V1).map((item) => item.id))
      .toEqual([older.courseId, newer.courseId]);
    expect(selectHomeItemsV1(items, { ...HOME_FILTER_V1, sort: "new" }).map((item) => item.id))
      .toEqual([newer.courseId, older.courseId]);
  });
  it("isolates account saves and handles malformed or denied browser storage", () => {
    const store = new Map<string, string>(),
      storage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
      };
    expect(writeHomeBookmarksV1("a", new Set(["article:one"]), storage)).toBe(
      true,
    );
    expect([...readHomeBookmarksV1("a", storage)]).toEqual(["article:one"]);
    expect(readHomeBookmarksV1("b", storage).size).toBe(0);
    expect(readHomeBookmarksV1(null, storage).size).toBe(0);
    expect(readHomeBookmarksV1("a", { getItem: () => "{bad" }).size).toBe(0);
    const pageOnly = new Set(["article:temporary"]);
    expect(readHomeBookmarksV1("a", undefined, pageOnly)).toEqual(pageOnly);
    expect(readHomeBookmarksV1("a", { getItem: () => { throw Error("denied"); } }, pageOnly))
      .toEqual(pageOnly);
    expect(readHomeBookmarksV1("b", storage, pageOnly).size).toBe(0);
    expect(
      writeHomeBookmarksV1("a", new Set(), {
        setItem: () => {
          throw Error("denied");
        },
      }),
    ).toBe(false);
  });
  it("reproduces the reference Fable demo and recalculates continuous control changes", () => {
    const base = simulateHomeDemoV1(HOME_DEMO_BASE_V1);
    expect(
      [
        base.metrics.SV,
        base.metrics.EF,
        base.metrics.sys,
        base.metrics.dia,
      ].map(Math.round),
    ).toEqual([68, 54, 108, 72]);
    expect(base.metrics.CO.toFixed(1)).toBe("5.1");
    expect(base.metrics.CO).toBeCloseTo(base.metrics.SV * 0.075, 10);
    const presets = HOME_DEMO_PRESETS_V1.map((p) =>
      simulateHomeDemoV1(p.params),
    );
    expect(presets[1].metrics.SV).toBeLessThan(base.metrics.SV);
    expect(presets[2].metrics.SV).toBeLessThan(base.metrics.SV);
    expect(presets[3].metrics.SV).toBeGreaterThan(base.metrics.SV);
    expect(
      simulateHomeDemoV1({ ...HOME_DEMO_BASE_V1, pv: 10.5 }).metrics.SV,
    ).toBeGreaterThan(base.metrics.SV);
    for (const pv of [4, 18])
      for (const svr of [0.5, 2])
        for (const ees of [0.8, 4]) {
          const result = simulateHomeDemoV1({ pv, svr, ees });
          expect(result.rec).toHaveLength(800);
          expect(result.last.length).toBeGreaterThan(390);
          expect(
            result.rec.every((p) => Object.values(p).every(Number.isFinite)),
          ).toBe(true);
          expect(Object.values(result.metrics).every(Number.isFinite)).toBe(
            true,
          );
          expect(result.metrics.EF).toBeGreaterThan(0);
          expect(result.metrics.EF).toBeLessThan(100);
        }
    expect(() =>
      simulateHomeDemoV1({ ...HOME_DEMO_BASE_V1, ees: NaN }),
    ).toThrow();
  });
  it("keeps the same hero for signed-in and anonymous visits, with a direct workbench entry", () => {
    for (const signedIn of [true, false]) {
      const html = renderToStaticMarkup(
        <HomePageV1 locale="ja" data={bootstrap} signedIn={signedIn} />,
      );
      expect(html).toContain('href="/ja/experiments/new"');
      expect(html).toContain("home-mini-demo");
      expect(html).toContain("home-intro-copy");
      expect(html).not.toContain('class="home-quiet"');
      expect(
        html.match(/class="home-kinds"[\s\S]*?<\/div>/)?.[0],
      ).not.toContain("<small>");
      expect(html).not.toContain("章 · ");
      expect(html).not.toContain("続きから読む");
      expect(html).not.toContain("home-collapse-intro");
      expect(html).not.toContain("home-search-row");
      expect(html).not.toContain("home-topics");
      expect(html).not.toContain("コースから学ぶ");
    }
  });
  it("offers sign-in in place and only shows Saved to signed-in accounts", () => {
    const anonymous = renderToStaticMarkup(
      <HomePageV1 locale="ja" data={bootstrap} loginPrompt />,
    );
    expect(anonymous).toContain("ログインすると保存できます");
    expect(anonymous).toContain('href="/ja/login"');
    expect(anonymous).not.toContain("保存済み");
    const signedIn = renderToStaticMarkup(
      <HomePageV1 locale="ja" data={bootstrap} signedIn />,
    );
    expect(signedIn).toContain("保存済み");
  });
  it("illustrates content without numbers, duplicate titles or scenario counts", () => {
    const html = renderToStaticMarkup(
      <HomePageV1
        locale="ja"
        data={bootstrap}
        filter={{ ...HOME_FILTER_V1, kind: "article" }}
      />,
    );
    expect(html.match(/Community PV loop/g)).toHaveLength(3); // Link label, heading and save label only.
    expect(html).toContain("home-cover-art");
    expect(html).not.toContain("home-cover-number");
    expect(html).not.toContain("シナリオ");
    expect(
      homeCoverSubjectV1({
        kind: "article",
        title: "後負荷を変える",
        description: "前負荷・後負荷・収縮性のシリーズ",
      }),
    ).toBe("afterload");
    expect(
      homeCoverSubjectV1({
        kind: "article",
        title: "心室の硬さと充満圧",
        description: "",
      }),
    ).toBe("filling");
  });
});
describe("Home topics", () => {
  const tagged: StudioPublicHomeBootstrapV1 = {
    ...bootstrap,
    articles: [
      { ...bootstrap.articles[0], tags: ["前負荷", "PV loop"] },
      { ...bootstrap.articles[1], tags: ["pv loop", "心不全"] },
      {
        ...bootstrap.articles[1],
        articleId: "afterload-article",
        title: "後負荷の読み方",
        publicSlug: "afterload",
        tags: ["後負荷"],
      },
    ],
  };
  it("derives topics from loaded Article tags and groups spellings case-insensitively", () => {
    const topics = homeTopicsV1(homeItemsV1(tagged), "ja");
    expect(topics[0]).toMatchObject({ key: "pv loop", count: 2 });
    expect(topics.map((topic) => topic.key)).toEqual(
      expect.arrayContaining(["前負荷", "心不全", "後負荷"]),
    );
  });
  it("narrows discovery to tagged Articles, including grouped course chapters", () => {
    const items = homeItemsV1(tagged);
    const byTag = selectHomeItemsV1(items, { ...HOME_FILTER_V1, tag: "PV LOOP" });
    expect(byTag.map((item) => item.id).sort()).toEqual(
      [course.entries[0].articleId, "community-article"].sort(),
    );
    expect(byTag.every((item) => item.kind === "article")).toBe(true);
    expect(
      selectHomeItemsV1(items, { ...HOME_FILTER_V1, query: "#心不全" }).map((item) => item.id),
    ).toEqual(["community-article"]);
  });
  it("renders topic and card tags as crawlable tag-page links before the app starts", () => {
    const html = renderToStaticMarkup(
      <HomePageV1 locale="ja" data={validateStudioPublicHomeBootstrapV1(tagged)} staticRender />,
    );
    expect(html).toContain('class="home-topics"');
    expect(html).toContain('href="/ja/articles?tag=%E5%BE%8C%E8%B2%A0%E8%8D%B7"');
    expect(html).toContain("home-card-tags");
  });
  it("offers a filtered interactive state with a route to the full tag page", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HomePageV1
          locale="ja"
          data={tagged}
          filter={{ ...HOME_FILTER_V1, tag: "後負荷" }}
          onFilter={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(html).toMatch(/<button[^>]*class="home-topic"[^>]*aria-pressed="true"/);
    expect(html).toContain("#後負荷 の記事をすべて見る");
    expect(html).toContain("後負荷の読み方");
    expect(html).not.toContain("Community PV loop");
  });
  it("rejects non-canonical tags in the public Home handoff", () => {
    expect(() => validateStudioPublicHomeBootstrapV1({
      ...tagged,
      articles: [{ ...tagged.articles[0], tags: ["#前負荷"] }],
    })).toThrow(/tags/);
  });
});
