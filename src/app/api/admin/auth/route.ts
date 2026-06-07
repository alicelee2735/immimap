import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminSecret } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { secret?: string };
  const secret = body.secret?.trim();

  if (!verifyAdminSecret(secret)) {
    return NextResponse.json({ error: "Invalid admin secret." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE_NAME, secret!, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
