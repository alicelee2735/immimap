import { NextRequest, NextResponse } from "next/server";

import {
  createOrganization,
  fetchOrganizations,
  parseOrganizationFilters,
} from "@/lib/organizations";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import type { CreateOrganizationInput } from "@/types/database.types";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  try {
    const filters = parseOrganizationFilters(request.nextUrl.searchParams);
    const organizations = await fetchOrganizations(filters);
    return NextResponse.json({ organizations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch organizations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as CreateOrganizationInput;

    if (!body.name || !body.city || !body.state || body.lat == null || body.lng == null) {
      return NextResponse.json(
        { error: "name, city, state, lat, and lng are required." },
        { status: 400 },
      );
    }

    const organization = await createOrganization(body);
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create organization.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
