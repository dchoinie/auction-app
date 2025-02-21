"use client";

import Container from "~/components/Container";
import { useUserRole } from "~/hooks/use-user-role";
import { hasPermission } from "~/lib/permissions";
import { redirect } from "next/navigation";

export default function AdminToolsPage() {
  const role = useUserRole();

  if (!hasPermission(role, "admin")) {
    redirect("/dashboard");
  }

  return (
    <Container>
      <h1 className="mb-6 text-2xl font-bold">Admin Tools</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">User Management</h2>
          <p className="text-sm text-gray-600">
            Manage user roles and permissions
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Draft Settings</h2>
          <p className="text-sm text-gray-600">
            Configure draft rules and settings
          </p>
        </div>
      </div>
    </Container>
  );
}
