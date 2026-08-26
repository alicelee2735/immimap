import { NextRequest, NextResponse } from "next/server";

import { syncEoirOrganizations } from "@/lib/ingestion/eoir/sync-organizations";

// PDF extraction plus batch geocoding far exceeds the default budget.
export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Escape hatch for verifying a run without writing.
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const summary = await syncEoirOrganizations({
      apply: !dryRun,
      verbose: true,
    });

    return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "EOIR organization sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
