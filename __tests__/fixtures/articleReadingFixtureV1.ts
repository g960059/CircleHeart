import type { StudioArticleDraftV2 } from "@/studio/contracts/v2/article";

export function articleReadingFixtureV1(): StudioArticleDraftV2 {
  return {
    schemaId: "circleheart-studio-article-draft-v2", articleId: "article-reading-fixture",
    tags: [],
    draftVersion: 1, visibility: "draft", locale: "ja", title: "文献・注釈・実測図の読み方",
    blocks: [
      { blockId: "intro", kind: "paragraph", text: "本文から文献へ移動します。[@ref/b][@ref/a]補足も確認できます。[^note/b]" },
      { blockId: "h/one", kind: "heading", level: 2, text: "図から読む" },
      { blockId: "figure-mention", kind: "paragraph", text: "波形の位置は[fig:fig/one]で確かめます。" },
      { blockId: "fig/one", kind: "image", url: "https://example.test/figure.png", altText: "表示テスト用の画像", title: "同時記録した圧と容積", caption: "同じ拍動に対応する時刻を比較する。", credit: { text: "出典：原著 Fig. 2。© Authors。改変なし。[@ref/b]", licenseLabel: "CC BY 4.0", licenseHref: "https://creativecommons.org/licenses/by/4.0/" } },
      { blockId: "h/two", kind: "heading", level: 2, text: "条件を確認する" },
      ...Array.from({ length: 7 }, (_, i) => ({ blockId: `long-${i}`, kind: "paragraph" as const, text: "測定時の条件と各軸の単位を確認してから、曲線の変化を読み進めます。".repeat(6) })),
      { blockId: "repeat", kind: "paragraph", text: "同じ文献を再び参照します。[@ref/b]条件の補足はこちらです。[^note/a]" },
      { blockId: "h/three", kind: "heading", level: 2, text: "次の記事へ" },
      { blockId: "card", kind: "link", role: "card", label: "関連する実験を読む", description: "測定条件を比較し、次の記事で曲線の変化を調べる。", href: "https://example.test/article", imageUrl: "https://example.test/figure.png", iconUrl: "https://example.test/missing-icon.png", siteName: "Reference site" },
      { blockId: "broken-card", kind: "link", label: "画像がない関連資料", description: "画像取得に失敗してもタイトルとリンクを読むことができます。", href: "https://example.test/other", imageUrl: "https://example.test/missing.png" },
      { blockId: "note/a", kind: "accordion", role: "note", title: "測定の条件", blocks: [{ blockId: "note-a-text", kind: "paragraph", text: "測定条件をここに補足する。[@ref/a]" }] },
      { blockId: "ref/a", kind: "link", role: "reference", label: "Second cited paper", href: "https://example.test/paper-a", description: "Author A. Journal. 2020;1:1–10." },
      { blockId: "note/b", kind: "accordion", role: "note", title: "圧の基準", blocks: [{ blockId: "note-b-text", kind: "paragraph", text: "圧の基準点をここに説明する。" }] },
      { blockId: "ref/b", kind: "link", role: "reference", label: "First cited paper", href: "https://example.test/paper-b", description: "Author B. Journal. 2022;2:11–20." },
    ],
  };
}
