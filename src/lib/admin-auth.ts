import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "immimap_admin";

export function verifyAdminSecret(secret: string | null | undefined): boolean {
  const expected = process.env.ADMIN_SECRET;
  return Boolean(expected && secret && secret === expected);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSecret(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export function isAdminRequest(request: NextRequest): boolean {
  const headerSecret = request.headers.get("x-admin-secret");
  if (verifyAdminSecret(headerSecret)) {
    return true;
  }

  const cookieSecret = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSecret(cookieSecret);
}
