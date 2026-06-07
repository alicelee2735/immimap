import type {
  CreateOrganizationInput,
  OrganizationFilters,
  OrganizationWithServices,
  UpdateOrganizationInput,
} from "@/types/database.types";
import type { ImmigrationService, ServiceOffering, USState } from "@/types/immimap";
import {
  getSupabaseAdminClient,
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";

type OrgRow = {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  legacy_id: string | null;
  org_type: "NGO" | "Law Firm" | null;
  pricing: string | null;
  thumbnail_image_url: string | null;
  intake_status: "OPEN" | "LIMITED" | "WAITLISTED" | null;
  languages: string[] | null;
  catchment_note: string | null;
  org_services: Array<{
    services: { id: string; name: string } | null;
  }>;
};

const ORG_FIELDS = `
  id,
  name,
  description,
  website_url,
  phone,
  address,
  city,
  state,
  lat,
  lng,
  legacy_id,
  org_type,
  pricing,
  thumbnail_image_url,
  intake_status,
  languages,
  catchment_note
`;

function buildOrgSelect(category?: string) {
  const orgServices = category
    ? "org_services!inner ( services!inner ( id, name ) )"
    : "org_services ( services ( id, name ) )";

  return `${ORG_FIELDS}, ${orgServices}`;
}

function mapRow(row: OrgRow): OrganizationWithServices | null {
  if (
    row.lat == null ||
    row.lng == null ||
    !row.city ||
    !row.state
  ) {
    return null;
  }

  const services = row.org_services
    .map((link) => link.services)
    .filter((service): service is { id: string; name: string } => Boolean(service));

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    website_url: row.website_url ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    city: row.city,
    state: row.state,
    lat: row.lat,
    lng: row.lng,
    services,
    legacy_id: row.legacy_id ?? undefined,
    org_type: row.org_type ?? undefined,
    pricing: row.pricing ?? undefined,
    thumbnail_image_url: row.thumbnail_image_url ?? undefined,
    intake_status: row.intake_status ?? undefined,
    languages: row.languages ?? undefined,
    catchment_note: row.catchment_note ?? undefined,
  };
}

export function organizationToImmigrationService(
  org: OrganizationWithServices,
): ImmigrationService | null {
  if (!org.address) {
    return null;
  }

  const servicesOffered = org.services
    .map((service) => service.name)
    .filter((name): name is ServiceOffering => Boolean(name));

  return {
    id: org.legacy_id ?? org.id,
    dbId: org.id,
    name: org.name,
    type: org.org_type ?? "NGO",
    state: org.state as USState,
    address: org.address,
    latitude: org.lat,
    longitude: org.lng,
    pricing: (org.pricing as ImmigrationService["pricing"]) ?? "Low-cost",
    services_offered: servicesOffered,
    thumbnail_image_url: org.thumbnail_image_url ?? "",
    phone: org.phone,
    website: org.website_url,
    description: org.description,
    intakeStatus: org.intake_status,
    languages: org.languages,
    catchmentNote: org.catchment_note,
  };
}

async function resolveServiceIds(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  serviceNames: string[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const name of serviceNames) {
    const { data: existing } = await supabase
      .from("services")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const { data: created, error } = await supabase
      .from("services")
      .insert({ name })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    ids.push(created.id);
  }

  return ids;
}

async function linkOrgServices(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  orgId: string,
  serviceNames: string[],
) {
  await supabase.from("org_services").delete().eq("org_id", orgId);

  if (serviceNames.length === 0) {
    return;
  }

  const serviceIds = await resolveServiceIds(supabase, serviceNames);
  const links = serviceIds.map((serviceId) => ({
    org_id: orgId,
    service_id: serviceId,
  }));

  const { error } = await supabase.from("org_services").insert(links);
  if (error) {
    throw error;
  }
}

export async function fetchOrganizations(
  filters: OrganizationFilters = {},
): Promise<OrganizationWithServices[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseClient();
  const states = filters.state
    ? Array.isArray(filters.state)
      ? filters.state
      : [filters.state]
    : [];

  let query = supabase
    .from("organizations")
    .select(buildOrgSelect(filters.category))
    .order("name");

  if (filters.name) {
    query = query.ilike("name", `%${filters.name}%`);
  }

  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }

  if (states.length === 1) {
    query = query.eq("state", states[0]);
  } else if (states.length > 1) {
    query = query.in("state", states);
  }

  if (filters.category) {
    query = query.eq("org_services.services.name", filters.category);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data as unknown as OrgRow[])
    .map(mapRow)
    .filter((org): org is OrganizationWithServices => org !== null);
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<OrganizationWithServices> {
  const supabase = getSupabaseAdminClient();
  const { service_names = [], ...orgFields } = input;

  const { data, error } = await supabase
    .from("organizations")
    .insert(orgFields)
    .select(buildOrgSelect())
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create organization.");
  }

  const row = data as unknown as OrgRow;

  if (service_names.length > 0) {
    await linkOrgServices(supabase, row.id, service_names);
    const refreshed = await fetchOrganizationById(row.id);
    if (!refreshed) {
      throw new Error("Failed to load organization after create.");
    }
    return refreshed;
  }

  const mapped = mapRow(row);
  if (!mapped) {
    throw new Error("Created organization is missing required location fields.");
  }

  return mapped;
}

export async function fetchOrganizationById(
  id: string,
): Promise<OrganizationWithServices | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("organizations")
    .select(buildOrgSelect())
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRow(data as unknown as OrgRow);
}

export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput,
): Promise<OrganizationWithServices> {
  const supabase = getSupabaseAdminClient();
  const { service_names, ...orgFields } = input;

  if (Object.keys(orgFields).length > 0) {
    const { error } = await supabase
      .from("organizations")
      .update(orgFields)
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  if (service_names) {
    await linkOrgServices(supabase, id, service_names);
  }

  const refreshed = await fetchOrganizationById(id);
  if (!refreshed) {
    throw new Error("Organization not found after update.");
  }

  return refreshed;
}

export async function deleteOrganization(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("organizations").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export function parseOrganizationFilters(
  searchParams: URLSearchParams,
): OrganizationFilters {
  const states = searchParams.getAll("state").filter(Boolean);
  const category = searchParams.get("category") ?? undefined;

  return {
    name: searchParams.get("name") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    state: states.length > 1 ? states : states[0],
    category: category || undefined,
  };
}
