"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CreateOrganizationInput,
  OrganizationWithServices,
} from "@/types/database.types";

const EMPTY_FORM: CreateOrganizationInput = {
  name: "",
  description: "",
  website_url: "",
  address: "",
  city: "",
  state: "",
  lat: 0,
  lng: 0,
  service_names: [],
};

export default function DashboardPage() {
  const [organizations, setOrganizations] = useState<OrganizationWithServices[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateOrganizationInput>(EMPTY_FORM);
  const [serviceNamesInput, setServiceNamesInput] = useState("");

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/organizations");
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to load organizations.");
      }

      const payload = (await response.json()) as {
        organizations: OrganizationWithServices[];
      };
      setOrganizations(payload.organizations);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load organizations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const service_names = serviceNamesInput
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, service_names }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to create organization.");
      }

      setForm(EMPTY_FORM);
      setServiceNamesInput("");
      await loadOrganizations();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create organization.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this organization?")) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to delete organization.");
      }

      await loadOrganizations();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete organization.",
      );
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage immigration service providers stored in Supabase.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Plus className="h-4 w-4" aria-hidden />
          Add organization
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              required
              value={form.city}
              onChange={(event) =>
                setForm((current) => ({ ...current, city: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              required
              value={form.state}
              onChange={(event) =>
                setForm((current) => ({ ...current, state: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              required
              value={form.lat}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lat: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lng">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="any"
              required
              value={form.lng}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lng: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="services">Services (comma-separated)</Label>
            <Input
              id="services"
              placeholder="Asylum, Family, DACA"
              value={serviceNamesInput}
              onChange={(event) => setServiceNamesInput(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Create organization"
              )}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Organizations</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading organizations…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm">
                    No organizations found.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell className="font-medium">
                      {organization.name}
                    </TableCell>
                    <TableCell>{organization.city}</TableCell>
                    <TableCell>{organization.state}</TableCell>
                    <TableCell>
                      {organization.services.map((service) => service.name).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void handleDelete(organization.id)}
                        aria-label={`Delete ${organization.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </main>
  );
}
