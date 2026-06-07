import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";

type Props = {
  officialUrl: string;
  className?: string;
};

export function DataMaintenanceState({ officialUrl, className }: Props) {
  const t = useTranslations("Provenance");

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <h2 className="text-lg font-semibold text-amber-950">
          {t("maintenanceTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-amber-900/90">
          {t("maintenanceBody")}
        </p>
        <a
          href={officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            className: "mt-5 inline-flex gap-2",
          })}
        >
          {t("maintenanceOfficialLink")}
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}
