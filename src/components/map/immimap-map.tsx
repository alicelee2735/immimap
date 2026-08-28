"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ImmigrationService } from "@/types/immimap";
import type { MapCommands } from "@/components/map/map-zoom-controls";

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
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/30 text-muted-foreground"
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
  onCommandsReady?: (commands: MapCommands | null) => void;
};

export function ImmimapMap({ services, onCommandsReady }: Props) {
  const t = useTranslations("Map");
  return (
    <div className="h-full w-full">
      <ImmimapMapClient
        services={services}
        ariaLabel={t("mapAriaLabel")}
        onCommandsReady={onCommandsReady}
      />
    </div>
  );
}
