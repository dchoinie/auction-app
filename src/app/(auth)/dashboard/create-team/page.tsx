"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Container from "~/components/Container";
import { useRouter } from "next/navigation";
import { useTeamsStore } from "~/store/teams";
import { useUserRole } from "~/hooks/use-user-role";
import type { UserRole } from "~/lib/permissions";

interface UserPublicMetadata {
  role?: UserRole;
  [key: string]: unknown;
}

export default function CreateTeamPage() {
  const { user } = useUser();
  const [teamName, setTeamName] = useState("");
  const [ownerName, setOwnerName] = useState(
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [userMetadata, setUserMetadata] = useState<UserPublicMetadata | null>(
    null,
  );
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [updateRoleMessage, setUpdateRoleMessage] = useState("");
  const role = useUserRole();
  const router = useRouter();
  const { createTeam, fetchTeams } = useTeamsStore();

  useEffect(() => {
    if (user) {
      setUserMetadata(user.publicMetadata as UserPublicMetadata);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await createTeam(
        teamName,
        ownerName || `${user?.firstName} ${user?.lastName}`,
      );
      await fetchTeams(); // Refetch teams to get the latest data
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create team:", error);
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <h1 className="mb-8 text-2xl font-bold">Create New Team</h1>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Team Name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="mt-1 block w-full rounded-md border p-2"
            placeholder="Enter team name"
            disabled={isLoading}
            required
          />
        </div>

        {/* Only show owner name input if Clerk doesn't have the info */}
        {(!user?.firstName || !user?.lastName) && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Owner Name
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1 block w-full rounded-md border p-2"
              placeholder="Enter your full name"
              disabled={isLoading}
              required
            />
          </div>
        )}

        <button
          type="submit"
          className="flex items-center justify-center rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-400"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Creating Team...
            </>
          ) : (
            "Create Team"
          )}
        </button>
      </form>
    </Container>
  );
}
