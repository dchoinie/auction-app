"use client";

import { useEffect } from "react";
import { useTeamsStore } from "~/store/teams";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface Team {
  id: number;
  name: string;
  ownerName: string;
  ownerId: string;
  draftOrder: number | null;
  totalBudget: number;
  createdAt: string;
}

export default function CurrentTeams() {
  const { teams, isLoading, error, hasFetched } = useTeamsStore();
  const { user, isLoaded } = useUser();

  if (isLoading || !isLoaded) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em]"></div>
        <p className="mt-4 text-gray-600">Loading teams...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-800">
        <p className="font-medium">Error loading teams</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">No teams have joined the league yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams
        .sort((a, b) => (a.draftOrder ?? Infinity) - (b.draftOrder ?? Infinity))
        .map((team) => {
          const isActive = team.ownerId === user?.id;

          return (
            <div
              key={team.id}
              className="relative overflow-hidden rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              {team.draftOrder && (
                <div className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-bl bg-blue-500 text-sm font-semibold text-white">
                  {team.draftOrder}
                </div>
              )}
              <div className="mb-2">
                <h3 className="font-semibold text-gray-900">{team.name}</h3>
                <p className="text-sm text-gray-500">{team.ownerName}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-800">
                    ${team.totalBudget}
                  </span>
                  <span className="text-gray-600">Budget</span>
                </div>
                {!team.draftOrder && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    No Pick
                  </span>
                )}
              </div>
              <div className="mt-3 border-t pt-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Created {new Date(team.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-300"}`}
                    ></span>
                    {isActive ? "Active" : "Not Active"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
