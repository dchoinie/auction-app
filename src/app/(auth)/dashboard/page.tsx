"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Container from "~/components/Container";
import CurrentTeams from "~/components/CurrentTeams";
import { useTeamsStore } from "~/store/teams";
import { Activity, Trophy, Users, LineChart, Gavel } from "lucide-react";

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

  const userTeam = teams.find((team: Team) => team.ownerId === user?.id);

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
              <h2 className="mb-2 flex items-center text-2xl font-bold text-yellow-800">
                <Activity className="mr-2" />
                Welcome to Fantasy Football! 🏈
              </h2>
              <p className="mb-4 text-yellow-700">
                You&apos;re almost ready to start your journey. Create your team
                to join the league and participate in the auction draft.
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
              <h3 className="mb-2 flex items-center font-semibold text-yellow-800">
                <Trophy className="mr-2" />
                Quick Tips:
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
                <li>Choose a unique team name</li>
                <li>Prepare for the auction draft</li>
                <li>Set your player budgets</li>
                <li>Plan your bidding strategy</li>
                <li>Research player values</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-800">
            <Users className="mr-2" />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 flex items-center text-3xl font-bold text-gray-900">
              <Activity className="mr-2 text-blue-500" />
              {userTeam.name}
            </h1>
            <p className="text-sm text-gray-500">
              Team created on{" "}
              {new Date(userTeam.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Team Stats Card */}
        <Link
          href={`/dashboard/teams/${userTeam.id}`}
          className="rounded-lg border bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
        >
          <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-800">
            <LineChart className="mr-2 text-blue-500" />
            Team Stats
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600">Auction Budget</span>
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
        </Link>

        {/* Quick Actions Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-800">
            <Gavel className="mr-2 text-blue-500" />
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/draft"
              className="flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-center text-white transition-all hover:bg-blue-600"
            >
              <Gavel className="mr-2" />
              Enter Auction Room
            </Link>
            <Link
              href={`/dashboard/teams/${userTeam.id}`}
              className="flex items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-center text-gray-700 transition-all hover:bg-gray-200"
            >
              <Activity className="mr-2" />
              View Roster
            </Link>
          </div>
        </div>

        {/* League Info Card */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-800">
            <Trophy className="mr-2 text-blue-500" />
            League Info
          </h2>
          <div className="space-y-3 text-sm">
            <p className="flex items-center text-gray-600">
              <Users className="mr-2 text-blue-500" />
              {teams.length} Teams in League
            </p>
            <p className="flex items-center text-gray-600">
              <Activity className="mr-2 text-blue-500" />
              14 Roster Spots
            </p>
            <p className="flex items-center text-gray-600">
              <Trophy className="mr-2 text-blue-500" />${userTeam.totalBudget}{" "}
              Auction Budget
            </p>
            <p className="flex items-center text-gray-600">
              <LineChart className="mr-2 text-blue-500" />
              Half-PPR Scoring Format
            </p>
            <p className="flex items-center text-gray-600">
              <Gavel className="mr-2 text-blue-500" />
              Auction Draft Format
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-800">
          <Users className="mr-2 text-blue-500" />
          League Teams
        </h2>
        <CurrentTeams />
      </div>
    </Container>
  );
}
