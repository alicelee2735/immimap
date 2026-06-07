"use client";

import { useCallback, useEffect, useState } from "react";

import {
  buildOrganizationsQuery,
  organizationSearchToFilters,
  type OrganizationSearchValues,
} from "@/components/search/organization-search";
import type { OrganizationWithServices } from "@/types/database.types";
import type { ImmigrationService } from "@/types/immimap";
import { getCatalogServices } from "@/lib/catalog-data";

function jsonFallbackServices(): ImmigrationService[] {
  return getCatalogServices();
}

export function useOrganizations(search: OrganizationSearchValues) {
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
      const filters = organizationSearchToFilters(search);
      const query = buildOrganizationsQuery(filters);
      const response = await fetch(`/api/organizations${query}`);

      if (response.status === 503) {
        const fallback = jsonFallbackServices();
        setUsingFallback(true);
        setServices(filterFallbackServices(fallback, search));
        setOrganizations([]);
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
      setServices(filterFallbackServices(fallback, search));
      setOrganizations([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load organizations.",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOrganizations();
    }, 250);

    return () => window.clearTimeout(timer);
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

function filterFallbackServices(
  services: ImmigrationService[],
  search: OrganizationSearchValues,
): ImmigrationService[] {
  const name = search.name.trim().toLowerCase();
  const city = search.city.trim().toLowerCase();

  return services.filter((service) => {
    if (search.state !== "all" && service.state !== search.state) {
      return false;
    }

    if (search.category !== "all") {
      const offering =
        search.category === "asylum"
          ? "Asylum"
          : search.category === "family"
            ? "Family"
            : search.category === "daca"
              ? "DACA"
              : "Employment";

      if (!service.services_offered.includes(offering)) {
        return false;
      }
    }

    if (name && !service.name.toLowerCase().includes(name)) {
      return false;
    }

    if (city && !service.address.toLowerCase().includes(city)) {
      return false;
    }

    return true;
  });
}
