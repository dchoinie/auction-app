"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Container from "~/components/Container";
import CurrentTeams from "~/components/CurrentTeams";
import { useTeamsStore } from "~/store/teams";

interface Team {
  id: number;
  name: string;
  ownerName: string;
  ownerId: string;
  draftOrder: number | null;
  totalBudget: number;
  createdAt: string;
}

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
        <div className="mb-8 rounded-lg border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-xl font-bold text-yellow-800">
                Welcome to Fantasy Football! 🏈
              </h2>
              <p className="mb-4 text-yellow-700">
                You&apos;re almost ready to start your journey. Create your team
                to join the league and start drafting players.
              </p>
              <Link
                href="/dashboard/create-team"
                className="inline-flex items-center rounded-lg bg-blue-500 px-6 py-3 text-white transition-all hover:bg-blue-600 hover:shadow-md"
              >
                <span className="mr-2 text-lg">+</span>
                Create Your Team
              </Link>
            </div>
            <div className="hidden rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm md:block">
              <h3 className="mb-2 font-semibold text-yellow-800">
                Quick Tips:
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
                <li>Choose a unique team name</li>
                <li>Get ready for the draft</li>
                <li>Build your winning strategy</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            League Teams
          </h2>
          <CurrentTeams />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          {userTeam.name}
        </h1>
        <p className="text-sm text-gray-500">
          Team created on {new Date(userTeam.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Team Stats Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Team Stats
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600">Total Budget</span>
              <span className="font-medium text-gray-900">
                ${userTeam.totalBudget}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600">Draft Position</span>
              <span className="font-medium text-gray-900">
                {userTeam.draftOrder ?? "Not Set"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Owner</span>
              <span className="font-medium text-gray-900">
                {userTeam.ownerName}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/draft"
              className="rounded-md bg-blue-500 px-4 py-2 text-center text-white transition-all hover:bg-blue-600"
            >
              Enter Draft Room
            </Link>
            <Link
              href="/dashboard/roster"
              className="rounded-md bg-gray-100 px-4 py-2 text-center text-gray-700 transition-all hover:bg-gray-200"
            >
              View Roster
            </Link>
          </div>
        </div>

        {/* League Info Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            League Info
          </h2>
          <div className="space-y-3 text-sm">
            <p className="flex items-center text-gray-600">
              <span className="mr-2">👥</span>
              {teams.length} Teams in League
            </p>
            <p className="flex items-center text-gray-600">
              <span className="mr-2">🎯</span>
              14 Roster Spots
            </p>
            <p className="flex items-center text-gray-600">
              <span className="mr-2">💰</span>${userTeam.totalBudget} Starting
              Budget
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          League Teams
        </h2>
        <CurrentTeams />
      </div>
    </Container>
  );
}
