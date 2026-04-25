"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ImmigrationService } from "@/types/immimap";

const ImmimapMapClient = dynamic(
  () =>
    import("./immimap-map-client").then((m) => m.ImmimapMapClient),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

function MapLoadingFallback() {
  const t = useTranslations("Map");
  return (
    <div
      className="flex h-full min-h-[420px] w-full flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium">{t("loadingMap")}</p>
    </div>
  );
}

type Props = {
  services: ImmigrationService[];
};

export function ImmimapMap({ services }: Props) {
  const t = useTranslations("Map");
  return (
    <ImmimapMapClient services={services} ariaLabel={t("mapAriaLabel")} />
  );
}
