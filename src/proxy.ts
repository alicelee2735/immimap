import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";
import { getInternalPathname } from "./lib/nav-pathname";

const handleI18nRouting = createMiddleware(routing);

/** Former Chinese locale paths redirect to the English equivalents. */
function redirectArchivedZh(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname !== "/zh" && !pathname.startsWith("/zh/")) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/zh" ? "/" : pathname.slice("/zh".length) || "/";
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const archived = redirectArchivedZh(request);
  if (archived) return archived;

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
