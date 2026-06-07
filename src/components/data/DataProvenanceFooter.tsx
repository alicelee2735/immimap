import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

type Props = {
  sourceLabel: string;
  sourceUrl: string;
  updatedAt: string | null;
  officialLinkLabel?: string;
  officialLinkUrl?: string;
  stale?: boolean;
};

function formatUpdatedAt(updatedAt: string | null, locale: string) {
  if (!updatedAt) {
    return null;
  }

  return new Date(updatedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function DataProvenanceFooter({
  sourceLabel,
  sourceUrl,
  updatedAt,
  officialLinkLabel,
  officialLinkUrl,
  stale = false,
}: Props) {
  const t = useTranslations("Provenance");
  const locale = useLocale();

  const formattedDate = formatUpdatedAt(updatedAt, locale);

  return (
    <footer className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <p>
          {t("sourceLine", { source: sourceLabel })}
          {formattedDate ? (
            <>
              {" "}
              {t("lastUpdated", { date: formattedDate })}
            </>
          ) : null}
        </p>
        {stale ? (
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            {t("staleBadge")}
          </Badge>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-4">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("viewSource")}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        {officialLinkUrl && officialLinkLabel ? (
          <a
            href={officialLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {officialLinkLabel}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
    </footer>
  );
}
