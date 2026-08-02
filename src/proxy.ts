import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import { getInternalPathname } from "./lib/nav-pathname";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  response.headers.set(
    "x-pathname",
    getInternalPathname(request.nextUrl.pathname),
  );
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
