"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Container from "~/components/Container";
import { useTeamsStore } from "~/store/teams";
import { useRosterStore } from "~/store/rosters";
import { useNFLPlayersStore } from "~/store/nfl-players";

interface NFLPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  nflTeamName: string;
  draftedAmount: number | null;
  assignedTeamId: number | null;
}

type RosterPosition =
  | "QB"
  | "RB1"
  | "RB2"
  | "WR1"
  | "WR2"
  | "TE"
  | "Flex1"
  | "Flex2"
  | "Bench1"
  | "Bench2"
  | "Bench3"
  | "Bench4"
  | "Bench5"
  | "Bench6";

type Roster = Record<RosterPosition, number | null>;

const ROSTER_POSITIONS = {
  STARTERS: [
    { key: "QB", label: "QB" },
    { key: "RB1", label: "RB1" },
    { key: "RB2", label: "RB2" },
    { key: "WR1", label: "WR1" },
    { key: "WR2", label: "WR2" },
    { key: "TE", label: "TE" },
    { key: "Flex1", label: "FLEX1" },
    { key: "Flex2", label: "FLEX2" },
  ],
  BENCH: [
    { key: "Bench1", label: "Bench 1" },
    { key: "Bench2", label: "Bench 2" },
    { key: "Bench3", label: "Bench 3" },
    { key: "Bench4", label: "Bench 4" },
    { key: "Bench5", label: "Bench 5" },
    { key: "Bench6", label: "Bench 6" },
  ],
} as const;

export default function TeamDetailsPage() {
  const { teamId } = useParams();
  const { teams, hasFetched, fetchTeams } = useTeamsStore();
  const {
    rosters,
    isLoading: isLoadingRoster,
    error,
    fetchRoster,
  } = useRosterStore();
  const {
    players,
    isLoading: isLoadingPlayers,
    fetchPlayers,
  } = useNFLPlayersStore();

  const teamIdNumber = Number(teamId);
  const team = teams.find((t) => t.id === teamIdNumber);
  const roster = rosters[teamIdNumber] as Roster | undefined;

  useEffect(() => {
    if (!hasFetched) {
      void fetchTeams();
    }
  }, [hasFetched, fetchTeams]);

  useEffect(() => {
    if (teamId) {
      void fetchRoster(teamIdNumber);
      void fetchPlayers();
    }
  }, [teamId, fetchRoster, fetchPlayers]);

  const renderPlayer = (playerId: number | null, position: string) => {
    if (!playerId) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-4">
          <div className="text-gray-400">Empty {position}</div>
        </div>
      );
    }

    const player = players.find((p) => p.id === playerId);
    if (!player) return null;

    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md">
        <div className="font-medium text-gray-900">
          {player.firstName} {player.lastName}
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {player.position} - {player.nflTeamName}
        </div>
        <div className="mt-1 text-sm font-medium text-green-600">
          ${player.draftedAmount}
        </div>
      </div>
    );
  };

  if (!team) return <Container>Team not found</Container>;
  if (isLoadingRoster || isLoadingPlayers)
    return <Container>Loading roster...</Container>;
  if (error) return <Container>Error: {error}</Container>;

  return (
    <Container className="my-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">{team.name}</h1>
        <p className="text-gray-600">Owner: {team.ownerName}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Starters Section */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Starters</h2>
          <div className="space-y-4">
            {ROSTER_POSITIONS.STARTERS.map(({ key, label }) => (
              <div key={key}>
                {renderPlayer(roster?.[key as RosterPosition] ?? null, label)}
              </div>
            ))}
          </div>
        </div>

        {/* Bench Section */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Bench</h2>
          <div className="space-y-4">
            {ROSTER_POSITIONS.BENCH.map(({ key, label }) => (
              <div key={key}>
                {renderPlayer(roster?.[key as RosterPosition] ?? null, label)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
