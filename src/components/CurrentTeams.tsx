"use client";

import { useEffect } from "react";
import { useTeamsStore } from "~/store/teams";
import { useRouter } from "next/navigation";

export default function CurrentTeams() {
  const { teams, isLoading, error, hasFetched } = useTeamsStore();
  const router = useRouter();

  if (isLoading) return <div>Loading teams...</div>;
  if (error) return <div>Error: {error}</div>;

  if (teams.length === 0) {
    return (
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Current Teams</h2>
        <div className="rounded-lg border border-gray-200 p-4 text-center text-gray-500">
          No teams joined
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Current Teams</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div
            key={team.id}
            onClick={() => router.push(`/dashboard/teams/${team.id}`)}
            className="cursor-pointer rounded-lg border p-4 transition hover:bg-gray-50"
          >
            <h3 className="font-semibold">{team.name}</h3>
            <p className="text-sm text-gray-600">Owner: {team.ownerName}</p>
            <p className="text-xs text-gray-500">
              Joined: {new Date(team.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
