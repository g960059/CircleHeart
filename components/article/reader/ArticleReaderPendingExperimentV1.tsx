import React from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

/** A lightweight entry point, shared before and after the Reader bundle loads. */
export function ArticleReaderPendingExperimentV1({ title, preparing, onShow }: Readonly<{
  title: string;
  preparing: boolean;
  onShow?: () => void;
}>) {
  const { t } = useTranslation();
  const label = <span className="reader-experiment-title min-w-0 flex-1">{title}</span>;
  if (preparing) {
    return <div className="article-reader-pending" data-reader-model-loading="true" aria-busy="true">
      {label}
      <span className="article-reader-pending-status" role="status" aria-label={t("articleReader.preparingSimulation")}>
        <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
        {t("articleReader.preparingShort")}
      </span>
    </div>;
  }
  return <button type="button" onClick={onShow}
    aria-label={t("articleReader.showExperiment", { title })}
    className="article-reader-pending article-reader-pending-trigger" data-reader-pending="true">
    {label}
    <span className="article-reader-pending-action">{t("articleReader.show")}</span>
  </button>;
}
