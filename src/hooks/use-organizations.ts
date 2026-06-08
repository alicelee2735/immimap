"use client";

import { useCallback, useEffect, useState } from "react";

import type { OrganizationWithServices } from "@/types/database.types";
import type { ImmigrationService } from "@/types/immimap";
import { getCatalogServices } from "@/lib/catalog-data";

function jsonFallbackServices(): ImmigrationService[] {
  return getCatalogServices();
}

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<OrganizationWithServices[]>(
    [],
  );
  const [services, setServices] = useState<ImmigrationService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/organizations");

      if (response.status === 503) {
        const fallback = jsonFallbackServices();
        setUsingFallback(true);
        setServices(fallback);
        setOrganizations([]);
        setError("Service temporarily unavailable.");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to load organizations.");
      }

      const payload = (await response.json()) as {
        organizations: OrganizationWithServices[];
      };

      setUsingFallback(false);
      setOrganizations(payload.organizations);
      setServices(
        payload.organizations
          .map((org) => organizationWithServicesToImmigrationService(org))
          .filter((service): service is ImmigrationService => service !== null),
      );
    } catch (fetchError) {
      const fallback = jsonFallbackServices();
      setUsingFallback(true);
      setServices(fallback);
      setOrganizations([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Service temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    services,
    loading,
    error,
    usingFallback,
    refresh: fetchOrganizations,
  };
}

function organizationWithServicesToImmigrationService(
  org: OrganizationWithServices,
): ImmigrationService | null {
  if (!org.address) {
    return null;
  }

  return {
    id: org.legacy_id ?? org.id,
    dbId: org.id,
    name: org.name,
    type: org.org_type ?? "NGO",
    state: org.state as ImmigrationService["state"],
    address: org.address,
    latitude: org.lat,
    longitude: org.lng,
    pricing: (org.pricing as ImmigrationService["pricing"]) ?? "Low-cost",
    services_offered: org.services.map(
      (service) => service.name,
    ) as ImmigrationService["services_offered"],
    thumbnail_image_url: org.thumbnail_image_url ?? "",
    phone: org.phone,
    website: org.website_url,
    description: org.description,
    intakeStatus: org.intake_status,
    languages: org.languages,
    catchmentNote: org.catchment_note,
  };
}
