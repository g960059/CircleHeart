import { publicAuthorHtmlV1, type PublicAuthorV1 } from "@/studio/application/profile/StudioPublicProfileV1";
import {
  articleReadingAnchorV1, articleReadingFieldV1, articleReadingHrefV1, articleReadingMentionV1,
  articleReadingTargetV1, buildArticleReadingIndexV1, parseArticleReadingTextV1, stripArticleReadingMarkupV1,
  type ArticleReadingIndexV1,
} from "@/studio/application/article/StudioArticleReadingV1";
import katex from "katex";
import circleHeartWordmark from "@/assets/brand/circleheart-wordmark.svg?raw";
import { articleHeadingPhrasesV1 } from "@/studio/application/article/StudioArticleHeadingPhrasesV1";

import enTranslation from "@/locales/en/translation.json";
import jaTranslation from "@/locales/ja/translation.json";
import type {
  StudioArticleAccordionContentBlockV2,
  StudioArticleBlockV2,
  StudioArticleExperimentBlockV2,
  StudioArticleQuizBlockV2,
} from "@/studio/contracts/v2/article";
import type {
  StudioPublishedArticleV1,
} from "@/studio/application/publication/StudioPublishedArticleV1";
import {
  renderStudioPublicArticleBootstrapV1,
} from "@/studio/application/publication/StudioPublicArticleBootstrapV1";
import {
  formatStudioPublicArticleDateV1,
  studioPublicArticlePresentationCopyV1,
} from "@/studio/application/publication/StudioPublicArticlePresentationV1";
import {
  articleBriefingPresentationV3,
} from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";

export type StudioPublicArticleMetadataV1 = Readonly<{
  canonicalUrl: string;
  description: string;
  title: string;
}>;

export type StudioRenderedPublicArticleV1 = Readonly<{
  articleContentId: string;
  bodyHtml: string;
  documentHtml: string;
  json: string;
  markdown: string;
  metadata: StudioPublicArticleMetadataV1;
}>;

const SITE_NAME_V1 = "CircleHeart";

export function renderStudioPublishedArticleV1(input: Readonly<{
  article: StudioPublishedArticleV1;
  author?: PublicAuthorV1;
  clientTemplate: string;
  canonicalOrigin: string;
}>): StudioRenderedPublicArticleV1 {
  const metadata = publicArticleMetadataV1(input.article, input.canonicalOrigin);
  const bodyHtml = renderPublicArticleBodyHtmlV1(input.article, input.author);
  return Object.freeze({
    articleContentId: input.article.articleContentId,
    bodyHtml,
    documentHtml: injectStudioPublicDocumentV1({
      bodyHtml: `${bodyHtml}\n${renderStudioPublicArticleBootstrapV1(input.article)}`,
      clientTemplate: input.clientTemplate,
      description: metadata.description,
      language: input.article.locale,
      title: metadata.title,
      canonicalUrl: metadata.canonicalUrl,
      additionalHeadHtml: publicArticleHeadHtmlV1(input.article, metadata),
    }),
    json: `${JSON.stringify(input.article, null, 2)}\n`,
    markdown: renderPublicArticleMarkdownV1(input.article),
    metadata,
  });
}

export function publicArticleMetadataV1(
  article: StudioPublishedArticleV1,
  canonicalOrigin: string,
): StudioPublicArticleMetadataV1 {
  const origin = new URL(canonicalOrigin);
  if (origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Canonical public origin must not contain a path, query, or hash");
  }
  const canonicalUrl = new URL(
    `/${article.locale}/articles/${encodeURIComponent(article.publicSlug)}`,
    origin,
  ).toString();
  const description = publicArticleDescriptionV1(article.blocks);
  return Object.freeze({
    canonicalUrl,
    description,
    title: `${article.title} | ${SITE_NAME_V1}`,
  });
}

export function publicArticleDescriptionV1(
  blocks: readonly StudioArticleBlockV2[],
): string {
  const text = firstMeaningfulTextV1(buildArticleReadingIndexV1(blocks).body) ?? SITE_NAME_V1;
  return truncateAtCodePointsV1(collapsedWhitespaceV1(stripArticleReadingMarkupV1(text)), 180);
}

export function renderPublicArticleBodyHtmlV1(
  article: StudioPublishedArticleV1,
  author?: PublicAuthorV1,
): string {
  const copy = studioPublicArticlePresentationCopyV1(article.locale);
  const reading = buildArticleReadingIndexV1(article.blocks);
  return [
    `<main class="public-static-shell article-document-shell" data-public-article-content-id="${escapeHtmlAttributeV1(article.articleContentId)}">`,
    `<article class="public-static-article article-document">`,
    `<header class="article-document-header">`,
    `<h1 class="article-title">${renderHeadingTextHtmlV1(article.title, article.locale)}</h1>`,
    publicAuthorHtmlV1(author, article.locale),
    `<p class="article-publication-date"><span>${copy.publishedLabel}</span> <time datetime="${escapeHtmlAttributeV1(article.publishedAt)}">${escapeHtmlTextV1(formatStudioPublicArticleDateV1(article.publishedAt, article.locale))}</time></p>`,
    `</header>`,
    `<div class="public-static-content">`,
    renderReadingTocHtmlV1(article.blocks, article.locale),
    ...reading.body.map((block) => renderBlockHtmlV1(block, article.locale, reading)),
    renderReadingEndMatterHtmlV1(reading, article.locale),
    `</div>`,
    `</article>`,
    `</main>`,
  ].join("\n");
}

export function renderPublicArticleMarkdownV1(
  article: StudioPublishedArticleV1,
): string {
  const reading = buildArticleReadingIndexV1(article.blocks);
  const frontmatter = [
    "---",
    `title: ${yamlStringV1(article.title)}`,
    `locale: ${yamlStringV1(article.locale)}`,
    `public_slug: ${yamlStringV1(article.publicSlug)}`,
    `published_at: ${yamlStringV1(article.publishedAt)}`,
    `updated_at: ${yamlStringV1(article.updatedAt)}`,
    `article_content_id: ${yamlStringV1(article.articleContentId)}`,
    "---",
    "",
    `# ${article.title}`,
    "",
  ];
  return `${[
    ...frontmatter,
    ...reading.body.flatMap((block) => renderBlockMarkdownV1(block, article.locale, reading)),
    renderReadingEndMatterMarkdownV1(reading, article.locale),
  ].join("\n").trimEnd()}\n`;
}

export function injectStudioPublicDocumentV1(input: Readonly<{
  additionalHeadHtml?: string;
  bodyHtml: string;
  canonicalUrl: string;
  clientTemplate: string;
  description: string;
  language: "ja" | "en";
  title: string;
}>): string {
  if (!/<div\s+id=["']root["'][^>]*><\/div>/.test(input.clientTemplate)) {
    throw new Error("Client template is missing an empty #root element");
  }
  const head = [
    `<title>${escapeHtmlTextV1(input.title)}</title>`,
    `<meta name="description" content="${escapeHtmlAttributeV1(input.description)}" />`,
    `<link rel="canonical" href="${escapeHtmlAttributeV1(input.canonicalUrl)}" />`,
    input.additionalHeadHtml ?? "",
  ].filter(Boolean).join("\n    ");

  return input.clientTemplate
    .replace(/<html\s+lang=["'][^"']*["']/, `<html lang="${input.language}"`)
    .replace(/<title>[^<]*<\/title>/, head)
    .replace(
      /<div\s+id=["']root["'][^>]*><\/div>/,
      `<div id="public-static-root">${publicStaticSiteHeaderHtmlV1(input.language, input.canonicalUrl)}${input.bodyHtml}</div><div id="root" hidden></div>`,
    );
}

function publicArticleHeadHtmlV1(
  article: StudioPublishedArticleV1,
  metadata: StudioPublicArticleMetadataV1,
): string {
  const markdownUrl = `${metadata.canonicalUrl}.md`;
  const jsonUrl = new URL(
    `/api/v1/public/articles/${article.publicSlug}`,
    metadata.canonicalUrl,
  ).toString();
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: article.locale,
    mainEntityOfPage: metadata.canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME_V1,
      url: new URL(metadata.canonicalUrl).origin,
    },
  }).replaceAll("<", "\\u003c");
  return [
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${SITE_NAME_V1}" />`,
    `<meta property="og:title" content="${escapeHtmlAttributeV1(article.title)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttributeV1(metadata.description)}" />`,
    `<meta property="og:url" content="${escapeHtmlAttributeV1(metadata.canonicalUrl)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtmlAttributeV1(article.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttributeV1(metadata.description)}" />`,
    `<meta property="article:published_time" content="${escapeHtmlAttributeV1(article.publishedAt)}" />`,
    `<meta property="article:modified_time" content="${escapeHtmlAttributeV1(article.updatedAt)}" />`,
    `<link rel="alternate" hreflang="${article.locale}" href="${escapeHtmlAttributeV1(metadata.canonicalUrl)}" />`,
    `<link rel="alternate" type="text/markdown" href="${escapeHtmlAttributeV1(markdownUrl)}" title="${escapeHtmlAttributeV1(article.title)}" />`,
    `<link rel="alternate" type="application/json" href="${escapeHtmlAttributeV1(jsonUrl)}" title="${escapeHtmlAttributeV1(article.title)}" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join("\n    ");
}

function renderHeadingTextHtmlV1(text: string, locale: string): string {
  return `<span class="article-heading-phrases">${articleHeadingPhrasesV1(text, locale).map(escapeHtmlTextV1).join("<wbr>")}</span>`;
}

function renderBlockHtmlV1(
  block: StudioArticleBlockV2 | StudioArticleAccordionContentBlockV2,
  locale: "ja" | "en",
  reading: ArticleReadingIndexV1,
): string {
  const anchor = `block-${block.blockId}`;
  if (block.kind === "heading") {
    const level = block.level === 2 ? "h2" : "h3";
    const className = block.level === 2 ? "article-heading-2" : "article-heading-3";
    return `<${level} class="${className}" id="${escapeHtmlAttributeV1(anchor)}">${renderHeadingTextHtmlV1(block.text, locale)}</${level}>`;
  }
  if (block.kind === "paragraph") {
    return `<p class="article-paragraph" id="${escapeHtmlAttributeV1(anchor)}">${renderReadingTextHtmlV1(block.text, articleReadingFieldV1(block.blockId), reading, locale)}</p>`;
  }
  if (block.kind === "equation") {
    const equation = block.expression.length === 0
      ? ""
      : katex.renderToString(block.expression, {
          displayMode: true,
          output: "htmlAndMathml",
          strict: false,
          throwOnError: false,
          trust: false,
        });
    return `<figure class="public-static-equation" id="${escapeHtmlAttributeV1(anchor)}"><div>${equation}</div></figure>`;
  }
  if (block.kind === "image") {
    if (block.url.length === 0) return "";
    const number = reading.figures.get(block.blockId)?.number;
    const figureId = articleReadingAnchorV1("figure", block.blockId);
    const title = [number ? `${locale === "ja" ? "図" : "Figure "}${number}` : "", block.title].filter(Boolean).join("：");
    const caption = block.caption ? `<p>${renderReadingTextHtmlV1(block.caption, articleReadingFieldV1(block.blockId, "caption"), reading, locale)}</p>` : "";
    const credit = block.credit ? `<p class="article-figure-credit">${renderReadingTextHtmlV1(block.credit.text, articleReadingFieldV1(block.blockId, "credit"), reading, locale)}${block.credit.licenseLabel ? ` · ${block.credit.licenseHref ? `<a href="${escapeHtmlAttributeV1(block.credit.licenseHref)}" target="_blank" rel="noreferrer">${escapeHtmlTextV1(block.credit.licenseLabel)}</a>` : escapeHtmlTextV1(block.credit.licenseLabel)}` : ""}</p>` : "";
    return `<figure class="article-figure" id="${escapeHtmlAttributeV1(figureId)}"${title ? ` aria-labelledby="${escapeHtmlAttributeV1(figureId)}-title"` : ""} tabindex="-1">${title ? `<p class="article-figure-title" id="${escapeHtmlAttributeV1(figureId)}-title">${escapeHtmlTextV1(title)}</p>` : ""}<a class="article-figure-open" href="${escapeHtmlAttributeV1(block.url)}" target="_blank" rel="noreferrer"><img src="${escapeHtmlAttributeV1(block.url)}" alt="${escapeHtmlAttributeV1(block.altText)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></a>${caption || credit ? `<figcaption class="article-figure-caption">${caption}${credit}</figcaption>` : ""}</figure>`;
  }

  if (block.kind === "divider") {
    return `<hr id="${escapeHtmlAttributeV1(anchor)}" />`;
  }
  if (block.kind === "link") {
    if (block.role === "reference" || block.href.length === 0 || block.label.length === 0) return "";
    const external = !block.href.startsWith("/");
    const description = block.description.length === 0 ? ""
      : `<span class="article-resource-description">${escapeHtmlTextV1(block.description)}</span>`;
    const host = publicArticleLinkHostLabelV1(block.href);
    const icon = block.iconUrl ? `<img src="${escapeHtmlAttributeV1(block.iconUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />` : "";
    const image = block.imageUrl ? `<span class="article-resource-image"><img src="${escapeHtmlAttributeV1(block.imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></span>` : "";
    return `<a class="article-link-card article-resource-card" id="${escapeHtmlAttributeV1(anchor)}" href="${escapeHtmlAttributeV1(block.href)}"${external ? ' target="_blank" rel="noreferrer"' : ""}><span class="article-resource-copy"><span class="article-resource-title">${escapeHtmlTextV1(block.label)}</span>${description}<span class="article-resource-host">${icon}<span>${escapeHtmlTextV1(block.siteName || host)}</span>${block.siteName && block.siteName !== host ? `<span class="article-resource-domain">${escapeHtmlTextV1(host)}</span>` : ""}</span></span>${image}</a>`;
  }

  if (block.kind === "quiz") return renderQuizHtmlV1(block, anchor, locale);
  if (block.kind === "accordion") {
    if (block.role === "note") return "";
    return `<details class="article-accordion public-static-accordion" id="${escapeHtmlAttributeV1(anchor)}"><summary class="article-accordion-summary"><span class="article-accordion-toggle" aria-hidden="true">›</span>${escapeHtmlTextV1(block.title)}</summary><div>${block.blocks.map((nested) => renderBlockHtmlV1(nested, locale, reading)).join("\n")}</div></details>`;
  }
  return renderExperimentHtmlV1(block, anchor, locale);
}

function publicArticleLinkHostLabelV1(href: string): string {
  if (href.startsWith("/")) return "CircleHeart";
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function renderQuizHtmlV1(
  block: StudioArticleQuizBlockV2,
  anchor: string,
  locale: "ja" | "en",
): string {
  const choices = block.choices.map((choice) =>
    `<li>${escapeHtmlTextV1(choice.label)}</li>`).join("");
  const answer = block.explanation.length === 0
    ? ""
    : `<p>${escapeHtmlTextV1(block.explanation)}</p>`;
  const quizLabel = locale === "ja" ? "確認問題" : "Quiz";
  const answerLabel = locale === "ja" ? "答えと解説" : "Answer and explanation";
  const correctChoice = block.choices.find(({ choiceId }) =>
    choiceId === block.correctChoiceId);
  const correctLabel = locale === "ja" ? "正解" : "Correct answer";
  const correct = correctChoice === undefined
    ? ""
    : `<p><strong>${correctLabel}:</strong> ${escapeHtmlTextV1(correctChoice.label)}</p>`;
  return `<section class="public-static-quiz" id="${escapeHtmlAttributeV1(anchor)}"><p class="public-static-label">${quizLabel}</p><h3>${escapeHtmlTextV1(block.question)}</h3><ol>${choices}</ol><details><summary>${answerLabel}</summary>${correct}${answer}</details></section>`;
}

function renderExperimentHtmlV1(
  block: StudioArticleExperimentBlockV2,
  anchor: string,
  locale: "ja" | "en",
): string {
  const { briefing } = block.placement;
  const presentation = articleBriefingPresentationV3(briefing);
  const title = block.placement.titleOverride ?? briefing.defaultTitle;
  const graphPrefix = locale === "ja" ? "グラフ" : "Graph";
  const labels = [
    ...briefing.graphs.map((graph, index) =>
      graph.overrides?.label ?? `${graphPrefix} ${index + 1}`),
    ...briefing.outputs.map((output) => output.label),
    ...briefing.controls.map((control) => control.label),
  ];
  const caption = block.placement.caption === null
    ? ""
    : `<p>${escapeHtmlTextV1(block.placement.caption)}</p>`;
  const summary = labels.length === 0
    ? ""
    : `<ul>${labels.map((label) => `<li>${escapeHtmlTextV1(label)}</li>`).join("")}</ul>`;
  const label = locale === "ja" ? "インタラクティブ・シミュレーション" : "Interactive simulation";
  const counts = locale === "ja"
    ? `シナリオ ${briefing.scenarioScope.visibleScenarioIds.length}件・グラフ ${briefing.graphs.length}件・出力 ${briefing.outputs.length}件・操作 ${briefing.controls.length}件`
    : `${briefing.scenarioScope.visibleScenarioIds.length} scenario(s), ${briefing.graphs.length} graph(s), ${briefing.outputs.length} output(s), ${briefing.controls.length} control(s)`;
  const jsNote = locale === "ja"
    ? "シミュレーションを操作するにはJavaScriptを有効にしてください。"
    : "Enable JavaScript to explore this simulation.";
  if (presentation !== "inflow") {
    const semanticSummary = [
      label,
      block.placement.caption,
      counts,
      ...labels,
    ].filter((part): part is string => part !== null && part.length > 0).join(". ");
    return `<section class="article-reader-peek-surface public-static-experiment public-static-experiment-${presentation}" id="placement-${escapeHtmlAttributeV1(block.placement.placementId)}" data-block-anchor="${escapeHtmlAttributeV1(anchor)}" data-reader-presentation="${presentation}"><span class="article-link-card-leading" aria-hidden="true">∿</span><span class="public-static-experiment-anchor-copy"><h2>${escapeHtmlTextV1(title)}</h2><p class="public-static-js-note">${jsNote}</p></span><span class="public-static-experiment-chevron" aria-hidden="true">›</span><span class="sr-only">${escapeHtmlTextV1(semanticSummary)}</span></section>`;
  }
  return `<section class="public-static-experiment public-static-experiment-${presentation}" id="placement-${escapeHtmlAttributeV1(block.placement.placementId)}" data-block-anchor="${escapeHtmlAttributeV1(anchor)}" data-reader-presentation="${presentation}"><p class="public-static-label">${label}</p><h2>${escapeHtmlTextV1(title)}</h2>${caption}<p>${counts}</p>${summary}<p class="public-static-js-note">${jsNote}</p></section>`;
}

function renderBlockMarkdownV1(
  block: StudioArticleBlockV2 | StudioArticleAccordionContentBlockV2,
  locale: "ja" | "en",
  reading: ArticleReadingIndexV1,
): readonly string[] {
  if (block.kind === "heading") {
    return [`${block.level === 2 ? "##" : "###"} ${block.text}`, ""];
  }
  if (block.kind === "paragraph") return [renderReadingTextMarkdownV1(block.text, reading, locale), ""];
  if (block.kind === "equation") return ["$$", block.expression, "$$", ""];
  if (block.kind === "image") {
    if (!block.url) return [];
    const number = reading.figures.get(block.blockId)?.number;
    const title = [number ? `${locale === "ja" ? "図" : "Figure "}${number}` : "", block.title].filter(Boolean).join("：");
    return [
      `<a id="${escapeHtmlAttributeV1(articleReadingAnchorV1("figure", block.blockId))}"></a>`,
      ...(title ? [`**${escapeMarkdownTextV1(title)}**`, ""] : []),
      `![${escapeMarkdownTextV1(block.altText)}](<${block.url}>)`, "",
      renderReadingTextMarkdownV1(block.caption, reading, locale), "",
      ...(block.credit ? [renderReadingTextMarkdownV1(block.credit.text, reading, locale)
        + (block.credit.licenseLabel ? ` · ${block.credit.licenseHref ? `[${escapeMarkdownTextV1(block.credit.licenseLabel)}](<${block.credit.licenseHref}>)` : escapeMarkdownTextV1(block.credit.licenseLabel)}` : ""), ""] : []),
    ];
  }
  if (block.kind === "divider") return ["---", ""];
  if (block.kind === "link") {
    if (block.role === "reference" || block.href.length === 0 || block.label.length === 0) return [];
    return [
      `[${block.label}](${block.href})`,
      ...(block.description.length > 0 ? [block.description] : []),
      "",
    ];
  }
  if (block.kind === "quiz") {
    const quizLabel = locale === "ja" ? "確認問題" : "Quiz";
    const answerLabel = locale === "ja" ? "答えと解説" : "Answer and explanation";
    const correctLabel = locale === "ja" ? "正解" : "Correct answer";
    const correctChoice = block.choices.find(({ choiceId }) =>
      choiceId === block.correctChoiceId);
    return [
      `### ${quizLabel}: ${block.question}`,
      "",
      ...block.choices.map((choice) => `- ${choice.label}`),
      "",
      "<details>",
      `<summary>${answerLabel}</summary>`,
      "",
      ...(correctChoice === undefined
        ? []
        : [`**${correctLabel}:** ${correctChoice.label}`, ""]),
      block.explanation,
      "",
      "</details>",
      "",
    ];
  }
  if (block.kind === "accordion") {
    if (block.role === "note") return [];
    return [
      "<details>",
      `<summary>${block.title}</summary>`,
      "",
      ...block.blocks.flatMap((nested) => renderBlockMarkdownV1(nested, locale, reading)),
      "</details>",
      "",
    ];
  }
  const title = block.placement.titleOverride
    ?? block.placement.briefing.defaultTitle;
  const briefing = block.placement.briefing;
  const label = locale === "ja"
    ? `インタラクティブ・シミュレーション: ${title}`
    : `Interactive simulation: ${title}`;
  return [
    `## ${label}`,
    "",
    ...(block.placement.caption === null ? [] : [block.placement.caption, ""]),
    `- Scenarios: ${briefing.scenarioScope.visibleScenarioIds.length}`,
    `- Graphs: ${briefing.graphs.length}`,
    `- Outputs: ${briefing.outputs.length}`,
    `- Controls: ${briefing.controls.length}`,
    ...briefing.outputs.map((output) => `- Output: ${output.label}`),
    ...briefing.controls.map((control) => `- Control: ${control.label}`),
    "",
  ];
}

function firstMeaningfulTextV1(
  blocks: readonly (
    StudioArticleBlockV2 | StudioArticleAccordionContentBlockV2
  )[],
): string | null {
  for (const block of blocks) {
    if ((block.kind === "paragraph" || block.kind === "heading") && block.text.trim()) {
      return block.text;
    }
    if (block.kind === "accordion") {
      const nested = firstMeaningfulTextV1(block.blocks);
      if (nested !== null) return nested;
    }
    if (block.kind === "quiz" && block.question.trim()) return block.question;
    if (block.kind === "link") {
      if (block.description.trim()) return block.description;
      if (block.label.trim()) return block.label;
    }
    if (block.kind === "image") {
      if (block.caption.trim()) return block.caption;
      if (block.altText.trim()) return block.altText;
    }
    if (block.kind === "experiment") {
      if (block.placement.caption?.trim()) return block.placement.caption;
      if (block.placement.titleOverride?.trim()) {
        return block.placement.titleOverride;
      }
      if (block.placement.briefing.defaultTitle.trim()) {
        return block.placement.briefing.defaultTitle;
      }
    }
  }
  return null;
}

function collapsedWhitespaceV1(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateAtCodePointsV1(value: string, maximum: number): string {
  const points = [...value];
  return points.length <= maximum
    ? value
    : `${points.slice(0, Math.max(0, maximum - 1)).join("")}…`;
}

function escapeHtmlTextV1(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlAttributeV1(value: string): string {
  return escapeHtmlTextV1(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function yamlStringV1(value: string): string {
  return JSON.stringify(value);
}

function publicStaticSiteHeaderHtmlV1(
  locale: "ja" | "en",
  canonicalUrl: string,
): string {
  const canonical = new URL(canonicalUrl);
  const alternateLocale = locale === "ja" ? "en" : "ja";
  const alternatePath = canonical.pathname.replace(
    /^\/(?:ja|en)(?=\/|$)/,
    `/${alternateLocale}`,
  );
  const siteHeaderCopy = locale === "ja"
    ? jaTranslation.siteHeader
    : enTranslation.siteHeader;
  const homeLabel = siteHeaderCopy.home;
  const simulationLabel = siteHeaderCopy.startSimulation;
  const loginLabel = siteHeaderCopy.login;
  const isHome = /^\/(ja|en)\/?$/.test(canonical.pathname);
  const isArticle = /^\/(ja|en)\/articles(?:\/|$)/.test(canonical.pathname);
  return [
    `<header class="public-static-site-header${isHome ? ' home-site-header' : isArticle ? ' article-site-header' : ''}">`,
    `<a class="site-brand-link" href="/${locale}" aria-label="${homeLabel}"><span class="circleheart-wordmark" aria-hidden="true">${circleHeartWordmark}</span></a>`,
    `<span class="public-static-site-header-spacer"></span>`,
    ...(isHome ? [`<button class="home-header-search" type="button" disabled aria-label="${locale === 'ja' ? 'コンテンツを検索' : 'Search content'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg><span>${locale === 'ja' ? '検索' : 'Search'}</span><kbd>⌘K</kbd></button>`] : []),
    // Public HTML is cacheable and cannot know the browser's session. Only
    // no-JS readers get guest actions here; React resolves the account chrome.
    `<noscript><style>.public-static-site-header noscript{display:contents}.public-static-site-header .site-account-pending-action,.public-static-site-header .site-account-pending-avatar{display:none}</style>`,
    `<nav class="public-static-language" aria-label="${siteHeaderCopy.language}">`,
    `<a${locale === "ja" ? " aria-current=\"true\"" : ""} href="${locale === "ja" ? canonical.pathname : alternatePath}">JA</a>`,
    `<a${locale === "en" ? " aria-current=\"true\"" : ""} href="${locale === "en" ? canonical.pathname : alternatePath}">EN</a>`,
    `</nav></noscript>`,
    `<span class="public-static-theme-icon" aria-hidden="true"><span class="public-static-theme-sun">${sunIconHtmlV1()}</span><span class="public-static-theme-moon">${moonIconHtmlV1()}</span></span>`,
    // Pending account slots share the browser shell's CSS sizing contract.
    `<span class="site-account-pending-action" data-testid="site-account-pending-v3" aria-hidden="true"><span>${escapeHtmlTextV1(siteHeaderCopy.create)}</span></span>`,
    `<span class="site-account-pending-avatar" aria-hidden="true"></span>`,
    `<noscript>`,
    `<a class="public-static-primary-icon" href="/${locale}/experiments/new" aria-label="${simulationLabel}">${flaskIconHtmlV1()}<span class="public-static-responsive-label">${simulationLabel}</span></a>`,
    `<a class="public-static-quiet-icon" href="/${locale}/login" aria-label="${loginLabel}">${loginIconHtmlV1()}<span class="public-static-responsive-label">${loginLabel}</span></a>`,
    `</noscript>`,
    `</header>`,
  ].join("");
}

function sunIconHtmlV1(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>`;
}

function moonIconHtmlV1(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"></path></svg>`;
}

function flaskIconHtmlV1(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.75 3h10.5A2 2 0 0 0 19 18l-5-9V3M7.5 15h9"></path></svg>`;
}

function loginIconHtmlV1(): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path></svg>`;
}

function renderReadingTextHtmlV1(text: string, fieldId: string, reading: ArticleReadingIndexV1, locale: "ja" | "en"): string {
  return parseArticleReadingTextV1(text).map((token, i, tokens) => {
    if (token.kind === "text") return escapeHtmlTextV1(token.text);
    const target = articleReadingTargetV1(reading, token);
    if (!target) return escapeHtmlTextV1(token.raw);
    const next = tokens[i + 1];
    const continues = next?.kind === "reference" && articleReadingTargetV1(reading, next);
    const label = token.kind === "reference" ? `${target.number}${continues ? "," : ")"}` : token.kind === "note" ? `${locale === "ja" ? "注" : "Note "}${target.number}` : `${locale === "ja" ? "図" : "Figure "}${target.number}`;
    const role = token.kind === "note" ? ' role="doc-noteref"' : token.kind === "reference" ? ' role="doc-biblioref"' : "";
    const ariaLabel = token.kind === "reference" ? `${locale === "ja" ? "文献" : "Reference "}${target.number}` : label;
    const link = `<a class="article-reading-anchor"${role} aria-label="${escapeHtmlAttributeV1(ariaLabel)}" id="${escapeHtmlAttributeV1(articleReadingMentionV1(fieldId, token.offset))}" href="${escapeHtmlAttributeV1(articleReadingHrefV1(articleReadingAnchorV1(token.kind, token.targetId)))}">${escapeHtmlTextV1(label)}</a>`;
    return token.kind === "figure" ? link : `<sup class="article-reading-marker">${link}</sup>`;
  }).join("");
}
function renderReadingTocHtmlV1(blocks: readonly StudioArticleBlockV2[], locale: "ja" | "en"): string {
  const headings = blocks.filter(b => b.kind === "heading" && b.level === 2);
  if (headings.length < 3) return "";
  return `<details class="article-toc"><summary>${locale === "ja" ? "目次" : "Contents"}</summary><nav aria-label="${locale === "ja" ? "記事の目次" : "Article contents"}"><ol>${headings.map(b => b.kind === "heading" ? `<li><a href="${escapeHtmlAttributeV1(articleReadingHrefV1(`block-${b.blockId}`))}">${escapeHtmlTextV1(b.text)}</a></li>` : "").join("")}</ol></nav></details>`;
}
function renderReadingEndMatterHtmlV1(reading: ArticleReadingIndexV1, locale: "ja" | "en"): string {
  const ja = locale === "ja";
  const backs = (ids: readonly string[]) => `<span class="article-reading-backlinks">${ids.map((id, i) => `<a href="${escapeHtmlAttributeV1(articleReadingHrefV1(id))}" role="doc-backlink" aria-label="${ja ? `引用箇所${i + 1}に戻る` : `Return to mention ${i + 1}`}">↩${ids.length > 1 ? i + 1 : ""}</a>`).join("")}</span>`;
  const notes = reading.notes.length ? `<section class="article-endnotes" role="doc-endnotes" aria-labelledby="article-notes-heading"><h2 id="article-notes-heading" class="article-heading-2">${ja ? "注釈" : "Notes"}</h2><ol>${reading.notes.map(e => `<li id="${escapeHtmlAttributeV1(articleReadingAnchorV1("note", e.block.blockId))}" tabindex="-1" role="doc-endnote"><div class="article-endnote-title"><span>${ja ? "注" : "Note "}${e.number}</span><strong>${escapeHtmlTextV1(e.block.title)}</strong>${backs(e.backlinks)}</div>${e.block.blocks.map(b => renderBlockHtmlV1(b, locale, reading)).join("\n")}</li>`).join("\n")}</ol></section>` : "";
  const refs = reading.references.length ? `<section class="article-references" role="doc-bibliography" aria-labelledby="article-references-heading"><h2 id="article-references-heading" class="article-heading-2">${ja ? "文献" : "References"}</h2><ol>${reading.references.map(e => `<li id="${escapeHtmlAttributeV1(articleReadingAnchorV1("reference", e.block.blockId))}" tabindex="-1" value="${e.number}">${e.block.href ? `<a href="${escapeHtmlAttributeV1(e.block.href)}" target="_blank" rel="noreferrer">${escapeHtmlTextV1(e.block.label)}</a>` : escapeHtmlTextV1(e.block.label)} <span>${escapeHtmlTextV1(e.block.description)}</span>${backs(e.backlinks)}</li>`).join("\n")}</ol></section>` : "";
  return notes + refs;
}

function escapeMarkdownTextV1(text: string): string {
  return escapeHtmlTextV1(text).replace(/[\\`*_[\]]/g, "\\$&");
}
function renderReadingTextMarkdownV1(text: string, reading: ArticleReadingIndexV1, locale: "ja" | "en"): string {
  return parseArticleReadingTextV1(text).map(token => {
    if (token.kind === "text") return escapeMarkdownTextV1(token.text);
    const target = articleReadingTargetV1(reading, token);
    if (!target) return escapeMarkdownTextV1(token.raw);
    if (token.kind === "note") return `[^note-${target.number}]`;
    const label = token.kind === "reference" ? `${target.number})` : `${locale === "ja" ? "図" : "Figure "}${target.number}`;
    return `[${label}](${articleReadingHrefV1(articleReadingAnchorV1(token.kind, token.targetId))})`;
  }).join("");
}
function renderReadingEndMatterMarkdownV1(reading: ArticleReadingIndexV1, locale: "ja" | "en"): string {
  const lines: string[] = [];
  if (reading.notes.length) lines.push(`## ${locale === "ja" ? "注釈" : "Notes"}`, "");
  for (const entry of reading.notes) {
    lines.push(`[^note-${entry.number}]: **${escapeMarkdownTextV1(entry.block.title)}**`);
    const content = entry.block.blocks.flatMap(b => renderBlockMarkdownV1(b, locale, reading));
    lines.push(...content.map(line => `    ${line}`), "");
  }
  if (reading.references.length) lines.push(`## ${locale === "ja" ? "文献" : "References"}`, "");
  for (const entry of reading.references) {
    const block = entry.block;
    const title = escapeMarkdownTextV1(block.label);
    lines.push(`<a id="${escapeHtmlAttributeV1(articleReadingAnchorV1("reference", block.blockId))}"></a>`,
      `${entry.number}. ${block.href ? `[${title}](<${block.href}>)` : title} ${escapeMarkdownTextV1(block.description)}`, "");
  }
  return lines.join("\n");
}
