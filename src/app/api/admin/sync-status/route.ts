import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-auth";
import { getSyncStatusSnapshot } from "@/lib/official-data";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const status = await getSyncStatusSnapshot();
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sync status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
