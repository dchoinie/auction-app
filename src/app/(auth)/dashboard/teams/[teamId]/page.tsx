"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Container from "~/components/Container";
import { useTeamsStore } from "~/store/teams";
import { useRosterStore } from "~/store/rosters";

const ROSTER_POSITIONS = [
  "QB",
  "RB1",
  "RB2",
  "WR1",
  "WR2",
  "TE",
  "Flex1",
  "Flex2",
  "Bench1",
  "Bench2",
  "Bench3",
  "Bench4",
  "Bench5",
  "Bench6",
] as const;

export default function TeamDetailsPage() {
  const { teamId } = useParams();
  const { teams } = useTeamsStore();
  const { rosters, isLoading, error, fetchRoster } = useRosterStore();

  const teamIdNumber = Number(teamId);
  const team = teams.find((t) => t.id === teamIdNumber);
  const roster = rosters[teamIdNumber];

  useEffect(() => {
    if (teamId) {
      void fetchRoster(teamIdNumber);
    }
  }, [teamId]);

  if (!team) return <div>Team not found</div>;
  if (isLoading) return <div>Loading roster...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Container>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">{team.name}</h1>
        <p className="text-gray-600">Owner: {team.ownerName}</p>
      </div>

      <div className="my-8 overflow-hidden rounded-lg border">
        <table className="w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Position
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Player
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                NFL Team
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Drafted Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ROSTER_POSITIONS.map((position) => {
              const player = roster?.[position];
              return (
                <tr key={position} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {position}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {player
                      ? `${player.firstName} ${player.lastName}`
                      : "Empty"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {player?.nflTeamName ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {player?.draftedAmount ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
