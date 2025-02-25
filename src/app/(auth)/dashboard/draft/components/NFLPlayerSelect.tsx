"use client";

import { useState, useRef, useEffect } from "react";
import { useNFLPlayersStore } from "~/store/nfl-players";

interface NFLPlayerSelectProps {
  selectedPlayerId?: number | null;
  onPlayerSelect: (playerId: number) => void;
}

export default function NFLPlayerSelect({
  selectedPlayerId,
  onPlayerSelect,
}: NFLPlayerSelectProps) {
  const { players } = useNFLPlayersStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const filteredPlayers = [...players]
    .sort((a, b) => a.id - b.id)
    .filter(
      (player) =>
        !searchTerm ||
        player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.nflTeamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.position.toLowerCase().includes(searchTerm.toLowerCase()),
    );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-6" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700">
        Select Player
      </label>
      <div className="relative mt-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-md border bg-white p-2 text-left"
        >
          {selectedPlayer
            ? `${selectedPlayer.firstName} ${selectedPlayer.lastName} - ${selectedPlayer.position} - ${selectedPlayer.nflTeamName}`
            : "Select a player"}
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-lg">
            <div className="sticky top-0 bg-white p-2">
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border p-2"
                autoFocus
              />
            </div>
            <div className="py-1">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    onPlayerSelect(player.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                    player.id === selectedPlayerId ? "bg-blue-50" : ""
                  }`}
                >
                  {player.firstName} {player.lastName} - {player.position} -{" "}
                  {player.nflTeamName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
