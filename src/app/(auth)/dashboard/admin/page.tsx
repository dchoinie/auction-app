"use client";

import Container from "~/components/Container";
import PlayerImport from "./components/PlayerImport";
import { useUserRole } from "~/hooks/use-user-role";
import { hasPermission } from "~/lib/permissions";
import { redirect } from "next/navigation";

export default function AdminPage() {
  const role = useUserRole();

  if (!hasPermission(role, "admin")) {
    redirect("/dashboard");
  }

  return (
    <Container>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      {/* Draft Order Section */}
      <div className="mb-8 rounded-lg border p-4">
        <h2 className="mb-4 text-xl font-semibold">Set Draft Order</h2>
        {/* ... existing draft order content ... */}
      </div>

      {/* Player Import Section */}
      <div className="mb-8">
        <PlayerImport />
      </div>
    </Container>
  );
}
