"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Container from "~/components/Container";
import CurrentTeams from "~/components/CurrentTeams";
import { useTeamsStore } from "~/store/teams";

export default function DashboardPage() {
  const { teams, hasFetched, fetchTeams } = useTeamsStore();
  const { user } = useUser();

  const userTeam = teams.find((team) => team.ownerId === user?.id);

  useEffect(() => {
    if (!hasFetched) {
      void fetchTeams();
    }
  }, [hasFetched, fetchTeams]);

  if (!userTeam) {
    return (
      <Container>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="mb-2 text-lg font-semibold text-yellow-800">
            No Team Found
          </h2>
          <p className="mb-4 text-yellow-700">
            You need to create a team to participate in the fantasy football
            league.
          </p>
          <Link
            href="/dashboard/create-team"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Create Your Team
          </Link>
        </div>
        <CurrentTeams />
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="mb-6 text-2xl font-bold">Your Team</h1>
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">{userTeam.name}</h2>
        <p className="text-sm text-gray-600">
          Created: {new Date(userTeam.createdAt).toLocaleDateString()}
        </p>
      </div>
      <CurrentTeams />
    </Container>
  );
}
