import { Link } from "react-router-dom";
import { articleTagHref } from "@/homeLinks";
import { studioPublicArticlePresentationCopyV1 } from "@/studio/application/publication/StudioPublicArticlePresentationV1";

/**
 * Reader tag chips. Mirrors `publicArticleTagListHtmlV1` so the first public
 * response and the interactive Reader show the same tags and destinations.
 */
export function ArticleTagListV1({
  tags,
  locale,
}: Readonly<{ tags: readonly string[]; locale: "ja" | "en" }>) {
  if (tags.length === 0) return null;
  return (
    <ul
      className="article-tags"
      aria-label={studioPublicArticlePresentationCopyV1(locale).tagsLabel}
    >
      {tags.map((tag) => (
        <li key={tag}>
          <Link className="article-tag" to={articleTagHref({ locale, tag })}>
            <span aria-hidden="true">#</span>
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
