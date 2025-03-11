"use client";

import { useEffect, useState } from "react";
import Container from "~/components/Container";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface Team {
  id: number;
  name: string;
  ownerName: string;
  totalBudget: number;
}

interface NFLPlayer {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  nflTeamName: string;
  assignedTeamId: number | null;
  isKeeper: boolean;
  draftedAmount: number | null;
}

interface TeamWithKeeper extends Team {
  keeper: NFLPlayer | null;
}

export default function KeepersPage() {
  const [teamsWithKeepers, setTeamsWithKeepers] = useState<TeamWithKeeper[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch teams and players in parallel
        const [teamsResponse, playersResponse] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/nfl-players"),
        ]);

        if (!teamsResponse.ok || !playersResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const teams = (await teamsResponse.json()) as Team[];
        const players = (await playersResponse.json()) as NFLPlayer[];

        // Filter keepers and create a map for easy lookup
        const keepersMap = new Map(
          players
            .filter((player) => player.isKeeper && player.assignedTeamId)
            .map((player) => [player.assignedTeamId, player]),
        );

        // Join teams with their keepers
        const teamsWithKeepersData = teams.map((team) => ({
          ...team,
          keeper: keepersMap.get(team.id) || null,
        }));

        setTeamsWithKeepers(teamsWithKeepersData);
      } catch (err) {
        setError("Failed to load keepers data");
        console.error("Error fetching keepers data:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <Container>
      <div className="container mx-auto p-4">
        <h1 className="mb-6 text-2xl font-bold">Team Keepers</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamsWithKeepers.map((team) => (
            <Card
              key={team.id}
              className={team.keeper ? "border-2 border-blue-500" : ""}
            >
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold">{team.name}</h2>
                <p className="text-sm text-gray-500">Owner: {team.ownerName}</p>
                <div className="mt-4">
                  <h3 className="text-sm font-medium">Keeper:</h3>
                  {team.keeper ? (
                    <div className="mt-2 rounded-lg bg-blue-50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700"
                        >
                          KEEPER
                        </Badge>
                      </div>
                      <p className="font-medium text-blue-900">
                        {team.keeper.firstName} {team.keeper.lastName}
                      </p>
                      <p className="text-sm text-blue-700">
                        {team.keeper.position} - {team.keeper.nflTeamName}
                      </p>
                      {team.keeper.draftedAmount && (
                        <p className="mt-1 text-sm text-blue-700">
                          Draft Amount: ${team.keeper.draftedAmount}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      No keeper found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
