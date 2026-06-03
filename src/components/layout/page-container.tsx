import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type PageContainerProps = ComponentPropsWithoutRef<"div">;

export function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-6 md:px-16 lg:px-24", className)}
      {...props}
    />
  );
}
