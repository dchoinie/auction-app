"use client";

import { useState, useEffect } from "react";
import { useNFLPlayersStore } from "~/store/nfl-players";

interface NFLPlayerSelectProps {
  selectedPlayerId: number | undefined;
  onPlayerSelect: (playerId: number) => void;
  isDisabled?: boolean;
  currentNominator?: string;
}

export default function NFLPlayerSelect({
  selectedPlayerId,
  onPlayerSelect,
  isDisabled = false,
  currentNominator,
}: NFLPlayerSelectProps) {
  const [query, setQuery] = useState("");
  const { players, fetchPlayers } = useNFLPlayersStore();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add effect to fetch players on mount
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        console.log("Fetching players...");
        await fetchPlayers();
        setError(null);
      } catch (err) {
        console.error("Error fetching players:", err);
        setError("Failed to fetch players. Please try again.");
      }
    };

    void loadPlayers();
  }, [fetchPlayers]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  // Filter out players that have already been drafted
  const availablePlayers =
    players?.filter((player) => !player.assignedTeamId) ?? [];

  // Sort players by ID first
  const sortedPlayers = [...availablePlayers].sort((a, b) => a.id - b.id);

  const filteredPlayers = !query
    ? sortedPlayers
    : sortedPlayers.filter(
        (player) =>
          player.firstName.toLowerCase().includes(query.toLowerCase()) ||
          player.lastName.toLowerCase().includes(query.toLowerCase()) ||
          player.nflTeamName.toLowerCase().includes(query.toLowerCase()) ||
          player.position.toLowerCase().includes(query.toLowerCase()),
      );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".nfl-player-select")) {
        setIsOpen(false);
        setQuery(""); // Clear search when closing dropdown
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (error) {
    return (
      <div className="mt-4 w-full">
        <div className="rounded-lg border border-red-500 bg-red-50 p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => void fetchPlayers()}
            className="mt-2 rounded bg-red-100 px-4 py-2 text-red-700 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="mt-4 w-full">
        <div className="flex items-center justify-center rounded-lg border bg-gray-50 p-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-gray-600">Loading players...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full">
      <div className="nfl-player-select relative">
        <div
          className={`relative w-full cursor-default overflow-hidden rounded-lg border bg-white text-left text-xs focus:outline-none sm:text-sm ${
            isDisabled ? "bg-gray-50" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => !isDisabled && setIsOpen(!isOpen)}
            className={`w-full border-none py-3 pl-3 pr-10 text-left text-xs leading-5 text-gray-900 focus:ring-0 sm:py-4 sm:text-sm ${
              isDisabled
                ? "cursor-not-allowed bg-gray-50 text-gray-500"
                : "cursor-pointer"
            }`}
          >
            {isDisabled && currentNominator
              ? `Waiting for ${currentNominator} to nominate a player...`
              : selectedPlayer
                ? `${selectedPlayer.firstName} ${selectedPlayer.lastName} (${selectedPlayer.position} - ${selectedPlayer.nflTeamName})`
                : "Select a player to nominate..."}
          </button>
          <button
            className="absolute inset-y-0 right-0 flex items-center pr-2"
            onClick={() => !isDisabled && setIsOpen(!isOpen)}
            type="button"
          >
            <svg
              className={`h-5 w-5 ${
                isDisabled ? "text-gray-400" : "text-gray-600"
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {isOpen && !isDisabled && (
          <div className="absolute z-10 mt-1 w-full overflow-auto rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="sticky top-0 z-10 bg-white px-3 py-2">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs placeholder-gray-500 focus:border-blue-500 focus:outline-none sm:text-sm"
                placeholder="Search players..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-auto py-1 text-xs sm:text-sm">
              {filteredPlayers.length === 0 ? (
                <div className="relative cursor-default select-none px-3 py-2 text-gray-700 sm:px-4">
                  Nothing found.
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`relative cursor-pointer select-none py-1 pl-3 pr-9 text-xs hover:bg-blue-600 hover:text-white sm:py-2 sm:text-sm ${
                      player.id === selectedPlayerId
                        ? "bg-blue-100"
                        : "text-gray-900"
                    }`}
                    onClick={() => {
                      onPlayerSelect(player.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className={`block truncate`}>
                      {player.firstName} {player.lastName} ({player.position} -{" "}
                      {player.nflTeamName})
                    </span>
                    {player.id === selectedPlayerId && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
