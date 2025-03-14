"use client";

import { useState, useEffect } from "react";
import { useNFLPlayersStore } from "~/store/nfl-players";
import { usePartySocket } from "partysocket/react";

interface Team {
  id: number;
  name: string;
  ownerName: string;
  totalBudget: number;
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

interface DraftState {
  selectedPlayer: null;
  currentBid: null;
  users: { id: string; name: string; isActive: boolean; joinedAt: number }[];
  currentNominatorDraftOrder: number;
  currentRound: number;
  isCountdownActive: boolean;
  countdownStartTime: null;
  triggeredBy: null;
}

interface ErrorResponse {
  error: string;
}

type RosterSpot = keyof Omit<Roster, "id" | "teamId">;

export default function ManualPlayerAssign() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [isKeeper, setIsKeeper] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const { players, fetchPlayers } = useNFLPlayersStore();

  // Add socket connection
  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST!,
    room: "draft",
  });

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      const response = await fetch("/api/teams");
      const data = (await response.json()) as Team[];
      setTeams(data);
    };
    void fetchTeams();
  }, []);

  // Fetch players
  useEffect(() => {
    void fetchPlayers();
  }, [fetchPlayers]);

  // Filter out already assigned players and sort by last name
  const availablePlayers = players
    .filter((player) => !player.assignedTeamId)
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  const handleAssign = async () => {
    if (!selectedPlayerId || !selectedTeamId || price < 0) {
      setMessage({
        type: "error",
        text: "Please fill in all fields with valid values",
      });
      return;
    }

    setIsAssigning(true);
    setMessage(null);

    try {
      // Get the selected player for position info
      const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
      if (!selectedPlayer) {
        throw new Error("Selected player not found");
      }

      // First, find an available roster spot
      const rosterResponse = await fetch(`/api/rosters/${selectedTeamId}`);
      if (!rosterResponse.ok) {
        throw new Error("Failed to fetch roster");
      }
      const roster = (await rosterResponse.json()) as Roster;

      // Determine which roster spot to use based on position
      let rosterSpot: RosterSpot | null = null;
      const position = selectedPlayer.position;

      // Check position-specific spots first
      if (position === "QB" && !roster.QB) {
        rosterSpot = "QB";
      } else if (position === "RB" && !roster.RB1) {
        rosterSpot = "RB1";
      } else if (position === "RB" && !roster.RB2) {
        rosterSpot = "RB2";
      } else if (position === "WR" && !roster.WR1) {
        rosterSpot = "WR1";
      } else if (position === "WR" && !roster.WR2) {
        rosterSpot = "WR2";
      } else if (position === "TE" && !roster.TE) {
        rosterSpot = "TE";
      } else {
        // Check flex spots for RB/WR/TE
        if (["RB", "WR", "TE"].includes(position)) {
          if (!roster.Flex1) rosterSpot = "Flex1";
          else if (!roster.Flex2) rosterSpot = "Flex2";
        }
      }

      // If no position-specific or flex spot, try bench spots
      if (!rosterSpot) {
        const benchSpots: RosterSpot[] = [
          "Bench1",
          "Bench2",
          "Bench3",
          "Bench4",
          "Bench5",
          "Bench6",
        ];
        for (const spot of benchSpots) {
          if (!roster[spot]) {
            rosterSpot = spot;
            break;
          }
        }
      }

      if (!rosterSpot) {
        throw new Error("No available roster spots for this player");
      }

      // Update NFL player assignment
      const playerResponse = await fetch(
        `/api/nfl-players/${selectedPlayerId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignedTeamId: selectedTeamId,
            draftedAmount: price,
            isKeeper: isKeeper,
          }),
        },
      );

      if (!playerResponse.ok) {
        const errorData = (await playerResponse.json()) as ErrorResponse;
        throw new Error(errorData.error || "Failed to assign player");
      }

      // Update roster with the new player using the existing PATCH endpoint
      const updateRosterResponse = await fetch(
        `/api/rosters/${selectedTeamId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            [rosterSpot]: selectedPlayerId,
          }),
        },
      );

      if (!updateRosterResponse.ok) {
        throw new Error("Failed to update roster");
      }

      // Update team's budget
      const updateBudgetResponse = await fetch(
        `/api/teams/budget/${selectedTeamId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: price,
          }),
        },
      );

      if (!updateBudgetResponse.ok) {
        throw new Error("Failed to update team budget");
      }

      // Get the assigned player and team details for notification
      const assignedPlayer = players.find((p) => p.id === selectedPlayerId);
      const assignedTeam = teams.find((t) => t.id === selectedTeamId);

      if (assignedPlayer && assignedTeam) {
        // First, reset the PartyKit server state
        socket.send(
          JSON.stringify({
            type: "init_state",
            state: {
              selectedPlayer: null,
              currentBid: null,
              users: [], // The server will maintain the current users
              currentNominatorDraftOrder: 1, // Reset to first nominator
              currentRound: 1, // Reset to first round
              isCountdownActive: false,
              countdownStartTime: null,
              triggeredBy: null,
            },
          }),
        );

        // Then broadcast the reset to all clients
        socket.send(
          JSON.stringify({
            type: "draft_reset",
            message: `${assignedPlayer.firstName} ${assignedPlayer.lastName} manually assigned to ${assignedTeam.name} for $${price}`,
          }),
        );
      }

      // Reset form
      setSelectedPlayerId(null);
      setSelectedTeamId(null);
      setPrice(0);
      setIsKeeper(false);
      setMessage({ type: "success", text: "Player assigned successfully" });

      // Refresh players list
      void fetchPlayers();
    } catch (error) {
      console.error("Error assigning player:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to assign player",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <h2 className="mb-4 text-xl font-semibold">Manually Assign Player</h2>

      {message && (
        <div
          className={`mb-4 rounded-lg p-3 ${
            message.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Player
          </label>
          <select
            value={selectedPlayerId ?? ""}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 p-2"
          >
            <option value="">Select a player...</option>
            {availablePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.firstName} {player.lastName} - {player.position} -{" "}
                {player.nflTeamName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select Team
          </label>
          <select
            value={selectedTeamId ?? ""}
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 p-2"
          >
            <option value="">Select a team...</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.ownerName})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Price
          </label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isKeeper"
            checked={isKeeper}
            onChange={(e) => setIsKeeper(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label
            htmlFor="isKeeper"
            className="text-sm font-medium text-gray-700"
          >
            Mark as Keeper
          </label>
        </div>

        <button
          onClick={handleAssign}
          disabled={isAssigning}
          className={`w-full rounded-md px-4 py-2 text-white ${
            isAssigning
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isAssigning ? "Assigning..." : "Assign Player"}
        </button>
      </div>
    </div>
  );
}
