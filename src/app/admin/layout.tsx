import type { ReactNode } from "react";

import { AdminLogin } from "@/components/admin/admin-login";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authed = await isAdminAuthenticated();

  if (!authed) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">{children}</div>
  );
}
