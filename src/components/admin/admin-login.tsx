"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLogin() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!response.ok) {
        throw new Error("Invalid admin secret.");
      }

      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">Admin access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the admin secret to access data management tools.
        </p>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="admin-secret">Admin secret</Label>
          <Input
            id="admin-secret"
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}

        <Button type="submit" className="mt-4 w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Verifying…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </main>
  );
}
