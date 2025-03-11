"use client";

import { useState, useEffect } from "react";
import Container from "~/components/Container";
import { useUserRole } from "~/hooks/use-user-role";
import { hasPermission } from "~/lib/permissions";
import { redirect } from "next/navigation";

interface Player {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  nflTeam: string;
  price: number | null;
  assignedTeamId: number | null;
  draftedAmount: number | null;
}

interface Roster {
  id: number;
  teamId: number;
  QB: number | null;
  RB1: number | null;
  RB2: number | null;
  WR1: number | null;
  WR2: number | null;
  TE: number | null;
  Flex1: number | null;
  Flex2: number | null;
  Bench1: number | null;
  Bench2: number | null;
  Bench3: number | null;
  Bench4: number | null;
  Bench5: number | null;
  Bench6: number | null;
}

interface Team {
  id: number;
  name: string;
  ownerName: string;
}

interface TeamWithRoster extends Team {
  roster: Roster;
  players: Record<number, Player>;
}

function TeamRoster({ team }: { team: TeamWithRoster }) {
  const positions = [
    { key: "QB" as const, label: "QB" },
    { key: "RB1" as const, label: "RB1" },
    { key: "RB2" as const, label: "RB2" },
    { key: "WR1" as const, label: "WR1" },
    { key: "WR2" as const, label: "WR2" },
    { key: "TE" as const, label: "TE" },
    { key: "Flex1" as const, label: "FLEX" },
    { key: "Flex2" as const, label: "FLEX" },
    { key: "Bench1" as const, label: "Bench" },
    { key: "Bench2" as const, label: "Bench" },
    { key: "Bench3" as const, label: "Bench" },
    { key: "Bench4" as const, label: "Bench" },
    { key: "Bench5" as const, label: "Bench" },
    { key: "Bench6" as const, label: "Bench" },
  ];

  const filledPositions = positions.filter(
    (pos) => team.roster[pos.key] !== null,
  );

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold">{team.name}</h3>
        <p className="text-sm text-gray-600">{team.ownerName}</p>
      </div>
      <div className="grid gap-2">
        {filledPositions.length > 0 ? (
          filledPositions.map((pos) => {
            const playerId = team.roster[pos.key];
            const player = playerId ? team.players[playerId] : null;
            if (!player) return null;

            return (
              <div
                key={pos.key}
                className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-12 font-medium">{pos.label}</span>
                  <span>{`${player.firstName} ${player.lastName}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {player.nflTeam}
                  </span>
                  <span className="text-xs font-medium">
                    ${player.draftedAmount ?? 0}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">No players on roster</p>
        )}
      </div>
    </div>
  );
}

export default function RostersPage() {
  const role = useUserRole();
  const [teams, setTeams] = useState<TeamWithRoster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRosters = async () => {
      try {
        const [rostersRes, teamsRes, playersRes] = await Promise.all([
          fetch("/api/rosters"),
          fetch("/api/teams"),
          fetch("/api/nfl-players"),
        ]);

        const [rostersData, teamsData, playersData] = await Promise.all([
          rostersRes.json() as Promise<Roster[]>,
          teamsRes.json() as Promise<Team[]>,
          playersRes.json() as Promise<Player[]>,
        ]);

        // Create a map of players by ID for quick lookup
        const playersMap = playersData.reduce<Record<number, Player>>(
          (acc, player) => {
            acc[player.id] = player;
            return acc;
          },
          {},
        );

        // Match rosters with teams
        const teamsWithRosters = teamsData.map((team) => {
          const roster = rostersData.find((r) => r.teamId === team.id);
          if (!roster) {
            throw new Error(`No roster found for team ${team.id}`);
          }

          // Get all player IDs from the roster
          const rosterPlayerIds = Object.values(roster).filter(
            (value): value is number => typeof value === "number",
          );

          // Create a map of only the players in this roster
          const teamPlayers = rosterPlayerIds.reduce<Record<number, Player>>(
            (acc, playerId) => {
              const player = playersMap[playerId];
              if (player) {
                acc[playerId] = player;
              }
              return acc;
            },
            {},
          );

          return {
            ...team,
            roster,
            players: teamPlayers,
          };
        });

        setTeams(teamsWithRosters);
      } catch (error) {
        console.error("Error fetching rosters:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchRosters();
  }, []);

  if (!hasPermission(role, "admin")) {
    redirect("/dashboard");
  }

  if (loading) {
    return (
      <Container>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-lg text-gray-600">Loading rosters...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Rosters</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team) => (
          <TeamRoster key={team.id} team={team} />
        ))}
      </div>
    </Container>
  );
}
